import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { hostname, homedir } from 'os'
import { secretPath } from './paths.js'

const MAGIC = Buffer.from('DCJ1')

function machineKey(): Buffer {
  const material = `${hostname()}|${homedir()}|dsh-commit-journal-v1`
  return scryptSync(material, 'dsh-commit-journal-salt', 32)
}

export function saveSecret(name: string, value: string): void {
  const key = machineKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  writeFileSync(secretPath(name), Buffer.concat([MAGIC, iv, tag, enc]))
}

export function loadSecret(name: string): string | null {
  const path = secretPath(name)
  if (!existsSync(path)) return null
  const raw = readFileSync(path)
  try {
    if (raw.length > 4 && raw.subarray(0, 4).equals(MAGIC)) {
      const iv = raw.subarray(4, 16)
      const tag = raw.subarray(16, 32)
      const data = raw.subarray(32)
      const decipher = createDecipheriv('aes-256-gcm', machineKey(), iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
    }
    // Legacy plaintext fallback
    return raw.toString('utf8')
  } catch {
    return null
  }
}

export function deleteSecret(name: string): void {
  const path = secretPath(name)
  if (existsSync(path)) unlinkSync(path)
}

export function hasSecret(name: string): boolean {
  return existsSync(secretPath(name))
}

export function saveToken(accountId: string, token: string): void {
  saveSecret(accountId, token)
}

export function loadToken(accountId: string): string | null {
  return loadSecret(accountId)
}

export function deleteToken(accountId: string): void {
  deleteSecret(accountId)
}

export function fingerprintToken(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 8)
}
