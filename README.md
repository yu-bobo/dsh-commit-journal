# dsh-commit-journal

DeepSeek Harness (`dsh`) 插件：按账号选择 **远程拉取**（Codeup）或 **本地扫描**（本机 git 根目录），浏览时间线与活跃热力图，并交给 Agent 写日/周/月报材料。

| 能力 | 说明 |
|------|------|
| 双模式账号 | **remote**：云效 PAT 拉仓；**local**：手填根目录扫 `.git`，无需令牌 |
| 多账号 | 本机加密存放 PAT（仅 remote）；local 只存根路径 |
| 增量同步 | 按关注仓库 / 作者过滤；定时任务两种模式共用 |
| 面板 | 账号 · 仓库 · 提交 · 活跃 · 日志 · 设置（文案随当前账号模式变化） |
| Provider | **remote：Codeup**；**local：本机 git**；GitLab / GitHub 企业版见路线图 |

侧栏打开「提交日志」即可使用。与桌面端 [codeup-journal](https://github.com/yu-bobo/codeup-journal) 功能同源（远程侧），数据目录独立。

**定位**：适合「未 clone / 不想逐仓告知路径」的跨仓提交材料，或「本机多根目录批量索引」。若只需当前工作区一条 `git log`，不必装本插件；若要钉钉+云效工作台全家桶，见社区 WorkHub 等产品。

## 安装

```sh
dsh plugin --profile web add github:yu-bobo/dsh-commit-journal
```

本地开发：

```sh
dsh plugin --profile web add link:<本仓库路径>
```

重启 DSH 后生效。

## 使用

### 远程账号（Codeup）

1. 打开侧栏「提交日志」→ **账号** → 新建，模式选 **远程拉取**
2. 中心版填 organizationId + PAT；Region 版填 API Base
3. 点 **使用** 切换当前账号 → **仓库** 刷新、关注、「同步关注」

### 本地账号（扫描）

1. 新建账号，模式选 **本地扫描**
2. 「扫描根目录」每行一个绝对路径（如 `F:\Personal\projects`）
3. **仓库** → **重新扫描** → 勾选关注 → **同步关注（本地）**（对关注仓跑 `git log` 入库）

### 共用

- **提交 / 活跃 / 日志** 读本地缓存；**设置** 调整同步间隔与回溯天数（对 remote API 与 local 重扫均生效）

### 云效 PAT 权限（仅 remote）

个人访问令牌至少：代码仓库、提交 → 只读。建议同时：代码组、分支 → 只读。改权限后请新建令牌。

## Agent 能做什么

插件把同步到的提交交给 Agent 工具调用。适合：

- 写日报 / 周报 / 月报（按提交材料改写）
- 查某段时间、某个仓库、某个关键词的提交
- 看活跃热力、某天具体改了什么
- 先同步再汇总（数据以本地缓存为准）

面板负责配账号、关注仓库、看 UI；报告类能力主要走对话里的 tools（无「报告」页签）。

## Agent 工具

| Tool | 说明 |
|------|------|
| `list_accounts` | 列本地账号（含 `mode` / `localRoots`）与当前活跃账号 |
| `upsert_account` / `remove_account` | 创建、更新、删除；`mode=local` 时填 `localRoots`，无需 token |
| `sync_commits` | 增量同步（remote API 或 local `git log`） |
| `list_repos` | 仓库列表；`refresh` 时 remote 拉 API / local 重扫 |
| `query_commits` | 按日期 / 仓库 / 关键词查本地提交 |
| `get_period_report` | 日 / 周 / 月 / 自定义区间 Markdown 材料（可落盘） |
| `get_activity_heatmap` | 热力统计；传 `date` 可取单日明细 |
| `update_journal_settings` | 同步间隔、回溯天数、导出目录等 |

## 可直接对 Agent 说的提示词

```text
先 list_accounts，用当前账号 sync_commits，再给我昨天的工作日报（get_period_report kind=day）。
```

```text
新建一个本地扫描账号，localRoots 为 F:\Personal\projects，作者过滤我的邮箱，然后 refresh 仓库并 sync。
```

```text
查本周我在各仓库的提交，按仓库分组总结做了什么（query_commits + 必要时 get_period_report kind=week）。
```

建议流程：`list_accounts` →（缺数据则）`sync_commits` → `query_commits` / `get_period_report` / `get_activity_heatmap`。

## 数据目录

```text
~/.dsh-commit-journal/   # 可用环境变量 DSH_COMMIT_JOURNAL_HOME 覆盖
  accounts.json
  settings.json
  secrets/*.bin          # 仅 remote 账号
  data.json
  holiday-cache/
  exports/
```

## 路线图

- [x] Codeup（阿里云云效）远程拉取
- [x] 本机 git 根目录扫描（按账号）
- [ ] GitLab（含自建）
- [ ] GitHub / GitHub Enterprise

## License

MIT
