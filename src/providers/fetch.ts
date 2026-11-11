import http from 'node:http'
import https from 'node:https'
import type { Account } from '../core/types.js'

const USER_AGENT = 'dsh-commit-journal'

export function shouldInsecureTls(account?: Pick<Account, 'insecureSsl'>): boolean {
  if (account?.insecureSsl) return true
  const env = String(process.env.DSH_COMMIT_JOURNAL_TLS_INSECURE || '').trim()
  return env === '1' || /^true$/i.test(env)
}

function formatFetchCause(err: unknown): string {
  const e = err as any
  const cause = e?.cause
  const code = cause?.code || e?.code
  const msg = cause?.message || e?.message || String(err)
  if (code) return `${code}: ${msg}`
  return msg
}

function isCertError(err: unknown): boolean {
  const detail = formatFetchCause(err)
  const code = (err as any)?.cause?.code || (err as any)?.code || ''
  return (
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code === 'CERT_HAS_EXPIRED' ||
    code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
    code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    /certificate|SSL|TLS|unable to verify/i.test(detail)
  )
}

export function wrapFetchError(url: string, err: unknown): Error {
  const detail = formatFetchCause(err)
  const code = (err as any)?.cause?.code || (err as any)?.code || ''
  if (isCertError(err)) {
    return new Error(
      `连接失败（证书校验）：${url}\n` +
        `${detail}\n` +
        `常见于公司代理 / HTTPS 解密 / 自签证书。可在账号中勾选「跳过 TLS 证书校验」，` +
        `或设置环境变量 DSH_COMMIT_JOURNAL_TLS_INSECURE=1 后重启 DSH；` +
        `更稳妥是把公司根证书路径设到 NODE_EXTRA_CA_CERTS。`
    )
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return new Error(`连接失败（DNS）：${url}\n${detail}`)
  }
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ECONNRESET') {
    return new Error(`连接失败（网络）：${url}\n${detail}`)
  }
  return new Error(`连接失败：${url}\n${detail}`)
}

function headersToObject(headers?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = { 'User-Agent': USER_AGENT }
  if (!headers) return out
  if (headers instanceof Headers) {
    headers.forEach((v, k) => {
      out[k] = v
    })
    return out
  }
  if (Array.isArray(headers)) {
    for (const [k, v] of headers) out[k] = v
    return out
  }
  for (const [k, v] of Object.entries(headers)) {
    if (v == null) continue
    out[k] = String(v)
  }
  return out
}

// 自签 / 公司代理场景：用 Node https 并关闭证书校验（仅本请求）
function insecureRequest(urlStr: string, headers: Record<string, string>): Promise<Response> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr)
    const lib = u.protocol === 'http:' ? http : https
    const req = lib.request(
      u,
      {
        method: 'GET',
        headers,
        rejectUnauthorized: false
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const headerInit: Record<string, string> = {}
          for (const [k, v] of Object.entries(res.headers)) {
            if (v == null) continue
            headerInit[k] = Array.isArray(v) ? v.join(', ') : v
          }
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode || 0,
              statusText: res.statusMessage || '',
              headers: headerInit
            })
          )
        })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

/**
 * VCS HTTP GET：统一 User-Agent、证书错误提示；可选跳过 TLS 校验
 * 公司代理导致证书失败时自动降级重试一次（无需先勾选 insecureSsl）
 */
export async function vcsFetch(
  url: string,
  init: { headers?: HeadersInit; account?: Pick<Account, 'insecureSsl'> }
): Promise<Response> {
  const headers = headersToObject(init.headers)
  const insecure = shouldInsecureTls(init.account)
  if (insecure) {
    try {
      return await insecureRequest(url, headers)
    } catch (err) {
      throw wrapFetchError(url, err)
    }
  }
  try {
    return await fetch(url, { method: 'GET', headers })
  } catch (err) {
    if (!isCertError(err)) throw wrapFetchError(url, err)
    try {
      return await insecureRequest(url, headers)
    } catch (err2) {
      throw wrapFetchError(url, err2)
    }
  }
}
