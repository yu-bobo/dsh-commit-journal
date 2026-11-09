import { existsSync, readFileSync, writeFileSync } from 'fs'
import { v4 as uuid } from 'uuid'
import type { Account, AccountInput, AccountUpdate } from './types.js'
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

function migrateAccount(raw: any): Account {
  const watched = Array.isArray(raw.watchedRepoIds)
    ? raw.watchedRepoIds.map((id: string | number) => String(id))
    : []
  return {
    id: String(raw.id),
    name: String(raw.name || ''),
    provider: (raw.provider as Account['provider']) || 'codeup',
    edition: raw.edition,
    organizationId: raw.organizationId,
    apiBaseUrl: raw.apiBaseUrl,
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

export function createAccount(input: AccountInput): Account {
  const now = new Date().toISOString()
  const account: Account = {
    id: uuid(),
    name: input.name.trim(),
    provider: input.provider || 'codeup',
    edition: input.edition || (input.provider === 'codeup' || !input.provider ? 'central' : undefined),
    organizationId: input.organizationId?.trim() || undefined,
    apiBaseUrl: input.apiBaseUrl?.trim().replace(/\/$/, '') || undefined,
    authorFilters: (input.authorFilters || []).map((s) => s.trim()).filter(Boolean),
    defaultBranch: input.defaultBranch?.trim() || 'master',
    watchedRepoIds: normalizeRepoIds(input.watchedRepoIds),
    repoBranches: normalizeBranches(input.repoBranches),
    createdAt: now,
    updatedAt: now
  }
  validateAccount(account, input.token)
  saveToken(account.id, input.token.trim())
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
    if (!input.token?.trim()) {
      throw new Error('账号不存在，请先 upsert_account 并填写 token')
    }
    return createAccount({
      name: input.name || '未命名账号',
      provider: input.provider || 'codeup',
      edition: input.edition || 'central',
      organizationId: input.organizationId,
      apiBaseUrl: input.apiBaseUrl,
      token: input.token,
      authorFilters: input.authorFilters || [],
      defaultBranch: input.defaultBranch,
      watchedRepoIds: input.watchedRepoIds,
      repoBranches: input.repoBranches
    })
  }
  const prev = store.accounts[idx]
  const next: Account = {
    ...prev,
    name: input.name?.trim() ?? prev.name,
    provider: input.provider ?? prev.provider,
    edition: input.edition ?? prev.edition,
    organizationId:
      input.organizationId !== undefined
        ? input.organizationId.trim() || undefined
        : prev.organizationId,
    apiBaseUrl:
      input.apiBaseUrl !== undefined
        ? input.apiBaseUrl.trim().replace(/\/$/, '') || undefined
        : prev.apiBaseUrl,
    authorFilters:
      input.authorFilters !== undefined
        ? input.authorFilters.map((s) => s.trim()).filter(Boolean)
        : prev.authorFilters,
    defaultBranch: input.defaultBranch?.trim() || prev.defaultBranch,
    watchedRepoIds:
      input.watchedRepoIds !== undefined
        ? normalizeRepoIds(input.watchedRepoIds)
        : prev.watchedRepoIds,
    repoBranches:
      input.repoBranches !== undefined
        ? normalizeBranches(input.repoBranches)
        : prev.repoBranches,
    updatedAt: new Date().toISOString()
  }
  validateAccount(next, input.token ?? loadToken(next.id) ?? '')
  if (input.token?.trim()) saveToken(next.id, input.token.trim())
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
  const token = loadToken(id)
  if (!token) throw new Error('未找到该账号的访问令牌，请重新填写 PAT')
  return token
}

function validateAccount(account: Account, token: string): void {
  if (!account.name) throw new Error('请填写账号名称')
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
