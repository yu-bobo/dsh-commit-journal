import type { Context } from '@deepseek-ai/cordis'
import { ensureDataLayout, getDataRoot } from './core/paths.js'
import { rescheduleAll, stopAllSchedules } from './core/sync.js'
import { registerTools } from './tools/registerTools.js'
import { getHeatmapUrl, startUiServer, stopUiServer } from './ui/server.js'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'commit-journal'
export const inject = ['tools']

/**
 * Commit Journal dsh 插件：同步 VCS 提交与活跃热力图面板
 */
export function apply(ctx: Context) {
  ensureDataLayout()
  registerTools(ctx)

  ctx.tools.register(
    defineTool({
      name: 'open_activity_heatmap',
      description: '返回本机 Commit Journal API 基址（侧栏面板数据源）。',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_a, v) => [{ type: 'text', text: String(v) }]
      },
      async execute() {
        const url = await startUiServer()
        return JSON.stringify({ url, dataRoot: getDataRoot() }, null, 2)
      }
    })
  )

  ctx.effect(() => {
    void startUiServer().catch((e) => {
      ctx.logger?.warn?.(`[commit-journal] ui server: ${e?.message || e}`)
    })
    try {
      rescheduleAll()
    } catch {
      // ignore
    }
    return () => {
      stopAllSchedules()
      void stopUiServer()
    }
  })
}

export { getHeatmapUrl, getDataRoot, startUiServer, stopUiServer }
