import type { StoredCommit } from './types.js'
import { commitTitleLine } from './commitText.js'

export interface ReportFilterOptions {
  // 默认 true
  excludeMerge?: boolean
  // 小写 type 黑名单，默认空
  excludeTypes?: string[]
  // 作者名/邮箱子串（小写比较），默认空
  excludeAuthors?: string[]
}

export interface ReportFilterStats {
  merge: number
  type: number
  author: number
}

export interface ReportFilterResult {
  kept: StoredCommit[]
  rawCount: number
  excluded: ReportFilterStats
}

// Merge branch / Merge pull request / Merge remote-tracking …
const MERGE_TITLE =
  /^(merge\s+(branch|pull\s+request|remote-tracking)\b|merge\s+[0-9a-f]{7,}\s+into\b)/i

/**
 * 判断是否为合并类提交（仅看标题行）
 */
export function isMergeCommit(commit: StoredCommit): boolean {
  return MERGE_TITLE.test(commitTitleLine(commit))
}

/**
 * 轻量抽出 conventional type（仅供过滤；认不出返回 null）
 */
export function extractCommitType(commit: StoredCommit): string | null {
  const title = commitTitleLine(commit)
  const m = title.match(/^([a-zA-Z]+)(?:\([^)]*\))?(?:!)?:\s/)
  return m ? m[1].toLowerCase() : null
}

/**
 * 报告侧过滤：归组前去掉噪音。默认只排除 merge。
 */
export function filterReportCommits(
  commits: StoredCommit[],
  opts: ReportFilterOptions = {}
): ReportFilterResult {
  const excludeMerge = opts.excludeMerge !== false
  const excludeTypes = (opts.excludeTypes || []).map((t) => t.trim().toLowerCase()).filter(Boolean)
  const excludeAuthors = (opts.excludeAuthors || [])
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
  const typeSet = new Set(excludeTypes)

  const excluded: ReportFilterStats = { merge: 0, type: 0, author: 0 }
  const kept: StoredCommit[] = []

  for (const c of commits) {
    if (excludeMerge && isMergeCommit(c)) {
      excluded.merge++
      continue
    }
    if (typeSet.size > 0) {
      const type = extractCommitType(c)
      if (type && typeSet.has(type)) {
        excluded.type++
        continue
      }
    }
    if (excludeAuthors.length > 0) {
      const hay = `${c.authorName} ${c.authorEmail}`.toLowerCase()
      if (excludeAuthors.some((a) => hay.includes(a))) {
        excluded.author++
        continue
      }
    }
    kept.push(c)
  }

  return { kept, rawCount: commits.length, excluded }
}

/**
 * 报告头用的排除说明
 */
export function formatExclusionSummary(excluded: ReportFilterStats): string {
  const parts: string[] = []
  if (excluded.merge) parts.push(`merge ${excluded.merge}`)
  if (excluded.type) parts.push(`type ${excluded.type}`)
  if (excluded.author) parts.push(`author ${excluded.author}`)
  return parts.length ? parts.join(' / ') : ''
}
