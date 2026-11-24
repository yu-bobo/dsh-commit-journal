import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { v4 as uuid } from 'uuid'
import type { Account, StoredCommit, SyncResult } from './types.js'
import { commitFullText } from './commitText.js'
import { formatCommitDiffStats } from './commitStats.js'
import { shortRepoPath } from './repoDisplay.js'
import { getAccount, getAccountToken, listAccounts } from './accounts.js'
import { db } from './db.js'
import { exportsDir } from './paths.js'
import { getSyncIntervalMinutes, getSyncLookbackDays } from './settings.js'
import { getProvider } from '../providers/index.js'
import { enrichCodeupCommitStats } from '../providers/codeup/index.js'
import { enrichGithubCommitStats } from '../providers/github/index.js'

const timers = new Map<string, NodeJS.Timeout>()
const syncing = new Set<string>()

const DAY_MS = 24 * 3600 * 1000
const INCREMENTAL_OVERLAP_MS = 2 * DAY_MS
// 每次同步额外回填缺 stats 的历史提交（按时间新→旧）
const STATS_BACKFILL_PER_SYNC = 100

async function fillCommitStats(
  account: Account,
  token: string,
  repoId: string,
  commits: StoredCommit[],
  onWarn: (message: string) => void
): Promise<number> {
  const need = commits.filter((c) => c.additions == null && c.deletions == null)
  if (!need.length) return 0
  if (account.provider === 'github') {
    await enrichGithubCommitStats(account, token, repoId, need, onWarn)
  } else if (account.provider === 'codeup') {
    await enrichCodeupCommitStats(account, token, repoId, need, onWarn)
  } else {
    return 0
  }
  return need.filter((c) => c.additions != null || c.deletions != null).length
}

function toApiTime(iso: string): string {
  const t = Date.parse(iso)
  const d = Number.isFinite(t) ? new Date(t) : new Date(iso)
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function matchAuthor(account: Account, name: string, email: string): boolean {
  if (!account.authorFilters.length) return true
  const hay = `${name} ${email}`.toLowerCase()
  return account.authorFilters.some((f) => hay.includes(f.toLowerCase()))
}

function writeDailyExports(accountId: string, commits: StoredCommit[]): void {
  if (!commits.length) return
  const root = exportsDir()
  const byDay = new Map<string, StoredCommit[]>()
  for (const c of commits) {
    const day = c.committedAt.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(c)
  }
  for (const [day, list] of byDay) {
    const dir = join(root, accountId)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const path = join(dir, `${day}.md`)
    const existing = existsSync(path)
      ? readFileSync(path, 'utf8')
      : `# ${day} 提交材料\n\n`
    const lines: string[] = []
    for (const c of list) {
      if (existing.includes(c.sha)) continue
      const text = commitFullText(c)
      const [first, ...rest] = text.split('\n')
      const stats = formatCommitDiffStats(c)
      lines.push(`- **[${c.repoName}]** ${stats ? `${first}（${stats}）` : first}`)
      for (const line of rest) lines.push(`  ${line}`)
      lines.push(`  - 时间: ${c.committedAt}`)
      lines.push(`  - 作者: ${c.authorName} <${c.authorEmail}>`)
      lines.push(`  - SHA: \`${c.shortId}\` (${c.sha})`)
      if (stats) lines.push(`  - 变更: ${stats}`)
      if (c.webUrl) lines.push(`  - 链接: ${c.webUrl}`)
      lines.push('')
    }
    if (lines.length) writeFileSync(path, existing + lines.join('\n'), 'utf8')
  }
}

export async function syncAccount(
  accountId: string,
  repoIds?: string[]
): Promise<SyncResult> {
  if (syncing.has(accountId)) {
    return { accountId, fetched: 0, inserted: 0, errors: ['同步进行中，请稍后再试'] }
  }
  syncing.add(accountId)
  const errors: string[] = []
  let fetched = 0
  let inserted = 0
  let matched = 0
  let truncated = 0
  let statsFilled = 0
  try {
    const account = getAccount(accountId)
    if (!account) throw new Error('账号不存在')
    const token = account.mode === 'local' ? '' : getAccountToken(accountId)
    const provider = getProvider(account)
    const isLocal = account.mode === 'local'

    const onlyIds =
      repoIds && repoIds.length > 0 ? Array.from(new Set(repoIds.map(String))) : null

    db.addSyncLog({
      id: uuid(),
      accountId,
      at: new Date().toISOString(),
      level: 'info',
      message: onlyIds
        ? `${isLocal ? '开始扫描指定仓库' : '开始同步指定仓库'}（${onlyIds.length} 个）`
        : isLocal
          ? '开始扫描关注的本地仓库'
          : '开始同步全部关注仓库'
    })

    let repos = db.listRepos(accountId)
    const needRefresh =
      !onlyIds || onlyIds.some((id) => !repos.find((r) => r.id === id))
    if (needRefresh) {
      const latest = await provider.listRepos(account, token)
      db.upsertRepos(accountId, latest)
      repos = db.listRepos(accountId)
    }

    const targets = onlyIds
      ? repos.filter((r) => onlyIds.includes(r.id))
      : account.watchedRepoIds.length > 0
        ? repos.filter((r) => account.watchedRepoIds.includes(r.id))
        : repos

    if (onlyIds && targets.length === 0) {
      throw new Error('未找到要同步的仓库，请先刷新仓库列表')
    }

    const newCommits: StoredCommit[] = []
    for (const repo of targets) {
      try {
        const branch =
          account.repoBranches[repo.id] ||
          repo.defaultBranch ||
          account.defaultBranch ||
          'master'
        const state = db.getSyncState(accountId, repo.id)
        const lookbackDays = getSyncLookbackDays()
        const fullFromMs = Date.now() - lookbackDays * DAY_MS
        const needBackfill = !state?.lastSyncedAt || lookbackDays > (state.lookbackDays ?? 0)
        const lastMs = state?.lastSyncedAt ? Date.parse(state.lastSyncedAt) : NaN
        const sinceMs = needBackfill
          ? fullFromMs
          : Number.isFinite(lastMs)
            ? lastMs - INCREMENTAL_OVERLAP_MS
            : fullFromMs
        const since = toApiTime(new Date(sinceMs).toISOString())

        const { commits, capped, pages } = await provider.listCommitsSince(
          account,
          token,
          repo.id,
          { ref: branch, since }
        )
        fetched += commits.length
        if (capped) {
          truncated++
          const msg =
            `仓库 ${shortRepoPath(repo.fullName || repo.name, account.organizationId)}: ` +
            `提交过多，本次只取到 ${commits.length} 条（${pages} 页上限），更早的提交可能未同步`
          db.addSyncLog({
            id: uuid(),
            accountId,
            at: new Date().toISOString(),
            level: 'warn',
            message: msg
          })
        }

        const now = new Date().toISOString()
        const batch: StoredCommit[] = []
        for (const c of commits) {
          if (!matchAuthor(account, c.authorName, c.authorEmail)) continue
          matched++
          batch.push({
            id: uuid(),
            accountId,
            repoId: repo.id,
            repoName: shortRepoPath(repo.fullName || repo.name, account.organizationId),
            sha: c.sha,
            shortId: c.shortId,
            title: c.title,
            message: c.message,
            authorName: c.authorName,
            authorEmail: c.authorEmail,
            committedAt: c.committedAt || c.authoredAt,
            webUrl: c.webUrl,
            syncedAt: now,
            ...(c.additions != null ? { additions: c.additions } : {}),
            ...(c.deletions != null ? { deletions: c.deletions } : {}),
            ...(c.filesChanged != null ? { filesChanged: c.filesChanged } : {})
          })
        }

        // GitHub / Codeup 列表常无 stats：对本批缺汇总的提交限并发补拉
        if (
          (account.provider === 'github' || account.provider === 'codeup') &&
          batch.length > 0
        ) {
          const onWarn = (message: string) => {
            db.addSyncLog({
              id: uuid(),
              accountId,
              at: new Date().toISOString(),
              level: 'warn',
              message: `${shortRepoPath(repo.fullName || repo.name, account.organizationId)}: ${message}`
            })
          }
          statsFilled += await fillCommitStats(account, token, repo.id, batch, onWarn)
        }

        newCommits.push(...batch)
        db.setSyncState({
          accountId,
          repoId: repo.id,
          lastSyncedAt: now,
          lookbackDays
        })
      } catch (e: any) {
        const msg = `仓库 ${shortRepoPath(repo.fullName || repo.name, account.organizationId)}: ${e?.message || e}`
        errors.push(msg)
        db.addSyncLog({
          id: uuid(),
          accountId,
          at: new Date().toISOString(),
          level: 'error',
          message: msg
        })
      }
    }

    inserted = db.insertCommits(newCommits)
    writeDailyExports(accountId, newCommits)

    // 增量同步碰不到的历史提交：按新→旧回填缺 stats 记录
    if (account.provider === 'github' || account.provider === 'codeup') {
      const pending = db.listCommitsMissingStats(accountId, STATS_BACKFILL_PER_SYNC)
      if (pending.length > 0) {
        const byRepo = new Map<string, StoredCommit[]>()
        for (const c of pending) {
          if (!byRepo.has(c.repoId)) byRepo.set(c.repoId, [])
          byRepo.get(c.repoId)!.push(c)
        }
        const onWarn = (message: string) => {
          db.addSyncLog({
            id: uuid(),
            accountId,
            at: new Date().toISOString(),
            level: 'warn',
            message
          })
        }
        for (const [repoId, list] of byRepo) {
          try {
            statsFilled += await fillCommitStats(account, token, repoId, list, onWarn)
          } catch (e: any) {
            onWarn(`回填 stats 失败（repo ${repoId}）: ${e?.message || e}`)
          }
        }
        db.insertCommits(pending)
      }
    }

    db.addSyncLog({
      id: uuid(),
      accountId,
      at: new Date().toISOString(),
      level: errors.length || truncated ? 'warn' : 'info',
      message:
        `同步完成：拉取 ${fetched}（匹配作者 ${matched}），新增 ${inserted}` +
        `${statsFilled ? `，补全变更统计 ${statsFilled}` : ''}` +
        `${truncated ? `，${truncated} 个仓库触及分页上限` : ''}` +
        `${errors.length ? `，失败 ${errors.length}` : ''}`
    })

    return { accountId, fetched, inserted, errors, truncated }
  } catch (e: any) {
    const msg = e?.message || String(e)
    errors.push(msg)
    db.addSyncLog({
      id: uuid(),
      accountId,
      at: new Date().toISOString(),
      level: 'error',
      message: msg
    })
    return { accountId, fetched, inserted, errors }
  } finally {
    syncing.delete(accountId)
  }
}

export function scheduleAccount(accountId: string): void {
  clearAccountSchedule(accountId)
  if (!getAccount(accountId)) return
  const ms = getSyncIntervalMinutes() * 60 * 1000
  const timer = setInterval(() => {
    void syncAccount(accountId)
  }, ms)
  timers.set(accountId, timer)
}

export function clearAccountSchedule(accountId: string): void {
  const t = timers.get(accountId)
  if (t) clearInterval(t)
  timers.delete(accountId)
}

export function rescheduleAll(): void {
  for (const id of [...timers.keys()]) clearAccountSchedule(id)
  for (const a of listAccounts()) scheduleAccount(a.id)
}

export function stopAllSchedules(): void {
  for (const id of [...timers.keys()]) clearAccountSchedule(id)
}
