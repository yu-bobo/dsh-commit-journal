import { existsSync, readFileSync, writeFileSync } from 'fs'
import {
  AppSettings,
  DEFAULT_SYNC_INTERVAL_MINUTES,
  DEFAULT_SYNC_LOOKBACK_DAYS,
  DEFAULT_UI_PORT
} from './types.js'
import { defaultExportsDir, settingsPath } from './paths.js'

const defaults: AppSettings = {
  exportsPath: '',
  syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
  syncLookbackDays: DEFAULT_SYNC_LOOKBACK_DAYS,
  uiPort: DEFAULT_UI_PORT
}

function load(): AppSettings {
  const path = settingsPath()
  if (!existsSync(path)) return { ...defaults }
  try {
    return { ...defaults, ...JSON.parse(readFileSync(path, 'utf8')) }
  } catch {
    return { ...defaults }
  }
}

function save(settings: AppSettings): void {
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf8')
}

export function getSettings(): AppSettings {
  return load()
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...load(), ...patch }
  if (next.syncIntervalMinutes < 5) next.syncIntervalMinutes = 5
  if (next.syncLookbackDays < 1) next.syncLookbackDays = 1
  if (next.uiPort < 1024 || next.uiPort > 65535) next.uiPort = DEFAULT_UI_PORT
  save(next)
  return next
}

export function getExportsPathSetting(): string {
  return (load().exportsPath || '').trim()
}

export function getSyncIntervalMinutes(): number {
  return load().syncIntervalMinutes || DEFAULT_SYNC_INTERVAL_MINUTES
}

export function getSyncLookbackDays(): number {
  return load().syncLookbackDays || DEFAULT_SYNC_LOOKBACK_DAYS
}

export function getUiPort(): number {
  return load().uiPort || DEFAULT_UI_PORT
}

export function describeSettings(): Record<string, unknown> {
  const s = load()
  return {
    ...s,
    resolvedExportsPath: s.exportsPath?.trim() || defaultExportsDir(),
    defaultExportsPath: defaultExportsDir()
  }
}
