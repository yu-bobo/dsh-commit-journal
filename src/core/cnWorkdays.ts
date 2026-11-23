import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import dayjs, { type Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import type { ReportKind } from './types.js'
import { holidayCacheDir } from './paths.js'

dayjs.extend(isoWeek)

interface YearDays {
  holidays: string[]
  makeupWorkdays: string[]
  source: 'api' | 'cache' | 'fallback'
}

interface TimorYearResponse {
  code: number
  holiday?: Record<string, { holiday: boolean; name?: string; date?: string }>
}

const memory = new Map<number, YearDays>()
const inflight = new Map<number, Promise<YearDays>>()
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

function cachePath(year: number): string {
  const dir = holidayCacheDir()
  mkdirSync(dir, { recursive: true })
  return join(dir, `${year}.json`)
}

function parseTimor(json: TimorYearResponse): YearDays | null {
  if (json.code !== 0 || !json.holiday || typeof json.holiday !== 'object') return null
  const holidays: string[] = []
  const makeupWorkdays: string[] = []
  for (const item of Object.values(json.holiday)) {
    const date = (item.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    if (item.holiday) holidays.push(date)
    else makeupWorkdays.push(date)
  }
  if (holidays.length === 0 && makeupWorkdays.length === 0) return null
  return { holidays, makeupWorkdays, source: 'api' }
}

function readDiskCache(year: number): { days: YearDays; mtimeMs: number } | null {
  const path = cachePath(year)
  if (!existsSync(path)) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as {
      holidays?: string[]
      makeupWorkdays?: string[]
    }
    if (!Array.isArray(raw.holidays) || !Array.isArray(raw.makeupWorkdays)) return null
    return {
      days: { holidays: raw.holidays, makeupWorkdays: raw.makeupWorkdays, source: 'cache' },
      mtimeMs: statSync(path).mtimeMs
    }
  } catch {
    return null
  }
}

function writeDiskCache(year: number, days: YearDays): void {
  writeFileSync(
    cachePath(year),
    JSON.stringify({ holidays: days.holidays, makeupWorkdays: days.makeupWorkdays }, null, 2),
    'utf8'
  )
}

function weekdayFallback(year: number): YearDays {
  return { holidays: [], makeupWorkdays: [], source: 'fallback' }
}

async function fetchYear(year: number): Promise<YearDays> {
  if (memory.has(year)) return memory.get(year)!
  const cached = readDiskCache(year)
  if (cached && Date.now() - cached.mtimeMs < CACHE_MAX_AGE_MS) {
    memory.set(year, cached.days)
    return cached.days
  }
  if (inflight.has(year)) return inflight.get(year)!

  const task = (async () => {
    try {
      const res = await fetch(`https://timor.tech/api/holiday/year/${year}/`)
      if (!res.ok) throw new Error(`timor ${res.status}`)
      const json = (await res.json()) as TimorYearResponse
      const parsed = parseTimor(json)
      if (!parsed) throw new Error('timor parse failed')
      writeDiskCache(year, parsed)
      memory.set(year, parsed)
      return parsed
    } catch {
      if (cached) {
        memory.set(year, cached.days)
        return cached.days
      }
      const fb = weekdayFallback(year)
      memory.set(year, fb)
      return fb
    } finally {
      inflight.delete(year)
    }
  })()
  inflight.set(year, task)
  return task
}

function isWorkday(d: Dayjs, yearDays: YearDays): boolean {
  const key = d.format('YYYY-MM-DD')
  if (yearDays.holidays.includes(key)) return false
  if (yearDays.makeupWorkdays.includes(key)) return true
  const dow = d.day()
  return dow >= 1 && dow <= 5
}

async function loadYears(from: Dayjs, to: Dayjs): Promise<Map<number, YearDays>> {
  const years = new Set<number>()
  for (let cur = from; !cur.isAfter(to, 'day'); cur = cur.add(1, 'day')) {
    years.add(cur.year())
  }
  const byYear = new Map<number, YearDays>()
  for (const y of years) byYear.set(y, await fetchYear(y))
  return byYear
}

async function countWorkdays(from: Dayjs, to: Dayjs): Promise<number> {
  const byYear = await loadYears(from, to)
  let count = 0
  for (let cur = from; !cur.isAfter(to, 'day'); cur = cur.add(1, 'day')) {
    if (isWorkday(cur, byYear.get(cur.year())!)) count++
  }
  return count
}

export interface WorkdayAttendanceRow {
  date: string
  // 0=日 … 6=六
  weekday: number
  commitCount: number
  // 本地缓存无提交
  empty: boolean
}

/**
 * 列出闭区间内的法定工作日（含调休上班日，不含节假日）
 */
export async function listStatutoryWorkdays(from: Dayjs, to: Dayjs): Promise<string[]> {
  const byYear = await loadYears(from, to)
  const days: string[] = []
  for (let cur = from; !cur.isAfter(to, 'day'); cur = cur.add(1, 'day')) {
    if (isWorkday(cur, byYear.get(cur.year())!)) days.push(cur.format('YYYY-MM-DD'))
  }
  return days
}

/**
 * 法定工作日 × 本地缓存提交数（按自然日）
 */
export async function buildWorkdayAttendance(
  from: Dayjs,
  to: Dayjs,
  commitCountByDay: Map<string, number>
): Promise<WorkdayAttendanceRow[]> {
  const workdays = await listStatutoryWorkdays(from, to)
  return workdays.map((date) => {
    const commitCount = commitCountByDay.get(date) || 0
    return {
      date,
      weekday: dayjs(date).day(),
      commitCount,
      empty: commitCount === 0
    }
  })
}

function rangeBoundsForKind(
  kind: ReportKind,
  date?: string
): { from: Dayjs; to: Dayjs } | null {
  if (kind !== 'week' && kind !== 'month') return null
  const d = dayjs(date || dayjs().format('YYYY-MM-DD'))
  if (kind === 'week') {
    return { from: d.startOf('isoWeek'), to: d.endOf('isoWeek') }
  }
  return { from: d.startOf('month'), to: d.endOf('month') }
}

export async function resolveStatutoryWorkdays(
  kind: ReportKind,
  date?: string
): Promise<number | undefined> {
  const bounds = rangeBoundsForKind(kind, date)
  if (!bounds) return undefined
  return countWorkdays(bounds.from, bounds.to)
}

/**
 * 周/月报出勤对照数据；其它 kind 返回 undefined
 */
export async function resolveWorkdayAttendance(
  kind: ReportKind,
  date: string | undefined,
  commitCountByDay: Map<string, number>
): Promise<{ statutoryWorkdays: number; rows: WorkdayAttendanceRow[] } | undefined> {
  const bounds = rangeBoundsForKind(kind, date)
  if (!bounds) return undefined
  const rows = await buildWorkdayAttendance(bounds.from, bounds.to, commitCountByDay)
  return { statutoryWorkdays: rows.length, rows }
}
