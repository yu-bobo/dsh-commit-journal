/**
 * 限流退避与错误文案截断（enrich 补 stats 用）
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function truncateErr(msg: unknown, max = 180): string {
  const s = String(msg ?? '')
  return s.length <= max ? s : `${s.slice(0, max)}…`
}

export function isRateLimited(err: unknown): boolean {
  return /\b429\b|rate.?limit|too many requests/i.test(String((err as any)?.message ?? err))
}

/**
 * 遇 429 / rate limit 时指数退避重试
 */
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  opts?: { retries?: number; onRetry?: (waitMs: number) => void }
): Promise<T> {
  const retries = Math.max(0, opts?.retries ?? 3)
  let last: unknown
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (!isRateLimited(e) || i === retries) throw e
      const waitMs = 1000 * 2 ** i
      opts?.onRetry?.(waitMs)
      await sleep(waitMs)
    }
  }
  throw last
}
