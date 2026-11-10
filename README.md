# dsh-commit-journal

> DeepSeek Harness (`dsh`) plugin · [English](#english) · 中文

同步代码托管平台的提交记录，生成本地日 / 周 / 月报 Markdown 材料，并提供 **GitHub 风格活跃热力图**。

| 能力 | 说明 |
|------|------|
| 多账号 | 本机加密存放 PAT（`~/.dsh-commit-journal/secrets`） |
| 增量同步 | 按关注仓库 / 作者过滤拉取提交 |
| 报告 | `get_period_report`：日 / 周 / 月 / 自定义；周月含中国大陆法定工作日 |
| 热力图 | 本机 Web UI + `get_activity_heatmap` 工具 |
| Provider | **v0.1：Codeup**；GitLab / GitHub 企业版见路线图 |

与桌面端 [codeup-journal](https://github.com/yu-bobo/codeup-journal) 功能同源，数据目录独立，互不覆盖。

## 安装

```sh
# GitHub 直装（推荐）
dsh plugin --profile web add github:yu-bobo/dsh-commit-journal

# 本地开发
dsh plugin --profile web add link:F:/Personal/projects/dsh-commit-journal
```

若 pnpm 提示拒绝 `prepare` 构建脚本，在 profile 的 `pnpm-workspace.yaml` 允许：

```yaml
allowBuilds:
  dsh-commit-journal: true
```

然后重启 `dsh web`。

## 快速开始

1. 让 Agent 调用 `upsert_account`（中心版填 `organizationId` + PAT；Region 版填 `apiBaseUrl`）
2. 调用 `sync_commits`
3. 调用 `get_period_report` / `query_commits` / `get_activity_heatmap`
4. 打开热力图：Agent 调 `open_activity_heatmap`，或浏览器访问 `http://127.0.0.1:39282/`

### 云效 PAT 权限

个人访问令牌至少：

- 代码仓库 → 只读
- 提交 → 只读

建议同时：代码组、分支 → 只读。改权限后请**新建**令牌。

## Agent 工具

| Tool | 说明 |
|------|------|
| `list_accounts` | 列账号 |
| `upsert_account` / `remove_account` | 管理账号 |
| `sync_commits` | 增量同步 |
| `list_repos` | 仓库列表 |
| `query_commits` | 查询提交 |
| `get_period_report` | 日/周/月报 Markdown |
| `get_activity_heatmap` | 热力数据 / 单日明细 |
| `open_activity_heatmap` | 返回本机热力图 URL |
| `update_journal_settings` | 同步间隔、回溯天数、导出目录、UI 端口 |

## 数据目录

```text
~/.dsh-commit-journal/   # 可用环境变量 DSH_COMMIT_JOURNAL_HOME 覆盖
  accounts.json
  settings.json
  secrets/*.bin          # AES-GCM，密钥派生自本机特征
  data.json              # 仓库 / 提交 / 同步状态
  holiday-cache/
  exports/
```

## 路线图

- [x] Codeup（阿里云云效）
- [ ] GitLab（含自建）
- [ ] GitHub / GitHub Enterprise
- [ ] 原生 dsh Settings 表单（当前可用工具 + 本地 JSON / 热力图 UI）

Provider 接口已固定在 `src/providers/`：`testConnection` / `listRepos` / `listBranches` / `listCommitsSince`。

## 开发

```sh
npm install
npm run build
npm run typecheck
```

本地 link 到 desktop profile 后**必须重启 DSH**。浏览器侧 `client.js` 必须是
`window.__ModuleLoader__.load({ id, factory })` 的 CJS 闭包格式（不要打成带
`import` 的 ESM），否则 Desktop 会报 `Cannot use import statement outside a module`
并阻断 web boot。

## License

MIT

---

<a id="english"></a>

## English

DeepSeek Harness plugin that syncs VCS commits (Codeup today; GitLab/GitHub next), builds day/week/month Markdown report drafts, and shows a GitHub-style activity heatmap at `http://127.0.0.1:39282/`.

```sh
dsh plugin --profile web add github:yu-bobo/dsh-commit-journal
```
