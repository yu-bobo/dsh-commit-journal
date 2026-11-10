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

## Agent 工具

| Tool | 说明 |
|------|------|
| `list_accounts` | 列账号 |
| `upsert_account` / `remove_account` | 管理账号 |
| `sync_commits` | 增量同步 |
| `list_repos` | 仓库列表 |
| `query_commits` | 查询提交 |
| `get_period_report` | 日/周/月报 Markdown（对话用，无面板页） |
| `get_activity_heatmap` | 热力数据 / 单日明细 |
| `update_journal_settings` | 同步与导出设置 |

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
