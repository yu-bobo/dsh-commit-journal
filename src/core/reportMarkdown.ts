import dayjs from 'dayjs'
import type { StoredCommit } from './types.js'
import { commitFullText, commitTitleLine } from './commitText.js'

export function buildReportHeader(
  title: string,
  accountName: string,
  commitCount: number
): string {
  return [
    `# ${title}`,
    '',
    `- 账号：${accountName}`,
    `- 提交数：${commitCount}`,
    `- 生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
    ''
  ].join('\n')
}

export function buildCommitDetailsMarkdown(commits: StoredCommit[]): string {
  const byRepo = new Map<string, StoredCommit[]>()
  for (const c of commits) {
    if (!byRepo.has(c.repoName)) byRepo.set(c.repoName, [])
    byRepo.get(c.repoName)!.push(c)
  }

  const lines: string[] = []
  const repos = Array.from(byRepo.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  for (const [repo, list] of repos) {
    lines.push(`### ${repo}`)
    lines.push('')
    for (const c of list) {
      const time = dayjs(c.committedAt).format('MM-DD HH:mm')
      const text = commitFullText(c)
      const [first, ...rest] = text.split('\n')
      lines.push(`- [${time}] ${first}`)
      for (const line of rest) lines.push(`  ${line}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

export function buildCommitSubjectListMarkdown(commits: StoredCommit[]): string {
  const byRepo = new Map<string, StoredCommit[]>()
  for (const c of commits) {
    if (!byRepo.has(c.repoName)) byRepo.set(c.repoName, [])
    byRepo.get(c.repoName)!.push(c)
  }

  const lines: string[] = []
  const repos = Array.from(byRepo.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  for (const [repo, list] of repos) {
    lines.push(`### ${repo}`)
    lines.push('')
    for (const c of list) {
      const time = dayjs(c.committedAt).format('MM-DD HH:mm')
      lines.push(`- [${time}] ${commitTitleLine(c)}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}
