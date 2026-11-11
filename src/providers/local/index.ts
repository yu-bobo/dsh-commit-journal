import { createHash } from 'crypto'
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'fs'
import { basename, delimiter, join, relative, resolve, sep } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { Account, RepoRef } from '../../core/types.js'
import type {
  BranchInfo,
  ListCommitsOptions,
  ListCommitsResult,
  RemoteCommit,
  VcsProvider
} from '../types.js'

const execFileAsync = promisify(execFile)

const MAX_DEPTH = 5
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'target',
  '.turbo',
  'coverage',
  '.cache'
])

// Windows / Electron 常缺 PATH 里的 git，缓存解析到的可执行文件
let cachedGitBin: string | null | undefined

const WIN_GIT_CANDIDATES = [
  'C:\\Program Files\\Git\\cmd\\git.exe',
  'C:\\Program Files\\Git\\bin\\git.exe',
  'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
  'C:\\Program Files (x86)\\Git\\bin\\git.exe'
]

// repoId -> absolute work tree path（进程内缓存，随 listRepos 刷新）
const pathByRepoId = new Map<string, string>()

function normalizePath(p: string): string {
  return resolve(p).replace(/[\\/]+$/, '')
}

function resolveGitBin(): string {
  if (cachedGitBin !== undefined) {
    if (!cachedGitBin) {
      throw new Error(
        '未找到 git 可执行文件。请安装 Git for Windows，或把 git 加入系统 PATH 后重启 DSH。'
      )
    }
    return cachedGitBin
  }

  const fromEnv = process.env.DSH_COMMIT_JOURNAL_GIT?.trim()
  if (fromEnv && existsSync(fromEnv)) {
    cachedGitBin = fromEnv
    return cachedGitBin
  }

  // PATH 中的 git（若 Electron 已带上）
  const pathDirs = (process.env.PATH || process.env.Path || '').split(delimiter).filter(Boolean)
  for (const dir of pathDirs) {
    const unix = join(dir, 'git')
    const win = join(dir, 'git.exe')
    if (process.platform === 'win32' && existsSync(win)) {
      cachedGitBin = win
      return cachedGitBin
    }
    if (existsSync(unix)) {
      cachedGitBin = unix
      return cachedGitBin
    }
  }

  if (process.platform === 'win32') {
    for (const cand of WIN_GIT_CANDIDATES) {
      if (existsSync(cand)) {
        cachedGitBin = cand
        return cachedGitBin
      }
    }
  }

  cachedGitBin = null
  throw new Error(
    '未找到 git 可执行文件。请安装 Git for Windows，或把 git 加入系统 PATH 后重启 DSH。'
  )
}

function repoIdForPath(absPath: string): string {
  const hash = createHash('sha1').update(normalizePath(absPath).toLowerCase()).digest('hex')
  return `local:${hash.slice(0, 16)}`
}

function isGitDir(gitPath: string): boolean {
  try {
    const st = lstatSync(gitPath)
    if (st.isDirectory()) {
      return existsSync(join(gitPath, 'HEAD')) || existsSync(join(gitPath, 'refs'))
    }
    if (st.isFile()) {
      const text = readFileSync(gitPath, 'utf8')
      return /^gitdir:\s+/i.test(text.trim())
    }
  } catch {
    return false
  }
  return false
}

function safeRealPath(p: string): string {
  try {
    return realpathSync(p)
  } catch {
    return normalizePath(p)
  }
}

function walkRepos(
  dir: string,
  root: string,
  depth: number,
  out: Map<string, string>
): void {
  if (depth > MAX_DEPTH) return
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  if (entries.includes('.git') && isGitDir(join(dir, '.git'))) {
    const abs = safeRealPath(dir)
    const id = repoIdForPath(abs)
    if (!out.has(id)) out.set(id, abs)
    return
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue
    if (name.startsWith('.') && name !== '.git') continue
    const child = join(dir, name)
    let st
    try {
      st = lstatSync(child)
    } catch {
      continue
    }
    if (!st.isDirectory() || st.isSymbolicLink()) continue
    walkRepos(child, root, depth + 1, out)
  }
}

function discoverRepos(account: Account): RepoRef[] {
  const found = new Map<string, string>()
  const roots = account.localRoots || []
  for (const root of roots) {
    if (!existsSync(root)) continue
    let st
    try {
      st = statSync(root)
    } catch {
      continue
    }
    if (!st.isDirectory()) continue
    const absRoot = safeRealPath(root)
    walkRepos(absRoot, absRoot, 0, found)
  }

  const repos: RepoRef[] = []
  pathByRepoId.clear()
  for (const [id, abs] of found) {
    pathByRepoId.set(id, abs)
    const name = basename(abs)
    let fullName = abs
    for (const root of roots) {
      if (!existsSync(root)) continue
      const absRoot = safeRealPath(root)
      const rel = relative(absRoot, abs)
      if (rel && !rel.startsWith('..') && !rel.includes(`..${sep}`)) {
        fullName = join(basename(absRoot), rel).split(sep).join('/')
        break
      }
      if (normalizePath(absRoot).toLowerCase() === normalizePath(abs).toLowerCase()) {
        fullName = basename(abs)
        break
      }
    }
    repos.push({
      id,
      name,
      fullName,
      webUrl: '',
      defaultBranch: undefined
    })
  }
  repos.sort((a, b) => a.fullName.localeCompare(b.fullName))
  return repos
}

function resolveWorkTree(account: Account, repoId: string): string {
  const cached = pathByRepoId.get(repoId)
  if (cached && existsSync(cached)) return cached
  discoverRepos(account)
  const again = pathByRepoId.get(repoId)
  if (!again || !existsSync(again)) {
    throw new Error(`未找到本地仓库 ${repoId}，请先刷新仓库列表`)
  }
  return again
}

async function git(cwd: string, args: string[]): Promise<string> {
  const bin = resolveGitBin()
  try {
    const { stdout } = await execFileAsync(bin, ['-C', cwd, ...args], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true
    })
    return stdout
  } catch (e: any) {
    if (e?.code === 'ENOENT') {
      cachedGitBin = undefined
      throw new Error(
        `无法启动 git（${bin}）。请确认已安装 Git，或设置环境变量 DSH_COMMIT_JOURNAL_GIT 指向 git.exe。`
      )
    }
    const msg = e?.stderr || e?.message || String(e)
    throw new Error(`git ${args.join(' ')} 失败: ${String(msg).trim()}`)
  }
}

async function defaultBranchName(cwd: string): Promise<string | undefined> {
  try {
    const sym = (await git(cwd, ['symbolic-ref', 'refs/remotes/origin/HEAD'])).trim()
    const m = sym.match(/refs\/remotes\/origin\/(.+)$/)
    if (m?.[1]) return m[1]
  } catch {
    // ignore
  }
  try {
    const cur = (await git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim()
    if (cur && cur !== 'HEAD') return cur
  } catch {
    // ignore
  }
  return undefined
}

/**
 * 本机 git 扫描适配器：按账号 localRoots 发现仓库并拉取提交
 */
export const localGitProvider: VcsProvider = {
  id: 'local',

  async testConnection(account) {
    // 先确认 git 可用，避免 Electron 精简 PATH 下「能扫到仓、一同步就 ENOENT」
    resolveGitBin()
    const repos = discoverRepos(account)
    return { repoCount: repos.length }
  },

  async listRepos(account) {
    const repos = discoverRepos(account)
    for (const r of repos) {
      const cwd = pathByRepoId.get(r.id)
      if (!cwd) continue
      try {
        r.defaultBranch = await defaultBranchName(cwd)
      } catch {
        // keep undefined
      }
    }
    return repos
  },

  async listBranches(account, _token, repoId) {
    const cwd = resolveWorkTree(account, repoId)
    const def = await defaultBranchName(cwd)
    const out = await git(cwd, [
      'for-each-ref',
      '--format=%(refname:short)',
      'refs/heads'
    ])
    const names = out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    const unique = Array.from(new Set(names))
    if (def && !unique.includes(def)) unique.unshift(def)
    return unique.map(
      (name): BranchInfo => ({
        name,
        defaultBranch: name === def
      })
    )
  },

  async listCommitsSince(account, _token, repoId, opts: ListCommitsOptions): Promise<ListCommitsResult> {
    const cwd = resolveWorkTree(account, repoId)
    const ref = opts.ref || 'HEAD'
    const args = [
      'log',
      ref,
      '--no-merges',
      '--date=iso-strict',
      '--format=%H%x1f%h%x1f%s%x1f%b%x1f%an%x1f%ae%x1f%aI%x1f%cI%x1e'
    ]
    if (opts.since) args.push(`--since=${opts.since}`)
    // soft cap similar to remote paging
    const max = Math.max(1, (opts.maxPages ?? 20) * 100)
    args.push(`-n${max}`)

    let raw = ''
    try {
      raw = await git(cwd, args)
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (/unknown revision|bad revision|ambiguous argument/i.test(msg)) {
        return { commits: [], capped: false, pages: 0 }
      }
      throw e
    }

    const commits: RemoteCommit[] = []
    const records = raw.split('\x1e').map((s) => s.trim()).filter(Boolean)
    for (const rec of records) {
      const parts = rec.split('\x1f')
      if (parts.length < 8) continue
      const [sha, shortId, title, messageBody, authorName, authorEmail, authoredAt, committedAt] =
        parts
      const message = [title, messageBody].filter(Boolean).join('\n').trim()
      commits.push({
        sha,
        shortId: shortId || sha.slice(0, 7),
        title: title || sha.slice(0, 7),
        message: message || title || '',
        authorName: authorName || '',
        authorEmail: authorEmail || '',
        authoredAt: authoredAt || committedAt || new Date().toISOString(),
        committedAt: committedAt || authoredAt || new Date().toISOString(),
        webUrl: ''
      })
    }
    const capped = commits.length >= max
    return {
      commits,
      capped,
      pages: Math.ceil(commits.length / 100) || (commits.length ? 1 : 0)
    }
  }
}
