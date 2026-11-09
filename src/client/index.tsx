import type { Context } from '@deepseek-ai/cordis'
import { HeatmapPanel } from './HeatmapPanel'

export const name = 'commit-journal-client'

/**
 * Web client：尝试把热力图面板挂到 settings/plugins 槽位；失败则仅导出组件供人工接入
 */
export function apply(ctx: Context) {
  const slots = ctx.get?.('slots') as
    | { register?: (slot: string, item: unknown) => void }
    | undefined

  // Best-effort slot registration across dsh client versions
  try {
    slots?.register?.('settings.plugins.panels', {
      id: 'commit-journal-heatmap',
      title: 'Commit Journal 热力图',
      description: '查看本地已同步提交的 GitHub 风格活跃热力图',
      render: () => <HeatmapPanel />
    })
  } catch {
    // ignore — panel still usable via localhost UI / open_activity_heatmap tool
  }

  try {
    slots?.register?.('plugin-settings', {
      id: 'commit-journal-heatmap',
      title: 'Commit Journal',
      component: HeatmapPanel
    })
  } catch {
    // ignore
  }
}

export { HeatmapPanel }
export default HeatmapPanel
