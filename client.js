/**
 * Commit Journal browser UI: horizontal tabs, DSH dual-theme tokens.
 * Account switching lives on the Accounts tab (no global top bar).
 */
window.__ModuleLoader__.load({
  id: 'dsh-commit-journal',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useState } = React

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
        activate: 'Use',
        active: 'Active',
        refresh: 'Refresh',
        sync: 'Sync',
        syncWatched: 'Sync watched',
        saveWatch: 'Save watched',
        query: 'Query',
        clearCommits: 'Reset local commits',
        clearLogs: 'Clear logs',
        name: 'Name',
        edition: 'Edition',
        org: 'Organization / API',
        authors: 'Author filters',
        token: 'PAT',
        defaultBranch: 'Default branch',
        watched: 'Watched',
        branch: 'Branch',
        time: 'Time',
        repo: 'Repo',
        title: 'Message',
        author: 'Author',
        sha: 'SHA',
        level: 'Level',
        message: 'Message',
        syncInterval: 'Sync interval (min)',
        lookback: 'Lookback days',
        exportsPath: 'Exports path',
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
        allRepos: 'All repos'
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
        activate: '使用',
        active: '当前',
        refresh: '刷新',
        sync: '同步',
        syncWatched: '同步关注',
        saveWatch: '保存关注',
        query: '查询',
        clearCommits: '重置本地提交',
        clearLogs: '清除日志',
        name: '名称',
        edition: '版本',
        org: '组织 / 接入点',
        authors: '作者过滤',
        token: '个人访问令牌',
        defaultBranch: '默认分支',
        watched: '关注',
        branch: '分支',
        time: '时间',
        repo: '仓库',
        title: '说明',
        author: '作者',
        sha: 'SHA',
        level: '级别',
        message: '内容',
        syncInterval: '同步间隔（分钟）',
        lookback: '回溯天数',
        exportsPath: '导出目录',
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
        allRepos: '全部仓库'
      }
    }

    const CSS = `
      .dsh-cj-root {
        box-sizing: border-box;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--dsw-alias-bg-base);
        color: var(--dsw-alias-label-primary);
        font-size: 13px;
        line-height: 1.45;
      }
      .dsh-cj-root *, .dsh-cj-root *::before, .dsh-cj-root *::after { box-sizing: border-box; }
      .dsh-cj-tabs {
        display: flex;
        gap: 4px;
        padding: calc(var(--dsh-frame-top-clearance, 0px) + 12px) 20px 0;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
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
        overflow: auto;
        padding: 16px 20px 24px;
      }
      .dsh-cj-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        margin-bottom: 12px;
      }
      .dsh-cj-row-end { justify-content: space-between; }
      .dsh-cj-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .dsh-cj-btn {
        appearance: none;
        border: 1px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary);
        border-radius: 8px;
        padding: 7px 12px;
        font-size: 12px;
        cursor: pointer;
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
      .dsh-cj-input, .dsh-cj-select, .dsh-cj-textarea {
        border: 1px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary);
        border-radius: 8px;
        padding: 7px 10px;
        font-size: 12px;
        min-width: 0;
      }
      .dsh-cj-textarea { width: 100%; min-height: 72px; resize: vertical; }
      .dsh-cj-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
      .dsh-cj-label { color: var(--dsw-alias-label-secondary); font-size: 12px; }
      .dsh-cj-muted { color: var(--dsw-alias-label-secondary); font-size: 12px; }
      .dsh-cj-error { color: var(--dsw-alias-state-error-primary); font-size: 12px; margin: 0 0 10px; }
      .dsh-cj-table-wrap {
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 12px;
        overflow: auto;
        background: var(--dsw-alias-bg-layer-1);
      }
      .dsh-cj-table { width: 100%; border-collapse: collapse; }
      .dsh-cj-table th, .dsh-cj-table td {
        padding: 10px 12px;
        text-align: left;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
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
      .dsh-cj-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);
        color: var(--dsw-alias-brand-primary);
      }
      .dsh-cj-modal-mask {
        position: fixed; inset: 0; background: color-mix(in srgb, #000 40%, transparent);
        display: flex; align-items: center; justify-content: center; z-index: 40; padding: 20px;
      }
      .dsh-cj-modal {
        width: min(480px, 100%);
        background: var(--dsw-alias-bg-layer-1);
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 14px;
        padding: 16px;
        max-height: 90vh;
        overflow: auto;
      }
      .dsh-cj-modal h3 { margin: 0 0 12px; font-size: 15px; }
      .dsh-cj-stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 16px;
      }
      .dsh-cj-stat {
        background: var(--dsw-alias-bg-layer-1);
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 12px;
        padding: 12px;
      }
      .dsh-cj-stat .l { color: var(--dsw-alias-label-secondary); font-size: 12px; }
      .dsh-cj-stat .v { margin-top: 6px; font-size: 20px; font-weight: 650; }
      .dsh-cj-heat {
        background: var(--dsw-alias-bg-layer-1);
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 12px;
        padding: 14px;
        overflow-x: auto;
      }
      .dsh-cj-heat-body { display: grid; grid-template-columns: 18px 1fr; gap: 8px; }
      .dsh-cj-weekdays {
        display: grid; grid-template-rows: repeat(7, 11px); gap: 3px; padding-top: 16px;
        color: var(--dsw-alias-label-secondary); font-size: 10px;
      }
      .dsh-cj-months {
        display: grid; grid-auto-flow: column; grid-auto-columns: 14px; gap: 3px;
        height: 14px; margin-bottom: 2px; color: var(--dsw-alias-label-secondary); font-size: 11px;
      }
      .dsh-cj-grid {
        display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 11px);
        grid-auto-columns: 11px; gap: 3px;
      }
      .dsh-cj-cell {
        width: 11px; height: 11px; border-radius: 2px; border: 0; padding: 0;
        background: color-mix(in srgb, var(--dsw-alias-label-secondary) 18%, transparent);
      }
      .dsh-cj-cell.lv1 { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent); }
      .dsh-cj-cell.lv2 { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 48%, transparent); }
      .dsh-cj-cell.lv3 { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 72%, transparent); }
      .dsh-cj-cell.lv4 { background: var(--dsw-alias-brand-primary); }
      .dsh-cj-cell.is-blank { opacity: .2; }
      .dsh-cj-cell.has-commits { cursor: pointer; }
      .dsh-cj-cell.is-today { outline: 1px solid var(--dsw-alias-brand-primary); }
      .dsh-cj-drawer {
        margin-top: 14px;
        border-top: 1px solid var(--dsw-alias-border-l1);
        padding-top: 12px;
      }
      .dsh-cj-commit {
        padding: 10px 0;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
      }
      .dsh-cj-commit:last-child { border-bottom: 0; }
      .dsh-cj-pager {
        display: flex; justify-content: flex-end; gap: 8px; align-items: center; margin-top: 12px;
      }
      .dsh-cj-link {
        color: var(--dsw-alias-brand-primary);
        text-decoration: none;
      }
      @media (max-width: 720px) {
        .dsh-cj-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
    `

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

    function Btn(props) {
      const { primary, danger, children, ...rest } = props
      return h('button', {
        type: 'button',
        className: 'dsh-cj-btn',
        'data-primary': primary ? '1' : undefined,
        'data-danger': danger ? '1' : undefined,
        ...rest
      }, children)
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
        edition: 'central',
        organizationId: '',
        apiBaseUrl: '',
        token: '',
        authorFilters: '',
        defaultBranch: 'master'
      }
    }

    function AccountsPage({ t, accounts, activeId, onChanged, busy, setBusy, setError }) {
      const [modal, setModal] = useState(null)
      const [form, setForm] = useState(emptyForm())

      const openNew = () => { setForm(emptyForm()); setModal('new') }
      const openEdit = (a) => {
        setForm({
          id: a.id,
          name: a.name || '',
          edition: a.edition || 'central',
          organizationId: a.organizationId || '',
          apiBaseUrl: a.apiBaseUrl || '',
          token: '',
          authorFilters: (a.authorFilters || []).join(', '),
          defaultBranch: a.defaultBranch || 'master'
        })
        setModal('edit')
      }

      const save = async () => {
        setBusy(true); setError('')
        try {
          const payload = {
            name: form.name,
            provider: 'codeup',
            edition: form.edition,
            organizationId: form.organizationId,
            apiBaseUrl: form.apiBaseUrl,
            token: form.token || undefined,
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
        } catch (e) { setError(e.message || String(e)) }
        finally { setBusy(false) }
      }

      return h(React.Fragment, null,
        h('div', { className: 'dsh-cj-row dsh-cj-row-end' },
          h('div', { className: 'dsh-cj-muted' }, accounts.length ? null : t('emptyAccount')),
          h(Btn, { primary: true, onClick: openNew }, t('newAccount'))
        ),
        h('div', { className: 'dsh-cj-table-wrap' },
          h('table', { className: 'dsh-cj-table' },
            h('thead', null, h('tr', null,
              h('th', null, t('name')),
              h('th', null, t('edition')),
              h('th', null, t('org')),
              h('th', null, t('authors')),
              h('th', null, '')
            )),
            h('tbody', null, accounts.map((a) =>
              h('tr', { key: a.id },
                h('td', null,
                  a.name, ' ',
                  a.active ? h('span', { className: 'dsh-cj-badge' }, t('active')) : null
                ),
                h('td', null, a.edition || '-'),
                h('td', null, a.organizationId || a.apiBaseUrl || '-'),
                h('td', null, (a.authorFilters || []).join(', ') || '-'),
                h('td', null,
                  h('div', { className: 'dsh-cj-actions' },
                    !a.active && h(Btn, {
                      disabled: busy,
                      onClick: async () => {
                        setBusy(true); setError('')
                        try {
                          await api('/api/accounts/' + encodeURIComponent(a.id) + '/activate', { method: 'POST', body: '{}' })
                          await onChanged()
                        } catch (e) { setError(e.message || String(e)) }
                        finally { setBusy(false) }
                      }
                    }, t('activate')),
                    h(Btn, {
                      disabled: busy,
                      onClick: async () => {
                        setBusy(true); setError('')
                        try {
                          await api('/api/accounts/' + encodeURIComponent(a.id) + '/test', { method: 'POST', body: '{}' })
                        } catch (e) { setError(e.message || String(e)) }
                        finally { setBusy(false) }
                      }
                    }, t('test')),
                    h(Btn, { onClick: () => openEdit(a) }, t('edit')),
                    h(Btn, {
                      danger: true, disabled: busy,
                      onClick: async () => {
                        if (!confirm(t('confirmDelete'))) return
                        setBusy(true); setError('')
                        try {
                          await api('/api/accounts/' + encodeURIComponent(a.id), { method: 'DELETE' })
                          await onChanged()
                        } catch (e) { setError(e.message || String(e)) }
                        finally { setBusy(false) }
                      }
                    }, t('remove'))
                  )
                )
              )
            ))
          )
        ),
        modal && h('div', { className: 'dsh-cj-modal-mask', onClick: () => setModal(null) },
          h('div', { className: 'dsh-cj-modal', onClick: (e) => e.stopPropagation() },
            h('h3', null, modal === 'edit' ? t('edit') : t('newAccount')),
            h('div', { className: 'dsh-cj-field' },
              h('label', { className: 'dsh-cj-label' }, t('name')),
              h('input', { className: 'dsh-cj-input', value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }) })
            ),
            h('div', { className: 'dsh-cj-field' },
              h('label', { className: 'dsh-cj-label' }, t('edition')),
              h('select', {
                className: 'dsh-cj-select', value: form.edition,
                onChange: (e) => setForm({ ...form, edition: e.target.value })
              },
                h('option', { value: 'central' }, 'central'),
                h('option', { value: 'region' }, 'region')
              )
            ),
            form.edition === 'central'
              ? h('div', { className: 'dsh-cj-field' },
                  h('label', { className: 'dsh-cj-label' }, 'organizationId'),
                  h('input', { className: 'dsh-cj-input', value: form.organizationId, onChange: (e) => setForm({ ...form, organizationId: e.target.value }) })
                )
              : h('div', { className: 'dsh-cj-field' },
                  h('label', { className: 'dsh-cj-label' }, 'API Base URL'),
                  h('input', { className: 'dsh-cj-input', value: form.apiBaseUrl, onChange: (e) => setForm({ ...form, apiBaseUrl: e.target.value }) })
                ),
            h('div', { className: 'dsh-cj-field' },
              h('label', { className: 'dsh-cj-label' }, t('token')),
              h('input', {
                className: 'dsh-cj-input', type: 'password', value: form.token,
                placeholder: modal === 'edit' ? '留空则不修改' : '',
                onChange: (e) => setForm({ ...form, token: e.target.value })
              })
            ),
            h('div', { className: 'dsh-cj-field' },
              h('label', { className: 'dsh-cj-label' }, t('authors')),
              h('input', { className: 'dsh-cj-input', value: form.authorFilters, onChange: (e) => setForm({ ...form, authorFilters: e.target.value }) })
            ),
            h('div', { className: 'dsh-cj-field' },
              h('label', { className: 'dsh-cj-label' }, t('defaultBranch')),
              h('input', { className: 'dsh-cj-input', value: form.defaultBranch, onChange: (e) => setForm({ ...form, defaultBranch: e.target.value }) })
            ),
            h('div', { className: 'dsh-cj-actions' },
              h(Btn, { onClick: () => setModal(null) }, t('cancel')),
              h(Btn, { primary: true, disabled: busy, onClick: save }, t('save'))
            )
          )
        )
      )
    }

    function ReposPage({ t, accountId, busy, setBusy, setError }) {
      const [repos, setRepos] = useState([])
      const [watched, setWatched] = useState([])
      const [branches, setBranches] = useState({})

      const load = useCallback(async () => {
        if (!accountId) return
        const data = await api('/api/repos?accountId=' + encodeURIComponent(accountId))
        setRepos(data.repos || [])
        setWatched(data.watchedRepoIds || [])
        setBranches(data.repoBranches || {})
      }, [accountId])

      useEffect(() => { load().catch((e) => setError(e.message || String(e))) }, [load, setError])

      if (!accountId) return h('p', { className: 'dsh-cj-muted' }, t('emptyAccount'))

      const allMode = watched.length === 0

      return h(React.Fragment, null,
        h('div', { className: 'dsh-cj-row' },
          h('div', { className: 'dsh-cj-actions' },
            h(Btn, {
              disabled: busy, onClick: async () => {
                setBusy(true); setError('')
                try {
                  await api('/api/repos/refresh', { method: 'POST', body: JSON.stringify({ accountId }) })
                  await load()
                } catch (e) { setError(e.message || String(e)) }
                finally { setBusy(false) }
              }
            }, t('refresh')),
            h(Btn, {
              disabled: busy, onClick: async () => {
                setBusy(true); setError('')
                try {
                  await api('/api/repos/watch', {
                    method: 'PUT',
                    body: JSON.stringify({ accountId, watchedRepoIds: watched, repoBranches: branches })
                  })
                  await load()
                } catch (e) { setError(e.message || String(e)) }
                finally { setBusy(false) }
              }
            }, t('saveWatch')),
            h(Btn, {
              primary: true, disabled: busy, onClick: async () => {
                setBusy(true); setError('')
                try {
                  await api('/api/sync', { method: 'POST', body: JSON.stringify({ accountId }) })
                } catch (e) { setError(e.message || String(e)) }
                finally { setBusy(false) }
              }
            }, t('syncWatched'))
          ),
          h('span', { className: 'dsh-cj-muted' }, allMode ? t('allRepos') : ('关注 ' + watched.length + ' 个'))
        ),
        h('div', { className: 'dsh-cj-table-wrap' },
          h('table', { className: 'dsh-cj-table' },
            h('thead', null, h('tr', null,
              h('th', null, t('watched')),
              h('th', null, t('repo')),
              h('th', null, t('branch')),
              h('th', null, '')
            )),
            h('tbody', null, repos.map((r) => {
              const checked = allMode ? true : watched.includes(r.id)
              return h('tr', { key: r.id },
                h('td', null,
                  h('input', {
                    type: 'checkbox',
                    checked,
                    onChange: (e) => {
                      if (allMode) {
                        const ids = repos.map((x) => x.id).filter((id) => id !== r.id || e.target.checked)
                        // leaving all-mode: start from all then uncheck current if needed
                        if (!e.target.checked) setWatched(repos.map((x) => x.id).filter((id) => id !== r.id))
                      } else if (e.target.checked) setWatched(watched.concat([r.id]))
                      else setWatched(watched.filter((id) => id !== r.id))
                    }
                  })
                ),
                h('td', null, r.fullName || r.name),
                h('td', null,
                  h('input', {
                    className: 'dsh-cj-input',
                    style: { width: 140 },
                    placeholder: r.defaultBranch || 'master',
                    value: branches[r.id] || '',
                    onChange: (e) => setBranches({ ...branches, [r.id]: e.target.value })
                  })
                ),
                h('td', null,
                  h(Btn, {
                    disabled: busy,
                    onClick: async () => {
                      setBusy(true); setError('')
                      try {
                        await api('/api/sync', {
                          method: 'POST',
                          body: JSON.stringify({ accountId, repoIds: [r.id] })
                        })
                      } catch (e) { setError(e.message || String(e)) }
                      finally { setBusy(false) }
                    }
                  }, t('sync')),
                  r.webUrl ? h('a', { className: 'dsh-cj-link', href: r.webUrl, target: '_blank', rel: 'noreferrer', style: { marginLeft: 8 } }, '↗') : null
                )
              )
            }))
          )
        )
      )
    }

    function CommitsPage({ t, accountId, busy, setBusy, setError }) {
      const [repos, setRepos] = useState([])
      const [items, setItems] = useState([])
      const [total, setTotal] = useState(0)
      const [repoId, setRepoId] = useState('')
      const [from, setFrom] = useState('')
      const [to, setTo] = useState('')
      const [keyword, setKeyword] = useState('')
      const [page, setPage] = useState(1)
      const pageSize = 20

      const load = useCallback(async (nextPage) => {
        if (!accountId) return
        const p = nextPage || page
        const q = new URLSearchParams({
          accountId,
          limit: String(pageSize),
          offset: String((p - 1) * pageSize)
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
      }, [accountId, from, keyword, page, repoId, to])

      useEffect(() => {
        if (!accountId) return
        load(1).catch((e) => setError(e.message || String(e)))
      }, [accountId]) // eslint-disable-line

      if (!accountId) return h('p', { className: 'dsh-cj-muted' }, t('emptyAccount'))

      return h(React.Fragment, null,
        h('div', { className: 'dsh-cj-row' },
          h('select', {
            className: 'dsh-cj-select', value: repoId,
            onChange: (e) => setRepoId(e.target.value)
          },
            h('option', { value: '' }, t('allRepos')),
            repos.map((r) => h('option', { key: r.id, value: r.id }, r.fullName || r.name))
          ),
          h('input', { className: 'dsh-cj-input', type: 'date', value: from, onChange: (e) => setFrom(e.target.value), title: t('from') }),
          h('input', { className: 'dsh-cj-input', type: 'date', value: to, onChange: (e) => setTo(e.target.value), title: t('to') }),
          h('input', {
            className: 'dsh-cj-input', style: { minWidth: 160 },
            placeholder: t('keyword'), value: keyword,
            onChange: (e) => setKeyword(e.target.value)
          }),
          h(Btn, {
            primary: true, disabled: busy,
            onClick: () => { setBusy(true); setError(''); load(1).catch((e) => setError(e.message || String(e))).finally(() => setBusy(false)) }
          }, t('query')),
          h(Btn, {
            danger: true, disabled: busy,
            onClick: async () => {
              if (!confirm(t('confirmClearCommits'))) return
              setBusy(true); setError('')
              try {
                await api('/api/commits/clear', { method: 'POST', body: JSON.stringify({ accountId }) })
                await load(1)
              } catch (e) { setError(e.message || String(e)) }
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
                h('td', null, c.repoName),
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
        h('div', { className: 'dsh-cj-pager' },
          h('span', { className: 'dsh-cj-muted' }, total + ' · p' + page),
          h(Btn, {
            disabled: busy || page <= 1,
            onClick: () => { setBusy(true); load(page - 1).catch((e) => setError(e.message || String(e))).finally(() => setBusy(false)) }
          }, '‹'),
          h(Btn, {
            disabled: busy || page * pageSize >= total,
            onClick: () => { setBusy(true); load(page + 1).catch((e) => setError(e.message || String(e))).finally(() => setBusy(false)) }
          }, '›')
        )
      )
    }

    function ActivityPage({ t, accountId, setError }) {
      const [year, setYear] = useState(0)
      const [data, setData] = useState(null)
      const [day, setDay] = useState(null)
      const [dayItems, setDayItems] = useState([])

      useEffect(() => {
        if (!accountId) return
        const q = new URLSearchParams({ accountId })
        if (year) q.set('year', String(year))
        api('/api/activity?' + q.toString())
          .then(setData)
          .catch((e) => setError(e.message || String(e)))
      }, [accountId, year, setError])

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
        const todayKey = new Date().toISOString().slice(0, 10)
        const cells = []
        for (let i = 0; i < weeks * 7; i++) {
          const d = new Date(gridStart); d.setDate(gridStart.getDate() + i)
          const key = d.toISOString().slice(0, 10)
          const inRange = d >= fromDay && d <= toDay
          const count = inRange ? (countByDay.get(key) || 0) : 0
          const level = count <= 0 ? 0 : Math.min(4, Math.ceil(count / step))
          cells.push({ key, count, inRange, level, isToday: key === todayKey })
        }
        return { weeks, cells }
      }, [data])

      if (!accountId) return h('p', { className: 'dsh-cj-muted' }, t('emptyAccount'))
      if (!data) return h('p', { className: 'dsh-cj-muted' }, '…')
      if (!data.stats.totalCommits) return h('p', { className: 'dsh-cj-muted' }, t('noData'))

      return h(React.Fragment, null,
        h('div', { className: 'dsh-cj-row dsh-cj-row-end' },
          h('span', { className: 'dsh-cj-muted' }, data.from + ' ~ ' + data.to),
          h('select', {
            className: 'dsh-cj-select', value: year,
            onChange: (e) => setYear(Number(e.target.value))
          },
            h('option', { value: 0 }, t('recentYear')),
            (data.years || []).map((y) => h('option', { key: y, value: y }, y + ' 年'))
          )
        ),
        h('div', { className: 'dsh-cj-stats' },
          [
            [t('totalCommits'), data.stats.totalCommits],
            [t('activeDays'), data.stats.activeDays],
            [t('longestStreak'), data.stats.longestStreak],
            [t('maxDay'), data.stats.maxDayCount]
          ].map(([l, v]) => h('div', { className: 'dsh-cj-stat', key: l },
            h('div', { className: 'l' }, l),
            h('div', { className: 'v' }, v)
          ))
        ),
        heatmap && h('div', { className: 'dsh-cj-heat' },
          h('div', { className: 'dsh-cj-heat-body' },
            h('div', { className: 'dsh-cj-weekdays' }, ['一', '二', '三', '四', '五', '六', '日'].map((x) => h('span', { key: x }, x))),
            h('div', null,
              h('div', { className: 'dsh-cj-grid' },
                heatmap.cells.map((c) =>
                  h('button', {
                    key: c.key,
                    type: 'button',
                    className: [
                      'dsh-cj-cell',
                      c.inRange ? 'lv' + c.level : 'is-blank',
                      c.count > 0 ? 'has-commits' : '',
                      c.isToday ? 'is-today' : ''
                    ].filter(Boolean).join(' '),
                    title: c.key + ' · ' + c.count,
                    disabled: !(c.inRange && c.count > 0),
                    onClick: async () => {
                      setDay(c.key)
                      try {
                        const r = await api('/api/activity/day?accountId=' + encodeURIComponent(accountId) + '&date=' + encodeURIComponent(c.key))
                        setDayItems(r.commits || [])
                      } catch (e) { setError(e.message || String(e)) }
                    }
                  })
                )
              )
            )
          )
        ),
        day && h('div', { className: 'dsh-cj-drawer' },
          h('div', { className: 'dsh-cj-row dsh-cj-row-end' },
            h('strong', null, day),
            h(Btn, { onClick: () => setDay(null) }, '×')
          ),
          dayItems.map((c, i) =>
            h('div', { className: 'dsh-cj-commit', key: i },
              h('div', { className: 'dsh-cj-muted' }, (c.time || '').slice(11, 16) + ' · ' + c.repo),
              h('div', null, c.title),
              c.webUrl
                ? h('a', { className: 'dsh-cj-link', href: c.webUrl, target: '_blank', rel: 'noreferrer' }, c.sha)
                : h('span', { className: 'dsh-cj-muted' }, c.sha)
            )
          )
        )
      )
    }

    function LogsPage({ t, accountId, busy, setBusy, setError }) {
      const [items, setItems] = useState([])
      const [total, setTotal] = useState(0)

      const load = useCallback(async () => {
        if (!accountId) return
        const data = await api('/api/logs?accountId=' + encodeURIComponent(accountId) + '&limit=100')
        setItems(data.items || [])
        setTotal(data.total || 0)
      }, [accountId])

      useEffect(() => { load().catch((e) => setError(e.message || String(e))) }, [load, setError])

      if (!accountId) return h('p', { className: 'dsh-cj-muted' }, t('emptyAccount'))

      return h(React.Fragment, null,
        h('div', { className: 'dsh-cj-row' },
          h(Btn, { disabled: busy, onClick: () => load().catch((e) => setError(e.message || String(e))) }, t('refresh')),
          h(Btn, {
            danger: true, disabled: busy,
            onClick: async () => {
              if (!confirm(t('confirmClearLogs'))) return
              setBusy(true); setError('')
              try {
                await api('/api/logs?accountId=' + encodeURIComponent(accountId), { method: 'DELETE' })
                await load()
              } catch (e) { setError(e.message || String(e)) }
              finally { setBusy(false) }
            }
          }, t('clearLogs')),
          h('span', { className: 'dsh-cj-muted' }, total)
        ),
        h('div', { className: 'dsh-cj-table-wrap' },
          h('table', { className: 'dsh-cj-table' },
            h('thead', null, h('tr', null,
              h('th', null, t('level')), h('th', null, t('time')), h('th', null, t('message'))
            )),
            h('tbody', null, items.map((l) =>
              h('tr', { key: l.id },
                h('td', null, l.level),
                h('td', null, (l.at || '').replace('T', ' ').slice(0, 19)),
                h('td', null, l.message)
              )
            ))
          )
        )
      )
    }

    function SettingsPage({ t, busy, setBusy, setError }) {
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
        })).catch((e) => setError(e.message || String(e)))
      }, [setError])

      return h(React.Fragment, null,
        h('div', { className: 'dsh-cj-field' },
          h('label', { className: 'dsh-cj-label' }, t('syncInterval')),
          h('input', {
            className: 'dsh-cj-input', type: 'number', min: 5,
            value: form.syncIntervalMinutes,
            onChange: (e) => setForm({ ...form, syncIntervalMinutes: Number(e.target.value) })
          })
        ),
        h('div', { className: 'dsh-cj-field' },
          h('label', { className: 'dsh-cj-label' }, t('lookback')),
          h('input', {
            className: 'dsh-cj-input', type: 'number', min: 1,
            value: form.syncLookbackDays,
            onChange: (e) => setForm({ ...form, syncLookbackDays: Number(e.target.value) })
          })
        ),
        h('div', { className: 'dsh-cj-field' },
          h('label', { className: 'dsh-cj-label' }, t('exportsPath')),
          h('input', {
            className: 'dsh-cj-input',
            value: form.exportsPath,
            onChange: (e) => setForm({ ...form, exportsPath: e.target.value })
          })
        ),
        h(Btn, {
          primary: true, disabled: busy,
          onClick: async () => {
            setBusy(true); setError('')
            try {
              await api('/api/settings', { method: 'PUT', body: JSON.stringify(form) })
            } catch (e) { setError(e.message || String(e)) }
            finally { setBusy(false) }
          }
        }, t('save'))
      )
    }

    function App({ t }) {
      const [tab, setTab] = useState('accounts')
      const [accounts, setAccounts] = useState([])
      const [activeId, setActiveId] = useState(null)
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')

      const refreshAccounts = useCallback(async () => {
        const data = await api('/api/accounts')
        setAccounts(data.accounts || [])
        setActiveId(data.activeAccountId || null)
      }, [])

      useEffect(() => {
        refreshAccounts().catch((e) => setError(e.message || String(e)))
      }, [refreshAccounts])

      return h('div', { className: 'dsh-cj-root' },
        h('style', null, CSS),
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
          error ? h('p', { className: 'dsh-cj-error' }, error) : null,
          tab === 'accounts' && h(AccountsPage, {
            t, accounts, activeId, busy, setBusy, setError,
            onChanged: refreshAccounts
          }),
          tab === 'repos' && h(ReposPage, { t, accountId: activeId, busy, setBusy, setError }),
          tab === 'commits' && h(CommitsPage, { t, accountId: activeId, busy, setBusy, setError }),
          tab === 'activity' && h(ActivityPage, { t, accountId: activeId, setError }),
          tab === 'logs' && h(LogsPage, { t, accountId: activeId, busy, setBusy, setError }),
          tab === 'settings' && h(SettingsPage, { t, busy, setBusy, setError })
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
