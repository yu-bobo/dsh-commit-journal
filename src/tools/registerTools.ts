import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  createAccount,
  deleteAccount,
  getAccountToken,
  setActiveAccountId,
  updateAccount
} from '../core/accounts.js'
import { db } from '../core/db.js'
import { describeSettings, updateSettings } from '../core/settings.js'
import { generateReport } from '../core/reports.js'
import { syncAccount } from '../core/sync.js'
import { getDataRoot } from '../core/paths.js'
import { getProvider } from '../providers/index.js'
import {
  buildCommitDetailsMarkdown,
  buildCommitSubjectListMarkdown
} from '../core/reportMarkdown.js'
import { accountSummary, getAccount, resolveAccountId } from './resolveAccount.js'
import type { ReportKind } from '../core/types.js'
import dayjs from 'dayjs'

function textOut(text: string) {
  return text
}

/**
 * 注册 commit-journal 相关 agent 工具
 */
export function registerTools(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: 'list_accounts',
      description:
        '列出 Commit Journal 账号（id、名称、mode=local|remote、provider、localRoots、是否当前活跃）。总结工作前可先调用以确认 accountId。',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: String(value) }]
      },
      async execute() {
        const list = accountSummary()
        if (list.length === 0) {
          return textOut(
            ['本地无账号。', `数据目录：${getDataRoot()}`, '请先调用 upsert_account。'].join('\n')
          )
        }
        return textOut(JSON.stringify({ accounts: list, dataRoot: getDataRoot() }, null, 2))
      }
    })
  )

  ctx.tools.register(
    defineTool({
      name: 'upsert_account',
      description:
        '创建或更新账号。mode=remote（默认）按 provider 用 PAT 拉提交（codeup / gitlab / github）；mode=local 扫描 localRoots 下的本机 git 仓（无需 token）。创建时不要传 id；更新时传 id。',
      parameters: {
        id: { type: 'string', description: '已有账号 id；省略则新建' },
        name: { type: 'string', required: true, description: '账号显示名' },
        mode: {
          type: 'string',
          description: 'remote | local；默认 remote'
        },
        provider: {
          type: 'string',
          description: 'remote 时 codeup | gitlab | github；local 固定 local'
        },
        edition: { type: 'string', description: 'central | region（仅 Codeup）' },
        organizationId: {
          type: 'string',
          description:
            'Codeup 中心版 organizationId；GitHub 可选 org login；GitLab 可选 group path/id'
        },
        apiBaseUrl: {
          type: 'string',
          description:
            'Codeup Region API Base；自建 GitLab / GHE 主机（可省略 /api/v4 或 /api/v3）；gitlab.com / github.com 可留空'
        },
        insecureSsl: {
          type: 'boolean',
          description:
            '跳过 TLS 证书校验（公司代理 / 自签证书）。也可用环境变量 DSH_COMMIT_JOURNAL_TLS_INSECURE=1'
        },
        localRoots: {
          type: 'array',
          items: { type: 'string' },
          description: 'local 模式扫描根目录列表'
        },
        token: { type: 'string', description: 'remote PAT；更新时可省略表示不改；local 不需要' },
        authorFilters: {
          type: 'array',
          items: { type: 'string' },
          description: '作者邮箱/姓名过滤'
        },
        defaultBranch: { type: 'string' },
        setActive: { type: 'boolean', description: '设为当前活跃账号' },
        test: { type: 'boolean', description: '保存前测试连接/扫描，默认 true' }
      },
      output: {
        schema: { type: 'string' },
        render: (_a, v) => [{ type: 'text', text: String(v) }]
      },
      async execute(args: Record<string, any>) {
        const mode = args.mode === 'local' ? 'local' : 'remote'
        const provider = (
          mode === 'local' ? 'local' : args.provider || 'codeup'
        ) as 'codeup' | 'gitlab' | 'github' | 'local'
        const token = args.token?.trim()
        const localRoots = Array.isArray(args.localRoots)
          ? args.localRoots.map(String)
          : undefined
        let account
        if (args.id) {
          account = updateAccount({
            id: String(args.id),
            name: args.name,
            mode,
            provider,
            edition: args.edition,
            organizationId: args.organizationId,
            apiBaseUrl: args.apiBaseUrl,
            insecureSsl: args.insecureSsl,
            localRoots,
            token,
            authorFilters: args.authorFilters,
            defaultBranch: args.defaultBranch
          })
        } else {
          if (mode === 'remote' && !token) throw new Error('远程账号新建必须提供 token')
          if (mode === 'local' && !(localRoots && localRoots.length)) {
            throw new Error('本地账号新建必须提供 localRoots')
          }
          account = createAccount({
            name: args.name,
            mode,
            provider,
            edition: args.edition || 'central',
            organizationId: args.organizationId,
            apiBaseUrl: args.apiBaseUrl,
            insecureSsl: args.insecureSsl,
            localRoots,
            token,
            authorFilters: args.authorFilters || [],
            defaultBranch: args.defaultBranch
          })
        }
        if (args.setActive !== false) setActiveAccountId(account.id)
        let testResult: { repoCount: number } | undefined
        if (args.test !== false) {
          const t = account.mode === 'local' ? '' : getAccountToken(account.id)
          testResult = await getProvider(account).testConnection(account, t)
        }
        return textOut(
          JSON.stringify(
            {
              ok: true,
              account: {
                id: account.id,
                name: account.name,
                mode: account.mode,
                provider: account.provider,
                edition: account.edition,
                localRoots: account.localRoots
              },
              test: testResult
            },
            null,
            2
          )
        )
      }
    })
  )

  ctx.tools.register(
    defineTool({
      name: 'remove_account',
      description: '删除本地账号及其提交缓存（不会删除远端仓库）。',
      parameters: {
        accountId: { type: 'string', required: true }
      },
      output: {
        schema: { type: 'string' },
        render: (_a, v) => [{ type: 'text', text: String(v) }]
      },
      async execute(args: Record<string, any>) {
        deleteAccount(String(args.accountId))
        return textOut(JSON.stringify({ ok: true, removed: args.accountId }))
      }
    })
  )

  ctx.tools.register(
    defineTool({
      name: 'sync_commits',
      description:
        '增量同步指定账号的提交到本地缓存。remote=Codeup/GitLab/GitHub API；local=扫描根目录下 git log。可先 upsert_account。',
      parameters: {
        accountId: { type: 'string' },
        repoIds: { type: 'array', items: { type: 'string' }, description: '可选，限制仓库' }
      },
      output: {
        schema: { type: 'string' },
        render: (_a, v) => [{ type: 'text', text: String(v) }]
      },
      async execute(args: { accountId?: string; repoIds?: string[] }) {
        const id = resolveAccountId(args.accountId)
        const result = await syncAccount(id, args.repoIds)
        return textOut(JSON.stringify(result, null, 2))
      }
    })
  )

  ctx.tools.register(
    defineTool({
      name: 'list_repos',
      description:
        '列出某账号下已有提交记录的仓库（或缓存的全部仓库）。refresh=true 时 remote 拉 API / local 重扫根目录。',
      parameters: {
        accountId: { type: 'string' },
        withCommitsOnly: {
          type: 'boolean',
          description: '默认 true，仅返回已有提交的仓库'
        },
        refresh: {
          type: 'boolean',
          description: '是否先刷新仓库列表（remote API 或 local 扫描）'
        }
      },
      output: {
        schema: { type: 'string' },
        render: (_a, v) => [{ type: 'text', text: String(v) }]
      },
      async execute(args: {
        accountId?: string
        withCommitsOnly?: boolean
        refresh?: boolean
      }) {
        const id = resolveAccountId(args.accountId)
        if (args.refresh) {
          const account = getAccount(id)!
          const token = getAccountToken(id)
          const repos = await getProvider(account).listRepos(account, token)
          db.upsertRepos(id, repos)
        }
        const list =
          args.withCommitsOnly === false
            ? db.listRepos(id)
            : db.listReposWithCommits(id)
        return textOut(
          JSON.stringify(
            {
              accountId: id,
              repos: list.map((r) => ({
                id: r.id,
                name: r.name,
                fullName: r.fullName,
                webUrl: r.webUrl,
                defaultBranch: r.defaultBranch
              }))
            },
            null,
            2
          )
        )
      }
    })
  )

  ctx.tools.register(
    defineTool({
      name: 'query_commits',
      description: '按日期/仓库/关键词查询本地已同步的提交。',
      parameters: {
        accountId: { type: 'string' },
        repoId: { type: 'string' },
        from: { type: 'string', description: 'YYYY-MM-DD 或 ISO' },
        to: { type: 'string', description: 'YYYY-MM-DD 或 ISO' },
        keyword: { type: 'string' },
        limit: { type: 'number' },
        subjectOnly: { type: 'boolean', description: '仅提交首行' }
      },
      output: {
        schema: { type: 'string' },
        render: (_a, v) => [{ type: 'text', text: String(v) }]
      },
      async execute(args: Record<string, any>) {
        const id = resolveAccountId(args.accountId)
        const account = getAccount(id)!
        const { items, total } = db.queryCommits({
          accountId: id,
          repoId: args.repoId,
          from: args.from,
          to: args.to,
          keyword: args.keyword,
          limit: args.limit ?? 200
        })
        const body = args.subjectOnly
          ? buildCommitSubjectListMarkdown(items)
          : buildCommitDetailsMarkdown(items)
        const header = [
          `# 提交查询结果`,
          '',
          `- 账号：${account.name}`,
          `- 返回：${items.length} / 共 ${total} 条`,
          `- 生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
          '',
          body || '（无提交）'
        ].join('\n')
        return textOut(header)
      }
    })
  )

  ctx.tools.register(
    defineTool({
      name: 'get_period_report',
      description: '按日/周/月/自定义区间生成报告 Markdown 材料（含法定工作日天数）。',
      parameters: {
        accountId: { type: 'string' },
        kind: {
          type: 'string',
          required: true,
          description: 'day | week | month | custom'
        },
        date: { type: 'string', description: '锚点日期 YYYY-MM-DD' },
        from: { type: 'string', description: 'custom 起始' },
        to: { type: 'string', description: 'custom 结束' },
        exportFile: { type: 'boolean', description: '是否落盘，默认 true' }
      },
      output: {
        schema: { type: 'string' },
        render: (_a, v) => [{ type: 'text', text: String(v) }]
      },
      async execute(args: Record<string, any>) {
        const id = resolveAccountId(args.accountId)
        const result = await generateReport(
          {
            accountId: id,
            kind: args.kind as ReportKind,
            date: args.date,
            from: args.from,
            to: args.to
          },
          args.exportFile !== false
        )
        return textOut(
          [
            result.markdown,
            '',
            result.filePath ? `已落盘：${result.filePath}` : '',
            result.statutoryWorkdays != null
              ? `法定工作日：${result.statutoryWorkdays} 天`
              : ''
          ]
            .filter(Boolean)
            .join('\n')
        )
      }
    })
  )

  ctx.tools.register(
    defineTool({
      name: 'get_activity_heatmap',
      description:
        '获取提交活跃热力图数据：按本地自然日聚合。可指定 year，或不传表示近一年。传 date 时返回该日提交明细。',
      parameters: {
        accountId: { type: 'string' },
        year: { type: 'number', description: '自然年；省略=近一年' },
        date: { type: 'string', description: 'YYYY-MM-DD，返回当日明细' }
      },
      output: {
        schema: { type: 'string' },
        render: (_a, v) => [{ type: 'text', text: String(v) }]
      },
      async execute(args: { accountId?: string; year?: number; date?: string }) {
        const id = resolveAccountId(args.accountId)
        if (args.date) {
          const items = db.listDayCommits(id, args.date)
          return textOut(
            JSON.stringify(
              {
                accountId: id,
                date: args.date,
                count: items.length,
                commits: items.map((c) => ({
                  time: c.committedAt,
                  repo: c.repoName,
                  title: c.title,
                  sha: c.shortId,
                  webUrl: c.webUrl
                }))
              },
              null,
              2
            )
          )
        }
        const data = db.getActivity(id, args.year)
        return textOut(JSON.stringify({ accountId: id, ...data }, null, 2))
      }
    })
  )

  ctx.tools.register(
    defineTool({
      name: 'update_journal_settings',
      description: '更新本地同步/导出/热力图 UI 端口等设置。',
      parameters: {
        exportsPath: { type: 'string' },
        syncIntervalMinutes: { type: 'number' },
        syncLookbackDays: { type: 'number' },
        uiPort: { type: 'number' }
      },
      output: {
        schema: { type: 'string' },
        render: (_a, v) => [{ type: 'text', text: String(v) }]
      },
      async execute(args: Record<string, any>) {
        const next = updateSettings(args)
        return textOut(JSON.stringify({ ok: true, settings: describeSettings(), saved: next }, null, 2))
      }
    })
  )
}
