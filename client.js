/**
 * Browser half: sidebar entry + main panel embedding the local heatmap UI.
 * Must be a ModuleLoader CJS closure-factory (not bare ESM).
 */
window.__ModuleLoader__.load({
  id: 'dsh-commit-journal',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState } = React

    const PANEL_ID = 'commit-journal'
    const NS = 'commitJournal'
    const DEFAULT_URL = 'http://127.0.0.1:39282/'

    const DICTIONARIES = {
      en: {
        panelLabel: 'Commit Journal',
        title: 'Activity heatmap',
        subtitle: 'GitHub-style commit activity from locally synced commits.',
        openExternal: 'Open in browser',
        reload: 'Reload',
        hint: 'If the frame is empty, sync commits first or check the local UI port (default 39282).'
      },
      zh: {
        panelLabel: '提交日志',
        title: '活跃热力图',
        subtitle: '基于本地已同步提交的 GitHub 风格活跃度。',
        openExternal: '浏览器打开',
        reload: '刷新',
        hint: '若画面空白，请先同步提交，或检查本机热力图端口（默认 39282）。'
      }
    }

    const CSS = `
      .dsh-cj-root {
        box-sizing: border-box;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--dsw-alias-bg-base, #0f1419);
        color: var(--dsw-alias-label-primary, #e7ecf1);
      }
      .dsh-cj-toolbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: calc(var(--dsh-frame-top-clearance, 0px) + 16px) 20px 12px;
        border-bottom: 1px solid var(--dsw-alias-border-secondary, rgba(127,127,127,.25));
      }
      .dsh-cj-title {
        margin: 0;
        font-size: 18px;
        line-height: 26px;
        font-weight: 600;
      }
      .dsh-cj-sub {
        margin: 4px 0 0;
        font-size: 12px;
        opacity: .72;
      }
      .dsh-cj-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
      .dsh-cj-btn {
        appearance: none;
        border: 1px solid var(--dsw-alias-border-secondary, rgba(127,127,127,.35));
        background: transparent;
        color: inherit;
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 12px;
        cursor: pointer;
        text-decoration: none;
      }
      .dsh-cj-frame-wrap {
        flex: 1;
        min-height: 0;
        padding: 12px 16px 16px;
      }
      .dsh-cj-frame {
        width: 100%;
        height: 100%;
        min-height: 480px;
        border: 1px solid var(--dsw-alias-border-secondary, rgba(127,127,127,.35));
        border-radius: 12px;
        background: #0f1419;
      }
      .dsh-cj-hint {
        margin: 0;
        padding: 0 20px 14px;
        font-size: 12px;
        opacity: .65;
      }
    `

    function HeatmapIcon(props) {
      return h(
        'svg',
        {
          width: 18,
          height: 18,
          viewBox: '0 0 16 16',
          fill: 'currentColor',
          'aria-hidden': true,
          ...props
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
        h('rect', { x: 13, y: 9, width: 2, height: 3, rx: 0.5, opacity: 0.55 }),
        h('rect', { x: 1, y: 13, width: 3, height: 2, rx: 0.5, opacity: 0.35 }),
        h('rect', { x: 5, y: 13, width: 3, height: 2, rx: 0.5, opacity: 0.75 }),
        h('rect', { x: 9, y: 13, width: 3, height: 2, rx: 0.5, opacity: 0.55 }),
        h('rect', { x: 13, y: 13, width: 2, height: 2, rx: 0.5, opacity: 1 })
      )
    }

    function HeatmapPanel({ t }) {
      const [url] = useState(DEFAULT_URL)
      const [nonce, setNonce] = useState(0)
      useEffect(() => {}, [])
      return h(
        'div',
        { className: 'dsh-cj-root' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'dsh-cj-toolbar' },
          h(
            'div',
            null,
            h('h1', { className: 'dsh-cj-title' }, t('title')),
            h('p', { className: 'dsh-cj-sub' }, t('subtitle'))
          ),
          h(
            'div',
            { className: 'dsh-cj-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-cj-btn',
                onClick: () => setNonce((n) => n + 1)
              },
              t('reload')
            ),
            h(
              'a',
              {
                className: 'dsh-cj-btn',
                href: url,
                target: '_blank',
                rel: 'noreferrer'
              },
              t('openExternal')
            )
          )
        ),
        h(
          'div',
          { className: 'dsh-cj-frame-wrap' },
          h('iframe', {
            key: String(nonce),
            className: 'dsh-cj-frame',
            title: 'commit-journal-heatmap',
            src: url
          })
        ),
        h('p', { className: 'dsh-cj-hint' }, t('hint'))
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'commit-journal: dictionaries')
        const translate = ctx.locale.bind(NS)

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 25,
              label: () => translate('panelLabel'),
              locale: NS
            },
            HeatmapIcon
          )
        )

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: PANEL_ID,
              locale: NS
            },
            function CommitJournalMain() {
              return h(HeatmapPanel, { t: translate })
            }
          )
        )
      }
    }
  }
})
