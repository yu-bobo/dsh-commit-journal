# dsh-commit-journal

DeepSeek Harness (`dsh`) 插件：同步代码托管平台提交、浏览时间线与活跃热力图。

| 能力 | 说明 |
|------|------|
| 多账号 | 本机加密存放 PAT（`~/.dsh-commit-journal/secrets`） |
| 增量同步 | 按关注仓库 / 作者过滤拉取提交 |
| 面板 | 账号 · 仓库 · 提交 · 活跃 · 日志 · 设置 |
| Provider | **v0.1：Codeup**；GitLab / GitHub 企业版见路线图 |

侧栏打开「提交日志」即可使用。与桌面端 [codeup-journal](https://github.com/yu-bobo/codeup-journal) 功能同源，数据目录独立。

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

1. 打开侧栏「提交日志」→ **账号**：新建 Codeup 账号（中心版填 organizationId + PAT；Region 版填 API Base）
2. 在账号列表点 **使用** 切换当前账号
3. **仓库**：刷新、勾选关注、保存后「同步关注」
4. **提交 / 活跃 / 日志** 查看记录；**设置** 调整同步间隔与回溯天数

### 云效 PAT 权限

个人访问令牌至少：代码仓库、提交 → 只读。建议同时：代码组、分支 → 只读。改权限后请新建令牌。

## Agent 能做什么

插件把本机同步到的 Codeup 提交交给 Agent 工具调用。适合：

- 写日报 / 周报 / 月报（按提交材料改写）
- 查某段时间、某个仓库、某个关键词的提交
- 看活跃热力、某天具体改了什么
- 先同步再汇总（数据以本地缓存为准）

面板负责配账号、关注仓库、看 UI；报告类能力主要走对话里的 tools（无「报告」页签）。

## Agent 工具

| Tool | 说明 |
|------|------|
| `list_accounts` | 列本地账号与当前活跃账号 |
| `upsert_account` / `remove_account` | 创建、更新、删除账号（PAT 加密存本机） |
| `sync_commits` | 增量同步关注仓库提交 |
| `list_repos` | 仓库列表（可只列已有提交的） |
| `query_commits` | 按日期 / 仓库 / 关键词查本地提交 |
| `get_period_report` | 日 / 周 / 月 / 自定义区间 Markdown 材料（可落盘） |
| `get_activity_heatmap` | 热力统计；传 `date` 可取单日明细 |
| `update_journal_settings` | 同步间隔、回溯天数、导出目录等 |

## 可直接对 Agent 说的提示词

```text
先 list_accounts，用当前账号 sync_commits，再给我昨天的工作日报（get_period_report kind=day）。
```

```text
查本周我在各仓库的提交，按仓库分组总结做了什么（query_commits + 必要时 get_period_report kind=week）。
```

```text
生成这个月的月报材料，标注法定工作日，Markdown 落盘（get_period_report kind=month, exportFile=true）。
```

```text
看近一年活跃热力：总提交、活跃天数、最长连续；并列出提交最多的那天明细（get_activity_heatmap，再带 date）。
```

```text
搜索关键词「修复」近 30 天的提交，列出仓库、时间和说明（query_commits）。
```

```text
同步账号 xxx 的提交后，列出有提交记录的仓库（sync_commits → list_repos）。
```

建议流程：`list_accounts` →（缺数据则）`sync_commits` → `query_commits` / `get_period_report` / `get_activity_heatmap`。

## 数据目录

```text
~/.dsh-commit-journal/   # 可用环境变量 DSH_COMMIT_JOURNAL_HOME 覆盖
  accounts.json
  settings.json
  secrets/*.bin
  data.json
  holiday-cache/
  exports/
```

## 路线图

- [x] Codeup（阿里云云效）
- [ ] GitLab（含自建）
- [ ] GitHub / GitHub Enterprise

## License

MIT
