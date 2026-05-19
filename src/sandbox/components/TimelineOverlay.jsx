import './TimelineOverlay.css'

/** @typedef {import('../sandboxStorage.js').SandboxTimelineEvent} SandboxTimelineEvent */

export const TIMELINE_CATEGORY_COLORS = {
  story: '#c0a060',
  combat: '#c04040',
  npc: '#40a060',
  discovery: '#4080c0',
  quest: '#8060c0',
}

const CATEGORY_LABELS = {
  story: '剧情',
  combat: '战斗',
  npc: '人物',
  discovery: '发现',
  quest: '任务',
}

/**
 * @param {{ events: SandboxTimelineEvent[], onClose: () => void }} props
 */
export default function TimelineOverlay({ events, onClose }) {
  const sorted = [...(events || [])].sort((a, b) => b.turn - a.turn || b.id.localeCompare(a.id))

  return (
    <div
      className="timeline-overlay-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeline-overlay-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="timeline-overlay-panel" onClick={(e) => e.stopPropagation()}>
        <header className="timeline-overlay-header">
          <h2 id="timeline-overlay-title" className="timeline-overlay-title">
            事件时间线
          </h2>
          <button type="button" className="timeline-overlay-close" onClick={onClose}>
            关闭
          </button>
        </header>
        <div className="timeline-overlay-body">
          {sorted.length === 0 ? (
            <p className="timeline-overlay-empty">
              尚无记录，冒险开始后将自动记录关键事件。
            </p>
          ) : (
            <div className="timeline-track">
              <div className="timeline-line" aria-hidden="true" />
              {sorted.map((e) => {
                const color = TIMELINE_CATEGORY_COLORS[e.category] ?? TIMELINE_CATEGORY_COLORS.story
                const label = CATEGORY_LABELS[e.category] ?? e.category
                return (
                  <article key={e.id} className="timeline-entry">
                    <div className="timeline-turn">第{e.turn}轮</div>
                    <div className="timeline-node-wrap">
                      <span
                        className="timeline-node"
                        style={{ color, borderColor: color }}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="timeline-card" style={{ borderColor: `${color}44` }}>
                      <h3 className="timeline-card-title">{e.title}</h3>
                      <div className="timeline-card-meta">
                        <span className="timeline-category-tag" style={{ color }}>
                          {label}
                        </span>
                      </div>
                      <p className="timeline-card-desc">{e.description}</p>
                      {e.consequence ? (
                        <p className="timeline-card-consequence">→ {e.consequence}</p>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
