import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { ReportRequest, ReportResult, StoredCommit } from './types.js'
import { getAccount } from './accounts.js'
import { resolveStatutoryWorkdays } from './cnWorkdays.js'
import { db } from './db.js'
import { reportsDir } from './paths.js'
import { rangeFor } from './reportRange.js'
import { buildCommitDetailsMarkdown, buildReportHeader } from './reportMarkdown.js'

function buildTemplateMarkdown(
  title: string,
  accountName: string,
  commits: StoredCommit[],
  statutoryWorkdays?: number
): string {
  const titleLine =
    statutoryWorkdays != null
      ? `${title} · ${commits.length} 条 · 法定工作日：${statutoryWorkdays} 天`
      : title
  const lines: string[] = []
  lines.push(buildReportHeader(titleLine, accountName, commits.length))
  lines.push('## 工作摘要（草稿）')
  lines.push('')
  lines.push('> 以下按项目列出完整提交说明，可据此改写成汇报用语。')
  lines.push('')
  lines.push(buildCommitDetailsMarkdown(commits))
  lines.push('')
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

  const statutoryWorkdays = await resolveStatutoryWorkdays(req.kind, req.date)
  const markdown = buildTemplateMarkdown(title, account.name, items, statutoryWorkdays)
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
    commitCount: items.length,
    statutoryWorkdays
  }
}
