# Changelog

## 0.1.7

- Repos: All / Watched / Unwatched filter
- Notices use panel theme tokens (no always-dark Toast)
- Logs page: 10-per-page pagination

## 0.1.6

- Action feedback via Toast (success/error) for sync and other ops
- Activity: weekdays on the left, month labels, weekday distribution + streak/avg insights

## 0.1.5

- Repos page: keyword search, 10-per-page pager, and an “Open” button instead of a bare ↗

## 0.1.4

- Sync actions use download icon (refresh stays for list reload); connection test uses globe
- Commits/repos UI strips Codeup organization id from repo labels
- Commits pager defaults to 10 per page
- Settings: clarify exports folder purpose (sync daily Markdown + period reports)

## 0.1.3

- Use official `@deepseek-ai/dsh-client-ui-primitives` (Button / Modal / Input / icons); polish pager
- Modal mask respects `--dsh-frame-chrome-top` so DSH top-right window controls stay clickable
- Activity heatmap: fixed green contribution colors; weekday labels on the right, row-aligned with cells

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
