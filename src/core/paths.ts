import { existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { getExportsPathSetting } from './settings.js'

export function getDataRoot(): string {
  const root = process.env.DSH_COMMIT_JOURNAL_HOME?.trim()
    || join(homedir(), '.dsh-commit-journal')
  mkdirSync(root, { recursive: true })
  mkdirSync(join(root, 'secrets'), { recursive: true })
  return root
}

export function defaultExportsDir(): string {
  return join(getDataRoot(), 'exports')
}

export function exportsDir(): string {
  const custom = getExportsPathSetting()
  const root = custom || defaultExportsDir()
  mkdirSync(root, { recursive: true })
  mkdirSync(join(root, 'reports'), { recursive: true })
  return root
}

export function reportsDir(): string {
  const dir = join(exportsDir(), 'reports')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function accountsPath(): string {
  return join(getDataRoot(), 'accounts.json')
}

export function settingsPath(): string {
  return join(getDataRoot(), 'settings.json')
}

export function secretPath(name: string): string {
  return join(getDataRoot(), 'secrets', `${name}.bin`)
}

export function dbPath(): string {
  return join(getDataRoot(), 'data.json')
}

export function holidayCacheDir(): string {
  const dir = join(getDataRoot(), 'holiday-cache')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function ensureDataLayout(): void {
  getDataRoot()
  if (!existsSync(exportsDir())) mkdirSync(exportsDir(), { recursive: true })
}
