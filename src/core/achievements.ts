import dayjs from 'dayjs'
import { achievementStore } from './achievementStore.js'
import { parseConventional } from './commitParse.js'
import { commitTitleLine } from './commitText.js'
import { db } from './db.js'
import type {
  AchievementTier,
  AchievementTierView,
  AchievementUnlock,
  AchievementView,
  StoredCommit
} from './types.js'

type MetricKey =
  | 'totalCommits'
  | 'longestStreak'
  | 'activeDays'
  | 'repoCount'
  | 'nightOwl'
  | 'earlyBird'
  | 'weekend'
  | 'maxDayCount'
  | 'maxDiff'
  | 'conventional'
  | 'midnightOil'
  | 'oneLiner'
  | 'fixer'
  | 'shipper'
  | 'repoLoyalist'
  | 'yearbook'
  | 'ticketTracker'
  | 'scoped'
  | 'refactor'

interface AchievementDef {
  id: string
  nameZh: string
  nameEn: string
  descriptionZh: string
  descriptionEn: string
  metric: MetricKey
  // 单级传一个阈值；分级按铜/银/金
  thresholds: number[]
}

interface Metrics {
  totalCommits: number
  longestStreak: number
  activeDays: number
  repoCount: number
  nightOwl: number
  earlyBird: number
  weekend: number
  maxDayCount: number
  maxDiff: number
  conventional: number
  midnightOil: number
  oneLiner: number
  fixer: number
  shipper: number
  repoLoyalist: number
  yearbook: number
  ticketTracker: number
  scoped: number
  refactor: number
}

const TIER_ORDER: AchievementTier[] = ['bronze', 'silver', 'gold']
const ONE_LINER_MAX = 20

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first-blood',
    nameZh: '初出茅庐',
    nameEn: 'First Blood',
    descriptionZh: '完成第一次提交同步入库',
    descriptionEn: 'Record your first commit',
    metric: 'totalCommits',
    thresholds: [1]
  },
  {
    id: 'commit-marathon',
    nameZh: '提交马拉松',
    nameEn: 'Commit Marathon',
    descriptionZh: '累计提交达到里程碑',
    descriptionEn: 'Reach commit count milestones',
    metric: 'totalCommits',
    thresholds: [10, 100, 1000]
  },
  {
    id: 'streak',
    nameZh: '连击不息',
    nameEn: 'Streak',
    descriptionZh: '连续活跃天数达到里程碑',
    descriptionEn: 'Keep consecutive active days',
    metric: 'longestStreak',
    thresholds: [3, 7, 30]
  },
  {
    id: 'active-calendar',
    nameZh: '日历战士',
    nameEn: 'Active Calendar',
    descriptionZh: '累计活跃天数达到里程碑',
    descriptionEn: 'Accumulate active calendar days',
    metric: 'activeDays',
    thresholds: [7, 30, 100]
  },
  {
    id: 'polyrepo',
    nameZh: '多仓游侠',
    nameEn: 'Polyrepo',
    descriptionZh: '在多个仓库留下提交',
    descriptionEn: 'Commit across multiple repositories',
    metric: 'repoCount',
    thresholds: [3, 10, 25]
  },
  {
    id: 'night-owl',
    nameZh: '夜猫子',
    nameEn: 'Night Owl',
    descriptionZh: '在本地 0–5 点提交',
    descriptionEn: 'Commit between 00:00 and 05:00 local time',
    metric: 'nightOwl',
    thresholds: [1, 25, 100]
  },
  {
    id: 'early-bird',
    nameZh: '早起鸟',
    nameEn: 'Early Bird',
    descriptionZh: '在本地 5–8 点提交',
    descriptionEn: 'Commit between 05:00 and 08:00 local time',
    metric: 'earlyBird',
    thresholds: [1, 25, 100]
  },
  {
    id: 'weekend-warrior',
    nameZh: '周末战士',
    nameEn: 'Weekend Warrior',
    descriptionZh: '在周六或周日提交',
    descriptionEn: 'Commit on Saturday or Sunday',
    metric: 'weekend',
    thresholds: [1, 25, 100]
  },
  {
    id: 'busy-day',
    nameZh: '爆肝一日',
    nameEn: 'Busy Day',
    descriptionZh: '单日提交数达到里程碑',
    descriptionEn: 'Hit a high commit count in a single day',
    metric: 'maxDayCount',
    thresholds: [10, 20, 40]
  },
  {
    id: 'heavy-diff',
    nameZh: '大刀阔斧',
    nameEn: 'Heavy Diff',
    descriptionZh: '单次提交增删行合计达到里程碑（需有变更统计）',
    descriptionEn: 'Reach a large additions+deletions total in one commit',
    metric: 'maxDiff',
    thresholds: [5000, 20000, 50000]
  },
  {
    id: 'conventional',
    nameZh: '规范使者',
    nameEn: 'Conventional',
    descriptionZh: '使用 conventional 风格提交达到里程碑',
    descriptionEn: 'Land conventional-style commits',
    metric: 'conventional',
    thresholds: [50, 200, 800]
  },
  {
    id: 'midnight-oil',
    nameZh: '午夜燃油',
    nameEn: 'Midnight Oil',
    descriptionZh: '跨过午夜：前一晚 22 点后与次日凌晨 3 点前都有提交',
    descriptionEn: 'Commit after 22:00 and again before 03:00 the next day',
    metric: 'midnightOil',
    thresholds: [1, 10, 30]
  },
  {
    id: 'one-liner',
    nameZh: '一言蔽之',
    nameEn: 'One-Liner',
    descriptionZh: `标题不超过 ${ONE_LINER_MAX} 字的短提交`,
    descriptionEn: `Commits with title length ≤ ${ONE_LINER_MAX}`,
    metric: 'oneLiner',
    thresholds: [10, 50, 200]
  },
  {
    id: 'fixer',
    nameZh: '修修补补',
    nameEn: 'Fixer',
    descriptionZh: 'conventional 类型为 fix 的提交',
    descriptionEn: 'Land conventional fix commits',
    metric: 'fixer',
    thresholds: [25, 100, 400]
  },
  {
    id: 'shipper',
    nameZh: '功能船长',
    nameEn: 'Shipper',
    descriptionZh: 'conventional 类型为 feat 的提交',
    descriptionEn: 'Land conventional feat commits',
    metric: 'shipper',
    thresholds: [25, 100, 400]
  },
  {
    id: 'repo-loyalist',
    nameZh: '仓库死忠',
    nameEn: 'Repo Loyalist',
    descriptionZh: '单个仓库累计提交达到里程碑',
    descriptionEn: 'Concentrate commits in one repository',
    metric: 'repoLoyalist',
    thresholds: [20, 100, 500]
  },
  {
    id: 'yearbook',
    nameZh: '年鉴收录',
    nameEn: 'Yearbook',
    descriptionZh: '跨越多个自然年都有提交',
    descriptionEn: 'Commit across multiple calendar years',
    metric: 'yearbook',
    thresholds: [2, 3, 5]
  },
  {
    id: 'ticket-tracker',
    nameZh: '工单猎人',
    nameEn: 'Ticket Tracker',
    descriptionZh: '提交信息中带有工单号（如 ABC-123 / #123）',
    descriptionEn: 'Commits that reference a ticket id',
    metric: 'ticketTracker',
    thresholds: [5, 25, 100]
  },
  {
    id: 'scope-smith',
    nameZh: '作用域匠',
    nameEn: 'Scope Smith',
    descriptionZh: 'conventional 提交带有 scope，如 feat(api):',
    descriptionEn: 'Conventional commits that include a scope',
    metric: 'scoped',
    thresholds: [5, 25, 100]
  },
  {
    id: 'refactor-ranger',
    nameZh: '重构游侠',
    nameEn: 'Refactor Ranger',
    descriptionZh: 'conventional 类型为 refactor 的提交',
    descriptionEn: 'Land conventional refactor commits',
    metric: 'refactor',
    thresholds: [3, 15, 50]
  }
]

function tiersFor(def: AchievementDef): AchievementTier[] {
  if (def.thresholds.length === 1) return ['single']
  return TIER_ORDER.slice(0, def.thresholds.length)
}

function longestStreakFromDays(dayKeys: Iterable<string>): number {
  const days = Array.from(new Set(dayKeys)).sort()
  if (days.length === 0) return 0
  let best = 1
  let cur = 1
  for (let i = 1; i < days.length; i++) {
    const prev = dayjs(days[i - 1])
    const next = dayjs(days[i])
    if (next.diff(prev, 'day') === 1) {
      cur++
      if (cur > best) best = cur
    } else {
      cur = 1
    }
  }
  return best
}

function countMidnightOil(lateDays: Set<string>, earlyDays: Set<string>): number {
  let n = 0
  for (const day of lateDays) {
    const next = dayjs(day).add(1, 'day').format('YYYY-MM-DD')
    if (earlyDays.has(next)) n++
  }
  return n
}

function computeMetrics(commits: StoredCommit[]): Metrics {
  const repos = new Set<string>()
  const repoCounts = new Map<string, number>()
  const dayCounts = new Map<string, number>()
  const years = new Set<number>()
  const lateDays = new Set<string>()
  const earlyDays = new Set<string>()
  let nightOwl = 0
  let earlyBird = 0
  let weekend = 0
  let maxDiff = 0
  let conventional = 0
  let oneLiner = 0
  let fixer = 0
  let shipper = 0
  let ticketTracker = 0
  let scoped = 0
  let refactor = 0

  for (const c of commits) {
    repos.add(c.repoId)
    repoCounts.set(c.repoId, (repoCounts.get(c.repoId) || 0) + 1)
    const at = dayjs(c.committedAt)
    if (!at.isValid()) continue
    const day = at.format('YYYY-MM-DD')
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1)
    years.add(at.year())
    const hour = at.hour()
    if (hour >= 0 && hour < 5) nightOwl++
    if (hour >= 5 && hour < 8) earlyBird++
    if (hour >= 22) lateDays.add(day)
    if (hour < 3) earlyDays.add(day)
    const wd = at.day()
    if (wd === 0 || wd === 6) weekend++
    if (c.additions != null || c.deletions != null) {
      const diff = (c.additions ?? 0) + (c.deletions ?? 0)
      if (diff > maxDiff) maxDiff = diff
    }
    const parsed = parseConventional(c)
    if (parsed.type) conventional++
    if (parsed.type === 'fix') fixer++
    if (parsed.type === 'feat') shipper++
    if (parsed.type === 'refactor') refactor++
    if (parsed.ticket) ticketTracker++
    if (parsed.scope) scoped++
    if (commitTitleLine(c).length <= ONE_LINER_MAX) oneLiner++
  }

  let maxDayCount = 0
  for (const n of dayCounts.values()) {
    if (n > maxDayCount) maxDayCount = n
  }
  let repoLoyalist = 0
  for (const n of repoCounts.values()) {
    if (n > repoLoyalist) repoLoyalist = n
  }

  return {
    totalCommits: commits.length,
    longestStreak: longestStreakFromDays(dayCounts.keys()),
    activeDays: dayCounts.size,
    repoCount: repos.size,
    nightOwl,
    earlyBird,
    weekend,
    maxDayCount,
    maxDiff,
    conventional,
    midnightOil: countMidnightOil(lateDays, earlyDays),
    oneLiner,
    fixer,
    shipper,
    repoLoyalist,
    yearbook: years.size,
    ticketTracker,
    scoped,
    refactor
  }
}

const SET_METRICS = new Set<MetricKey>([
  'longestStreak',
  'activeDays',
  'maxDayCount',
  'repoCount',
  'midnightOil',
  'repoLoyalist',
  'yearbook'
])

// 按时间扫描，记录各档首次达标时刻
function firstUnlockTimes(
  def: AchievementDef,
  commits: StoredCommit[]
): Partial<Record<AchievementTier, string>> {
  const sorted = commits
    .slice()
    .sort((a, b) => a.committedAt.localeCompare(b.committedAt))
  const out: Partial<Record<AchievementTier, string>> = {}
  const tiers = tiersFor(def)

  if (SET_METRICS.has(def.metric)) {
    const byDay = new Map<string, StoredCommit[]>()
    for (const c of sorted) {
      const at = dayjs(c.committedAt)
      if (!at.isValid()) continue
      const key = at.format('YYYY-MM-DD')
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key)!.push(c)
    }
    const dayKeys = Array.from(byDay.keys()).sort()
    const repos = new Set<string>()
    const repoCounts = new Map<string, number>()
    const active = new Set<string>()
    const years = new Set<number>()
    const lateDays = new Set<string>()
    const earlyDays = new Set<string>()
    let maxDay = 0
    let repoLoyalist = 0

    for (const day of dayKeys) {
      const list = byDay.get(day) || []
      active.add(day)
      years.add(dayjs(day).year())
      for (const c of list) {
        repos.add(c.repoId)
        const n = (repoCounts.get(c.repoId) || 0) + 1
        repoCounts.set(c.repoId, n)
        if (n > repoLoyalist) repoLoyalist = n
        const hour = dayjs(c.committedAt).hour()
        if (hour >= 22) lateDays.add(day)
        if (hour < 3) earlyDays.add(day)
      }
      if (list.length > maxDay) maxDay = list.length
      const streak = longestStreakFromDays(active)
      const value =
        def.metric === 'longestStreak'
          ? streak
          : def.metric === 'activeDays'
            ? active.size
            : def.metric === 'maxDayCount'
              ? maxDay
              : def.metric === 'repoCount'
                ? repos.size
                : def.metric === 'midnightOil'
                  ? countMidnightOil(lateDays, earlyDays)
                  : def.metric === 'repoLoyalist'
                    ? repoLoyalist
                    : years.size
      const stamp = list[list.length - 1]?.committedAt || `${day}T23:59:59.000Z`
      for (let i = 0; i < def.thresholds.length; i++) {
        const tier = tiers[i]
        if (!out[tier] && value >= def.thresholds[i]) out[tier] = stamp
      }
    }
    return out
  }

  let total = 0
  let nightOwl = 0
  let earlyBird = 0
  let weekend = 0
  let maxDiff = 0
  let conventional = 0
  let oneLiner = 0
  let fixer = 0
  let shipper = 0
  let ticketTracker = 0
  let scoped = 0
  let refactor = 0

  for (const c of sorted) {
    total++
    const at = dayjs(c.committedAt)
    if (at.isValid()) {
      const hour = at.hour()
      if (hour >= 0 && hour < 5) nightOwl++
      if (hour >= 5 && hour < 8) earlyBird++
      const wd = at.day()
      if (wd === 0 || wd === 6) weekend++
    }
    if (c.additions != null || c.deletions != null) {
      const diff = (c.additions ?? 0) + (c.deletions ?? 0)
      if (diff > maxDiff) maxDiff = diff
    }
    const parsed = parseConventional(c)
    if (parsed.type) conventional++
    if (parsed.type === 'fix') fixer++
    if (parsed.type === 'feat') shipper++
    if (parsed.type === 'refactor') refactor++
    if (parsed.ticket) ticketTracker++
    if (parsed.scope) scoped++
    if (commitTitleLine(c).length <= ONE_LINER_MAX) oneLiner++

    const value =
      def.metric === 'totalCommits'
        ? total
        : def.metric === 'nightOwl'
          ? nightOwl
          : def.metric === 'earlyBird'
            ? earlyBird
            : def.metric === 'weekend'
              ? weekend
              : def.metric === 'maxDiff'
                ? maxDiff
                : def.metric === 'oneLiner'
                  ? oneLiner
                  : def.metric === 'fixer'
                    ? fixer
                    : def.metric === 'shipper'
                      ? shipper
                      : def.metric === 'ticketTracker'
                        ? ticketTracker
                        : def.metric === 'scoped'
                          ? scoped
                          : def.metric === 'refactor'
                            ? refactor
                            : conventional

    for (let i = 0; i < def.thresholds.length; i++) {
      const tier = tiers[i]
      if (!out[tier] && value >= def.thresholds[i]) out[tier] = c.committedAt
    }
  }
  return out
}

function metricValue(metrics: Metrics, key: MetricKey): number {
  return metrics[key]
}

function highestUnlocked(
  tiers: AchievementTierView[]
): AchievementTier | null {
  let best: AchievementTier | null = null
  for (const t of tiers) {
    if (!t.unlocked) continue
    best = t.tier
  }
  return best
}

/**
 * 评估账号成就：计算进度、持久化新解锁、返回视图
 */
export function evaluateAchievements(accountId: string): AchievementView[] {
  const commits = db.queryCommits({ accountId, limit: 1_000_000, offset: 0 }).items
  const metrics = computeMetrics(commits)
  const existing = achievementStore.listUnlocks(accountId)
  const byKey = new Map<string, AchievementUnlock>()
  for (const u of existing) byKey.set(`${u.achievementId}::${u.tier}`, u)
  const pending: AchievementUnlock[] = []
  const views: AchievementView[] = []

  for (const def of ACHIEVEMENT_DEFS) {
    const current = metricValue(metrics, def.metric)
    const tierIds = tiersFor(def)
    const firstTimes = firstUnlockTimes(def, commits)
    const tierViews: AchievementTierView[] = []

    for (let i = 0; i < def.thresholds.length; i++) {
      const tier = tierIds[i]
      const threshold = def.thresholds[i]
      const key = `${def.id}::${tier}`
      const prev = byKey.get(key)
      const reached = current >= threshold
      let unlockedAt = prev?.unlockedAt
      if (reached && !prev) {
        unlockedAt = firstTimes[tier] || new Date().toISOString()
        pending.push({
          accountId,
          achievementId: def.id,
          tier,
          unlockedAt
        })
      }
      tierViews.push({
        tier,
        threshold,
        unlocked: Boolean(prev) || reached,
        unlockedAt
      })
    }

    views.push({
      id: def.id,
      nameZh: def.nameZh,
      nameEn: def.nameEn,
      descriptionZh: def.descriptionZh,
      descriptionEn: def.descriptionEn,
      icon: def.id,
      tiers: tierViews,
      current,
      highestTier: highestUnlocked(tierViews)
    })
  }

  achievementStore.addUnlocks(pending)
  return views
}
