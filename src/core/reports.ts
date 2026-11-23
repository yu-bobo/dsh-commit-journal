import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import dayjs from 'dayjs'
import type { ReportGroupBy, ReportRequest, ReportResult, StoredCommit } from './types.js'
import { getAccount } from './accounts.js'
import { resolveStatutoryWorkdays, resolveWorkdayAttendance } from './cnWorkdays.js'
import { db } from './db.js'
import { reportsDir } from './paths.js'
import { rangeFor } from './reportRange.js'
import { filterReportCommits } from './reportFilter.js'
import {
  buildAttendanceMarkdown,
  buildGroupedCommitMarkdown,
  buildReportHeader
} from './reportMarkdown.js'
import {
  getReportExcludeAuthors,
  getReportExcludeMerge,
  getReportExcludeTypes,
  getReportGroupBy
} from './settings.js'

function countByLocalDay(commits: StoredCommit[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const c of commits) {
    const day = dayjs(c.committedAt).format('YYYY-MM-DD')
    map.set(day, (map.get(day) || 0) + 1)
  }
  return map
}

function resolveGroupBy(groupBy?: ReportGroupBy): ReportGroupBy {
  if (groupBy === 'day' || groupBy === 'flat' || groupBy === 'repo' || groupBy === 'ticket') {
    return groupBy
  }
  return getReportGroupBy()
}

function sectionTitleFor(groupBy: ReportGroupBy): string {
  if (groupBy === 'day') return '## 按日'
  if (groupBy === 'flat') return '## 提交列表'
  if (groupBy === 'ticket') return '## 工作单元'
  return '## 按仓库'
}

function buildTemplateMarkdown(opts: {
  title: string
  accountName: string
  kept: StoredCommit[]
  rawCount: number
  excluded: { merge: number; type: number; author: number }
  groupBy: ReportGroupBy
  statutoryWorkdays?: number
  attendanceMarkdown?: string
}): string {
  const lines: string[] = []
  lines.push(
    buildReportHeader(opts.title, opts.accountName, {
      commitCount: opts.kept.length,
      rawCommitCount: opts.rawCount,
      excluded: opts.excluded,
      statutoryWorkdays: opts.statutoryWorkdays
    })
  )
  lines.push('## 工作摘要（草稿）')
  lines.push('')
  lines.push('> 以下为过滤后的提交材料，可据此改写成汇报用语。')
  lines.push('')
  lines.push(sectionTitleFor(opts.groupBy))
  lines.push('')
  lines.push(buildGroupedCommitMarkdown(opts.kept, opts.groupBy))
  lines.push('')
  if (opts.attendanceMarkdown) {
    lines.push(opts.attendanceMarkdown)
  }
  return lines.join('\n')
}

export async function generateReport(
  req: ReportRequest,
  exportFile = true
): Promise<ReportResult> {
  const account = getAccount(req.accountId)
  if (!account) throw new Error('账号不存在')

  const { from, to, title, fileName } = rangeFor(req.kind, req.date, req.from, req.to)
  const { items } = db.queryCommits({
    accountId: req.accountId,
    from,
    to,
    limit: 5000
  })

  const excludeMerge =
    req.excludeMerge !== undefined ? req.excludeMerge : getReportExcludeMerge()
  const filtered = filterReportCommits(items, {
    excludeMerge,
    excludeTypes: getReportExcludeTypes(),
    excludeAuthors: getReportExcludeAuthors()
  })

  const groupBy = resolveGroupBy(req.groupBy)
  const includeAttendance = req.includeAttendance !== false

  // 出勤对照用原始缓存条数，避免仅 merge 的日子被标成「无提交」
  let statutoryWorkdays = await resolveStatutoryWorkdays(req.kind, req.date)
  let attendanceMarkdown: string | undefined
  if (includeAttendance && (req.kind === 'week' || req.kind === 'month')) {
    const attendance = await resolveWorkdayAttendance(
      req.kind,
      req.date,
      countByLocalDay(items)
    )
    if (attendance) {
      statutoryWorkdays = attendance.statutoryWorkdays
      attendanceMarkdown = buildAttendanceMarkdown(attendance.rows)
    }
  }

  const markdown = buildTemplateMarkdown({
    title,
    accountName: account.name,
    kept: filtered.kept,
    rawCount: filtered.rawCount,
    excluded: filtered.excluded,
    groupBy,
    statutoryWorkdays,
    attendanceMarkdown
  })

  let filePath: string | undefined
  if (exportFile) {
    const dir = join(reportsDir(), req.accountId)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    filePath = join(dir, fileName)
    writeFileSync(filePath, markdown, 'utf8')
  }

  return {
    title,
    markdown,
    filePath,
    commitCount: filtered.kept.length,
    rawCommitCount: filtered.rawCount,
    excluded: filtered.excluded,
    statutoryWorkdays
  }
}
