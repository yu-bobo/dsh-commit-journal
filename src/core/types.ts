export type VcsProviderId = 'codeup' | 'gitlab' | 'github' | 'local'

export type OrgEdition = 'central' | 'region'

// remote = Codeup / GitLab / GitHub API；local = 扫描本机 git 根目录
export type AccountMode = 'local' | 'remote'

export interface Account {
  id: string
  name: string
  mode: AccountMode
  provider: VcsProviderId
  // Codeup: central | region（GitLab / GitHub 忽略）
  edition?: OrgEdition
  // Codeup central organization id；GitHub 可选 org login；GitLab 可选 group path/id
  organizationId?: string
  // Codeup region / 自建 GitLab / GHE API base（GitHub.com / gitlab.com 可留空）
  apiBaseUrl?: string
  // local 模式：扫描根目录（绝对或可解析路径）
  localRoots?: string[]
  // 跳过 TLS 证书校验（公司代理 / 自签证书）；也可用环境变量 DSH_COMMIT_JOURNAL_TLS_INSECURE=1
  insecureSsl?: boolean
  // Author filter (email or name, compared lowercased)
  authorFilters: string[]
  defaultBranch: string
  // Empty = sync all visible repos
  watchedRepoIds: string[]
  // repoId -> branch override
  repoBranches: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface AccountInput {
  name: string
  mode?: AccountMode
  provider?: VcsProviderId
  edition?: OrgEdition
  organizationId?: string
  apiBaseUrl?: string
  localRoots?: string[]
  insecureSsl?: boolean
  // remote 必填；local 可省略
  token?: string
  authorFilters?: string[]
  defaultBranch?: string
  watchedRepoIds?: string[]
  repoBranches?: Record<string, string>
}

export interface AccountUpdate extends Partial<AccountInput> {
  id: string
}

export interface RepoRef {
  id: string
  name: string
  fullName: string
  webUrl: string
  lastActivityAt?: string
  defaultBranch?: string
  accessLevel?: number
  visibility?: string
  starred?: boolean
  participating?: boolean
}

export interface StoredCommit {
  id: string
  accountId: string
  repoId: string
  repoName: string
  sha: string
  shortId: string
  title: string
  message: string
  authorName: string
  authorEmail: string
  committedAt: string
  webUrl: string
  syncedAt: string
  // 变更汇总；同步时写入，旧数据可缺
  additions?: number
  deletions?: number
  filesChanged?: number
}

export interface SyncState {
  accountId: string
  repoId: string
  lastSyncedAt: string
  lookbackDays?: number
}

export interface SyncLog {
  id: string
  accountId: string
  at: string
  level: 'info' | 'warn' | 'error'
  message: string
}

export interface SyncResult {
  accountId: string
  fetched: number
  inserted: number
  errors: string[]
  truncated?: number
}

export type ReportKind = 'day' | 'week' | 'month' | 'custom'

// repo = 按仓库（默认）；day = 按日再按仓库；flat = 流水；ticket = 按工单（可选增强）
export type ReportGroupBy = 'repo' | 'day' | 'flat' | 'ticket'

export interface ReportRequest {
  accountId: string
  kind: ReportKind
  date?: string
  from?: string
  to?: string
  groupBy?: ReportGroupBy
  // 覆盖设置；省略则用 settings.reportExcludeMerge（默认 true）
  excludeMerge?: boolean
  // 周/月报是否附出勤对照；默认 true
  includeAttendance?: boolean
}

export interface ReportExclusionStats {
  merge: number
  type: number
  author: number
}

export interface ReportResult {
  title: string
  markdown: string
  filePath?: string
  commitCount: number
  rawCommitCount?: number
  excluded?: ReportExclusionStats
  statutoryWorkdays?: number
}

export interface ActivityDay {
  date: string
  count: number
  // 当日有 stats 的提交合计；全无则省略
  additions?: number
  deletions?: number
  filesChanged?: number
}

export interface ActivityStats {
  totalCommits: number
  activeDays: number
  longestStreak: number
  maxDayCount: number
  maxDayDate: string | null
  // 区间内增删行合计（仅统计有值的提交）
  totalAdditions: number
  totalDeletions: number
  totalFilesChanged: number
  commitsWithStats: number
}

export interface ActivityData {
  years: number[]
  from: string
  to: string
  days: ActivityDay[]
  stats: ActivityStats
}

export interface AppSettings {
  exportsPath: string
  syncIntervalMinutes: number
  syncLookbackDays: number
  uiPort: number
  // 报告默认排除 merge；缺省视为 true
  reportExcludeMerge?: boolean
  // conventional type 黑名单（如 chore、ci）；默认空
  reportExcludeTypes?: string[]
  // 作者名/邮箱子串黑名单；默认空
  reportExcludeAuthors?: string[]
  // 报告默认分组；缺省 repo。ticket 为可选增强
  reportGroupBy?: ReportGroupBy
}

export const DEFAULT_SYNC_INTERVAL_MINUTES = 30
export const DEFAULT_SYNC_LOOKBACK_DAYS = 90
export const DEFAULT_UI_PORT = 39282
export const DEFAULT_REPORT_EXCLUDE_MERGE = true
export const DEFAULT_REPORT_GROUP_BY: ReportGroupBy = 'repo'

// 成就档位：single 仅用于无分级徽章
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'single'

export interface AchievementUnlock {
  accountId: string
  achievementId: string
  tier: AchievementTier
  unlockedAt: string
}

export interface AchievementTierView {
  tier: AchievementTier
  threshold: number
  unlocked: boolean
  unlockedAt?: string
}

export interface AchievementView {
  id: string
  nameZh: string
  nameEn: string
  descriptionZh: string
  descriptionEn: string
  // 对应 assets/achievements/{id}.png
  icon: string
  tiers: AchievementTierView[]
  current: number
  highestTier: AchievementTier | null
}
