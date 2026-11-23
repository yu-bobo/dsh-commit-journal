import dayjs from 'dayjs'
import type { ReportExclusionStats, ReportGroupBy, StoredCommit } from './types.js'
import type { WorkdayAttendanceRow } from './cnWorkdays.js'
import { commitFullText, commitTitleLine } from './commitText.js'
import { formatExclusionSummary } from './reportFilter.js'

const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六']

export function buildReportHeader(
  title: string,
  accountName: string,
  opts: {
    commitCount: number
    rawCommitCount?: number
    excluded?: ReportExclusionStats
    statutoryWorkdays?: number
  }
): string {
  const lines: string[] = [`# ${title}`, '', `- 账号：${accountName}`]
  const raw = opts.rawCommitCount
  if (raw != null && raw !== opts.commitCount) {
    const excl = opts.excluded ? formatExclusionSummary(opts.excluded) : ''
    lines.push(
      excl
        ? `- 提交：原始 ${raw} → 纳入 ${opts.commitCount}（排除 ${excl}）`
        : `- 提交：原始 ${raw} → 纳入 ${opts.commitCount}`
    )
  } else {
    lines.push(`- 提交数：${opts.commitCount}`)
  }
  if (opts.statutoryWorkdays != null) {
    lines.push(`- 法定工作日：${opts.statutoryWorkdays} 天`)
  }
  lines.push(`- 生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, '')
  return lines.join('\n')
}

function pushCommitDetail(lines: string[], c: StoredCommit, timeFmt = 'MM-DD HH:mm'): void {
  const time = dayjs(c.committedAt).format(timeFmt)
  const text = commitFullText(c)
  const [first, ...rest] = text.split('\n')
  lines.push(`- [${time}] ${first}`)
  for (const line of rest) lines.push(`  ${line}`)
}

function groupByRepo(commits: StoredCommit[]): [string, StoredCommit[]][] {
  const byRepo = new Map<string, StoredCommit[]>()
  for (const c of commits) {
    if (!byRepo.has(c.repoName)) byRepo.set(c.repoName, [])
    byRepo.get(c.repoName)!.push(c)
  }
  return Array.from(byRepo.entries()).sort((a, b) => a[0].localeCompare(b[0]))
}

/**
 * 按仓库列出完整提交说明
 */
export function buildCommitDetailsMarkdown(commits: StoredCommit[]): string {
  const lines: string[] = []
  for (const [repo, list] of groupByRepo(commits)) {
    lines.push(`### ${repo}`, '')
    for (const c of list) pushCommitDetail(lines, c)
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

/**
 * 按仓库仅列提交首行
 */
export function buildCommitSubjectListMarkdown(commits: StoredCommit[]): string {
  const lines: string[] = []
  for (const [repo, list] of groupByRepo(commits)) {
    lines.push(`### ${repo}`, '')
    for (const c of list) {
      const time = dayjs(c.committedAt).format('MM-DD HH:mm')
      lines.push(`- [${time}] ${commitTitleLine(c)}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

/**
 * 扁平时间线（不按仓库分节）
 */
export function buildFlatCommitDetailsMarkdown(commits: StoredCommit[]): string {
  const sorted = [...commits].sort((a, b) => a.committedAt.localeCompare(b.committedAt))
  const lines: string[] = []
  for (const c of sorted) {
    const time = dayjs(c.committedAt).format('MM-DD HH:mm')
    const text = commitFullText(c)
    const [first, ...rest] = text.split('\n')
    lines.push(`- [${time}] **[${c.repoName}]** ${first}`)
    for (const line of rest) lines.push(`  ${line}`)
  }
  return lines.join('\n').trimEnd()
}

/**
 * 按自然日再按仓库
 */
export function buildDayThenRepoMarkdown(commits: StoredCommit[]): string {
  const byDay = new Map<string, StoredCommit[]>()
  for (const c of commits) {
    const day = dayjs(c.committedAt).format('YYYY-MM-DD')
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(c)
  }
  const days = Array.from(byDay.keys()).sort()
  const lines: string[] = []
  for (const day of days) {
    const wd = WEEKDAY_CN[dayjs(day).day()]
    lines.push(`### ${day}（周${wd}）`, '')
    for (const [repo, list] of groupByRepo(byDay.get(day)!)) {
      lines.push(`#### ${repo}`, '')
      for (const c of list) pushCommitDetail(lines, c, 'HH:mm')
      lines.push('')
    }
  }
  return lines.join('\n').trimEnd()
}

/**
 * 按 groupBy 生成主体 Markdown
 */
export function buildGroupedCommitMarkdown(
  commits: StoredCommit[],
  groupBy: ReportGroupBy
): string {
  if (!commits.length) return '（无提交）'
  if (groupBy === 'flat') return buildFlatCommitDetailsMarkdown(commits)
  if (groupBy === 'day') return buildDayThenRepoMarkdown(commits)
  return buildCommitDetailsMarkdown(commits)
}

/**
 * 法定工作日出勤对照（本地缓存）
 */
export function buildAttendanceMarkdown(rows: WorkdayAttendanceRow[]): string {
  if (!rows.length) return ''
  const lines: string[] = ['## 出勤对照（法定工作日）', '']
  lines.push('> 按本地已同步缓存统计；无提交不等于当天未工作（可能在其它分支/账号）。')
  lines.push('')
  let emptyDays = 0
  for (const row of rows) {
    const wd = WEEKDAY_CN[row.weekday]
    if (row.empty) {
      emptyDays++
      lines.push(`- ${row.date} 周${wd}：本地缓存无提交`)
    } else {
      lines.push(`- ${row.date} 周${wd}：有提交（${row.commitCount}）`)
    }
  }
  lines.push('')
  lines.push(`共 ${rows.length} 个法定工作日，其中 ${emptyDays} 天本地缓存无提交。`)
  lines.push('')
  return lines.join('\n')
}
