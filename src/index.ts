import type { Context } from '@deepseek-ai/cordis'
import { ensureDataLayout, getDataRoot } from './core/paths.js'
import { rescheduleAll, stopAllSchedules } from './core/sync.js'
import { registerTools } from './tools/registerTools.js'
import { getHeatmapUrl, startUiServer, stopUiServer } from './ui/server.js'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'commit-journal'
export const inject = ['tools']

/**
 * Commit Journal dsh 插件：同步 VCS 提交、报告材料与活跃热力图
 */
export function apply(ctx: Context) {
  ensureDataLayout()
  registerTools(ctx)

  ctx.tools.register(
    defineTool({
      name: 'open_activity_heatmap',
      description:
        '返回本机活跃热力图 Web UI 地址（GitHub 风格方格）。用户可在浏览器打开查看。',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_a, v) => [{ type: 'text', text: String(v) }]
      },
      async execute() {
        const url = await startUiServer()
        return JSON.stringify(
          {
            url,
            dataRoot: getDataRoot(),
            hint: '在浏览器打开该地址查看热力图；可在页面内切换账号/年份并同步提交。'
          },
          null,
          2
        )
      }
    })
  )

  ctx.effect(() => {
    void startUiServer()
      .then((url) => {
        ctx.logger?.info?.(`[commit-journal] heatmap UI: ${url}`)
        ctx.logger?.info?.(`[commit-journal] data root: ${getDataRoot()}`)
      })
      .catch((e) => {
        ctx.logger?.warn?.(
          `[commit-journal] heatmap UI failed to start: ${e?.message || e}`
        )
      })
    try {
      rescheduleAll()
    } catch {
      // ignore empty schedule
    }
    return () => {
      stopAllSchedules()
      void stopUiServer()
    }
  })
}

export { getHeatmapUrl, getDataRoot, startUiServer, stopUiServer }
