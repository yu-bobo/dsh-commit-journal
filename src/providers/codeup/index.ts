import type { Account, RepoRef } from '../../core/types.js'
import type {
  BranchInfo,
  ListCommitsOptions,
  ListCommitsResult,
  RemoteCommit,
  VcsProvider
} from '../types.js'

function baseUrl(account: Account): string {
  if (account.edition === 'region') {
    if (!account.apiBaseUrl) throw new Error('缺少 API Base URL')
    return account.apiBaseUrl.replace(/\/$/, '')
  }
  return 'https://openapi-rdc.aliyuncs.com'
}

function orgPrefix(account: Account): string {
  if (account.edition === 'central') {
    if (!account.organizationId) throw new Error('缺少 organizationId')
    return `/oapi/v1/codeup/organizations/${account.organizationId}`
  }
  return '/oapi/v1/codeup'
}

async function request<T>(
  account: Account,
  token: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
  options?: { soft?: boolean }
): Promise<{ data: T; headers: Headers }> {
  const url = new URL(`${baseUrl(account)}${orgPrefix(account)}${path}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === '') continue
      url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-yunxiao-token': token
    }
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (options?.soft) {
      throw new Error(
        `${res.status} ${body.includes('no permission') ? 'Forbidden' : res.statusText}`
      )
    }
    if (res.status === 403 || body.includes('no permission')) {
      throw new Error(
        `令牌无 API 权限（403）。请到云效「个人设置 → 个人访问令牌」删除后重建，` +
          `代码管理里至少将「代码仓库」「提交」设为只读；并确认账号选的是中心版还是 Region 版。` +
          ` 原始信息: ${body || res.statusText}`
      )
    }
    throw new Error(`Codeup API ${res.status}: ${body || res.statusText}`)
  }
  const data = (await res.json()) as T
  return { data, headers: res.headers }
}

function mapRepo(item: any, participating?: boolean): RepoRef {
  return {
    id: String(item.id),
    name: String(item.name || ''),
    fullName: String(item.pathWithNamespace || item.path_with_namespace || item.name || ''),
    webUrl: String(item.webUrl || item.web_url || ''),
    lastActivityAt: item.lastActivityAt || item.last_activity_at,
    defaultBranch: item.defaultBranch || item.default_branch,
    accessLevel:
      item.accessLevel != null
        ? Number(item.accessLevel)
        : item.access_level != null
          ? Number(item.access_level)
          : undefined,
    visibility:
      item.visibility != null
        ? String(item.visibility)
        : item.visibility_level != null
          ? Number(item.visibility_level) === 0
            ? 'private'
            : 'internal'
          : undefined,
    starred: Boolean(item.starred || item.star),
    participating
  }
}

function isParticipatingRepoHeuristic(repo: RepoRef): boolean {
  if (repo.participating) return true
  if (repo.starred) return true
  if ((repo.accessLevel ?? 0) >= 20) return true
  if (repo.visibility === 'private') return true
  return false
}

async function listParticipatingIdsFromUserResources(
  account: Account,
  token: string
): Promise<Set<string>> {
  const ids = new Set<string>()
  let page = 1
  const perPage = 20
  while (true) {
    const { data, headers } = await request<any[]>(
      account,
      token,
      '/users/vision/user_resources',
      { page, per_page: perPage },
      { soft: true }
    )
    const rows = Array.isArray(data) ? data : []
    for (const row of rows) {
      for (const item of row?.repository_infos || row?.repositoryInfos || []) {
        const info = item?.repository_info || item?.repositoryInfo || item
        const id = info?.id ?? item?.source_id ?? item?.sourceId
        if (id != null) ids.add(String(id))
      }
    }
    const totalPages = Number(headers.get('x-total-pages') || 1)
    if (page >= totalPages || rows.length === 0) break
    page++
    if (page > 50) break
  }
  return ids
}

async function enrichParticipatingFlags(
  account: Account,
  token: string,
  repos: RepoRef[]
): Promise<void> {
  const ids = new Set<string>()
  try {
    for (const id of await listParticipatingIdsFromUserResources(account, token)) ids.add(id)
  } catch {
    // optional enrichment
  }
  if (ids.size > 0) {
    for (const repo of repos) {
      repo.participating = ids.has(repo.id)
    }
  }
  if (repos.filter((r) => r.participating === true).length === 0) {
    for (const repo of repos) {
      repo.participating = isParticipatingRepoHeuristic(repo)
    }
  }
}

const MAX_COMMIT_PAGES = 200
const MAX_COMMIT_WINDOWS = 20
const COMMIT_PER_PAGE = 100

function apiTime(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function asRows(data: any): any[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.result)) return data.result
  if (Array.isArray(data?.list)) return data.list
  return []
}

/**
 * 云效 Codeup VCS 适配器
 */
export const codeupProvider: VcsProvider = {
  id: 'codeup',

  async testConnection(account, token) {
    const { data, headers } = await request<any[]>(account, token, '/repositories', {
      page: 1,
      perPage: 1,
      archived: false
    })
    const total = Number(headers.get('x-total') || data.length || 0)
    return { repoCount: total }
  },

  async listRepos(account, token) {
    const all: RepoRef[] = []
    let page = 1
    const perPage = 100
    while (true) {
      const { data, headers } = await request<any[]>(account, token, '/repositories', {
        page,
        perPage,
        archived: false,
        orderBy: 'last_activity_at',
        sort: 'desc'
      })
      for (const item of data || []) {
        const mapped = mapRepo(item)
        if ((mapped.accessLevel ?? 0) >= 20) mapped.participating = true
        all.push(mapped)
      }
      const totalPages = Number(headers.get('x-total-pages') || 1)
      if (page >= totalPages || !data?.length) break
      page++
    }
    await enrichParticipatingFlags(account, token, all)
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
        `/repositories/${repoId}/branches`,
        {
          page,
          perPage,
          sort: 'name_asc',
          search: search || undefined
        }
      )
      for (const item of data || []) {
        const name = String(item.name || '')
        if (!name) continue
        all.push({
          name,
          defaultBranch: Boolean(item.defaultBranch),
          protected: Boolean(item.protected)
        })
      }
      const totalPages = Number(headers.get('x-total-pages') || 1)
      if (page >= totalPages || !data?.length) break
      page++
      if (page > 20) break
    }
    return all
  },

  async listCommitsSince(account, token, repoId, opts: ListCommitsOptions): Promise<ListCommitsResult> {
    const all: RemoteCommit[] = []
    const seen = new Set<string>()
    const maxPages = Math.max(1, opts.maxPages ?? MAX_COMMIT_PAGES)
    const since = opts.since
    const sinceMs = since ? Date.parse(since) : NaN
    let pages = 0
    let capped = false
    let until: string | undefined

    for (let window = 0; window < MAX_COMMIT_WINDOWS; window++) {
      let page = 1
      let windowOldestMs = Infinity
      let hitBudget = false

      while (true) {
        if (pages >= maxPages) {
          capped = true
          hitBudget = true
          break
        }
        const { data } = await request<any[]>(
          account,
          token,
          `/repositories/${repoId}/commits`,
          { refName: opts.ref, since, until, page, perPage: COMMIT_PER_PAGE }
        )
        pages++
        const rows = asRows(data)
        if (rows.length === 0) break

        let added = 0
        for (const item of rows) {
          const id = String(item.id || item.sha || '')
          if (!id || seen.has(id)) continue
          seen.add(id)
          added++
          const message = String(item.message || item.commitMessage || '')
          const title = String(item.title || message.split('\n').find((l) => l.trim()) || '')
          const committedDate = String(item.committedDate || item.authoredDate || '')
          const ms = Date.parse(committedDate)
          if (Number.isFinite(ms) && ms < windowOldestMs) windowOldestMs = ms
          all.push({
            sha: id,
            shortId: String(item.shortId || id.slice(0, 8)),
            title,
            message: message || title,
            authorName: String(item.authorName || ''),
            authorEmail: String(item.authorEmail || ''),
            authoredAt: String(item.authoredDate || committedDate || ''),
            committedAt: committedDate,
            webUrl: String(item.webUrl || '')
          })
        }

        if (added === 0) {
          capped = true
          hitBudget = true
          break
        }
        page++
      }

      if (hitBudget) break
      if (!Number.isFinite(sinceMs)) break
      if (!Number.isFinite(windowOldestMs)) break
      if (windowOldestMs <= sinceMs + 1000) break
      until = apiTime(windowOldestMs - 1000)
    }

    return { commits: all, capped, pages }
  }
}
