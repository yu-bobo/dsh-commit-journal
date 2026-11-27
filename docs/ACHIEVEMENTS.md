# 成就规则

基于本地提交缓存（`StoredCommit`）按 **账号** 评估；与 GitHub 个人主页成就类似，多数徽章分 **铜 / 银 / 金** 三档，UI 上标记为 **x2 / x3 / x4**。

权威实现：[`src/core/achievements.ts`](../src/core/achievements.ts)（改阈值或条件时请同步更新本文档）。

## 通则

| 项 | 说明 |
|----|------|
| 数据源 | 该账号已同步入库的全部提交；**不排除** merge |
| 时区 | 与活跃热力图一致：按本机本地时区解析 `committedAt` |
| 解锁 | 只升不降；首次达标写入 `unlockedAt`（回溯用首次达标提交时间） |
| 持久化 | `~/.dsh-commit-journal/achievements.json` |
| 触发 | 同步成功后自动评估；打开成就弹窗 / `GET /api/achievements` / Agent `get_achievements` 也会评估 |
| 删账号 | 清除该账号解锁记录 |
| 清空提交 | **不**撤销已解锁成就 |
| 徽章图 | `assets/achievements/{id}.png`；缺图时 UI 占位 |
| 档位标记 | 铜=`x2`，银=`x3`，金=`x4`（对齐 GitHub）；单级成就无此标记 |

## 目录（20）

| id | 中文 | 英文 | 指标 | x2 | x3 | x4 |
|----|------|------|------|----|----|-----|
| `first-blood` | 初出茅庐 | First Blood | 累计提交数 | 1（单级） | — | — |
| `commit-marathon` | 提交马拉松 | Commit Marathon | 累计提交数 | 10 | 100 | 1000 |
| `streak` | 连击不息 | Streak | 历史最长连续活跃天 | 3 | 7 | 30 |
| `active-calendar` | 日历战士 | Active Calendar | 累计活跃天数 | 7 | 30 | 100 |
| `polyrepo` | 多仓游侠 | Polyrepo | 去重仓库数 | 3 | 10 | 25 |
| `night-owl` | 夜猫子 | Night Owl | 本地小时 ∈ [0, 5) 的提交数 | 1 | 25 | 100 |
| `early-bird` | 早起鸟 | Early Bird | 本地小时 ∈ [5, 8) 的提交数 | 1 | 25 | 100 |
| `weekend-warrior` | 周末战士 | Weekend Warrior | 周六或周日提交数 | 1 | 25 | 100 |
| `busy-day` | 爆肝一日 | Busy Day | 单日最高提交数 | 10 | 20 | 40 |
| `heavy-diff` | 大刀阔斧 | Heavy Diff | 单次 `additions+deletions` 最大（无 stats 跳过） | 5000 | 20000 | 50000 |
| `conventional` | 规范使者 | Conventional | 能解析出 conventional `type` 的提交数 | 50 | 200 | 800 |
| `midnight-oil` | 午夜燃油 | Midnight Oil | 跨午夜场次（见下） | 1 | 10 | 30 |
| `one-liner` | 一言蔽之 | One-Liner | 标题长度 ≤ 20 的提交数 | 10 | 50 | 200 |
| `fixer` | 修修补补 | Fixer | `type === fix` | 25 | 100 | 400 |
| `shipper` | 功能船长 | Shipper | `type === feat` | 25 | 100 | 400 |
| `repo-loyalist` | 仓库死忠 | Repo Loyalist | 单仓最高提交数 | 20 | 100 | 500 |
| `yearbook` | 年鉴收录 | Yearbook | 有提交的自然年个数 | 2 | 3 | 5 |
| `ticket-tracker` | 工单猎人 | Ticket Tracker | 解析出 ticket 的提交数 | 5 | 25 | 100 |
| `scope-smith` | 作用域匠 | Scope Smith | 带 `scope` 的 conventional 提交数 | 5 | 25 | 100 |
| `refactor-ranger` | 重构游侠 | Refactor Ranger | `type === refactor` | 3 | 15 | 50 |

## 指标说明

### 活跃 / 时间类

- **活跃天**：本地日历日至少 1 条提交。
- **连续活跃天（streak）**：按本地日期排序后，相邻日期差为 1 天的最长段；全历史，不限于热力图所选年份。
- **夜猫子 / 早起鸟 / 周末战士**：按提交落在的本地小时 / 星期计数。
- **午夜燃油**：存在本地日 `D` 上小时 ≥ 22 的提交，且次日 `D+1` 上小时 &lt; 3 的提交，计 1 场；多场累计。

### Diff / 文本类

- **大刀阔斧**：仅统计带 `additions` 或 `deletions` 的提交；取单次 `(additions||0)+(deletions||0)` 最大值。
- **一言蔽之**：`commitTitleLine` 长度 ≤ 20（字符）。
- **conventional / fix / feat / refactor / scope / ticket**：走 `parseConventional`（与报告解析同一套规则）。

### 仓库 / 年份

- **多仓游侠**：`repoId` 去重个数。
- **仓库死忠**：同一 `repoId` 下提交数的最大值。
- **年鉴收录**：`committedAt` 落在的本地自然年去重个数。

## 面板与 API

- **入口**：活跃页 → 年份选择器左侧徽章图标。
- **列表**：4×5 网格；点击打开详情（大图、介绍、进度、档位里程碑）。
- **HTTP**：`GET /api/achievements?accountId=`；徽章静态资源 `GET /assets/achievements/{id}.png`。
- **Agent**：`get_achievements`。

## 维护清单

改规则时请同时：

1. 更新 [`src/core/achievements.ts`](../src/core/achievements.ts) 中 `ACHIEVEMENT_DEFS` / `computeMetrics` / `firstUnlockTimes`
2. 更新本文档表格与说明
3. 若新增 id：补 `assets/achievements/{id}.png`（建议 512×512），并视情况改 CHANGELOG
