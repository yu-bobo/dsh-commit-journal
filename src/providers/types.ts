import type { Account, RepoRef, VcsProviderId } from '../core/types.js'

export interface RemoteCommit {
  sha: string
  shortId: string
  title: string
  message: string
  authorName: string
  authorEmail: string
  authoredAt: string
  committedAt: string
  webUrl: string
}

export interface BranchInfo {
  name: string
  defaultBranch?: boolean
  protected?: boolean
}

export interface ListCommitsOptions {
  ref: string
  since?: string
  maxPages?: number
}

export interface ListCommitsResult {
  commits: RemoteCommit[]
  capped: boolean
  pages: number
}

export interface VcsProvider {
  readonly id: VcsProviderId
  testConnection(account: Account, token: string): Promise<{ repoCount: number }>
  listRepos(account: Account, token: string): Promise<RepoRef[]>
  listBranches(
    account: Account,
    token: string,
    repoId: string,
    search?: string
  ): Promise<BranchInfo[]>
  listCommitsSince(
    account: Account,
    token: string,
    repoId: string,
    opts: ListCommitsOptions
  ): Promise<ListCommitsResult>
}
