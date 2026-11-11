import type { Account, RepoRef } from '../../core/types.js'
import { vcsFetch } from '../fetch.js'
import type {
  BranchInfo,
  ListCommitsOptions,
  ListCommitsResult,
  RemoteCommit,
  VcsProvider
} from '../types.js'

const MAX_COMMIT_PAGES = 200
const COMMIT_PER_PAGE = 100

// 归一化 API Base：空 → gitlab.com；缺 /api/v4 时自动补
function apiBase(account: Account): string {
  let base = (account.apiBaseUrl || 'https://gitlab.com').replace(/\/$/, '')
  if (!/\/api\/v4$/i.test(base)) {
    base = `${base}/api/v4`
  }
  return base
}

async function request<T>(
  account: Account,
  token: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): Promise<{ data: T; headers: Headers }> {
  const url = new URL(`${apiBase(account)}${path}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === '') continue
      url.searchParams.set(k, String(v))
    }
  }
  const res = await vcsFetch(url.toString(), {
    account,
    headers: {
      'Content-Type': 'application/json',
      'PRIVATE-TOKEN': token
    }
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `GitLab 令牌无效或权限不足（${res.status}）。请确认 PAT 至少具备 read_api / read_repository。` +
          ` 原始信息: ${body || res.statusText}`
      )
    }
    throw new Error(`GitLab API ${res.status}: ${body || res.statusText}`)
  }
  const data = (await res.json()) as T
  return { data, headers: res.headers }
}

function mapRepo(item: any): RepoRef {
  return {
    id: String(item.id),
    name: String(item.name || ''),
    fullName: String(item.path_with_namespace || item.name || ''),
    webUrl: String(item.web_url || ''),
    lastActivityAt: item.last_activity_at || undefined,
    defaultBranch: item.default_branch || undefined,
    visibility: item.visibility != null ? String(item.visibility) : undefined,
    starred: Boolean(item.starred),
    participating: true
  }
}

function mapCommit(item: any): RemoteCommit {
  const id = String(item.id || item.sha || '')
  const message = String(item.message || '')
  const title = String(item.title || message.split('\n').find((l) => l.trim()) || '')
  const committedAt = String(item.committed_date || item.authored_date || '')
  return {
    sha: id,
    shortId: String(item.short_id || id.slice(0, 8)),
    title,
    message: message || title,
    authorName: String(item.author_name || ''),
    authorEmail: String(item.author_email || ''),
    authoredAt: String(item.authored_date || committedAt || ''),
    committedAt,
    webUrl: String(item.web_url || '')
  }
}

function projectsPath(account: Account): string {
  const group = account.organizationId?.trim()
  if (group) {
    return `/groups/${encodeURIComponent(group)}/projects`
  }
  return '/projects'
}

function projectsQuery(account: Account, page: number, perPage: number) {
  const group = account.organizationId?.trim()
  const base: Record<string, string | number | boolean | undefined> = {
    page,
    per_page: perPage,
    order_by: 'last_activity_at',
    sort: 'desc',
    archived: false
  }
  if (!group) {
    base.membership = true
  }
  return base
}

/**
 * GitLab（含自建）VCS 适配器
 */
export const gitlabProvider: VcsProvider = {
  id: 'gitlab',

  async testConnection(account, token) {
    const { data, headers } = await request<any[]>(
      account,
      token,
      projectsPath(account),
      projectsQuery(account, 1, 1)
    )
    const total = Number(headers.get('x-total') || (Array.isArray(data) ? data.length : 0))
    return { repoCount: total }
  },

  async listRepos(account, token) {
    const all: RepoRef[] = []
    let page = 1
    const perPage = 100
    while (true) {
      const { data, headers } = await request<any[]>(
        account,
        token,
        projectsPath(account),
        projectsQuery(account, page, perPage)
      )
      const rows = Array.isArray(data) ? data : []
      for (const item of rows) all.push(mapRepo(item))
      const totalPages = Number(headers.get('x-total-pages') || 1)
      if (page >= totalPages || rows.length === 0) break
      page++
      if (page > 100) break
    }
    return all
  },

  async listBranches(account, token, repoId, search) {
    const all: BranchInfo[] = []
    let page = 1
    const perPage = 100
    while (true) {
      const { data, headers } = await request<any[]>(
        account,
        token,
        `/projects/${encodeURIComponent(repoId)}/repository/branches`,
        {
          page,
          per_page: perPage,
          search: search || undefined
        }
      )
      const rows = Array.isArray(data) ? data : []
      for (const item of rows) {
        const name = String(item.name || '')
        if (!name) continue
        all.push({
          name,
          defaultBranch: Boolean(item.default),
          protected: Boolean(item.protected)
        })
      }
      const totalPages = Number(headers.get('x-total-pages') || 1)
      if (page >= totalPages || rows.length === 0) break
      page++
      if (page > 20) break
    }
    return all
  },

  async listCommitsSince(
    account,
    token,
    repoId,
    opts: ListCommitsOptions
  ): Promise<ListCommitsResult> {
    const all: RemoteCommit[] = []
    const seen = new Set<string>()
    const maxPages = Math.max(1, opts.maxPages ?? MAX_COMMIT_PAGES)
    let pages = 0
    let capped = false
    let page = 1

    while (true) {
      if (pages >= maxPages) {
        capped = true
        break
      }
      const { data, headers } = await request<any[]>(
        account,
        token,
        `/projects/${encodeURIComponent(repoId)}/repository/commits`,
        {
          ref_name: opts.ref,
          since: opts.since,
          page,
          per_page: COMMIT_PER_PAGE
        }
      )
      pages++
      const rows = Array.isArray(data) ? data : []
      if (rows.length === 0) break

      for (const item of rows) {
        const mapped = mapCommit(item)
        if (!mapped.sha || seen.has(mapped.sha)) continue
        seen.add(mapped.sha)
        all.push(mapped)
      }

      const nextPage = headers.get('x-next-page')
      if (!nextPage) break
      page = Number(nextPage)
      if (!Number.isFinite(page) || page <= 0) break
    }

    return { commits: all, capped, pages }
  }
}
