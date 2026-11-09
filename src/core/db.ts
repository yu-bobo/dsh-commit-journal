import { existsSync, readFileSync, writeFileSync } from 'fs'
import dayjs, { type Dayjs } from 'dayjs'
import { dbPath } from './paths.js'
import type {
  ActivityData,
  ActivityDay,
  RepoRef,
  StoredCommit,
  SyncLog,
  SyncState
} from './types.js'

export interface RepoRecord extends RepoRef {
  accountId: string
}

interface DbData {
  repos: RepoRecord[]
  commits: StoredCommit[]
  syncState: SyncState[]
  syncLogs: SyncLog[]
}

const empty: DbData = {
  repos: [],
  commits: [],
  syncState: [],
  syncLogs: []
}

function migrateCommit(raw: any): StoredCommit {
  return {
    ...raw,
    repoId: String(raw.repoId)
  }
}

function migrateRepo(raw: any): RepoRecord {
  return {
    accountId: String(raw.accountId),
    id: String(raw.id),
    name: String(raw.name || ''),
    fullName: String(raw.fullName || raw.pathWithNamespace || raw.name || ''),
    webUrl: String(raw.webUrl || ''),
    lastActivityAt: raw.lastActivityAt,
    defaultBranch: raw.defaultBranch,
    accessLevel: raw.accessLevel,
    visibility: raw.visibility,
    starred: raw.starred,
    participating: raw.participating
  }
}

function migrateSyncState(raw: any): SyncState {
  return {
    accountId: String(raw.accountId),
    repoId: String(raw.repoId),
    lastSyncedAt: String(raw.lastSyncedAt || ''),
    lookbackDays: raw.lookbackDays
  }
}

function load(): DbData {
  const path = dbPath()
  if (!existsSync(path)) return structuredClone(empty)
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    return {
      repos: (raw.repos || []).map(migrateRepo),
      commits: (raw.commits || []).map(migrateCommit),
      syncState: (raw.syncState || []).map(migrateSyncState),
      syncLogs: raw.syncLogs || []
    }
  } catch {
    return structuredClone(empty)
  }
}

function save(data: DbData): void {
  writeFileSync(dbPath(), JSON.stringify(data, null, 2), 'utf8')
}

const ACTIVITY_MAX_YEARS = 8

function mondayOf(d: Dayjs): Dayjs {
  return d.subtract((d.day() + 6) % 7, 'day')
}

function resolveActivityRange(year?: number): { from: Dayjs; to: Dayjs } {
  const today = dayjs().startOf('day')
  if (year != null && Number.isFinite(year)) {
    const start = dayjs(`${year}-01-01`).startOf('day')
    const end = dayjs(`${year}-12-31`).endOf('day')
    return { from: start, to: end.isAfter(today) ? today : end }
  }
  return { from: mondayOf(today).subtract(52, 'week'), to: today }
}

export const db = {
  upsertRepos(accountId: string, repos: RepoRef[]): void {
    const data = load()
    const others = data.repos.filter((r) => r.accountId !== accountId)
    data.repos = [...others, ...repos.map((r) => ({ ...r, accountId }))]
    save(data)
  },

  listRepos(accountId: string): RepoRecord[] {
    return load().repos.filter((r) => r.accountId === accountId)
  },

  listReposWithCommits(accountId: string): RepoRecord[] {
    const data = load()
    const nameById = new Map<string, string>()
    for (const c of data.commits) {
      if (c.accountId !== accountId) continue
      if (!nameById.has(c.repoId)) nameById.set(c.repoId, c.repoName)
    }
    if (nameById.size === 0) return []
    const byId = new Map(
      data.repos.filter((r) => r.accountId === accountId).map((r) => [r.id, r])
    )
    const list: RepoRecord[] = []
    for (const [id, repoName] of nameById) {
      const existing = byId.get(id)
      if (existing) list.push(existing)
      else {
        list.push({
          accountId,
          id,
          name: repoName,
          fullName: repoName,
          webUrl: ''
        })
      }
    }
    list.sort((a, b) => (a.fullName || a.name).localeCompare(b.fullName || b.name))
    return list
  },

  getSyncState(accountId: string, repoId: string): SyncState | undefined {
    return load().syncState.find((s) => s.accountId === accountId && s.repoId === repoId)
  },

  setSyncState(state: SyncState): void {
    const data = load()
    const idx = data.syncState.findIndex(
      (s) => s.accountId === state.accountId && s.repoId === state.repoId
    )
    if (idx >= 0) data.syncState[idx] = state
    else data.syncState.push(state)
    save(data)
  },

  insertCommits(commits: StoredCommit[]): number {
    if (commits.length === 0) return 0
    const data = load()
    const index = new Map(data.commits.map((c, i) => [`${c.accountId}:${c.sha}`, i]))
    let inserted = 0
    let updated = 0
    for (const c of commits) {
      const key = `${c.accountId}:${c.sha}`
      const idx = index.get(key)
      if (idx == null) {
        data.commits.push(c)
        index.set(key, data.commits.length - 1)
        inserted++
        continue
      }
      const prev = data.commits[idx]
      const nextMsg = (c.message || '').trim()
      const prevMsg = (prev.message || '').trim()
      if (nextMsg && nextMsg.length > prevMsg.length) {
        data.commits[idx] = {
          ...prev,
          title: c.title || prev.title,
          message: nextMsg,
          webUrl: c.webUrl || prev.webUrl,
          syncedAt: c.syncedAt || prev.syncedAt
        }
        updated++
      }
    }
    if (inserted > 0 || updated > 0) save(data)
    return inserted
  },

  queryCommits(opts: {
    accountId: string
    repoId?: string
    from?: string
    to?: string
    keyword?: string
    limit?: number
    offset?: number
  }): { items: StoredCommit[]; total: number } {
    let items = load().commits.filter((c) => c.accountId === opts.accountId)
    if (opts.repoId != null) items = items.filter((c) => c.repoId === opts.repoId)
    if (opts.from) {
      const from = opts.from
      items = items.filter((c) => c.committedAt >= from)
    }
    if (opts.to) {
      const to =
        opts.to.endsWith('Z') || opts.to.includes('T')
          ? opts.to
          : `${opts.to}T23:59:59.999Z`
      items = items.filter((c) => c.committedAt <= to)
    }
    if (opts.keyword) {
      const kw = opts.keyword.toLowerCase()
      items = items.filter(
        (c) =>
          c.title.toLowerCase().includes(kw) ||
          c.message.toLowerCase().includes(kw) ||
          c.repoName.toLowerCase().includes(kw)
      )
    }
    items.sort((a, b) => b.committedAt.localeCompare(a.committedAt))
    const total = items.length
    const offset = opts.offset ?? 0
    const limit = opts.limit ?? 200
    return { items: items.slice(offset, offset + limit), total }
  },

  getActivity(accountId: string, year?: number): ActivityData {
    const data = load()
    const { from, to } = resolveActivityRange(year)
    const today = dayjs().startOf('day')
    const yearSet = new Set<number>([today.year()])
    const byDay = new Map<string, number>()

    for (const c of data.commits) {
      if (c.accountId !== accountId) continue
      const at = dayjs(c.committedAt)
      if (!at.isValid()) continue
      yearSet.add(at.year())
      if (at.isBefore(from, 'day') || at.isAfter(to, 'day')) continue
      const key = at.format('YYYY-MM-DD')
      byDay.set(key, (byDay.get(key) ?? 0) + 1)
    }

    const days: ActivityDay[] = Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    let longestStreak = 0
    let streak = 0
    let maxDayCount = 0
    let maxDayDate: string | null = null
    for (let cur = from, guard = 0; !cur.isAfter(to, 'day') && guard < 1000; guard++) {
      const count = byDay.get(cur.format('YYYY-MM-DD')) ?? 0
      if (count > 0) {
        streak++
        if (streak > longestStreak) longestStreak = streak
        if (count > maxDayCount) {
          maxDayCount = count
          maxDayDate = cur.format('YYYY-MM-DD')
        }
      } else {
        streak = 0
      }
      cur = cur.add(1, 'day')
    }

    const years = Array.from(yearSet)
      .sort((a, b) => b - a)
      .slice(0, ACTIVITY_MAX_YEARS)

    return {
      years,
      from: from.format('YYYY-MM-DD'),
      to: to.format('YYYY-MM-DD'),
      days,
      stats: {
        totalCommits: days.reduce((sum, d) => sum + d.count, 0),
        activeDays: days.length,
        longestStreak,
        maxDayCount,
        maxDayDate
      }
    }
  },

  listDayCommits(accountId: string, date: string): StoredCommit[] {
    const target = dayjs(date)
    if (!target.isValid()) return []
    const key = target.format('YYYY-MM-DD')
    return load()
      .commits.filter(
        (c) => c.accountId === accountId && dayjs(c.committedAt).format('YYYY-MM-DD') === key
      )
      .sort((a, b) => b.committedAt.localeCompare(a.committedAt))
  },

  addSyncLog(log: SyncLog): void {
    const data = load()
    data.syncLogs.unshift(log)
    data.syncLogs = data.syncLogs.slice(0, 500)
    save(data)
  },

  listSyncLogs(
    accountId: string,
    limit = 20,
    offset = 0
  ): { items: SyncLog[]; total: number } {
    const all = load().syncLogs.filter((l) => l.accountId === accountId)
    return { items: all.slice(offset, offset + limit), total: all.length }
  },

  deleteAccountData(accountId: string): void {
    const data = load()
    data.repos = data.repos.filter((r) => r.accountId !== accountId)
    data.commits = data.commits.filter((c) => c.accountId !== accountId)
    data.syncState = data.syncState.filter((s) => s.accountId !== accountId)
    data.syncLogs = data.syncLogs.filter((l) => l.accountId !== accountId)
    save(data)
  },

  clearCommits(accountId: string, repoId?: string): { deletedCommits: number } {
    const data = load()
    const before = data.commits.length
    if (repoId != null) {
      data.commits = data.commits.filter(
        (c) => !(c.accountId === accountId && c.repoId === repoId)
      )
      data.syncState = data.syncState.filter(
        (s) => !(s.accountId === accountId && s.repoId === repoId)
      )
    } else {
      data.commits = data.commits.filter((c) => c.accountId !== accountId)
      data.syncState = data.syncState.filter((s) => s.accountId !== accountId)
    }
    const deletedCommits = before - data.commits.length
    save(data)
    return { deletedCommits }
  }
}
