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

// 从 apiBase / 个人主页 URL 抽出 login；github.com → 走 api.github.com
function parseGithubComLogin(raw: string): string | undefined {
  const m = raw
    .trim()
    .replace(/\/$/, '')
    .match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/i)
  if (!m) return undefined
  const login = decodeURIComponent(m[1])
  if (!login || /^(settings|orgs|marketplace|explore|topics|about|login|signup)$/i.test(login)) {
    return undefined
  }
  return login
}

// 归一化 API Base：空 / github.com(/user) → api.github.com；GHE 缺 /api/v3 时自动补
function apiBase(account: Account): string {
  const raw = (account.apiBaseUrl || '').trim().replace(/\/$/, '')
  if (!raw) return 'https://api.github.com'
  if (/^(https?:\/\/)?(www\.)?github\.com(\/|$)/i.test(raw)) return 'https://api.github.com'
  if (/api\.github\.com$/i.test(raw)) return 'https://api.github.com'
  if (/\/api\/v3$/i.test(raw)) return raw
  return `${raw}/api/v3`
}

// Organization 字段：支持 org login、user login、或 https://github.com/xxx
function ownerLogin(account: Account): string | undefined {
  const raw = (account.organizationId || '').trim()
  if (!raw) {
    // 有人把个人主页填进 API Base
    return account.apiBaseUrl ? parseGithubComLogin(account.apiBaseUrl) : undefined
  }
  const fromUrl = parseGithubComLogin(raw)
  if (fromUrl) return fromUrl
  return raw.replace(/^@/, '')
}

function parseLinkNext(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  for (const part of linkHeader.split(',')) {
    const m = part.trim().match(/<([^>]+)>\s*;\s*rel="next"/i)
    if (m) return m[1]
  }
  return null
}

async function request<T>(
  account: Account,
  token: string,
  pathOrUrl: string,
  query?: Record<string, string | number | boolean | undefined>
): Promise<{ data: T; headers: Headers; status: number }> {
  const url = pathOrUrl.startsWith('http')
    ? new URL(pathOrUrl)
    : new URL(`${apiBase(account)}${pathOrUrl}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === '') continue
      url.searchParams.set(k, String(v))
    }
  }
  const res = await vcsFetch(url.toString(), {
    account,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `GitHub 令牌无效或权限不足（${res.status}）。请确认 PAT 至少具备 repo（私有仓）或 public_repo 只读权限。` +
          ` 原始信息: ${body || res.statusText}`
      )
    }
    throw new Error(`GitHub API ${res.status}: ${body || res.statusText}`)
  }
  const data = (await res.json()) as T
  return { data, headers: res.headers, status: res.status }
}

async function requestSoft<T>(
  account: Account,
  token: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): Promise<{ data: T; status: number } | null> {
  try {
    const res = await request<T>(account, token, path, query)
    return { data: res.data, status: res.status }
  } catch (e: any) {
    const msg = String(e?.message || e)
    if (/\b404\b/.test(msg)) return null
    throw e
  }
}

function mapRepo(item: any): RepoRef {
  const fullName = String(item.full_name || `${item.owner?.login || ''}/${item.name || ''}`)
  return {
    id: fullName,
    name: String(item.name || ''),
    fullName,
    webUrl: String(item.html_url || ''),
    lastActivityAt: item.pushed_at || item.updated_at || undefined,
    defaultBranch: item.default_branch || undefined,
    visibility: item.private ? 'private' : 'public',
    starred: Boolean(item.starred),
    participating: true
  }
}

function mapCommit(item: any): RemoteCommit {
  const sha = String(item.sha || '')
  const commit = item.commit || {}
  const message = String(commit.message || '')
  const title = message.split('\n').find((l: string) => l.trim()) || ''
  const author = commit.author || {}
  const committer = commit.committer || {}
  const authoredAt = String(author.date || committer.date || '')
  const committedAt = String(committer.date || author.date || '')
  return {
    sha,
    shortId: sha.slice(0, 8),
    title,
    message: message || title,
    authorName: String(author.name || item.author?.login || ''),
    authorEmail: String(author.email || ''),
    authoredAt,
    committedAt,
    webUrl: String(item.html_url || '')
  }
}

async function paginateRepos(
  account: Account,
  token: string,
  firstPath: string,
  query: Record<string, string | number | boolean | undefined>
): Promise<RepoRef[]> {
  const all: RepoRef[] = []
  let nextUrl: string | null = null
  let page = 1
  while (true) {
    const { data, headers } = nextUrl
      ? await request<any[]>(account, token, nextUrl)
      : await request<any[]>(account, token, firstPath, { ...query, page, per_page: 100 })
    const rows = Array.isArray(data) ? data : []
    for (const item of rows) all.push(mapRepo(item))
    nextUrl = parseLinkNext(headers.get('link'))
    if (!nextUrl || rows.length === 0) break
    page++
    if (page > 100) break
  }
  return all
}

// owner 可能是 org 或个人用户：先探 org，404 再走 user repos
async function listReposForOwner(
  account: Account,
  token: string,
  login: string
): Promise<RepoRef[]> {
  const orgHit = await requestSoft<any>(account, token, `/orgs/${encodeURIComponent(login)}`)
  if (orgHit) {
    return paginateRepos(account, token, `/orgs/${encodeURIComponent(login)}/repos`, {
      type: 'all',
      sort: 'pushed',
      direction: 'desc'
    })
  }
  const userHit = await requestSoft<any>(account, token, `/users/${encodeURIComponent(login)}`)
  if (!userHit) {
    throw new Error(
      `GitHub 找不到组织或用户「${login}」。Organization 请填 org login 或个人 login（不要填完整主页 URL 以外的无效路径）；也可留空列出令牌可见的全部仓库。`
    )
  }
  return paginateRepos(account, token, `/users/${encodeURIComponent(login)}/repos`, {
    type: 'all',
    sort: 'pushed',
    direction: 'desc'
  })
}

/**
 * GitHub / GitHub Enterprise VCS 适配器
 */
export const githubProvider: VcsProvider = {
  id: 'github',

  async testConnection(account, token) {
    const login = ownerLogin(account)
    if (login) {
      const orgHit = await requestSoft<any>(account, token, `/orgs/${encodeURIComponent(login)}`)
      if (orgHit) {
        const { data } = await request<any[]>(
          account,
          token,
          `/orgs/${encodeURIComponent(login)}/repos`,
          { per_page: 1, type: 'all' }
        )
        return { repoCount: Array.isArray(data) ? data.length : 0 }
      }
      const userHit = await requestSoft<any>(account, token, `/users/${encodeURIComponent(login)}`)
      if (!userHit) {
        throw new Error(`GitHub 找不到组织或用户「${login}」`)
      }
      const { data } = await request<any[]>(
        account,
        token,
        `/users/${encodeURIComponent(login)}/repos`,
        { per_page: 1, type: 'all' }
      )
      return { repoCount: Array.isArray(data) ? data.length : 0 }
    }
    const { data } = await request<any[]>(account, token, '/user/repos', {
      per_page: 1,
      affiliation: 'owner,collaborator,organization_member'
    })
    return { repoCount: Array.isArray(data) ? data.length : 0 }
  },

  async listRepos(account, token) {
    const login = ownerLogin(account)
    if (login) return listReposForOwner(account, token, login)
    return paginateRepos(account, token, '/user/repos', {
      affiliation: 'owner,collaborator,organization_member',
      sort: 'pushed',
      direction: 'desc'
    })
  },

  async listBranches(account, token, repoId, search) {
    const all: BranchInfo[] = []
    let nextUrl: string | null = null
    let page = 1
    const path = `/repos/${repoId}/branches`
    while (true) {
      const { data, headers } = nextUrl
        ? await request<any[]>(account, token, nextUrl)
        : await request<any[]>(account, token, path, { page, per_page: 100 })
      const rows = Array.isArray(data) ? data : []
      for (const item of rows) {
        const name = String(item.name || '')
        if (!name) continue
        if (search && !name.toLowerCase().includes(search.toLowerCase())) continue
        all.push({
          name,
          protected: Boolean(item.protected)
        })
      }
      nextUrl = parseLinkNext(headers.get('link'))
      if (!nextUrl || rows.length === 0) break
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
    let nextUrl: string | null = null
    let page = 1
    const path = `/repos/${repoId}/commits`

    while (true) {
      if (pages >= maxPages) {
        capped = true
        break
      }
      const { data, headers } = nextUrl
        ? await request<any[]>(account, token, nextUrl)
        : await request<any[]>(account, token, path, {
            sha: opts.ref,
            since: opts.since,
            page,
            per_page: COMMIT_PER_PAGE
          })
      pages++
      const rows = Array.isArray(data) ? data : []
      if (rows.length === 0) break

      for (const item of rows) {
        const mapped = mapCommit(item)
        if (!mapped.sha || seen.has(mapped.sha)) continue
        seen.add(mapped.sha)
        all.push(mapped)
      }

      nextUrl = parseLinkNext(headers.get('link'))
      if (!nextUrl) break
    }

    return { commits: all, capped, pages }
  }
}
