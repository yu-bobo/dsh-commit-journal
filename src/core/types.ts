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

export interface ReportRequest {
  accountId: string
  kind: ReportKind
  date?: string
  from?: string
  to?: string
}

export interface ReportResult {
  title: string
  markdown: string
  filePath?: string
  commitCount: number
  statutoryWorkdays?: number
}

export interface ActivityDay {
  date: string
  count: number
}

export interface ActivityStats {
  totalCommits: number
  activeDays: number
  longestStreak: number
  maxDayCount: number
  maxDayDate: string | null
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
}

export const DEFAULT_SYNC_INTERVAL_MINUTES = 30
export const DEFAULT_SYNC_LOOKBACK_DAYS = 90
export const DEFAULT_UI_PORT = 39282
