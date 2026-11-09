import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import { listAccounts, getActiveAccountId } from '../core/accounts.js'
import { db } from '../core/db.js'
import { getDataRoot } from '../core/paths.js'
import { getUiPort } from '../core/settings.js'
import { syncAccount } from '../core/sync.js'
import { heatmapPageHtml } from './heatmapHtml.js'

let server: Server | null = null
let listenPort: number | null = null

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const raw = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
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

async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', `http://127.0.0.1`)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    res.end()
    return
  }

  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/heatmap')) {
      const html = heatmapPageHtml(`http://127.0.0.1:${listenPort}`)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/accounts') {
      const activeAccountId = getActiveAccountId()
      sendJson(res, 200, {
        dataRoot: getDataRoot(),
        accounts: listAccounts().map((a) => ({
          id: a.id,
          name: a.name,
          provider: a.provider,
          active: a.id === activeAccountId
        }))
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/activity') {
      const accountId = url.searchParams.get('accountId') || ''
      const yearRaw = url.searchParams.get('year')
      const year = yearRaw ? Number(yearRaw) : undefined
      if (!accountId) return sendJson(res, 400, { error: 'accountId required' })
      sendJson(res, 200, db.getActivity(accountId, year))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/activity/day') {
      const accountId = url.searchParams.get('accountId') || ''
      const date = url.searchParams.get('date') || ''
      if (!accountId || !date) return sendJson(res, 400, { error: 'accountId/date required' })
      const items = db.listDayCommits(accountId, date)
      sendJson(res, 200, {
        commits: items.map((c) => ({
          time: c.committedAt,
          repo: c.repoName,
          title: c.title,
          sha: c.shortId,
          webUrl: c.webUrl
        }))
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/sync') {
      const raw = await readBody(req)
      const body = raw ? JSON.parse(raw) : {}
      const accountId = String(body.accountId || '')
      if (!accountId) return sendJson(res, 400, { error: 'accountId required' })
      const result = await syncAccount(accountId)
      sendJson(res, 200, result)
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
