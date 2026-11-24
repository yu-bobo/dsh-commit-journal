import type { StoredCommit } from './types.js'

export interface DiffStatsSum {
  additions: number
  deletions: number
  filesChanged: number
  withStats: number
}

/**
 * 汇总有增删行数据的提交
 */
export function sumCommitDiffStats(commits: StoredCommit[]): DiffStatsSum {
  let additions = 0
  let deletions = 0
  let filesChanged = 0
  let withStats = 0
  let withFiles = 0
  for (const c of commits) {
    if (c.additions == null && c.deletions == null) continue
    withStats++
    additions += c.additions ?? 0
    deletions += c.deletions ?? 0
    if (c.filesChanged != null) {
      withFiles++
      filesChanged += c.filesChanged
    }
  }
  return {
    additions,
    deletions,
    filesChanged: withFiles ? filesChanged : 0,
    withStats
  }
}

/**
 * 单条提交的 `+a −d` / `· n files` 文案；无数据返回空串
 */
export function formatCommitDiffStats(c: Pick<StoredCommit, 'additions' | 'deletions' | 'filesChanged'>): string {
  if (c.additions == null && c.deletions == null) return ''
  const a = c.additions ?? 0
  const d = c.deletions ?? 0
  let s = `+${a} −${d}`
  if (c.filesChanged != null) s += ` · ${c.filesChanged} files`
  return s
}

/**
 * 区间合计文案（仅当至少一条有 stats）
 */
export function formatDiffStatsSum(sum: DiffStatsSum): string {
  if (!sum.withStats) return ''
  let s = `+${sum.additions} / −${sum.deletions}`
  if (sum.filesChanged > 0) s += ` · ${sum.filesChanged} files`
  return s
}
