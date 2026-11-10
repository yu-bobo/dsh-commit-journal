# Changelog

## 0.1.2

- Native horizontal tabs: Accounts / Repos / Commits / Activity / Logs / Settings
- DSH dual-theme via `--dsw-alias-*` tokens; no top bar (activate account on Accounts tab)
- Expand local UI HTTP API for panel CRUD; remove standalone heatmap HTML page

## 0.1.1

- Fix Desktop web boot: ship `client.js` as `__ModuleLoader__` CJS factory (not ESM)
- Sidebar panel embeds local heatmap UI; align `dsh.client.inject` with locale/layout/sidebar

## 0.1.0

- Initial open-source release as a DeepSeek Harness (`dsh`) plugin
- Multi-VCS provider abstraction (`codeup` | `gitlab` | `github`)
- Codeup adapter: sync commits, list repos/branches, connection test
- Agent tools: accounts, sync, query, period report, activity heatmap
- Local GitHub-style activity heatmap Web UI (`http://127.0.0.1:39282/`)
- Roadmap stubs for enterprise GitLab / GitHub
