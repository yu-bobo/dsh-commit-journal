import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import {
  createAccount,
  deleteAccount,
  getAccount,
  getAccountToken,
  getActiveAccountId,
  listAccounts,
  setActiveAccountId,
  updateAccount
} from '../core/accounts.js'
import { db } from '../core/db.js'
import { describeSettings, getUiPort, updateSettings } from '../core/settings.js'
import { getDataRoot } from '../core/paths.js'
import { syncAccount } from '../core/sync.js'
import { getProvider } from '../providers/index.js'

let server: Server | null = null
let listenPort: number | null = null

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const raw = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...corsHeaders()
  })
  res.end(raw)
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function readJson(req: IncomingMessage): Promise<any> {
  const raw = await readBody(req)
  if (!raw.trim()) return {}
  return JSON.parse(raw)
}

function accountPublic(a: ReturnType<typeof listAccounts>[number], activeId: string | null) {
  return {
    id: a.id,
    name: a.name,
    provider: a.provider,
    edition: a.edition,
    organizationId: a.organizationId,
    apiBaseUrl: a.apiBaseUrl,
    authorFilters: a.authorFilters,
    defaultBranch: a.defaultBranch,
    watchedRepoIds: a.watchedRepoIds,
    repoBranches: a.repoBranches,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    active: a.id === activeId
  }
}

function matchRoute(
  pathname: string,
  pattern: string
): Record<string, string> | null {
  const pp = pattern.split('/').filter(Boolean)
  const ap = pathname.split('/').filter(Boolean)
  if (pp.length !== ap.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(ap[i])
    else if (pp[i] !== ap[i]) return null
  }
  return params
}

async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', `http://127.0.0.1`)
  const method = req.method || 'GET'
  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders())
    res.end()
    return
  }

  try {
    if (method === 'GET' && (url.pathname === '/' || url.pathname === '/api/health')) {
      sendJson(res, 200, {
        ok: true,
        port: listenPort,
        dataRoot: getDataRoot()
      })
      return
    }

    // --- accounts ---
    if (method === 'GET' && url.pathname === '/api/accounts') {
      const activeId = getActiveAccountId()
      sendJson(res, 200, {
        dataRoot: getDataRoot(),
        activeAccountId: activeId,
        accounts: listAccounts().map((a) => accountPublic(a, activeId))
      })
      return
    }

    if (method === 'POST' && url.pathname === '/api/accounts') {
      const body = await readJson(req)
      const account = createAccount({
        name: body.name,
        provider: body.provider || 'codeup',
        edition: body.edition || 'central',
        organizationId: body.organizationId,
        apiBaseUrl: body.apiBaseUrl,
        token: body.token,
        authorFilters: body.authorFilters || [],
        defaultBranch: body.defaultBranch,
        watchedRepoIds: body.watchedRepoIds,
        repoBranches: body.repoBranches
      })
      if (body.setActive !== false) setActiveAccountId(account.id)
      let test: { repoCount: number } | undefined
      if (body.test !== false) {
        const token = getAccountToken(account.id)
        test = await getProvider(account).testConnection(account, token)
      }
      sendJson(res, 200, {
        account: accountPublic(account, getActiveAccountId()),
        test
      })
      return
    }

    {
      const m = matchRoute(url.pathname, '/api/accounts/:id')
      if (m) {
        if (method === 'PATCH' || method === 'PUT') {
          const body = await readJson(req)
          const account = updateAccount({
            id: m.id,
            name: body.name,
            provider: body.provider,
            edition: body.edition,
            organizationId: body.organizationId,
            apiBaseUrl: body.apiBaseUrl,
            token: body.token,
            authorFilters: body.authorFilters,
            defaultBranch: body.defaultBranch,
            watchedRepoIds: body.watchedRepoIds,
            repoBranches: body.repoBranches
          })
          sendJson(res, 200, { account: accountPublic(account, getActiveAccountId()) })
          return
        }
        if (method === 'DELETE') {
          deleteAccount(m.id)
          sendJson(res, 200, { ok: true, removed: m.id })
          return
        }
      }
    }

    {
      const m = matchRoute(url.pathname, '/api/accounts/:id/activate')
      if (m && method === 'POST') {
        if (!getAccount(m.id)) return sendJson(res, 404, { error: '账号不存在' })
        setActiveAccountId(m.id)
        sendJson(res, 200, { ok: true, activeAccountId: m.id })
        return
      }
    }

    {
      const m = matchRoute(url.pathname, '/api/accounts/:id/test')
      if (m && method === 'POST') {
        const account = getAccount(m.id)
        if (!account) return sendJson(res, 404, { error: '账号不存在' })
        const token = getAccountToken(m.id)
        const test = await getProvider(account).testConnection(account, token)
        sendJson(res, 200, { ok: true, ...test })
        return
      }
    }

    // --- repos ---
    if (method === 'GET' && url.pathname === '/api/repos') {
      const accountId = url.searchParams.get('accountId') || getActiveAccountId() || ''
      if (!accountId) return sendJson(res, 400, { error: 'accountId required' })
      const account = getAccount(accountId)
      if (!account) return sendJson(res, 404, { error: '账号不存在' })
      const withCommitsOnly = url.searchParams.get('withCommitsOnly') === '1'
      const list = withCommitsOnly
        ? db.listReposWithCommits(accountId)
        : db.listRepos(accountId)
      sendJson(res, 200, {
        accountId,
        watchedRepoIds: account.watchedRepoIds,
        repoBranches: account.repoBranches,
        repos: list.map((r) => ({
          id: r.id,
          name: r.name,
          fullName: r.fullName,
          webUrl: r.webUrl,
          defaultBranch: r.defaultBranch,
          lastActivityAt: r.lastActivityAt,
          participating: r.participating,
          watched: account.watchedRepoIds.length === 0 || account.watchedRepoIds.includes(r.id),
          branchOverride: account.repoBranches[r.id] || ''
        }))
      })
      return
    }

    if (method === 'POST' && url.pathname === '/api/repos/refresh') {
      const body = await readJson(req)
      const accountId = String(body.accountId || getActiveAccountId() || '')
      const account = getAccount(accountId)
      if (!account) return sendJson(res, 404, { error: '账号不存在' })
      const token = getAccountToken(accountId)
      const repos = await getProvider(account).listRepos(account, token)
      db.upsertRepos(accountId, repos)
      sendJson(res, 200, {
        accountId,
        count: repos.length,
        repos: db.listRepos(accountId)
      })
      return
    }

    if (method === 'PUT' && url.pathname === '/api/repos/watch') {
      const body = await readJson(req)
      const accountId = String(body.accountId || '')
      if (!getAccount(accountId)) return sendJson(res, 404, { error: '账号不存在' })
      const account = updateAccount({
        id: accountId,
        watchedRepoIds: Array.isArray(body.watchedRepoIds) ? body.watchedRepoIds.map(String) : [],
        repoBranches: body.repoBranches || {}
      })
      sendJson(res, 200, {
        ok: true,
        watchedRepoIds: account.watchedRepoIds,
        repoBranches: account.repoBranches
      })
      return
    }

    // --- sync ---
    if (method === 'POST' && url.pathname === '/api/sync') {
      const body = await readJson(req)
      const accountId = String(body.accountId || getActiveAccountId() || '')
      if (!accountId) return sendJson(res, 400, { error: 'accountId required' })
      const repoIds = Array.isArray(body.repoIds) ? body.repoIds.map(String) : undefined
      const result = await syncAccount(accountId, repoIds)
      sendJson(res, 200, result)
      return
    }

    // --- commits ---
    if (method === 'GET' && url.pathname === '/api/commits') {
      const accountId = url.searchParams.get('accountId') || getActiveAccountId() || ''
      if (!accountId) return sendJson(res, 400, { error: 'accountId required' })
      const limit = Number(url.searchParams.get('limit') || 20)
      const offset = Number(url.searchParams.get('offset') || 0)
      const result = db.queryCommits({
        accountId,
        repoId: url.searchParams.get('repoId') || undefined,
        from: url.searchParams.get('from') || undefined,
        to: url.searchParams.get('to') || undefined,
        keyword: url.searchParams.get('keyword') || undefined,
        limit,
        offset
      })
      sendJson(res, 200, result)
      return
    }

    if (method === 'POST' && url.pathname === '/api/commits/clear') {
      const body = await readJson(req)
      const accountId = String(body.accountId || '')
      if (!accountId) return sendJson(res, 400, { error: 'accountId required' })
      const cleared = db.clearCommits(accountId, body.repoId ? String(body.repoId) : undefined)
      sendJson(res, 200, cleared)
      return
    }

    // --- activity ---
    if (method === 'GET' && url.pathname === '/api/activity') {
      const accountId = url.searchParams.get('accountId') || getActiveAccountId() || ''
      const yearRaw = url.searchParams.get('year')
      const year = yearRaw ? Number(yearRaw) : undefined
      if (!accountId) return sendJson(res, 400, { error: 'accountId required' })
      sendJson(res, 200, db.getActivity(accountId, year))
      return
    }

    if (method === 'GET' && url.pathname === '/api/activity/day') {
      const accountId = url.searchParams.get('accountId') || getActiveAccountId() || ''
      const date = url.searchParams.get('date') || ''
      if (!accountId || !date) return sendJson(res, 400, { error: 'accountId/date required' })
      const items = db.listDayCommits(accountId, date)
      sendJson(res, 200, {
        commits: items.map((c) => ({
          id: c.id,
          time: c.committedAt,
          repo: c.repoName,
          title: c.title,
          message: c.message,
          authorName: c.authorName,
          sha: c.shortId,
          webUrl: c.webUrl
        }))
      })
      return
    }

    // --- logs ---
    if (method === 'GET' && url.pathname === '/api/logs') {
      const accountId = url.searchParams.get('accountId') || getActiveAccountId() || ''
      if (!accountId) return sendJson(res, 400, { error: 'accountId required' })
      const limit = Number(url.searchParams.get('limit') || 50)
      const offset = Number(url.searchParams.get('offset') || 0)
      sendJson(res, 200, db.listSyncLogs(accountId, limit, offset))
      return
    }

    if (method === 'DELETE' && url.pathname === '/api/logs') {
      const accountId =
        url.searchParams.get('accountId') ||
        (await readJson(req).then((b) => b.accountId).catch(() => '')) ||
        ''
      const deleted = db.clearSyncLogs(accountId || undefined)
      sendJson(res, 200, { deleted })
      return
    }

    // --- settings ---
    if (method === 'GET' && url.pathname === '/api/settings') {
      sendJson(res, 200, {
        ...describeSettings(),
        listenPort,
        apiBase: listenPort ? `http://127.0.0.1:${listenPort}` : null
      })
      return
    }

    if ((method === 'PUT' || method === 'PATCH') && url.pathname === '/api/settings') {
      const body = await readJson(req)
      const next = updateSettings({
        exportsPath: body.exportsPath,
        syncIntervalMinutes: body.syncIntervalMinutes,
        syncLookbackDays: body.syncLookbackDays,
        uiPort: body.uiPort
      })
      sendJson(res, 200, { ok: true, settings: describeSettings(), saved: next })
      return
    }

    sendJson(res, 404, { error: 'not found' })
  } catch (e: any) {
    sendJson(res, 500, { error: e?.message || String(e) })
  }
}

export function getHeatmapUrl(): string | null {
  return listenPort ? `http://127.0.0.1:${listenPort}/` : null
}

export async function startUiServer(port = getUiPort()): Promise<string> {
  if (server && listenPort) return `http://127.0.0.1:${listenPort}/`
  server = createServer((req, res) => {
    void handler(req, res)
  })
  await new Promise<void>((resolve, reject) => {
    server!.once('error', reject)
    server!.listen(port, '127.0.0.1', () => resolve())
  })
  listenPort = port
  return `http://127.0.0.1:${port}/`
}

export async function stopUiServer(): Promise<void> {
  if (!server) return
  const s = server
  server = null
  listenPort = null
  await new Promise<void>((resolve) => s.close(() => resolve()))
}
