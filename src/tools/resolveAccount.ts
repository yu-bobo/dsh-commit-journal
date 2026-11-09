import {
  getAccount,
  getActiveAccountId,
  listAccounts
} from '../core/accounts.js'
import { getDataRoot } from '../core/paths.js'

export function resolveAccountId(accountId?: string): string {
  const accounts = listAccounts()
  if (accountId?.trim()) {
    const found = accounts.find((a) => a.id === accountId.trim())
    if (!found) throw new Error(`账号不存在：${accountId}`)
    return found.id
  }
  const activeId = getActiveAccountId()
  if (activeId && accounts.some((a) => a.id === activeId)) return activeId
  if (accounts.length === 1) return accounts[0].id
  if (accounts.length === 0) {
    throw new Error(
      `本地无账号。请先调用 upsert_account 添加 Codeup 账号。数据目录：${getDataRoot()}`
    )
  }
  throw new Error('存在多个账号，请先调用 list_accounts 后传入 accountId')
}

export function accountSummary() {
  const accounts = listAccounts()
  const activeAccountId = getActiveAccountId()
  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    provider: a.provider,
    edition: a.edition,
    organizationId: a.organizationId,
    apiBaseUrl: a.apiBaseUrl,
    authorFilters: a.authorFilters,
    defaultBranch: a.defaultBranch,
    watchedRepoCount: a.watchedRepoIds.length,
    active: a.id === activeAccountId
  }))
}

export { getAccount }
