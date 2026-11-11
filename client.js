/**
 * Commit Journal browser UI: horizontal tabs, DSH dual-theme tokens.
 * Account switching lives on the Accounts tab (no global top bar).
 */
window.__ModuleLoader__.load({
  id: 'dsh-commit-journal',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React
    let ReactDOM = null
    try { ReactDOM = require('react-dom') } catch { ReactDOM = null }

    let ui = null
    try { ui = require('@deepseek-ai/dsh-client-ui-primitives') } catch { ui = null }
    const UiButton = ui && ui.Button
    const UiModal = ui && ui.Modal
    const UiTag = ui && ui.Tag
    const UiMenu = ui && ui.Menu
    const UiToast = ui && ui.Toast
    const IconPlus = ui && ui.IconPlusOutlineRegular
    const IconRefresh = ui && ui.IconRefreshOutlineRegular
    const IconEdit = ui && ui.IconEditOutlineRegular
    const IconTrash = ui && ui.IconTrashOutlineRegular
    const IconCheck = ui && ui.IconCheckOutlineRegular
    const IconSearch = ui && ui.IconSearchOutlineRegular
    const IconSave = ui && ui.IconSaveOutlineRegular
    const IconClose = ui && ui.IconCloseOutlineRegular
    const IconChevronLeft = ui && ui.IconChevronLeftOutlineRegular
    const IconChevronRight = ui && ui.IconChevronRightOutlineRegular
    const IconChevronDown = ui && ui.IconChevronDownOutlineRegular
    const IconDownload = ui && ui.IconDownloadOutlineRegular
    const IconGlobe = ui && ui.IconGlobeOutlineRegular
    const IconLink = ui && (ui.IconRightUpOutlineRegular || ui.IconLinkOutlineRegular)
    const UiSeg = ui && ui.SegmentedControl

    const PANEL_ID = 'commit-journal'
    const NS = 'commitJournal'
    const API = 'http://127.0.0.1:39282'
    const TABS = [
      { id: 'accounts', zh: '账号', en: 'Accounts' },
      { id: 'repos', zh: '仓库', en: 'Repos' },
      { id: 'commits', zh: '提交', en: 'Commits' },
      { id: 'activity', zh: '活跃', en: 'Activity' },
      { id: 'logs', zh: '日志', en: 'Logs' },
      { id: 'settings', zh: '设置', en: 'Settings' }
    ]

    const DICTIONARIES = {
      en: {
        panelLabel: 'Commit Journal',
        accounts: 'Accounts',
        repos: 'Repos',
        commits: 'Commits',
        activity: 'Activity',
        logs: 'Logs',
        settings: 'Settings',
        emptyAccount: 'Add an account first.',
        newAccount: 'New account',
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        remove: 'Delete',
        test: 'Test',
        testScan: 'Scan test',
        activate: 'Switch to this',
        currentAccount: 'Current account',
        switchAccount: 'Switch account',
        active: 'Active',
        refresh: 'Refresh',
        refreshScan: 'Rescan',
        sync: 'Sync',
        syncWatched: 'Sync watched',
        syncWatchedLocal: 'Sync watched (local)',
        saveWatch: 'Save watched',
        query: 'Query',
        clearCommits: 'Reset local commits',
        clearLogs: 'Clear logs',
        accountMode: 'Mode',
        modeRemote: 'Remote pull',
        modeLocal: 'Local scan (git)',
        modeRemoteShort: 'Remote',
        modeLocalShort: 'Local',
        modeHintRemote: 'Pull commits via provider API with a personal access token.',
        modeHintLocal: 'Scans git repos under the folders you list — no token needed.',
        provider: 'Provider',
        providerCodeup: 'Codeup (Yunxiao)',
        providerGitlab: 'GitLab',
        providerGithub: 'GitHub / GHE',
        localRoots: 'Scan roots',
        localRootsPh: 'One absolute path per line\ne.g. F:\\Personal\\projects',
        localRootsHint: 'Recursively find .git under each root (depth ≤ 5).',
        name: 'Display name',
        namePh: 'e.g. Work account',
        edition: 'Org type',
        editionCentral: 'Central (public cloud)',
        editionRegion: 'Region (dedicated / private)',
        editionHintCentral: 'Uses codeup.aliyun.com — fill organization ID below.',
        editionHintRegion: 'Fill your dedicated instance API Base URL below.',
        org: 'Organization / API',
        orgId: 'organizationId',
        orgIdPh: 'Org ID from Yunxiao org admin → Basic info',
        orgIdPhGithub: 'Org or user login (e.g. yu-bobo); empty = all token-visible repos',
        orgIdPhGitlab: 'Optional group path/id; empty = membership projects',
        orgIdLabelGithub: 'Org / user (optional)',
        orgIdLabelGitlab: 'Group (optional)',
        apiBase: 'API Base URL',
        apiBasePh: 'e.g. https://xxx.devops.aliyuncs.com',
        apiBasePhGithub: 'Leave empty for github.com; GHE e.g. https://github.example.com',
        apiBasePhGitlab: 'Leave empty for gitlab.com; self-hosted e.g. https://gitlab.example.com',
        apiBaseHintGithub: 'Empty → api.github.com; Enterprise Server host gets /api/v3 appended if missing.',
        apiBaseHintGitlab: 'Empty → gitlab.com/api/v4; self-hosted host gets /api/v4 appended if missing.',
        authors: 'Author filters',
        authorsHint: 'Email or name, comma-separated; empty = no filter',
        authorsPh: 'you@example.com, Alice',
        token: 'Personal access token',
        tokenPh: 'Yunxiao → Personal settings → Personal access token',
        tokenPhGithub:
          'Avatar → Settings → Developer settings → Personal access tokens → Fine-grained or Tokens (classic)',
        tokenPhGitlab: 'GitLab → Preferences → Access tokens (read_api / read_repository)',
        tokenPhEdit: 'Leave blank to keep unchanged',
        insecureSsl: 'Skip TLS certificate verification',
        insecureSslHint:
          'Use for corporate HTTPS proxy or self-signed certs (e.g. GitHub fetch failed / UNABLE_TO_VERIFY_LEAF_SIGNATURE). Less safe.',
        defaultBranch: 'Default sync branch',
        defaultBranchPh: 'master / main / develop',
        watched: 'Watched',
        branch: 'Branch',
        time: 'Time',
        repo: 'Repo',
        title: 'Message',
        author: 'Author',
        sha: 'SHA',
        level: 'Level',
        levelInfo: 'Info',
        levelWarn: 'Warn',
        levelError: 'Error',
        message: 'Message',
        syncInterval: 'Sync interval (min)',
        lookback: 'Lookback days',
        exportsPath: 'Exports folder',
        exportsPathHint: 'Markdown dumps from sync / period reports. Empty = ~/.dsh-commit-journal/exports',
        recentYear: 'Past year',
        totalCommits: 'Commits',
        activeDays: 'Active days',
        longestStreak: 'Longest streak',
        maxDay: 'Peak day',
        noData: 'No data yet. Sync commits first.',
        confirmDelete: 'Delete this account?',
        confirmClearCommits: 'Clear local commits for this account?',
        confirmClearLogs: 'Clear sync logs?',
        keyword: 'Keyword',
        from: 'From',
        to: 'To',
        allRepos: 'All repos',
        openRepo: 'Open',
        repoKeyword: 'Search repos',
        pageOf: 'Page',
        pageSizeLabel: '/ page',
        totalItems: '{n} total',
        syncOk: 'Synced: +{n} commits ({f} fetched)',
        syncPartial: 'Synced +{n}, {e} repo error(s)',
        refreshOk: 'Repos refreshed',
        saveWatchOk: 'Watched repos saved',
        testOk: 'Connection OK',
        testScanOk: 'Scan OK ({n} repos)',
        activateOk: 'Account activated',
        saveOk: 'Saved',
        clearOk: 'Cleared',
        queryOk: 'Updated',
        refreshScanOk: 'Rescanned roots',
        currentStreak: 'Current streak',
        avgPerDay: 'Avg / active day',
        peakOn: 'Peak on',
        weekdayDist: 'By weekday',
        heatHint: 'Click a day with commits to open the side drawer.',
        activityFootnote:
          'Only locally synced commits are counted, bucketed by local calendar day. The first sync only looks back the days in Settings; earlier years may look sparse. For fuller history, raise lookback under Settings → Sync, reset local commits, then sync again.',
        dayEmpty: 'No commits on this day.',
        less: 'Less',
        more: 'More',
        noteTotal: 'All commits in range',
        noteActiveDays: 'At least one commit',
        noteStreak: 'Consecutive days with commits',
        notePeak: 'No record yet',
        unitDay: 'd',
        unitCommit: '',
        heatSummary: '{w} weeks · {a} active days · {c} commits',
        dayLoading: 'Loading…',
        dayCommits: '{n} commits',
        filterAll: 'All',
        filterWatched: 'Watched',
        filterUnwatched: 'Unwatched',
        descAccounts:
          'Each account is remote (Codeup / GitLab / GitHub PAT) or local (scan roots). Switch the active account to change which data other tabs use.',
        descRepos:
          '“Sync watched” pulls all watched repos; each row can sync alone. With nothing watched, full sync covers every visible repo.',
        descReposLocal:
          'Rescan discovers git repos under your roots. Watch the ones to index; sync runs git log into the local cache.',
        descCommits: 'Browse locally synced commits; filter by repo, date range, and keyword.',
        descActivity: 'Contribution heatmap for the selected range.',
        descLogs: 'Sync log for the current account; error rows show which repo failed.',
        descSettings:
          'Scheduled sync applies to every account (remote API or local rescan). Lookback days apply on first sync, after reset, and once after you raise the window; otherwise sync is incremental.',
        syncSettingsTitle: 'Sync'
      },
      zh: {
        panelLabel: '提交日志',
        accounts: '账号',
        repos: '仓库',
        commits: '提交',
        activity: '活跃',
        logs: '日志',
        settings: '设置',
        emptyAccount: '请先添加账号。',
        newAccount: '新建账号',
        save: '保存',
        cancel: '取消',
        edit: '编辑',
        remove: '删除',
        test: '测试',
        testScan: '扫描测试',
        activate: '切换为当前',
        currentAccount: '当前账号',
        switchAccount: '切换账号',
        active: '当前',
        refresh: '刷新',
        refreshScan: '重新扫描',
        sync: '同步',
        syncWatched: '同步关注',
        syncWatchedLocal: '同步关注（本地）',
        saveWatch: '保存关注',
        query: '查询',
        clearCommits: '重置本地提交',
        clearLogs: '清除日志',
        accountMode: '模式',
        modeRemote: '远程拉取',
        modeLocal: '本地扫描（git）',
        modeRemoteShort: '远程',
        modeLocalShort: '本地',
        modeHintRemote: '使用对应平台的个人访问令牌，经 API 拉取提交。',
        modeHintLocal: '扫描下方根目录中的本机 git 仓库，无需令牌。',
        provider: '平台',
        providerCodeup: 'Codeup（云效）',
        providerGitlab: 'GitLab',
        providerGithub: 'GitHub / 企业版',
        localRoots: '扫描根目录',
        localRootsPh: '每行一个绝对路径\n例如 F:\\Personal\\projects',
        localRootsHint: '在各根目录下递归查找 .git（深度 ≤ 5）。',
        name: '显示名称',
        namePh: '例如：公司主账号',
        edition: '组织类型',
        editionCentral: '中心版（公共云）',
        editionRegion: 'Region 版（专有云 / 独立实例）',
        editionHintCentral: '走 codeup.aliyun.com，请在下方填写组织 ID。',
        editionHintRegion: '请在下方填写专有云 / 独立实例的 API Base URL。',
        org: '组织 / 接入点',
        orgId: 'organizationId',
        orgIdPh: '组织管理后台 → 基本信息里的组织 ID',
        orgIdPhGithub: '组织或用户 login（如 yu-bobo）；留空=令牌可见全部仓库',
        orgIdPhGitlab: '可选 group 路径/ID；留空列出 membership 项目',
        orgIdLabelGithub: '组织 / 用户（可选）',
        orgIdLabelGitlab: 'Group（可选）',
        apiBase: 'API Base URL',
        apiBasePh: '实例访问域名，如 https://xxx.devops.aliyuncs.com',
        apiBasePhGithub: 'github.com 可留空；GHE 如 https://github.example.com',
        apiBasePhGitlab: 'gitlab.com 可留空；自建如 https://gitlab.example.com',
        apiBaseHintGithub: '留空 → api.github.com；企业版主机缺 /api/v3 时会自动补。',
        apiBaseHintGitlab: '留空 → gitlab.com/api/v4；自建主机缺 /api/v4 时会自动补。',
        authors: '作者过滤',
        authorsHint: '邮箱或姓名，逗号分隔；留空不过滤',
        authorsPh: 'you@example.com, 张三',
        token: '个人访问令牌',
        tokenPh: '云效个人设置 → 个人访问令牌',
        tokenPhGithub:
          '头像 → Settings → Developer settings → Personal access tokens → Fine-grained 或 Tokens (classic)',
        tokenPhGitlab: 'GitLab → Preferences → Access tokens（read_api / read_repository）',
        tokenPhEdit: '留空则不修改',
        insecureSsl: '跳过 TLS 证书校验',
        insecureSslHint:
          '公司代理 / HTTPS 解密 / 自签证书导致 fetch failed（如 UNABLE_TO_VERIFY_LEAF_SIGNATURE）时可勾选；安全性较低。',
        defaultBranch: '默认同步分支',
        defaultBranchPh: 'master / main / develop',
        watched: '关注',
        branch: '分支',
        time: '时间',
        repo: '仓库',
        title: '说明',
        author: '作者',
        sha: 'SHA',
        level: '级别',
        levelInfo: '信息',
        levelWarn: '警告',
        levelError: '错误',
        message: '内容',
        syncInterval: '同步间隔（分钟）',
        lookback: '回溯天数',
        exportsPath: '导出目录',
        exportsPathHint: '同步按日落盘与周期报告 Markdown 的目录；留空默认 ~/.dsh-commit-journal/exports',
        recentYear: '近一年',
        totalCommits: '提交总数',
        activeDays: '活跃天数',
        longestStreak: '最长连续',
        maxDay: '单日最高',
        noData: '暂无数据，请先同步提交。',
        confirmDelete: '确定删除该账号？',
        confirmClearCommits: '清除该账号本地提交记录？',
        confirmClearLogs: '清除同步日志？',
        keyword: '关键词',
        from: '开始',
        to: '结束',
        allRepos: '全部仓库',
        openRepo: '打开',
        repoKeyword: '搜索仓库',
        pageOf: '页',
        pageSizeLabel: '条/页',
        totalItems: '共 {n} 条',
        syncOk: '同步完成：新增 {n} 条（拉取 {f}）',
        syncPartial: '同步部分完成：新增 {n}，{e} 个仓库出错',
        refreshOk: '仓库列表已刷新',
        saveWatchOk: '关注列表已保存',
        testOk: '连接测试通过',
        testScanOk: '扫描通过（发现 {n} 个仓库）',
        activateOk: '已切换为当前账号',
        saveOk: '已保存',
        clearOk: '已清除',
        queryOk: '已更新',
        refreshScanOk: '已按根目录重新扫描',
        currentStreak: '当前连续',
        avgPerDay: '活跃日均',
        peakOn: '峰值日期',
        weekdayDist: '星期分布',
        heatHint: '点击有提交的日期，右侧抽屉查看当日明细。',
        activityFootnote:
          '仅统计本地已同步的提交，按本地时区自然日归档。首次同步只回溯设置中的天数，更早的历史年份可能偏少；需要更完整的历史可在「设置 → 同步」调大回溯天数后重置记录再同步。',
        dayEmpty: '当天没有提交记录',
        less: '少',
        more: '多',
        noteTotal: '所选区间内全部提交',
        noteActiveDays: '至少有一次提交',
        noteStreak: '连续每天都有提交',
        notePeak: '暂无记录',
        unitDay: '天',
        unitCommit: '条',
        heatSummary: '共 {w} 周 · 活跃 {a} 天 · 合计 {c} 条',
        dayLoading: '加载中',
        dayCommits: '{n} 条提交',
        filterAll: '全部',
        filterWatched: '已关注',
        filterUnwatched: '未关注',
        descAccounts:
          '每个账号可选远程（Codeup / GitLab / GitHub PAT）或本地（扫描根目录）。切换当前账号后，其它页签使用该账号数据。',
        descRepos:
          '「同步关注」拉取全部关注仓；单行可单独同步。未关注任何仓库时全量同步会覆盖全部可见仓。',
        descReposLocal:
          '「重新扫描」按根目录发现本机 git 仓；勾选关注后同步会执行 git log 写入本地缓存。',
        descCommits: '查询本地已同步的提交记录；可按仓库、日期与关键词筛选。',
        descActivity: '近一年 / 指定年份的提交活跃度。',
        descLogs: '当前账号同步记录；错误行可查看具体仓库失败原因。',
        descSettings:
          '定时同步对所有账号生效（远程拉 API 或本地重扫）。回溯天数用于首次同步、重置记录后，以及调大该值后的下一次同步（会按新窗口回填一次历史）；其余时间按上次同步时间增量拉取。',
        syncSettingsTitle: '同步'
      }
    }

    const CSS = `
      /* 与侧栏「新会话」同档（实测 #e5e5e5）；挂 :root 以便 Modal/Toast portal 也能用 */
      :root, .dsh-cj-root {
        --dsh-cj-border: #e5e5e5;
        --dsh-cj-border: color-mix(in srgb, var(--dsw-alias-label-primary, #000) 10%, transparent);
      }
      .dsh-cj-root {
        --dsh-cj-heat-0: #ebedf0;
        --dsh-cj-heat-1: #9be9a8;
        --dsh-cj-heat-2: #40c463;
        --dsh-cj-heat-3: #30a14e;
        --dsh-cj-heat-4: #216e39;
        position: relative;
        box-sizing: border-box;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--dsw-alias-bg-base);
        color: var(--dsw-alias-label-primary);
        font-size: 13px;
        line-height: 1.45;
        overflow: hidden;
      }
      .dsh-cj-root[data-scheme="dark"],
      :root[data-theme="dark"] .dsh-cj-root,
      :root[data-color-scheme="dark"] .dsh-cj-root {
        --dsh-cj-heat-0: #161b22;
        --dsh-cj-heat-1: #0e4429;
        --dsh-cj-heat-2: #006d32;
        --dsh-cj-heat-3: #26a641;
        --dsh-cj-heat-4: #39d353;
      }
      @media (prefers-color-scheme: dark) {
        .dsh-cj-root:not([data-scheme="light"]) {
          --dsh-cj-heat-0: #161b22;
          --dsh-cj-heat-1: #0e4429;
          --dsh-cj-heat-2: #006d32;
          --dsh-cj-heat-3: #26a641;
          --dsh-cj-heat-4: #39d353;
        }
      }
      .dsh-cj-root *, .dsh-cj-root *::before, .dsh-cj-root *::after { box-sizing: border-box; }
      .dsh-cj-tabs {
        display: flex;
        gap: 4px;
        padding: calc(var(--dsh-frame-top-clearance, 0px) + 12px) 20px 0;
        border-bottom: 1px solid var(--dsh-cj-border);
        flex-shrink: 0;
      }
      .dsh-cj-tab {
        appearance: none;
        border: 0;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        padding: 10px 14px;
        margin-bottom: -1px;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        font-size: 13px;
        border-radius: 8px 8px 0 0;
      }
      .dsh-cj-tab[data-active="1"] {
        color: var(--dsw-alias-label-primary);
        border-bottom-color: var(--dsw-alias-brand-primary);
        font-weight: 600;
      }
      .dsh-cj-body {
        flex: 1;
        min-height: 0;
        overflow: hidden;
        padding: 16px 20px 16px;
        display: flex;
        flex-direction: column;
      }
      /* Table pages: fill remaining height; table scrolls; pager stays put */
      .dsh-cj-page-fill {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .dsh-cj-page-fill > .dsh-cj-page-head,
      .dsh-cj-page-fill > .dsh-cj-row,
      .dsh-cj-page-fill > .dsh-cj-pager,
      .dsh-cj-page-fill > .dsh-cj-muted,
      .dsh-cj-page-fill > .dsh-cj-error {
        flex-shrink: 0;
      }
      /* Non-table pages keep a single scroll area */
      .dsh-cj-page-scroll {
        flex: 1;
        min-height: 0;
        overflow: auto;
      }
      .dsh-cj-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        margin-bottom: 12px;
      }
      .dsh-cj-row-end { justify-content: space-between; }
      .dsh-cj-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .dsh-cj-table .dsh-cj-actions {
        flex-wrap: nowrap;
        gap: 6px;
        justify-content: flex-end;
      }
      .dsh-cj-td-actions {
        white-space: nowrap;
        width: 1%;
        vertical-align: middle !important;
      }
      .dsh-cj-td-clip {
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dsh-cj-btn-icon.dsh-cj-btn-sized,
      .dsh-cj-btn.dsh-cj-btn-icon {
        padding: 0 8px !important;
        min-width: 32px;
        justify-content: center !important;
      }
      /* Size only — do not override official Button primary/outline colors */
      .dsh-cj-btn-sized {
        box-sizing: border-box !important;
        height: 32px !important;
        min-height: 32px !important;
        max-height: 32px !important;
        padding: 0 12px !important;
        font-size: 12px !important;
        line-height: 18px !important;
        display: inline-flex !important;
        align-items: center !important;
        white-space: nowrap;
        vertical-align: middle;
      }
      .dsh-cj-btn {
        appearance: none;
        box-sizing: border-box;
        height: 32px;
        min-height: 32px;
        padding: 0 12px;
        margin: 0;
        border: 1px solid var(--dsh-cj-border, #e5e5e5);
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary);
        border-radius: var(--dsw-radius-sm, 8px);
        font-size: 12px;
        line-height: 18px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        white-space: nowrap;
        vertical-align: middle;
      }
      .dsh-cj-btn:disabled { opacity: .45; cursor: not-allowed; }
      .dsh-cj-btn[data-primary="1"] {
        background: var(--dsw-alias-brand-primary);
        border-color: transparent;
        color: #fff;
      }
      .dsh-cj-btn[data-danger="1"] {
        color: var(--dsw-alias-state-error-primary);
        border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent);
      }
      .dsh-cj-btn-danger {
        color: var(--dsw-alias-state-error-primary) !important;
      }
      /* 控件描边与 --dsh-cj-border 同档；打到控件本身，不走官方 Input 偏浅的 l4 */
      .dsh-cj-control,
      .dsh-cj-input,
      .dsh-cj-select,
      .dsh-cj-select-trigger,
      .dsh-cj-textarea {
        box-sizing: border-box;
        border: 1px solid var(--dsh-cj-border, #e5e5e5) !important;
        border-radius: var(--dsw-radius-sm, 8px) !important;
        background: var(--dsw-alias-bg-layer-1, #fff);
        color: var(--dsw-alias-label-primary, #111);
      }
      .dsh-cj-control:focus-within,
      .dsh-cj-input:focus,
      .dsh-cj-select:focus,
      .dsh-cj-select-trigger:focus,
      .dsh-cj-select-trigger[aria-expanded="true"],
      .dsh-cj-textarea:focus {
        border-color: var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary, #1677ff)) !important;
        outline: none !important;
      }
      .dsh-cj-input, .dsh-cj-select {
        height: 32px;
        min-height: 32px;
        padding: 0 10px;
        font-size: 12px;
        line-height: 18px;
        min-width: 0;
        vertical-align: middle;
      }
      .dsh-cj-input[type="date"] {
        min-width: 140px;
        color-scheme: inherit;
      }
      .dsh-cj-select-trigger {
        display: inline-flex !important;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        width: auto;
        max-width: 100%;
        min-width: 0;
        height: 32px !important;
        min-height: 32px !important;
        max-height: 32px !important;
        padding: 0 10px !important;
        font-size: 12px !important;
        line-height: 18px !important;
        font-weight: 400 !important;
      }
      .dsh-cj-select-anchor {
        display: block;
        width: 100%;
        max-width: 100%;
        min-width: 0;
      }
      .dsh-cj-select-anchor .dsh-cj-select-trigger,
      .dsh-cj-field .dsh-cj-select-trigger {
        width: 100% !important;
      }
      .dsh-cj-select-trigger .dsh-cj-select-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
        flex: 1;
        text-align: left;
      }
      .dsh-cj-select-trigger .dsh-cj-select-caret {
        flex-shrink: 0;
        opacity: 0.7;
        font-size: 11px;
        line-height: 1;
      }
      .dsh-cj-select-menu {
        position: fixed;
        z-index: 60;
        max-height: min(280px, 50vh);
        overflow: auto;
        padding: 4px;
        border-radius: var(--dsw-radius-sm, 8px);
        border: 1px solid var(--dsh-cj-border);
        background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1));
        box-shadow: var(--dsw-elevation-prominent, 0 8px 24px rgba(0,0,0,.18));
      }
      .dsh-cj-select-option {
        appearance: none;
        display: block;
        width: 100%;
        border: 0;
        background: transparent;
        color: var(--dsw-alias-label-primary);
        text-align: left;
        border-radius: 6px;
        padding: 8px 10px;
        font-size: 14px;
        line-height: 22px;
        cursor: pointer;
      }
      .dsh-cj-select-option:hover,
      .dsh-cj-select-option[data-active="1"] {
        background: var(--dsw-alias-bg-layer-1);
      }
      .dsh-cj-select-option[data-selected="1"] {
        color: var(--dsw-alias-brand-primary);
        font-weight: 600;
      }
      .dsh-cj-select-option:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .dsh-cj-textarea {
        display: block;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        padding: 8px 10px;
        margin: 0;
        font-size: 12px;
        line-height: 18px;
        font-family: inherit;
        min-height: 72px;
        resize: vertical;
        outline: none;
      }
      /* dimmed 太浅；用 secondary 并取消 Firefox 默认降低透明度 */
      .dsh-cj-textarea::placeholder,
      .dsh-cj-input::placeholder {
        color: var(--dsw-alias-label-secondary, #737373);
        opacity: 1;
      }
      /* Official Input wrapper also lands at 32px */
      .dsh-cj-row > span {
        vertical-align: middle;
      }
      .dsh-cj-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
      .dsh-cj-account-form {
        width: min(640px, calc(100vw - 48px));
        max-width: 100%;
      }
      .dsh-cj-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0 12px;
        align-items: start;
      }
      .dsh-cj-form-span {
        grid-column: 1 / -1;
      }
      .dsh-cj-field-check {
        margin-top: 2px;
      }
      .dsh-cj-field-check .dsh-cj-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 400;
        cursor: pointer;
        user-select: none;
      }
      @media (max-width: 560px) {
        .dsh-cj-form-row { grid-template-columns: 1fr; }
        .dsh-cj-account-form { width: 100%; }
      }
      /* 官方 Input 外层是 inline-flex + align-items:center；拉满宽度时不能改成 block，否则 placeholder 不垂直居中 */
      .dsh-cj-field > span {
        display: inline-flex;
        align-items: center;
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        min-width: 0;
      }
      .dsh-cj-field .dsh-cj-input {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        min-width: 0;
      }
      .dsh-cj-label { color: var(--dsw-alias-label-secondary); font-size: 12px; }
      .dsh-cj-muted { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.45; }
      .dsh-cj-page-head { margin-bottom: 14px; }
      .dsh-cj-page-title {
        margin: 0 0 6px;
        font-size: 16px;
        font-weight: 650;
        color: var(--dsw-alias-label-primary);
      }
      .dsh-cj-page-desc {
        margin: 0;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        line-height: 1.55;
      }
      .dsh-cj-footnote {
        margin: 12px 0 0;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        line-height: 1.55;
      }
      .dsh-cj-error { color: var(--dsw-alias-state-error-primary); font-size: 12px; margin: 0 0 10px; }
      .dsh-cj-table-wrap {
        flex: 1;
        min-height: 0;
        border: 1px solid var(--dsh-cj-border);
        border-radius: 12px;
        overflow: auto;
        background: var(--dsw-alias-bg-layer-1);
      }
      .dsh-cj-page-scroll > .dsh-cj-table-wrap {
        flex: initial;
        min-height: auto;
        max-height: none;
      }
      .dsh-cj-table { width: 100%; border-collapse: collapse; }
      .dsh-cj-table th, .dsh-cj-table td {
        padding: 10px 12px;
        text-align: left;
        border-bottom: 1px solid var(--dsh-cj-border);
        vertical-align: top;
      }
      .dsh-cj-table th {
        font-weight: 600;
        color: var(--dsw-alias-label-secondary);
        background: var(--dsw-alias-bg-layer-2);
        position: sticky;
        top: 0;
      }
      .dsh-cj-table tr:last-child td { border-bottom: 0; }
      /* Fallback Tag tones (match official Tag.module.css) */
      .dsh-cj-tag {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 1px 8px;
        font-size: 11px;
        line-height: 17px;
        font-weight: 500;
        white-space: nowrap;
      }
      .dsh-cj-tag[data-tone="outline"] {
        border: 0.5px solid var(--dsw-alias-border-l4, var(--dsh-cj-border));
        color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
      }
      .dsh-cj-tag[data-tone="solid"] {
        background: var(--dsw-alias-label-primary);
        color: var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-layer-1));
      }
      .dsh-cj-tag[data-tone="neutral"] {
        background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-2));
        color: var(--dsw-alias-label-secondary);
      }
      .dsh-cj-tag[data-tone="success"] {
        background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 10%, transparent);
        color: var(--dsw-alias-state-success-primary, #16a34a);
      }
      .dsh-cj-tag[data-tone="info"] {
        background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #2563eb) 10%, transparent);
        color: var(--dsw-alias-state-business-primary, #2563eb);
      }
      .dsh-cj-tag[data-tone="warning"] {
        background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #d97706) 12%, transparent);
        color: var(--dsw-alias-state-warn-primary, #d97706);
      }
      .dsh-cj-tag[data-tone="danger"] {
        background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
        color: var(--dsw-alias-state-error-primary);
      }
      /* Fallback modal: paint below native caption so top-right DSH controls stay usable */
      .dsh-cj-modal-mask {
        position: fixed;
        inset: var(--dsh-frame-chrome-top, 0px) 0 0;
        background: var(--dsw-alias-bg-mask-1, color-mix(in srgb, #000 40%, transparent));
        display: flex; align-items: center; justify-content: center; z-index: 40;
        padding: max(24px, var(--dsh-frame-overlay-top, 24px)) 24px;
      }
      .dsh-cj-modal {
        width: min(480px, 100%);
        background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1));
        border: 1px solid var(--dsh-cj-border);
        border-radius: var(--dsw-radius-panel, 14px);
        padding: 16px;
        max-height: 100%;
        overflow: auto;
        box-shadow: var(--dsw-elevation-prominent, none);
      }
      .dsh-cj-modal-wide {
        width: min(680px, 100%);
      }
      .dsh-cj-modal h3 { margin: 0 0 12px; font-size: 15px; }
      .dsh-cj-stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin: 4px 0 16px;
      }
      .dsh-cj-stat {
        position: relative;
        overflow: hidden;
        background: var(--dsw-alias-bg-layer-1);
        border: 1px solid var(--dsh-cj-border);
        border-radius: 12px;
        padding: 12px 14px 13px;
      }
      .dsh-cj-stat .l {
        position: relative;
        z-index: 1;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        letter-spacing: 0.04em;
      }
      .dsh-cj-stat .v {
        position: relative;
        z-index: 1;
        margin-top: 4px;
        font-size: 26px;
        font-weight: 700;
        line-height: 1.2;
        color: var(--dsh-cj-heat-3);
        font-variant-numeric: tabular-nums;
      }
      .dsh-cj-stat .v small {
        margin-left: 4px;
        font-size: 12px;
        font-weight: 500;
        color: var(--dsw-alias-label-secondary);
      }
      .dsh-cj-stat .n {
        position: relative;
        z-index: 1;
        margin-top: 3px;
        font-size: 12px;
        color: var(--dsw-alias-label-secondary);
        min-height: 16px;
      }
      .dsh-cj-heat {
        background: var(--dsw-alias-bg-layer-1);
        border: 1px solid var(--dsh-cj-border);
        border-radius: 12px;
        padding: 14px 16px 12px;
        overflow-x: hidden;
        container-type: inline-size;
      }
      .dsh-cj-heat-body {
        --dsh-cj-cell: clamp(9px, calc((100cqw - 48px) / 53), 13px);
        --dsh-cj-gap: 3px;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        width: 100%;
      }
      .dsh-cj-heat-main { min-width: 0; }
      .dsh-cj-months {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: calc(var(--dsh-cj-cell) + var(--dsh-cj-gap));
        height: 16px;
        margin-bottom: 4px;
        color: var(--dsw-alias-label-secondary);
        font-size: 11px;
        line-height: 16px;
        user-select: none;
      }
      .dsh-cj-months .dsh-cj-month {
        white-space: nowrap;
      }
      .dsh-cj-weekdays {
        display: grid;
        grid-template-rows: repeat(7, var(--dsh-cj-cell));
        gap: var(--dsh-cj-gap);
        padding-top: 20px;
        color: var(--dsw-alias-label-secondary);
        font-size: 10px;
        line-height: var(--dsh-cj-cell);
        user-select: none;
        width: 14px;
        flex: none;
      }
      .dsh-cj-weekdays span {
        height: var(--dsh-cj-cell);
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
      .dsh-cj-grid {
        display: grid;
        grid-auto-flow: column;
        grid-template-rows: repeat(7, var(--dsh-cj-cell));
        grid-auto-columns: var(--dsh-cj-cell);
        gap: var(--dsh-cj-gap);
      }
      .dsh-cj-cell {
        width: var(--dsh-cj-cell);
        height: var(--dsh-cj-cell);
        border-radius: max(3px, calc(var(--dsh-cj-cell) * 0.2));
        border: 0;
        padding: 0;
        background: var(--dsh-cj-heat-0);
      }
      .dsh-cj-cell.lv1 { background: var(--dsh-cj-heat-1); }
      .dsh-cj-cell.lv2 { background: var(--dsh-cj-heat-2); }
      .dsh-cj-cell.lv3 { background: var(--dsh-cj-heat-3); }
      .dsh-cj-cell.lv4 { background: var(--dsh-cj-heat-4); }
      .dsh-cj-cell.is-blank {
        opacity: .45;
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsh-cj-border) 80%, transparent);
      }
      .dsh-cj-cell.has-commits { cursor: pointer; }
      .dsh-cj-cell.has-commits:hover {
        transform: scale(1.2);
        position: relative;
        z-index: 2;
      }
      .dsh-cj-cell.is-today { outline: 1px solid var(--dsh-cj-heat-3); outline-offset: 1px; }
      .dsh-cj-heat-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
        font-size: 12px;
        color: var(--dsw-alias-label-secondary);
      }
      .dsh-cj-heat-legend {
        display: flex; align-items: center; gap: 5px;
      }
      .dsh-cj-heat-legend .swatch {
        width: 12px; height: 12px; border-radius: 3px; display: inline-block;
        background: var(--dsh-cj-heat-0);
      }
      .dsh-cj-heat-legend .swatch.lv1 { background: var(--dsh-cj-heat-1); }
      .dsh-cj-heat-legend .swatch.lv2 { background: var(--dsh-cj-heat-2); }
      .dsh-cj-heat-legend .swatch.lv3 { background: var(--dsh-cj-heat-3); }
      .dsh-cj-heat-legend .swatch.lv4 { background: var(--dsh-cj-heat-4); }
      .dsh-cj-insights {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 14px;
      }
      .dsh-cj-insight {
        background: var(--dsw-alias-bg-layer-1);
        border: 1px solid var(--dsh-cj-border);
        border-radius: 12px;
        padding: 12px 14px;
      }
      .dsh-cj-insight h4 {
        margin: 0 0 10px;
        font-size: 12px;
        font-weight: 600;
        color: var(--dsw-alias-label-secondary);
      }
      .dsh-cj-wd {
        display: grid;
        grid-template-columns: 18px 1fr 28px;
        gap: 8px;
        align-items: center;
        margin-bottom: 6px;
        font-size: 11px;
        color: var(--dsw-alias-label-secondary);
      }
      .dsh-cj-wd:last-child { margin-bottom: 0; }
      .dsh-cj-wd-bar {
        height: 6px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--dsh-cj-border) 70%, transparent);
        overflow: hidden;
      }
      .dsh-cj-wd-bar > i {
        display: block;
        height: 100%;
        border-radius: 999px;
        background: var(--dsh-cj-heat-3);
      }
      .dsh-cj-meta-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 12px;
      }
      .dsh-cj-meta-list div { display: flex; justify-content: space-between; gap: 12px; }
      .dsh-cj-meta-list strong { color: var(--dsw-alias-label-primary); font-weight: 600; }
      @media (max-width: 720px) {
        .dsh-cj-insights { grid-template-columns: 1fr; }
      }
      .dsh-cj-drawer {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        z-index: 20;
        width: min(400px, 94%);
        display: flex;
        flex-direction: column;
        background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1));
        border-left: 1px solid var(--dsh-cj-border);
        box-shadow: var(--dsw-elevation-prominent, none);
        padding: 14px 16px 16px;
      }
      .dsh-cj-drawer-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 12px;
        flex-shrink: 0;
      }
      .dsh-cj-drawer-body {
        flex: 1;
        min-height: 0;
        overflow: auto;
      }
      .dsh-cj-drawer-title {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .dsh-cj-drawer-title strong { font-size: 15px; font-weight: 600; }
      .dsh-cj-drawer-title span {
        font-size: 12px;
        font-weight: 400;
        color: var(--dsw-alias-label-secondary);
      }
      .dsh-cj-commit {
        padding: 11px 13px 12px;
        margin-bottom: 10px;
        border-radius: 12px;
        border: 1px solid var(--dsh-cj-border);
        background: var(--dsw-alias-bg-layer-1);
      }
      .dsh-cj-commit:last-child { margin-bottom: 0; }
      .dsh-cj-commit-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font-size: 12px;
        color: var(--dsw-alias-label-secondary);
      }
      .dsh-cj-commit-repo {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dsh-cj-commit-title {
        margin-top: 5px;
        font-size: 13px;
        line-height: 1.55;
        word-break: break-word;
      }
      .dsh-cj-commit-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 6px;
        font-size: 12px;
        color: var(--dsw-alias-label-secondary);
      }
      .dsh-cj-commit-sha {
        padding: 1px 6px;
        border-radius: 5px;
        border: 1px solid var(--dsh-cj-border);
        background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1));
        font-size: 11px;
      }
      .dsh-cj-pager {
        flex-shrink: 0;
        display: flex;
        justify-content: flex-end;
        gap: 6px;
        align-items: center;
        margin-top: 4px;
        padding: 12px 0 2px;
        border-top: 1px solid var(--dsh-cj-border);
      }
      .dsh-cj-pager-info {
        margin-right: auto;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
      }
      .dsh-cj-pager-size {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
      }
      .dsh-cj-pager-size .dsh-cj-select-trigger {
        min-width: 72px;
      }
      .dsh-cj-link {
        color: var(--dsw-alias-brand-primary);
        text-decoration: none;
      }
      .dsh-cj-toast-fallback {
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        max-width: min(520px, calc(100vw - 24px));
        padding: 10px 14px;
        border-radius: 10px;
        font-size: 12px;
        line-height: 1.45;
        background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1));
        border: 1px solid var(--dsh-cj-border);
        color: var(--dsw-alias-label-primary);
        box-shadow: var(--dsw-elevation-prominent, 0 8px 24px rgba(0,0,0,.18));
        pointer-events: none;
      }
      .dsh-cj-toast-fallback[data-tone="success"] {
        background: color-mix(in srgb, var(--dsh-cj-heat-2) 18%, var(--dsw-alias-bg-layer-1));
        border-color: color-mix(in srgb, var(--dsh-cj-heat-3) 35%, var(--dsh-cj-border));
      }
      .dsh-cj-toast-fallback[data-tone="error"] {
        background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, var(--dsw-alias-bg-layer-1));
        border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, var(--dsh-cj-border));
        color: var(--dsw-alias-state-error-primary);
      }
      .dsh-cj-seg {
        display: inline-flex;
        gap: 2px;
        padding: 2px;
        border-radius: 8px;
        background: var(--dsw-alias-bg-layer-2);
        border: 1px solid var(--dsh-cj-border);
      }
      .dsh-cj-seg button {
        appearance: none;
        border: 0;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        border-radius: 6px;
        padding: 5px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      .dsh-cj-seg button[data-active="1"] {
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary);
        font-weight: 600;
        box-shadow: var(--dsw-elevation-subtle, none);
      }
      @media (max-width: 720px) {
        .dsh-cj-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
    `

    // Strip Codeup 24-char org id prefix from path_with_namespace for UI labels
    function shortRepoLabel(path) {
      const raw = String(path || '').trim()
      if (!raw) return ''
      const parts = raw.split('/').filter(Boolean)
      if (parts.length <= 1) return raw
      if (/^[a-f0-9]{24}$/i.test(parts[0])) return parts.slice(1).join('/') || raw
      return raw
    }

    function fillMsg(tpl, vars) {
      return String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
    }

    function syncToastText(t, result) {
      const inserted = result && result.inserted != null ? result.inserted : 0
      const fetched = result && result.fetched != null ? result.fetched : 0
      const errN = result && result.errors ? result.errors.length : 0
      if (errN) return fillMsg(t('syncPartial'), { n: inserted, e: errN })
      return fillMsg(t('syncOk'), { n: inserted, f: fetched })
    }

    async function api(path, options) {
      const res = await fetch(API + path, {
        headers: { 'Content-Type': 'application/json', ...(options && options.headers) },
        ...options
      })
      const text = await res.text()
      let data = null
      try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
      if (!res.ok) throw new Error((data && data.error) || res.statusText || 'request failed')
      return data
    }

    function PageHead({ desc }) {
      if (!desc) return null
      return h('div', { className: 'dsh-cj-page-head' },
        h('p', { className: 'dsh-cj-page-desc' }, desc)
      )
    }

    const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

    function StatusTag({ tone, children }) {
      if (UiTag) return h(UiTag, { tone: tone || 'outline' }, children)
      return h('span', { className: 'dsh-cj-tag', 'data-tone': tone || 'outline' }, children)
    }

    /**
     * 自定义下拉：弹出层挂到 portal / fixed，避免原生 select 撑出 App 容器
     */
    function SelectField({
      value,
      options,
      onChange,
      disabled,
      style,
      className,
      placeholder,
      onOpen,
      'aria-label': ariaLabel,
      title
    }) {
      const [open, setOpen] = useState(false)
      const anchorRef = useRef(null)
      const menuRef = useRef(null)
      const [menuStyle, setMenuStyle] = useState(null)
      const list = options || []
      const selected = list.find((o) => String(o.value) === String(value))
      const label = selected ? selected.label : (placeholder || '')

      const close = useCallback(() => setOpen(false), [])

      const openMenu = useCallback(() => {
        if (disabled) return
        setOpen(true)
        if (onOpen) onOpen()
      }, [disabled, onOpen])

      const pick = useCallback((next) => {
        onChange(next)
        setOpen(false)
      }, [onChange])

      useEffect(() => {
        if (!open || UiMenu) return undefined
        const place = () => {
          const el = anchorRef.current
          if (!el) return
          const root = el.closest('.dsh-cj-root') || document.body
          const a = el.getBoundingClientRect()
          const bound = root.getBoundingClientRect()
          const width = Math.max(a.width, 120)
          const maxH = Math.min(280, Math.max(120, bound.height - 16))
          let left = Math.min(Math.max(a.left, bound.left + 8), bound.right - width - 8)
          let top = a.bottom + 4
          if (top + Math.min(maxH, list.length * 32 + 12) > bound.bottom - 8) {
            top = Math.max(bound.top + 8, a.top - 4 - Math.min(maxH, list.length * 32 + 12))
          }
          setMenuStyle({
            left: Math.round(left) + 'px',
            top: Math.round(top) + 'px',
            width: Math.round(width) + 'px',
            maxHeight: Math.round(maxH) + 'px'
          })
        }
        place()
        const onDoc = (e) => {
          const t = e.target
          if (anchorRef.current && anchorRef.current.contains(t)) return
          if (menuRef.current && menuRef.current.contains(t)) return
          close()
        }
        const onKey = (e) => { if (e.key === 'Escape') close() }
        window.addEventListener('resize', place)
        window.addEventListener('scroll', place, true)
        document.addEventListener('mousedown', onDoc, true)
        document.addEventListener('keydown', onKey, true)
        return () => {
          window.removeEventListener('resize', place)
          window.removeEventListener('scroll', place, true)
          document.removeEventListener('mousedown', onDoc, true)
          document.removeEventListener('keydown', onKey, true)
        }
      }, [close, list.length, open])

      const trigger = h('button', {
        ref: anchorRef,
        type: 'button',
        className: ['dsh-cj-btn', 'dsh-cj-btn-sized', 'dsh-cj-control', 'dsh-cj-select-trigger', className].filter(Boolean).join(' '),
        style,
        disabled: !!disabled,
        title: title || ariaLabel || undefined,
        'aria-label': ariaLabel,
        'aria-expanded': open ? 'true' : 'false',
        'aria-haspopup': 'listbox',
        onClick: () => { if (open) close(); else openMenu() }
      },
        h('span', { className: 'dsh-cj-select-label' }, label || '—'),
        h('span', { className: 'dsh-cj-select-caret', 'aria-hidden': true },
          IconChevronDown ? h(IconChevronDown) : '▾'
        )
      )

      if (UiMenu) {
        const emptyId = '__dsh_cj_empty__'
        const toId = (v) => (v == null || v === '' ? emptyId : String(v))
        const fromId = (id) => {
          if (id === emptyId) {
            const hit = list.find((o) => o.value == null || o.value === '')
            return hit ? hit.value : ''
          }
          const hit = list.find((o) => String(o.value) === id)
          return hit ? hit.value : id
        }
        return h(UiMenu, {
          open,
          onClose: close,
          portal: true,
          minWidthFromAnchor: true,
          selection: 'check',
          selectedId: toId(value),
          items: list.map((o) => ({
            id: toId(o.value),
            label: o.label,
            disabled: !!o.disabled
          })),
          onSelect: (id) => { pick(fromId(id)) },
          anchor: h('span', {
            ref: anchorRef,
            className: 'dsh-cj-select-anchor',
            style: style && style.width === '100%'
              ? { display: 'block', width: '100%', maxWidth: '100%' }
              : { display: 'inline-flex', maxWidth: '100%' },
            onClick: (e) => {
              if (disabled) return
              e.preventDefault()
              if (open) close()
              else openMenu()
            }
          },
            h('button', {
              type: 'button',
              className: ['dsh-cj-btn', 'dsh-cj-btn-sized', 'dsh-cj-control', 'dsh-cj-select-trigger', className].filter(Boolean).join(' '),
              style,
              disabled: !!disabled,
              title: title || ariaLabel || undefined,
              'aria-label': ariaLabel,
              'aria-expanded': open ? 'true' : 'false',
              'aria-haspopup': 'listbox'
            },
              h('span', { className: 'dsh-cj-select-label' }, label || '—'),
              h('span', { className: 'dsh-cj-select-caret', 'aria-hidden': true },
                IconChevronDown ? h(IconChevronDown) : '▾'
              )
            )
          )
        })
      }

      const menu = open && menuStyle
        ? h('div', {
            ref: menuRef,
            className: 'dsh-cj-select-menu',
            role: 'listbox',
            style: menuStyle
          },
            list.map((o) =>
              h('button', {
                key: String(o.value),
                type: 'button',
                role: 'option',
                className: 'dsh-cj-select-option',
                disabled: !!o.disabled,
                'data-selected': String(o.value) === String(value) ? '1' : '0',
                'aria-selected': String(o.value) === String(value),
                onClick: () => pick(o.value)
              }, o.label)
            )
          )
        : null

      return h(React.Fragment, null,
        trigger,
        menu && ReactDOM && ReactDOM.createPortal
          ? ReactDOM.createPortal(menu, document.body)
          : menu
      )
    }

    /**
     * 表格底部分页：总数、每页条数、左右翻页
     */
    function TablePager({ t, total, page, pageSize, busy, onPageChange, onPageSizeChange }) {
      const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize))
      const safePage = Math.min(Math.max(1, page || 1), totalPages)
      return h('div', { className: 'dsh-cj-pager' },
        h('span', { className: 'dsh-cj-pager-info' },
          fillMsg(t('totalItems'), { n: total || 0 }) + ' · ' + safePage + ' / ' + totalPages
        ),
        h('label', { className: 'dsh-cj-pager-size' },
          h(SelectField, {
            value: pageSize,
            disabled: busy,
            'aria-label': t('pageSizeLabel'),
            style: { minWidth: 72 },
            options: PAGE_SIZE_OPTIONS.map((n) => ({ value: n, label: String(n) })),
            onChange: (n) => onPageSizeChange(Number(n))
          }),
          h('span', null, t('pageSizeLabel'))
        ),
        h(Btn, {
          disabled: busy || safePage <= 1,
          icon: IconChevronLeft ? h(IconChevronLeft) : null,
          onClick: () => onPageChange(safePage - 1)
        }, IconChevronLeft ? null : '‹'),
        h(Btn, {
          disabled: busy || safePage >= totalPages,
          icon: IconChevronRight ? h(IconChevronRight) : null,
          onClick: () => onPageChange(safePage + 1)
        }, IconChevronRight ? null : '›')
      )
    }

    function logLevelTag(t, level) {
      const key = String(level || '').toLowerCase()
      if (key === 'error') return h(StatusTag, { tone: 'danger' }, t('levelError'))
      if (key === 'warn' || key === 'warning') return h(StatusTag, { tone: 'warning' }, t('levelWarn'))
      return h(StatusTag, { tone: 'info' }, t('levelInfo'))
    }

    function Btn(props) {
      const { primary, danger, icon, children, className, ...rest } = props
      if (UiButton) {
        return h(UiButton, {
          type: 'button',
          variant: primary ? 'primary' : 'outline',
          size: 'sm',
          icon: icon || undefined,
          className: ['dsh-cj-btn-sized', danger ? 'dsh-cj-btn-danger' : '', className].filter(Boolean).join(' ') || undefined,
          ...rest
        }, children)
      }
      return h('button', {
        type: 'button',
        className: ['dsh-cj-btn', className].filter(Boolean).join(' '),
        'data-primary': primary ? '1' : undefined,
        'data-danger': danger ? '1' : undefined,
        ...rest
      }, icon || null, children)
    }

    function FieldInput(props) {
      const { className, ...rest } = props
      // 不用官方 Input：其默认 border-l4 比侧栏「新会话」浅，且内部样式会盖过 className
      const merged = ['dsh-cj-input', 'dsh-cj-control', className].filter(Boolean).join(' ')
      return h('input', { className: merged, ...rest })
    }

    function editionLabel(t, edition) {
      return edition === 'region' ? t('editionRegion') : t('editionCentral')
    }

    function accountModeLabel(t, mode) {
      return mode === 'local' ? t('modeLocalShort') : t('modeRemoteShort')
    }

    function providerLabel(t, provider) {
      if (provider === 'gitlab') return t('providerGitlab')
      if (provider === 'github') return t('providerGithub')
      if (provider === 'local') return t('modeLocalShort')
      return t('providerCodeup')
    }

    function accountOrgCell(a) {
      if (a.mode === 'local') {
        const roots = a.localRoots || []
        if (!roots.length) return '-'
        return roots.length === 1 ? roots[0] : roots[0] + ' (+' + (roots.length - 1) + ')'
      }
      return a.organizationId || a.apiBaseUrl || '-'
    }

    function remoteProviderFields(form, setForm, t, mode) {
      const provider = form.provider || 'codeup'
      const tokenPh =
        mode === 'edit'
          ? t('tokenPhEdit')
          : provider === 'github'
            ? t('tokenPhGithub')
            : provider === 'gitlab'
              ? t('tokenPhGitlab')
              : t('tokenPh')

      const providerField = h('div', { className: 'dsh-cj-field' },
        h('label', { className: 'dsh-cj-label' }, t('provider')),
        h(SelectField, {
          value: provider,
          style: { width: '100%' },
          'aria-label': t('provider'),
          options: [
            { value: 'codeup', label: t('providerCodeup') },
            { value: 'gitlab', label: t('providerGitlab') },
            { value: 'github', label: t('providerGithub') }
          ],
          onChange: (v) => setForm({ ...form, provider: v })
        })
      )

      const tokenRow = h(React.Fragment, null,
        h('div', { className: 'dsh-cj-field dsh-cj-form-span' },
          h('label', { className: 'dsh-cj-label' }, t('token')),
          h(FieldInput, {
            type: 'password',
            value: form.token,
            placeholder: tokenPh,
            title: tokenPh,
            onChange: (e) => setForm({ ...form, token: e.target.value })
          })
        ),
        h('div', { className: 'dsh-cj-field dsh-cj-field-check dsh-cj-form-span' },
          h('label', { className: 'dsh-cj-label', title: t('insecureSslHint') },
            h('input', {
              type: 'checkbox',
              checked: !!form.insecureSsl,
              onChange: (e) => setForm({ ...form, insecureSsl: e.target.checked })
            }),
            t('insecureSsl')
          )
        )
      )

      if (provider === 'gitlab' || provider === 'github') {
        return h(React.Fragment, null,
          h('div', { className: 'dsh-cj-form-row' },
            providerField,
            h('div', { className: 'dsh-cj-field' },
              h('label', { className: 'dsh-cj-label' },
                provider === 'github' ? t('orgIdLabelGithub') : t('orgIdLabelGitlab')
              ),
              h(FieldInput, {
                value: form.organizationId,
                placeholder: provider === 'github' ? t('orgIdPhGithub') : t('orgIdPhGitlab'),
                title: provider === 'github' ? t('orgIdPhGithub') : t('orgIdPhGitlab'),
                onChange: (e) => setForm({ ...form, organizationId: e.target.value })
              })
            )
          ),
          h('div', { className: 'dsh-cj-form-row' },
            h('div', { className: 'dsh-cj-field dsh-cj-form-span' },
              h('label', { className: 'dsh-cj-label' }, t('apiBase')),
              h(FieldInput, {
                value: form.apiBaseUrl,
                placeholder: provider === 'github' ? t('apiBasePhGithub') : t('apiBasePhGitlab'),
                title: provider === 'github' ? t('apiBaseHintGithub') : t('apiBaseHintGitlab'),
                onChange: (e) => setForm({ ...form, apiBaseUrl: e.target.value })
              })
            )
          ),
          h('div', { className: 'dsh-cj-form-row' }, tokenRow)
        )
      }

      return h(React.Fragment, null,
        h('div', { className: 'dsh-cj-form-row' },
          providerField,
          h('div', { className: 'dsh-cj-field' },
            h('label', { className: 'dsh-cj-label' }, t('edition')),
            h(SelectField, {
              value: form.edition,
              style: { width: '100%' },
              'aria-label': t('edition'),
              options: [
                { value: 'central', label: t('editionCentral') },
                { value: 'region', label: t('editionRegion') }
              ],
              onChange: (v) => setForm({ ...form, edition: v })
            })
          )
        ),
        h('div', { className: 'dsh-cj-form-row' },
          form.edition === 'central'
            ? h('div', { className: 'dsh-cj-field dsh-cj-form-span' },
                h('label', { className: 'dsh-cj-label' }, t('orgId')),
                h(FieldInput, {
                  value: form.organizationId,
                  placeholder: t('orgIdPh'),
                  title: t('editionHintCentral'),
                  onChange: (e) => setForm({ ...form, organizationId: e.target.value })
                })
              )
            : h('div', { className: 'dsh-cj-field dsh-cj-form-span' },
                h('label', { className: 'dsh-cj-label' }, t('apiBase')),
                h(FieldInput, {
                  value: form.apiBaseUrl,
                  placeholder: t('apiBasePh'),
                  title: t('editionHintRegion'),
                  onChange: (e) => setForm({ ...form, apiBaseUrl: e.target.value })
                })
              )
        ),
        h('div', { className: 'dsh-cj-form-row' }, tokenRow)
      )
    }

    function AccountModal({ open, title, form, setForm, busy, onClose, onSave, t, mode }) {
      const isLocal = form.accountMode === 'local'
      const body = h('div', { className: 'dsh-cj-account-form' },
        h('div', { className: 'dsh-cj-form-row' },
          h('div', { className: 'dsh-cj-field' },
            h('label', { className: 'dsh-cj-label' }, t('name')),
            h(FieldInput, {
              value: form.name,
              placeholder: t('namePh'),
              onChange: (e) => setForm({ ...form, name: e.target.value }),
              'data-modal-autofocus': true
            })
          ),
          h('div', { className: 'dsh-cj-field' },
            h('label', { className: 'dsh-cj-label' }, t('accountMode')),
            h(SelectField, {
              value: form.accountMode || 'remote',
              style: { width: '100%' },
              'aria-label': t('accountMode'),
              title: isLocal ? t('modeHintLocal') : t('modeHintRemote'),
              options: [
                { value: 'remote', label: t('modeRemote') },
                { value: 'local', label: t('modeLocal') }
              ],
              onChange: (v) => setForm({ ...form, accountMode: v })
            })
          )
        ),
        isLocal
          ? h('div', { className: 'dsh-cj-form-row' },
              h('div', { className: 'dsh-cj-field dsh-cj-form-span' },
                h('label', { className: 'dsh-cj-label' }, t('localRoots')),
                h('textarea', {
                  className: 'dsh-cj-textarea',
                  rows: 3,
                  value: form.localRootsText || '',
                  placeholder: t('localRootsPh'),
                  title: t('localRootsHint'),
                  onChange: (e) => setForm({ ...form, localRootsText: e.target.value })
                })
              )
            )
          : remoteProviderFields(form, setForm, t, mode),
        h('div', { className: 'dsh-cj-form-row' },
          h('div', { className: 'dsh-cj-field' },
            h('label', { className: 'dsh-cj-label' }, t('authors')),
            h(FieldInput, {
              value: form.authorFilters,
              placeholder: t('authorsPh'),
              title: t('authorsHint'),
              onChange: (e) => setForm({ ...form, authorFilters: e.target.value })
            })
          ),
          h('div', { className: 'dsh-cj-field' },
            h('label', { className: 'dsh-cj-label' }, t('defaultBranch')),
            h(FieldInput, {
              value: form.defaultBranch,
              placeholder: t('defaultBranchPh'),
              onChange: (e) => setForm({ ...form, defaultBranch: e.target.value })
            })
          )
        )
      )

      const footer = h(React.Fragment, null,
        h(Btn, { icon: IconClose ? h(IconClose) : null, onClick: onClose }, t('cancel')),
        h(Btn, { primary: true, disabled: busy, icon: IconSave ? h(IconSave) : null, onClick: onSave }, t('save'))
      )

      if (UiModal) {
        return h(UiModal, {
          open: !!open,
          onClose,
          title,
          closeLabel: t('cancel'),
          footer,
          backdropBlur: true,
          className: 'dsh-cj-modal-wide'
        }, body)
      }

      if (!open) return null
      return h('div', { className: 'dsh-cj-modal-mask', onClick: onClose },
        h('div', { className: 'dsh-cj-modal dsh-cj-modal-wide', onClick: (e) => e.stopPropagation() },
          h('h3', null, title),
          body,
          h('div', { className: 'dsh-cj-actions' }, footer)
        )
      )
    }

    function PanelIcon(props) {
      return h('svg', {
        width: 18, height: 18, viewBox: '0 0 16 16', fill: 'currentColor', 'aria-hidden': true, ...props
      },
        h('rect', { x: 1, y: 1, width: 3, height: 3, rx: 0.5, opacity: 0.35 }),
        h('rect', { x: 5, y: 1, width: 3, height: 3, rx: 0.5, opacity: 0.55 }),
        h('rect', { x: 9, y: 1, width: 3, height: 3, rx: 0.5, opacity: 0.75 }),
        h('rect', { x: 13, y: 1, width: 2, height: 3, rx: 0.5, opacity: 1 }),
        h('rect', { x: 1, y: 5, width: 3, height: 3, rx: 0.5, opacity: 0.55 }),
        h('rect', { x: 5, y: 5, width: 3, height: 3, rx: 0.5, opacity: 1 }),
        h('rect', { x: 9, y: 5, width: 3, height: 3, rx: 0.5, opacity: 0.35 }),
        h('rect', { x: 13, y: 5, width: 2, height: 3, rx: 0.5, opacity: 0.75 }),
        h('rect', { x: 1, y: 9, width: 3, height: 3, rx: 0.5, opacity: 0.75 }),
        h('rect', { x: 5, y: 9, width: 3, height: 3, rx: 0.5, opacity: 0.35 }),
        h('rect', { x: 9, y: 9, width: 3, height: 3, rx: 0.5, opacity: 1 }),
        h('rect', { x: 13, y: 9, width: 2, height: 3, rx: 0.5, opacity: 0.55 })
      )
    }

    function emptyForm() {
      return {
        name: '',
        accountMode: 'local',
        provider: 'codeup',
        edition: 'central',
        organizationId: '',
        apiBaseUrl: '',
        insecureSsl: false,
        localRootsText: '',
        token: '',
        authorFilters: '',
        defaultBranch: 'master'
      }
    }

    function AccountsPage({ t, accounts, activeId, onChanged, busy, setBusy, notify }) {
      const [modal, setModal] = useState(null)
      const [form, setForm] = useState(emptyForm())

      const openNew = () => { setForm(emptyForm()); setModal('new') }
      const openEdit = (a) => {
        setForm({
          id: a.id,
          name: a.name || '',
          accountMode: a.mode === 'local' ? 'local' : 'remote',
          provider: a.mode === 'local' ? 'local' : (a.provider || 'codeup'),
          edition: a.edition || 'central',
          organizationId: a.organizationId || '',
          apiBaseUrl: a.apiBaseUrl || '',
          insecureSsl: !!a.insecureSsl,
          localRootsText: (a.localRoots || []).join('\n'),
          token: '',
          authorFilters: (a.authorFilters || []).join(', '),
          defaultBranch: a.defaultBranch || 'master'
        })
        setModal('edit')
      }

      const switchAccount = async (id) => {
        if (!id || id === activeId) return
        setBusy(true)
        try {
          await api('/api/accounts/' + encodeURIComponent(id) + '/activate', { method: 'POST', body: '{}' })
          await onChanged()
          notify(t('activateOk'), 'success')
        } catch (e) { notify(e.message || String(e), 'error') }
        finally { setBusy(false) }
      }

      const save = async () => {
        setBusy(true)
        try {
          const isLocal = form.accountMode === 'local'
          const provider = isLocal ? 'local' : (form.provider || 'codeup')
          const payload = {
            name: form.name,
            mode: isLocal ? 'local' : 'remote',
            provider,
            edition: !isLocal && provider === 'codeup' ? form.edition : undefined,
            organizationId: isLocal ? undefined : form.organizationId,
            apiBaseUrl: isLocal ? undefined : form.apiBaseUrl,
            insecureSsl: isLocal ? undefined : !!form.insecureSsl,
            localRoots: isLocal
              ? String(form.localRootsText || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
              : undefined,
            token: isLocal ? undefined : (form.token || undefined),
            authorFilters: form.authorFilters.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
            defaultBranch: form.defaultBranch,
            setActive: true,
            test: true
          }
          if (modal === 'edit') {
            await api('/api/accounts/' + encodeURIComponent(form.id), {
              method: 'PATCH',
              body: JSON.stringify(payload)
            })
          } else {
            await api('/api/accounts', { method: 'POST', body: JSON.stringify(payload) })
          }
          setModal(null)
          await onChanged()
          notify(t('saveOk'), 'success')
        } catch (e) { notify(e.message || String(e), 'error') }
        finally { setBusy(false) }
      }

      return h('div', { className: 'dsh-cj-page-scroll' },
        h(PageHead, { desc: t('descAccounts') }),
        h('div', { className: 'dsh-cj-row dsh-cj-row-end' },
          accounts.length
            ? h('div', { className: 'dsh-cj-actions' },
                h('span', { className: 'dsh-cj-muted' }, t('currentAccount')),
                h(SelectField, {
                  style: { minWidth: 180 },
                  value: activeId || '',
                  disabled: busy || accounts.length < 2,
                  'aria-label': t('switchAccount'),
                  placeholder: t('switchAccount'),
                  options: accounts.map((a) => ({
                    value: a.id,
                    label: (a.name || a.id) + ' · ' + accountModeLabel(t, a.mode)
                  })),
                  onChange: (id) => { void switchAccount(id) }
                })
              )
            : h('div', { className: 'dsh-cj-muted' }, t('emptyAccount')),
          h(Btn, { primary: true, icon: IconPlus ? h(IconPlus) : null, onClick: openNew }, t('newAccount'))
        ),
        h('div', { className: 'dsh-cj-table-wrap' },
          h('table', { className: 'dsh-cj-table' },
            h('thead', null, h('tr', null,
              h('th', null, t('name')),
              h('th', null, t('accountMode')),
              h('th', null, t('provider')),
              h('th', null, t('org')),
              h('th', null, t('authors')),
              h('th', null, '')
            )),
            h('tbody', null, accounts.map((a) =>
              h('tr', { key: a.id },
                h('td', null,
                  a.name, ' ',
                  a.active ? h(StatusTag, { tone: 'solid' }, t('active')) : null
                ),
                h('td', null, accountModeLabel(t, a.mode)),
                h('td', { className: 'dsh-cj-td-clip', title: a.mode === 'local' ? undefined : providerLabel(t, a.provider) },
                  a.mode === 'local' ? '-' : providerLabel(t, a.provider)
                ),
                h('td', {
                  className: 'dsh-cj-td-clip',
                  title: a.mode === 'local' ? (a.localRoots || []).join('\n') : (a.organizationId || a.apiBaseUrl || '')
                }, accountOrgCell(a)),
                h('td', {
                  className: 'dsh-cj-td-clip',
                  title: (a.authorFilters || []).join(', ') || undefined
                }, (a.authorFilters || []).join(', ') || '-'),
                h('td', { className: 'dsh-cj-td-actions' },
                  h('div', { className: 'dsh-cj-actions' },
                    !a.active && h(Btn, {
                      className: 'dsh-cj-btn-icon',
                      disabled: busy,
                      title: t('activate'),
                      'aria-label': t('activate'),
                      icon: IconCheck ? h(IconCheck) : null,
                      onClick: () => { void switchAccount(a.id) }
                    }, IconCheck ? null : t('activate')),
                    h(Btn, {
                      className: 'dsh-cj-btn-icon',
                      disabled: busy,
                      title: a.mode === 'local' ? t('testScan') : t('test'),
                      'aria-label': a.mode === 'local' ? t('testScan') : t('test'),
                      // 远程测连用地球；本地扫描用搜索，避免纯图标时语义混淆
                      icon: a.mode === 'local'
                        ? (IconSearch ? h(IconSearch) : null)
                        : (IconGlobe ? h(IconGlobe) : null),
                      onClick: async () => {
                        setBusy(true)
                        try {
                          const res = await api(
                            '/api/accounts/' + encodeURIComponent(a.id) + '/test',
                            { method: 'POST', body: '{}' }
                          )
                          if (a.mode === 'local') {
                            notify(fillMsg(t('testScanOk'), { n: res.repoCount || 0 }), 'success')
                          } else {
                            notify(t('testOk'), 'success')
                          }
                        } catch (e) { notify(e.message || String(e), 'error') }
                        finally { setBusy(false) }
                      }
                    }, (a.mode === 'local' ? IconSearch : IconGlobe)
                      ? null
                      : (a.mode === 'local' ? t('testScan') : t('test'))),
                    h(Btn, {
                      className: 'dsh-cj-btn-icon',
                      title: t('edit'),
                      'aria-label': t('edit'),
                      icon: IconEdit ? h(IconEdit) : null,
                      onClick: () => openEdit(a)
                    }, IconEdit ? null : t('edit')),
                    h(Btn, {
                      className: 'dsh-cj-btn-icon',
                      danger: true, disabled: busy,
                      title: t('remove'),
                      'aria-label': t('remove'),
                      icon: IconTrash ? h(IconTrash) : null,
                      onClick: async () => {
                        if (!confirm(t('confirmDelete'))) return
                        setBusy(true)
                        try {
                          await api('/api/accounts/' + encodeURIComponent(a.id), { method: 'DELETE' })
                          await onChanged()
                          notify(t('clearOk'), 'success')
                        } catch (e) { notify(e.message || String(e), 'error') }
                        finally { setBusy(false) }
                      }
                    }, IconTrash ? null : t('remove'))
                  )
                )
              )
            ))
          )
        ),
        h(AccountModal, {
          open: !!modal,
          mode: modal,
          title: modal === 'edit' ? t('edit') : t('newAccount'),
          form, setForm, busy, t,
          onClose: () => setModal(null),
          onSave: save
        })
      )
    }

    function BranchSelect({ accountId, repo, value, onChange, notify, t }) {
      const [options, setOptions] = useState([])
      const [loading, setLoading] = useState(false)
      const loaded = React.useRef(false)
      const fallback = repo.defaultBranch || 'master'

      const ensureLoaded = async () => {
        if (loaded.current || loading) return
        setLoading(true)
        try {
          const data = await api(
            '/api/repo-branches?accountId=' +
              encodeURIComponent(accountId) +
              '&repoId=' +
              encodeURIComponent(repo.id)
          )
          const names = (data.branches || []).map((b) => b.name).filter(Boolean)
          if (fallback && !names.includes(fallback)) names.unshift(fallback)
          setOptions(names)
          loaded.current = true
        } catch (e) {
          if (!options.length) setOptions(fallback ? [fallback] : [])
          notify(e.message || String(e), 'error')
        } finally { setLoading(false) }
      }

      useEffect(() => {
        loaded.current = false
        setOptions(fallback ? [fallback] : [])
      }, [repo.id, fallback])

      const current = value || fallback
      const list = options.includes(current) ? options : (current ? [current].concat(options) : options)

      return h(SelectField, {
        style: { width: 160 },
        value: current,
        disabled: loading,
        title: loading ? '…' : t('branch'),
        'aria-label': t('branch'),
        onOpen: () => { ensureLoaded().catch(() => {}) },
        options: list.map((name) => ({
          value: name,
          label: name === fallback ? (name + ' (' + t('defaultBranch') + ')') : name
        })),
        onChange: (v) => onChange(v === fallback ? '' : v)
      })
    }

    function WatchFilter({ t, value, onChange }) {
      const options = [
        { value: 'watched', label: t('filterWatched') },
        { value: 'unwatched', label: t('filterUnwatched') },
        { value: 'all', label: t('filterAll') }
      ]
      if (UiSeg) {
        return h(UiSeg, {
          id: 'dsh-cj-watch-filter',
          label: t('watched'),
          value,
          options,
          onChange
        })
      }
      return h('div', { className: 'dsh-cj-seg', role: 'tablist' },
        options.map((o) =>
          h('button', {
            key: o.value,
            type: 'button',
            'data-active': value === o.value ? '1' : '0',
            onClick: () => { if (value !== o.value) onChange(o.value) }
          }, o.label)
        )
      )
    }

    function ReposPage({ t, accountId, accountMode, busy, setBusy, notify }) {
      const [repos, setRepos] = useState([])
      const [watched, setWatched] = useState([])
      const [branches, setBranches] = useState({})
      const [keyword, setKeyword] = useState('')
      const [watchFilter, setWatchFilter] = useState('watched')
      const [page, setPage] = useState(1)
      const [pageSize, setPageSize] = useState(10)
      const isLocal = accountMode === 'local'

      const load = useCallback(async () => {
        if (!accountId) return
        const data = await api('/api/repos?accountId=' + encodeURIComponent(accountId))
        setRepos(data.repos || [])
        setWatched(data.watchedRepoIds || [])
        setBranches(data.repoBranches || {})
      }, [accountId])

      useEffect(() => { load().catch((e) => notify(e.message || String(e), 'error')) }, [load, notify])
      useEffect(() => { setPage(1) }, [keyword, watchFilter, accountId, pageSize])

      const allMode = watched.length === 0
      const isWatched = useCallback((id) => allMode || watched.includes(id), [allMode, watched])

      const filtered = useMemo(() => {
        const q = keyword.trim().toLowerCase()
        return repos.filter((r) => {
          const watchedNow = isWatched(r.id)
          if (watchFilter === 'watched' && !watchedNow) return false
          if (watchFilter === 'unwatched' && watchedNow) return false
          if (!q) return true
          const label = shortRepoLabel(r.displayName || r.fullName || r.name).toLowerCase()
          return label.includes(q) || String(r.name || '').toLowerCase().includes(q)
        })
      }, [repos, keyword, watchFilter, isWatched])

      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
      const safePage = Math.min(page, totalPages)
      const pageRepos = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

      if (!accountId) {
        return h('div', { className: 'dsh-cj-page-fill' },
          h(PageHead, { desc: t('descRepos') }),
          h('p', { className: 'dsh-cj-muted' }, t('emptyAccount'))
        )
      }

      return h('div', { className: 'dsh-cj-page-fill' },
        h(PageHead, { desc: isLocal ? t('descReposLocal') : t('descRepos') }),
        h('div', { className: 'dsh-cj-row' },
          h(WatchFilter, { t, value: watchFilter, onChange: setWatchFilter }),
          h(FieldInput, {
            style: { width: 180 },
            icon: IconSearch ? h(IconSearch) : undefined,
            placeholder: t('repoKeyword'),
            value: keyword,
            onChange: (e) => setKeyword(e.target.value)
          }),
          h('div', { className: 'dsh-cj-actions' },
            h(Btn, {
              disabled: busy,
              icon: IconRefresh ? h(IconRefresh) : null,
              onClick: async () => {
                setBusy(true)
                try {
                  await api('/api/repos/refresh', { method: 'POST', body: JSON.stringify({ accountId }) })
                  await load()
                  notify(isLocal ? t('refreshScanOk') : t('refreshOk'), 'success')
                } catch (e) { notify(e.message || String(e), 'error') }
                finally { setBusy(false) }
              }
            }, isLocal ? t('refreshScan') : t('refresh')),
            h(Btn, {
              disabled: busy,
              icon: IconSave ? h(IconSave) : null,
              onClick: async () => {
                setBusy(true)
                try {
                  await api('/api/repos/watch', {
                    method: 'PUT',
                    body: JSON.stringify({ accountId, watchedRepoIds: watched, repoBranches: branches })
                  })
                  await load()
                  notify(t('saveWatchOk'), 'success')
                } catch (e) { notify(e.message || String(e), 'error') }
                finally { setBusy(false) }
              }
            }, t('saveWatch')),
            h(Btn, {
              primary: true, disabled: busy,
              icon: IconDownload ? h(IconDownload) : null,
              onClick: async () => {
                setBusy(true)
                try {
                  const result = await api('/api/sync', { method: 'POST', body: JSON.stringify({ accountId }) })
                  notify(syncToastText(t, result), (result.errors && result.errors.length) ? 'error' : 'success')
                } catch (e) { notify(e.message || String(e), 'error') }
                finally { setBusy(false) }
              }
            }, isLocal ? t('syncWatchedLocal') : t('syncWatched'))
          )
        ),
        h('div', { className: 'dsh-cj-table-wrap' },
          h('table', { className: 'dsh-cj-table' },
            h('thead', null, h('tr', null,
              h('th', null, t('watched')),
              h('th', null, t('repo')),
              h('th', null, t('branch')),
              h('th', null, '')
            )),
            h('tbody', null, pageRepos.map((r) => {
              const checked = isWatched(r.id)
              return h('tr', { key: r.id },
                h('td', null,
                  h('input', {
                    type: 'checkbox',
                    checked,
                    onChange: (e) => {
                      if (allMode) {
                        if (!e.target.checked) setWatched(repos.map((x) => x.id).filter((id) => id !== r.id))
                      } else if (e.target.checked) setWatched(watched.concat([r.id]))
                      else setWatched(watched.filter((id) => id !== r.id))
                    }
                  })
                ),
                h('td', null, shortRepoLabel(r.displayName || r.fullName || r.name)),
                h('td', null,
                  h(BranchSelect, {
                    accountId,
                    repo: r,
                    t,
                    notify,
                    value: branches[r.id] || '',
                    onChange: (next) => {
                      const nextMap = { ...branches }
                      if (!next) delete nextMap[r.id]
                      else nextMap[r.id] = next
                      setBranches(nextMap)
                    }
                  })
                ),
                h('td', null,
                  h('div', { className: 'dsh-cj-actions' },
                    h(Btn, {
                      disabled: busy,
                      icon: IconDownload ? h(IconDownload) : null,
                      onClick: async () => {
                        setBusy(true)
                        try {
                          const result = await api('/api/sync', {
                            method: 'POST',
                            body: JSON.stringify({ accountId, repoIds: [r.id] })
                          })
                          notify(syncToastText(t, result), (result.errors && result.errors.length) ? 'error' : 'success')
                        } catch (e) { notify(e.message || String(e), 'error') }
                        finally { setBusy(false) }
                      }
                    }, t('sync')),
                    r.webUrl
                      ? h(Btn, {
                          icon: IconLink ? h(IconLink) : null,
                          onClick: () => {
                            try { window.open(r.webUrl, '_blank', 'noopener,noreferrer') } catch { /* ignore */ }
                          }
                        }, t('openRepo'))
                      : null
                  )
                )
              )
            }))
          )
        ),
        h(TablePager, {
          t,
          total: filtered.length,
          page: safePage,
          pageSize,
          busy,
          onPageChange: setPage,
          onPageSizeChange: (size) => { setPageSize(size); setPage(1) }
        })
      )
    }

    function CommitsPage({ t, accountId, busy, setBusy, notify }) {
      const [repos, setRepos] = useState([])
      const [items, setItems] = useState([])
      const [total, setTotal] = useState(0)
      const [repoId, setRepoId] = useState('')
      const [from, setFrom] = useState('')
      const [to, setTo] = useState('')
      const [keyword, setKeyword] = useState('')
      const [page, setPage] = useState(1)
      const [pageSize, setPageSize] = useState(10)

      const load = useCallback(async (nextPage, nextSize) => {
        if (!accountId) return
        const size = nextSize || pageSize
        const p = nextPage || page
        const q = new URLSearchParams({
          accountId,
          limit: String(size),
          offset: String((p - 1) * size)
        })
        if (repoId) q.set('repoId', repoId)
        if (from) q.set('from', from + 'T00:00:00.000Z')
        if (to) q.set('to', to + 'T23:59:59.999Z')
        if (keyword.trim()) q.set('keyword', keyword.trim())
        const [commits, repoData] = await Promise.all([
          api('/api/commits?' + q.toString()),
          api('/api/repos?accountId=' + encodeURIComponent(accountId) + '&withCommitsOnly=1')
        ])
        setItems(commits.items || [])
        setTotal(commits.total || 0)
        setRepos(repoData.repos || [])
        setPage(p)
        if (nextSize) setPageSize(size)
      }, [accountId, from, keyword, page, pageSize, repoId, to])

      useEffect(() => {
        if (!accountId) return
        load(1).catch((e) => notify(e.message || String(e), 'error'))
      }, [accountId]) // eslint-disable-line

      if (!accountId) {
        return h('div', { className: 'dsh-cj-page-fill' },
          h(PageHead, { desc: t('descCommits') }),
          h('p', { className: 'dsh-cj-muted' }, t('emptyAccount'))
        )
      }

      return h('div', { className: 'dsh-cj-page-fill' },
        h(PageHead, { desc: t('descCommits') }),
        h('div', { className: 'dsh-cj-row' },
          h(SelectField, {
            value: repoId,
            style: { minWidth: 180 },
            'aria-label': t('repo'),
            options: [{ value: '', label: t('allRepos') }].concat(
              repos.map((r) => ({
                value: r.id,
                label: shortRepoLabel(r.displayName || r.fullName || r.name)
              }))
            ),
            onChange: setRepoId
          }),
          h(FieldInput, {
            type: 'date',
            style: { minWidth: 140 },
            value: from,
            onChange: (e) => setFrom(e.target.value),
            title: t('from'),
            'aria-label': t('from')
          }),
          h(FieldInput, {
            type: 'date',
            style: { minWidth: 140 },
            value: to,
            onChange: (e) => setTo(e.target.value),
            title: t('to'),
            'aria-label': t('to')
          }),
          h(FieldInput, {
            style: { minWidth: 160 },
            placeholder: t('keyword'),
            value: keyword,
            onChange: (e) => setKeyword(e.target.value),
            'aria-label': t('keyword')
          }),
          h(Btn, {
            primary: true, disabled: busy,
            icon: IconSearch ? h(IconSearch) : null,
            onClick: () => {
              setBusy(true)
              load(1)
                .then(() => notify(t('queryOk'), 'success'))
                .catch((e) => notify(e.message || String(e), 'error'))
                .finally(() => setBusy(false))
            }
          }, t('query')),
          h(Btn, {
            danger: true, disabled: busy,
            icon: IconTrash ? h(IconTrash) : null,
            onClick: async () => {
              if (!confirm(t('confirmClearCommits'))) return
              setBusy(true)
              try {
                await api('/api/commits/clear', { method: 'POST', body: JSON.stringify({ accountId }) })
                await load(1)
                notify(t('clearOk'), 'success')
              } catch (e) { notify(e.message || String(e), 'error') }
              finally { setBusy(false) }
            }
          }, t('clearCommits'))
        ),
        h('div', { className: 'dsh-cj-table-wrap' },
          h('table', { className: 'dsh-cj-table' },
            h('thead', null, h('tr', null,
              h('th', null, t('time')), h('th', null, t('repo')), h('th', null, t('title')),
              h('th', null, t('author')), h('th', null, t('sha'))
            )),
            h('tbody', null, items.map((c) =>
              h('tr', { key: c.id },
                h('td', null, (c.committedAt || '').slice(0, 16).replace('T', ' ')),
                h('td', null, shortRepoLabel(c.repoName)),
                h('td', null, c.title),
                h('td', null, c.authorName),
                h('td', null,
                  c.webUrl
                    ? h('a', { className: 'dsh-cj-link', href: c.webUrl, target: '_blank', rel: 'noreferrer' }, c.shortId)
                    : c.shortId
                )
              )
            ))
          )
        ),
        h(TablePager, {
          t,
          total,
          page,
          pageSize,
          busy,
          onPageChange: (p) => {
            setBusy(true)
            load(p).catch((e) => notify(e.message || String(e), 'error')).finally(() => setBusy(false))
          },
          onPageSizeChange: (size) => {
            setBusy(true)
            load(1, size).catch((e) => notify(e.message || String(e), 'error')).finally(() => setBusy(false))
          }
        })
      )
    }

    function formatDayTitle(iso) {
      const d = new Date(iso + 'T12:00:00')
      if (Number.isNaN(d.getTime())) return iso
      const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
      return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 周' + wd
    }

    function ActivityPage({ t, accountId, notify }) {
      const [year, setYear] = useState(0)
      const [years, setYears] = useState([])
      const [data, setData] = useState(null)
      const [day, setDay] = useState(null)
      const [dayItems, setDayItems] = useState([])
      const [dayLoading, setDayLoading] = useState(false)
      const weekLabels = ['一', '二', '三', '四', '五', '六', '日']
      const dayReq = React.useRef(0)

      useEffect(() => {
        setYear(0)
        setData(null)
        setYears([])
        setDay(null)
        setDayItems([])
      }, [accountId])

      useEffect(() => {
        if (!accountId) return
        const q = new URLSearchParams({ accountId })
        if (year) q.set('year', String(year))
        api('/api/activity?' + q.toString())
          .then((d) => {
            setData(d)
            setYears(d.years || [])
            setDay(null)
            setDayItems([])
          })
          .catch((e) => notify(e.message || String(e), 'error'))
      }, [accountId, year, notify])

      const openDay = async (date) => {
        const reqId = ++dayReq.current
        setDay(date)
        setDayItems([])
        setDayLoading(true)
        try {
          const r = await api('/api/activity/day?accountId=' + encodeURIComponent(accountId) + '&date=' + encodeURIComponent(date))
          if (dayReq.current === reqId) setDayItems(r.commits || [])
        } catch (e) {
          if (dayReq.current === reqId) {
            setDayItems([])
            notify(e.message || String(e), 'error')
          }
        } finally {
          if (dayReq.current === reqId) setDayLoading(false)
        }
      }

      const heatmap = useMemo(() => {
        if (!data) return null
        const fromDay = new Date(data.from + 'T00:00:00')
        const toDay = new Date(data.to + 'T00:00:00')
        const mondayOffset = (fromDay.getDay() + 6) % 7
        const gridStart = new Date(fromDay); gridStart.setDate(fromDay.getDate() - mondayOffset)
        const endPad = (7 - ((toDay.getDay() + 6) % 7) - 1 + 7) % 7
        const gridEnd = new Date(toDay); gridEnd.setDate(toDay.getDate() + endPad)
        const totalDays = Math.round((gridEnd - gridStart) / 86400000) + 1
        const weeks = Math.ceil(totalDays / 7)
        const countByDay = new Map((data.days || []).map((d) => [d.date, d.count]))
        const step = Math.max(1, Math.ceil((data.stats.maxDayCount || 1) / 4))
        const now = new Date()
        const todayKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
        const cells = []
        const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]
        for (let i = 0; i < weeks * 7; i++) {
          const d = new Date(gridStart); d.setDate(gridStart.getDate() + i)
          const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
          const inRange = d >= fromDay && d <= toDay
          const count = inRange ? (countByDay.get(key) || 0) : 0
          const level = count <= 0 ? 0 : Math.min(4, Math.ceil(count / step))
          if (inRange && count > 0) weekdayCounts[(d.getDay() + 6) % 7] += count
          cells.push({ key, count, inRange, level, isToday: key === todayKey })
        }
        // Sparse month labels like the desktop reference (avoid crowding near the end)
        const monthLabels = []
        let lastLabelWeek = -4
        let prevMonth = -1
        for (let w = 0; w < weeks; w++) {
          const d = new Date(gridStart); d.setDate(gridStart.getDate() + w * 7)
          if (d < fromDay) continue
          if (d.getMonth() === prevMonth) continue
          prevMonth = d.getMonth()
          if (w - lastLabelWeek < 3 || w > weeks - 4) continue
          monthLabels.push({ column: w + 1, text: (d.getMonth() + 1) + '月' })
          lastLabelWeek = w
        }
        let currentStreak = 0
        for (let cur = new Date(Math.min(toDay.getTime(), Date.now())); cur >= fromDay; cur.setDate(cur.getDate() - 1)) {
          const key = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0')
          if ((countByDay.get(key) || 0) > 0) currentStreak++
          else break
        }
        const avg = data.stats.activeDays
          ? Math.round((data.stats.totalCommits / data.stats.activeDays) * 10) / 10
          : 0
        const wdMax = Math.max(1, ...weekdayCounts)
        return { weeks, cells, monthLabels, weekdayCounts, wdMax, currentStreak, avg }
      }, [data])

      if (!accountId) {
        return h('div', { className: 'dsh-cj-page-scroll' },
          h(PageHead, { desc: t('descActivity') }),
          h('p', { className: 'dsh-cj-muted' }, t('emptyAccount'))
        )
      }
      if (!data) {
        return h('div', { className: 'dsh-cj-page-scroll' },
          h(PageHead, { desc: t('descActivity') }),
          h('p', { className: 'dsh-cj-muted' }, '…')
        )
      }
      if (!data.stats.totalCommits) {
        return h('div', { className: 'dsh-cj-page-scroll' },
          h(PageHead, { desc: t('descActivity') }),
          h('div', { className: 'dsh-cj-row dsh-cj-row-end' },
            h('span'),
            h(SelectField, {
              value: year,
              'aria-label': t('recentYear'),
              options: [{ value: 0, label: t('recentYear') }].concat(
                years.map((y) => ({ value: y, label: y + ' 年' }))
              ),
              onChange: (v) => { setData(null); setYear(Number(v)) }
            })
          ),
          h('p', { className: 'dsh-cj-muted' }, t('noData')),
          h('p', { className: 'dsh-cj-footnote' }, t('activityFootnote'))
        )
      }

      const stats = data.stats

      return h('div', { className: 'dsh-cj-page-scroll' },
        // h(PageHead, {
        //   desc: (year ? (year + ' 年提交活跃度') : t('descActivity')) + ' · ' + data.from + ' ~ ' + data.to
        // }),
        h('div', { className: 'dsh-cj-row dsh-cj-row-end' },
          h('span', { className: 'dsh-cj-muted' }, t('heatHint')),
          h(SelectField, {
            value: year,
            'aria-label': t('recentYear'),
            options: [{ value: 0, label: t('recentYear') }].concat(
              years.map((y) => ({ value: y, label: y + ' 年' }))
            ),
            onChange: (v) => { setData(null); setYear(Number(v)) }
          })
        ),
        h('div', { className: 'dsh-cj-stats' },
          h('div', { className: 'dsh-cj-stat' },
            h('div', { className: 'l' }, t('totalCommits')),
            h('div', { className: 'v' }, stats.totalCommits),
            h('div', { className: 'n' }, t('noteTotal'))
          ),
          h('div', { className: 'dsh-cj-stat' },
            h('div', { className: 'l' }, t('activeDays')),
            h('div', { className: 'v' }, stats.activeDays, h('small', null, t('unitDay'))),
            h('div', { className: 'n' }, t('noteActiveDays'))
          ),
          h('div', { className: 'dsh-cj-stat' },
            h('div', { className: 'l' }, t('longestStreak')),
            h('div', { className: 'v' }, stats.longestStreak, h('small', null, t('unitDay'))),
            h('div', { className: 'n' }, t('noteStreak'))
          ),
          h('div', { className: 'dsh-cj-stat' },
            h('div', { className: 'l' }, t('maxDay')),
            h('div', { className: 'v' }, stats.maxDayCount, h('small', null, t('unitCommit'))),
            h('div', { className: 'n' }, stats.maxDayDate || t('notePeak'))
          )
        ),
        heatmap && h('div', { className: 'dsh-cj-heat' },
          h('div', { className: 'dsh-cj-heat-body' },
            h('div', { className: 'dsh-cj-weekdays', 'aria-hidden': true },
              weekLabels.map((x) => h('span', { key: x }, x))
            ),
            h('div', { className: 'dsh-cj-heat-main' },
              h('div', {
                className: 'dsh-cj-months',
                'aria-hidden': true,
                style: { gridTemplateColumns: 'repeat(' + heatmap.weeks + ', calc(var(--dsh-cj-cell) + var(--dsh-cj-gap)))' }
              },
                heatmap.monthLabels.map((m) =>
                  h('span', {
                    key: m.column + '-' + m.text,
                    className: 'dsh-cj-month',
                    style: { gridColumn: m.column }
                  }, m.text)
                )
              ),
              h('div', {
                className: 'dsh-cj-grid',
                role: 'group',
                'aria-label': data.from + ' ~ ' + data.to
              },
                heatmap.cells.map((c) => {
                  const clickable = c.inRange && c.count > 0
                  const tip = c.inRange ? (c.key + ' · ' + c.count + ' ' + t('unitCommit')) : c.key
                  return h('button', {
                    key: c.key,
                    type: 'button',
                    className: [
                      'dsh-cj-cell',
                      c.inRange ? 'lv' + c.level : 'is-blank',
                      clickable ? 'has-commits' : '',
                      c.isToday ? 'is-today' : '',
                      day === c.key ? 'is-today' : ''
                    ].filter(Boolean).join(' '),
                    title: clickable ? tip + '（点击查看）' : tip,
                    disabled: !clickable,
                    onClick: () => openDay(c.key)
                  })
                })
              )
            )
          ),
          h('div', { className: 'dsh-cj-heat-foot' },
            h('span', null, fillMsg(t('heatSummary'), {
              w: heatmap.weeks,
              a: stats.activeDays,
              c: stats.totalCommits
            })),
            h('span', { className: 'dsh-cj-heat-legend' },
              h('span', null, t('less')),
              [0, 1, 2, 3, 4].map((lv) =>
                h('span', { key: lv, className: 'swatch' + (lv ? ' lv' + lv : '') })
              ),
              h('span', null, t('more'))
            )
          )
        ),
        heatmap && h('div', { className: 'dsh-cj-insights' },
          h('div', { className: 'dsh-cj-insight' },
            h('h4', null, t('weekdayDist')),
            heatmap.weekdayCounts.map((n, i) =>
              h('div', { className: 'dsh-cj-wd', key: weekLabels[i] },
                h('span', null, weekLabels[i]),
                h('div', { className: 'dsh-cj-wd-bar' },
                  h('i', { style: { width: Math.round((n / heatmap.wdMax) * 100) + '%' } })
                ),
                h('span', null, n)
              )
            )
          ),
          h('div', { className: 'dsh-cj-insight' },
            h('h4', null, t('activity')),
            h('div', { className: 'dsh-cj-meta-list' },
              h('div', null, h('span', null, t('currentStreak')), h('strong', null, heatmap.currentStreak)),
              h('div', null, h('span', null, t('avgPerDay')), h('strong', null, heatmap.avg)),
              h('div', null,
                h('span', null, t('peakOn')),
                h('strong', null, data.stats.maxDayDate || '—')
              ),
              h('div', null,
                h('span', null, t('maxDay')),
                h('strong', null, data.stats.maxDayCount)
              )
            )
          )
        ),
        h('p', { className: 'dsh-cj-footnote' }, t('activityFootnote')),
        day && h('aside', {
          className: 'dsh-cj-drawer',
          role: 'complementary',
          'aria-label': day
        },
          h('div', { className: 'dsh-cj-drawer-head' },
            h('div', { className: 'dsh-cj-drawer-title' },
              h('strong', null, formatDayTitle(day)),
              h('span', null,
                day + ' · ' + (dayLoading ? t('dayLoading') : fillMsg(t('dayCommits'), { n: dayItems.length }))
              )
            ),
            h(Btn, {
              icon: IconClose ? h(IconClose) : null,
              onClick: () => setDay(null)
            }, IconClose ? null : '×')
          ),
          h('div', { className: 'dsh-cj-drawer-body' },
            dayLoading
              ? h('p', { className: 'dsh-cj-muted' }, '…')
              : (dayItems.length
                ? dayItems.map((c, i) =>
                    h('div', { className: 'dsh-cj-commit', key: c.id || i },
                      h('div', { className: 'dsh-cj-commit-head' },
                        h('span', null, (c.time || '').slice(11, 16) || '—'),
                        h('span', { className: 'dsh-cj-commit-repo', title: c.repo }, shortRepoLabel(c.repo))
                      ),
                      h('div', { className: 'dsh-cj-commit-title' }, c.title),
                      h('div', { className: 'dsh-cj-commit-meta' },
                        h('span', { className: 'dsh-cj-commit-sha' }, c.sha),
                        h('span', null, c.authorName || ''),
                        c.webUrl
                          ? h(Btn, {
                              icon: IconLink ? h(IconLink) : null,
                              onClick: () => {
                                try { window.open(c.webUrl, '_blank', 'noopener,noreferrer') } catch { /* ignore */ }
                              }
                            }, t('openRepo'))
                          : null
                      )
                    )
                  )
                : h('p', { className: 'dsh-cj-muted' }, t('dayEmpty')))
          )
        )
      )
    }

    function LogsPage({ t, accountId, busy, setBusy, notify }) {
      const [items, setItems] = useState([])
      const [total, setTotal] = useState(0)
      const [page, setPage] = useState(1)
      const [pageSize, setPageSize] = useState(10)

      const load = useCallback(async (nextPage, nextSize) => {
        if (!accountId) return
        const size = nextSize || pageSize
        const p = nextPage || page
        const q = new URLSearchParams({
          accountId,
          limit: String(size),
          offset: String((p - 1) * size)
        })
        const data = await api('/api/logs?' + q.toString())
        setItems(data.items || [])
        setTotal(data.total || 0)
        setPage(p)
        if (nextSize) setPageSize(size)
      }, [accountId, page, pageSize])

      useEffect(() => {
        if (!accountId) return
        load(1).catch((e) => notify(e.message || String(e), 'error'))
      }, [accountId]) // eslint-disable-line

      if (!accountId) {
        return h('div', { className: 'dsh-cj-page-fill' },
          h(PageHead, { desc: t('descLogs') }),
          h('p', { className: 'dsh-cj-muted' }, t('emptyAccount'))
        )
      }

      return h('div', { className: 'dsh-cj-page-fill' },
        h(PageHead, { desc: t('descLogs') }),
        h('div', { className: 'dsh-cj-row' },
          h(Btn, {
            disabled: busy,
            icon: IconRefresh ? h(IconRefresh) : null,
            onClick: () => {
              setBusy(true)
              load(1)
                .then(() => notify(t('refreshOk'), 'success'))
                .catch((e) => notify(e.message || String(e), 'error'))
                .finally(() => setBusy(false))
            }
          }, t('refresh')),
          h(Btn, {
            danger: true, disabled: busy,
            icon: IconTrash ? h(IconTrash) : null,
            onClick: async () => {
              if (!confirm(t('confirmClearLogs'))) return
              setBusy(true)
              try {
                await api('/api/logs?accountId=' + encodeURIComponent(accountId), { method: 'DELETE' })
                await load(1)
                notify(t('clearOk'), 'success')
              } catch (e) { notify(e.message || String(e), 'error') }
              finally { setBusy(false) }
            }
          }, t('clearLogs'))
        ),
        h('div', { className: 'dsh-cj-table-wrap' },
          h('table', { className: 'dsh-cj-table' },
            h('thead', null, h('tr', null,
              h('th', null, t('level')), h('th', null, t('time')), h('th', null, t('message'))
            )),
            h('tbody', null, items.map((l) =>
              h('tr', { key: l.id },
                h('td', null, logLevelTag(t, l.level)),
                h('td', null, (l.at || '').replace('T', ' ').slice(0, 19)),
                h('td', null, l.message)
              )
            ))
          )
        ),
        h(TablePager, {
          t,
          total,
          page,
          pageSize,
          busy,
          onPageChange: (p) => {
            setBusy(true)
            load(p).catch((e) => notify(e.message || String(e), 'error')).finally(() => setBusy(false))
          },
          onPageSizeChange: (size) => {
            setBusy(true)
            load(1, size).catch((e) => notify(e.message || String(e), 'error')).finally(() => setBusy(false))
          }
        })
      )
    }

    function SettingsPage({ t, busy, setBusy, notify }) {
      const [form, setForm] = useState({
        syncIntervalMinutes: 30,
        syncLookbackDays: 90,
        exportsPath: ''
      })

      useEffect(() => {
        api('/api/settings').then((s) => setForm({
          syncIntervalMinutes: s.syncIntervalMinutes,
          syncLookbackDays: s.syncLookbackDays,
          exportsPath: s.exportsPath || ''
        })).catch((e) => notify(e.message || String(e), 'error'))
      }, [notify])

      return h('div', { className: 'dsh-cj-page-scroll' },
        h(PageHead, { desc: t('descSettings') }),
        h('h3', {
          className: 'dsh-cj-page-title',
          style: { fontSize: 14, marginBottom: 10 }
        }, t('syncSettingsTitle')),
        h('div', { className: 'dsh-cj-field' },
          h('label', { className: 'dsh-cj-label' }, t('syncInterval')),
          h(FieldInput, {
            type: 'number', min: 5,
            value: form.syncIntervalMinutes,
            onChange: (e) => setForm({ ...form, syncIntervalMinutes: Number(e.target.value) })
          })
        ),
        h('div', { className: 'dsh-cj-field' },
          h('label', { className: 'dsh-cj-label' }, t('lookback')),
          h(FieldInput, {
            type: 'number', min: 1,
            value: form.syncLookbackDays,
            onChange: (e) => setForm({ ...form, syncLookbackDays: Number(e.target.value) })
          })
        ),
        h('div', { className: 'dsh-cj-field' },
          h('label', { className: 'dsh-cj-label' }, t('exportsPath')),
          h(FieldInput, {
            value: form.exportsPath,
            placeholder: '~/.dsh-commit-journal/exports',
            onChange: (e) => setForm({ ...form, exportsPath: e.target.value })
          }),
          h('div', { className: 'dsh-cj-muted' }, t('exportsPathHint'))
        ),
        h(Btn, {
          primary: true, disabled: busy,
          icon: IconSave ? h(IconSave) : null,
          onClick: async () => {
            setBusy(true)
            try {
              await api('/api/settings', { method: 'PUT', body: JSON.stringify(form) })
              notify(t('saveOk'), 'success')
            } catch (e) { notify(e.message || String(e), 'error') }
            finally { setBusy(false) }
          }
        }, t('save'))
      )
    }

    function detectScheme() {
      const el = document.documentElement
      const attr = (el.getAttribute('data-theme') || el.getAttribute('data-color-scheme') || el.className || '').toLowerCase()
      if (attr.includes('dark')) return 'dark'
      if (attr.includes('light')) return 'light'
      const bg = getComputedStyle(el).getPropertyValue('--dsw-alias-bg-base').trim()
      const hex = bg.match(/#([0-9a-f]{6})/i)
      if (hex) {
        const n = parseInt(hex[1], 16)
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
        return (r * 299 + g * 587 + b * 114) / 1000 < 128 ? 'dark' : 'light'
      }
      const rgb = bg.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
      if (rgb) {
        const r = Number(rgb[1]), g = Number(rgb[2]), b = Number(rgb[3])
        return (r * 299 + g * 587 + b * 114) / 1000 < 128 ? 'dark' : 'light'
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    function App({ t }) {
      const [tab, setTab] = useState('accounts')
      const [accounts, setAccounts] = useState([])
      const [activeId, setActiveId] = useState(null)
      const [busy, setBusy] = useState(false)
      const [scheme, setScheme] = useState('light')
      const [toast, setToast] = useState(null)
      const toastSeq = React.useRef(0)

      const notify = useCallback((text, tone) => {
        toastSeq.current += 1
        setToast({
          id: toastSeq.current,
          text: String(text || ''),
          tone: tone === 'success' ? 'success' : 'error',
          holdMs: tone === 'success' ? 3000 : 6000
        })
      }, [])

      const clearToast = useCallback(() => setToast(null), [])

      const refreshAccounts = useCallback(async () => {
        const data = await api('/api/accounts')
        setAccounts(data.accounts || [])
        setActiveId(data.activeAccountId || null)
      }, [])

      useEffect(() => {
        refreshAccounts().catch((e) => notify(e.message || String(e), 'error'))
      }, [refreshAccounts, notify])

      useEffect(() => {
        const sync = () => setScheme(detectScheme())
        sync()
        const mo = new MutationObserver(sync)
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-color-scheme', 'class'] })
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        if (mq.addEventListener) mq.addEventListener('change', sync)
        else if (mq.addListener) mq.addListener(sync)
        return () => {
          mo.disconnect()
          if (mq.removeEventListener) mq.removeEventListener('change', sync)
          else if (mq.removeListener) mq.removeListener(sync)
        }
      }, [])

      // 无官方 Toast 时的兜底：固定顶栏 + 定时关闭
      useEffect(() => {
        if (!toast || UiToast) return undefined
        const timer = setTimeout(clearToast, toast.holdMs || 4000)
        return () => clearTimeout(timer)
      }, [toast, clearToast])

      const activeAccount = accounts.find((a) => a.id === activeId) || null
      const activeMode = activeAccount && activeAccount.mode === 'local' ? 'local' : 'remote'

      const toastNode = toast
        ? (UiToast
          ? h(UiToast, {
              key: toast.id,
              text: toast.text,
              tone: toast.tone === 'success' ? 'success' : undefined,
              holdMs: toast.holdMs,
              onDone: clearToast
            })
          : (ReactDOM && ReactDOM.createPortal
            ? ReactDOM.createPortal(
                h('div', {
                  key: toast.id,
                  className: 'dsh-cj-toast-fallback',
                  'data-tone': toast.tone,
                  role: 'status'
                }, toast.text),
                document.body
              )
            : h('div', {
                key: toast.id,
                className: 'dsh-cj-toast-fallback',
                'data-tone': toast.tone,
                role: 'status'
              }, toast.text)))
        : null

      return h('div', { className: 'dsh-cj-root', 'data-scheme': scheme },
        h('style', null, CSS),
        toastNode,
        h('div', { className: 'dsh-cj-tabs', role: 'tablist' },
          TABS.map((item) =>
            h('button', {
              key: item.id,
              type: 'button',
              role: 'tab',
              className: 'dsh-cj-tab',
              'data-active': tab === item.id ? '1' : '0',
              'aria-selected': tab === item.id,
              onClick: () => setTab(item.id)
            }, t(item.id))
          )
        ),
        h('div', { className: 'dsh-cj-body' },
          tab === 'accounts' && h(AccountsPage, {
            t, accounts, activeId, busy, setBusy, notify,
            onChanged: refreshAccounts
          }),
          tab === 'repos' && h(ReposPage, {
            t, accountId: activeId, accountMode: activeMode, busy, setBusy, notify
          }),
          tab === 'commits' && h(CommitsPage, { t, accountId: activeId, busy, setBusy, notify }),
          tab === 'activity' && h(ActivityPage, { t, accountId: activeId, notify }),
          tab === 'logs' && h(LogsPage, { t, accountId: activeId, busy, setBusy, notify }),
          tab === 'settings' && h(SettingsPage, { t, busy, setBusy, notify })
        )
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'commit-journal: dictionaries')
        const translate = ctx.locale.bind(NS)
        // Tab labels come from TABS zh/en via locale keys if present; fallback zh in render
        const t = (key) => {
          try { return translate(key) } catch { return DICTIONARIES.zh[key] || key }
        }

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 25,
              label: () => translate('panelLabel'),
              locale: NS
            },
            PanelIcon
          )
        )

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            { name: 'main', key: PANEL_ID, locale: NS },
            function CommitJournalMain() {
              return h(App, { t })
            }
          )
        )
      }
    }
  }
})
