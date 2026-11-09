import { useEffect, useState } from 'react'

interface Props {
  url?: string | null
}

/**
 * dsh web 侧活跃热力图入口面板：嵌入本地热力图 UI
 */
export function HeatmapPanel(props: Props) {
  const [url, setUrl] = useState(props.url || 'http://127.0.0.1:39282/')

  useEffect(() => {
    if (props.url) setUrl(props.url)
  }, [props.url])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 12,
        minHeight: 480
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Commit Journal · 活跃热力图</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
            GitHub 风格提交活跃度（本机 UI）
          </div>
        </div>
        <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
          新窗口打开
        </a>
      </div>
      <iframe
        title="commit-journal-heatmap"
        src={url}
        style={{
          width: '100%',
          height: 560,
          border: '1px solid rgba(127,127,127,.35)',
          borderRadius: 12,
          background: '#0f1419'
        }}
      />
    </div>
  )
}

export default HeatmapPanel
