import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { v4 as uuid } from 'uuid'
import type { Account, AccountInput, AccountMode, AccountUpdate } from './types.js'
import { accountsPath } from './paths.js'
import { deleteToken, loadToken, saveToken } from './vault.js'
import { db } from './db.js'

interface Store {
  accounts: Account[]
  activeAccountId: string | null
}

function normalizeRepoIds(ids?: Array<string | number>): string[] {
  return (ids ?? []).map((id) => String(id))
}

function normalizeBranches(map?: Record<string, string>): Record<string, string> {
  if (!map) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(map)) out[String(k)] = v
  return out
}

function normalizeRoots(roots?: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of roots || []) {
    // 去掉首尾引号/空白，兼容从资源管理器复制的路径
    let trimmed = String(raw || '')
      .trim()
      .replace(/^["']+|["']+$/g, '')
      .trim()
      .replace(/[\\/]+$/, '')
    if (!trimmed) continue
    let abs = trimmed
    try {
      abs = resolve(trimmed)
    } catch {
      abs = trimmed
    }
    const key = abs.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(abs)
  }
  return out
}

function normalizeMode(raw: unknown): AccountMode {
  return raw === 'local' ? 'local' : 'remote'
}

function migrateAccount(raw: any): Account {
  const watched = Array.isArray(raw.watchedRepoIds)
    ? raw.watchedRepoIds.map((id: string | number) => String(id))
    : []
  const mode = normalizeMode(raw.mode)
  return {
    id: String(raw.id),
    name: String(raw.name || ''),
    mode,
    provider:
      mode === 'local'
        ? 'local'
        : ((raw.provider as Account['provider']) || 'codeup'),
    edition: mode === 'remote' ? raw.edition : undefined,
    organizationId: mode === 'remote' ? raw.organizationId : undefined,
    apiBaseUrl: mode === 'remote' ? raw.apiBaseUrl : undefined,
    localRoots: mode === 'local' ? normalizeRoots(raw.localRoots) : undefined,
    authorFilters: Array.isArray(raw.authorFilters) ? raw.authorFilters : [],
    defaultBranch: raw.defaultBranch || 'master',
    watchedRepoIds: watched,
    repoBranches: normalizeBranches(raw.repoBranches),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  }
}

function loadStore(): Store {
  const path = accountsPath()
  if (!existsSync(path)) return { accounts: [], activeAccountId: null }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Store
    return {
      accounts: (raw.accounts || []).map(migrateAccount),
      activeAccountId: raw.activeAccountId ?? null
    }
  } catch {
    return { accounts: [], activeAccountId: null }
  }
}

function saveStore(store: Store): void {
  writeFileSync(accountsPath(), JSON.stringify(store, null, 2), 'utf8')
}

export function listAccounts(): Account[] {
  return loadStore().accounts
}

export function getActiveAccountId(): string | null {
  return loadStore().activeAccountId
}

export function setActiveAccountId(id: string | null): void {
  const store = loadStore()
  store.activeAccountId = id
  saveStore(store)
}

export function getAccount(id: string): Account | undefined {
  return loadStore().accounts.find((a) => a.id === id)
}

function buildAccountFields(
  input: Partial<AccountInput>,
  prev?: Account
): Omit<Account, 'id' | 'createdAt' | 'updatedAt'> {
  const mode = normalizeMode(input.mode ?? prev?.mode ?? 'remote')
  const provider = input.provider || prev?.provider || 'codeup'
  if (mode === 'local') {
    return {
      name: (input.name ?? prev?.name ?? '').trim(),
      mode: 'local',
      provider: 'local',
      localRoots: normalizeRoots(
        input.localRoots !== undefined ? input.localRoots : prev?.localRoots
      ),
      authorFilters: (
        input.authorFilters !== undefined ? input.authorFilters : prev?.authorFilters || []
      )
        .map((s) => s.trim())
        .filter(Boolean),
      defaultBranch:
        (input.defaultBranch ?? prev?.defaultBranch)?.trim() || 'master',
      watchedRepoIds:
        input.watchedRepoIds !== undefined
          ? normalizeRepoIds(input.watchedRepoIds)
          : prev?.watchedRepoIds || [],
      repoBranches:
        input.repoBranches !== undefined
          ? normalizeBranches(input.repoBranches)
          : prev?.repoBranches || {}
    }
  }
  return {
    name: (input.name ?? prev?.name ?? '').trim(),
    mode: 'remote',
    provider,
    edition:
      input.edition ??
      prev?.edition ??
      (provider === 'codeup' ? 'central' : undefined),
    organizationId:
      input.organizationId !== undefined
        ? input.organizationId.trim() || undefined
        : prev?.organizationId,
    apiBaseUrl:
      input.apiBaseUrl !== undefined
        ? input.apiBaseUrl.trim().replace(/\/$/, '') || undefined
        : prev?.apiBaseUrl,
    authorFilters: (
      input.authorFilters !== undefined ? input.authorFilters : prev?.authorFilters || []
    )
      .map((s) => s.trim())
      .filter(Boolean),
    defaultBranch:
      (input.defaultBranch ?? prev?.defaultBranch)?.trim() || 'master',
    watchedRepoIds:
      input.watchedRepoIds !== undefined
        ? normalizeRepoIds(input.watchedRepoIds)
        : prev?.watchedRepoIds || [],
    repoBranches:
      input.repoBranches !== undefined
        ? normalizeBranches(input.repoBranches)
        : prev?.repoBranches || {}
  }
}

export function createAccount(input: AccountInput): Account {
  const now = new Date().toISOString()
  const fields = buildAccountFields(input)
  const account: Account = {
    id: uuid(),
    ...fields,
    createdAt: now,
    updatedAt: now
  }
  validateAccount(account, input.token || '')
  if (account.mode === 'remote') {
    saveToken(account.id, (input.token || '').trim())
  }
  const store = loadStore()
  store.accounts.push(account)
  if (!store.activeAccountId) store.activeAccountId = account.id
  saveStore(store)
  return account
}

export function updateAccount(input: AccountUpdate): Account {
  const store = loadStore()
  const idx = store.accounts.findIndex((a) => a.id === input.id)
  if (idx < 0) {
    const mode = normalizeMode(input.mode)
    if (mode === 'remote' && !input.token?.trim()) {
      throw new Error('账号不存在，请先 upsert_account 并填写 token')
    }
    if (mode === 'local' && !(input.localRoots && input.localRoots.length)) {
      throw new Error('账号不存在，请先 upsert_account 并填写 localRoots')
    }
    return createAccount({
      name: input.name || '未命名账号',
      mode,
      provider: mode === 'local' ? 'local' : input.provider || 'codeup',
      edition: input.edition || 'central',
      organizationId: input.organizationId,
      apiBaseUrl: input.apiBaseUrl,
      localRoots: input.localRoots,
      token: input.token,
      authorFilters: input.authorFilters || [],
      defaultBranch: input.defaultBranch,
      watchedRepoIds: input.watchedRepoIds,
      repoBranches: input.repoBranches
    })
  }
  const prev = store.accounts[idx]
  const fields = buildAccountFields(input, prev)
  const next: Account = {
    ...prev,
    ...fields,
    id: prev.id,
    createdAt: prev.createdAt,
    updatedAt: new Date().toISOString()
  }
  const tokenForValidate =
    next.mode === 'local' ? '' : input.token ?? loadToken(next.id) ?? ''
  validateAccount(next, tokenForValidate)
  if (next.mode === 'remote' && input.token?.trim()) {
    saveToken(next.id, input.token.trim())
  }
  if (next.mode === 'local') {
    deleteToken(next.id)
  }
  store.accounts[idx] = next
  saveStore(store)
  return next
}

export function deleteAccount(id: string): void {
  const store = loadStore()
  store.accounts = store.accounts.filter((a) => a.id !== id)
  if (store.activeAccountId === id) {
    store.activeAccountId = store.accounts[0]?.id ?? null
  }
  saveStore(store)
  deleteToken(id)
  db.deleteAccountData(id)
}

export function getAccountToken(id: string): string {
  const account = getAccount(id)
  if (account?.mode === 'local') return ''
  const token = loadToken(id)
  if (!token) throw new Error('未找到该账号的访问令牌，请重新填写 PAT')
  return token
}

function validateAccount(account: Account, token: string): void {
  if (!account.name) throw new Error('请填写账号名称')
  if (account.mode === 'local') {
    if (!account.localRoots || account.localRoots.length === 0) {
      throw new Error('本地模式请至少填写一个扫描根目录')
    }
    const missing = account.localRoots.filter((p) => !existsSync(p))
    if (missing.length === account.localRoots.length) {
      throw new Error(`扫描根目录均不存在：${missing.join(', ')}`)
    }
    return
  }
  if (!token.trim()) throw new Error('请填写个人访问令牌')
  if (account.provider === 'codeup') {
    if (account.edition === 'central' && !account.organizationId) {
      throw new Error('中心版需填写 organizationId')
    }
    if (account.edition === 'region' && !account.apiBaseUrl) {
      throw new Error('Region 版需填写 API Base URL')
    }
  }
  if (account.provider === 'gitlab' || account.provider === 'github') {
    throw new Error(`${account.provider} 适配器尚未实现，当前仅支持 codeup`)
  }
}
