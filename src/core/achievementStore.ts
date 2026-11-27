import { existsSync, readFileSync, writeFileSync } from 'fs'
import { achievementsPath } from './paths.js'
import type { AchievementTier, AchievementUnlock } from './types.js'

interface AchievementStoreData {
  unlocks: AchievementUnlock[]
}

const empty: AchievementStoreData = { unlocks: [] }

function load(): AchievementStoreData {
  const path = achievementsPath()
  if (!existsSync(path)) return structuredClone(empty)
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    const unlocks = Array.isArray(raw.unlocks) ? raw.unlocks : []
    return {
      unlocks: unlocks
        .filter(
          (u: any) =>
            u &&
            typeof u.accountId === 'string' &&
            typeof u.achievementId === 'string' &&
            typeof u.tier === 'string' &&
            typeof u.unlockedAt === 'string'
        )
        .map((u: any) => ({
          accountId: String(u.accountId),
          achievementId: String(u.achievementId),
          tier: u.tier as AchievementTier,
          unlockedAt: String(u.unlockedAt)
        }))
    }
  } catch {
    return structuredClone(empty)
  }
}

function save(data: AchievementStoreData): void {
  writeFileSync(achievementsPath(), JSON.stringify(data, null, 2), 'utf8')
}

function unlockKey(u: Pick<AchievementUnlock, 'accountId' | 'achievementId' | 'tier'>): string {
  return `${u.accountId}::${u.achievementId}::${u.tier}`
}

// 顺序无关指纹：用于检测 load→save 窗口内是否被其它写入改过
function unlocksFingerprint(unlocks: AchievementUnlock[]): string {
  return unlocks.map(unlockKey).sort().join('\n')
}

const CAS_ATTEMPTS = 8

/**
 * 成就解锁持久化
 */
export const achievementStore = {
  listUnlocks(accountId?: string): AchievementUnlock[] {
    const all = load().unlocks
    if (!accountId) return all
    return all.filter((u) => u.accountId === accountId)
  },

  // 仅追加新解锁；已存在的档位不降级、不改时间
  // CAS：保存前再读盘，指纹变了则重试合并，避免并发后写覆盖先写丢解锁
  addUnlocks(next: AchievementUnlock[]): number {
    if (next.length === 0) return 0

    for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
      const base = load()
      const baseFp = unlocksFingerprint(base.unlocks)
      const seen = new Set(base.unlocks.map(unlockKey))
      const merged = base.unlocks.slice()
      let added = 0
      for (const u of next) {
        const key = unlockKey(u)
        if (seen.has(key)) continue
        merged.push(u)
        seen.add(key)
        added++
      }
      if (added === 0) return 0

      // 保存前再 load：期间若有其它写入则重新以最新状态合并
      if (unlocksFingerprint(load().unlocks) !== baseFp) continue

      save({ unlocks: merged })
      return added
    }

    // 重试用尽：以当前磁盘为准强制合并一次
    const data = load()
    const seen = new Set(data.unlocks.map(unlockKey))
    let added = 0
    for (const u of next) {
      const key = unlockKey(u)
      if (seen.has(key)) continue
      data.unlocks.push(u)
      seen.add(key)
      added++
    }
    if (added > 0) save(data)
    return added
  },

  deleteAccountUnlocks(accountId: string): void {
    for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
      const base = load()
      const baseFp = unlocksFingerprint(base.unlocks)
      const filtered = base.unlocks.filter((u) => u.accountId !== accountId)
      if (filtered.length === base.unlocks.length) return

      if (unlocksFingerprint(load().unlocks) !== baseFp) continue

      save({ unlocks: filtered })
      return
    }

    const data = load()
    save({ unlocks: data.unlocks.filter((u) => u.accountId !== accountId) })
  }
}
