import './Screens.css'

/**
 * @param {{
 *   mode: 'coc' | 'sandbox',
 *   slots: Array<{
 *     isEmpty: boolean,
 *     characterName: string,
 *     worldName: string,
 *     turnCount: number,
 *     lastPlayedAt: string,
 *   }>,
 *   onSelectSlot: (slotIndex: number, isEmpty: boolean) => void,
 *   onDeleteSlot: (slotIndex: number) => void,
 * }} props
 */
export default function SlotSelectScreen({ mode, slots, onSelectSlot, onDeleteSlot }) {
  const modeLabel = mode === 'coc' ? '克苏鲁的呼唤' : '沙盒模式'

  return (
    <div className="screen-root">
      <div className="screen-slot-inner">
        <h2 className="screen-mode-heading">选择存档</h2>
        <p className="screen-slot-mode-hint">{modeLabel}</p>
        <ul className="screen-slot-list">
          {slots.map((slot, idx) => {
            const slotIndex = idx + 1
            return (
              <li key={slotIndex} className="screen-slot-item">
                <button
                  type="button"
                  className={`screen-slot-card${slot.isEmpty ? ' screen-slot-card--empty' : ''}`}
                  onClick={() => onSelectSlot(slotIndex, slot.isEmpty)}
                >
                  {slot.isEmpty ? (
                    <>
                      <span className="screen-slot-empty-label">空存档</span>
                      <span className="screen-slot-plus" aria-hidden>
                        +
                      </span>
                    </>
                  ) : (
                    <div className="screen-slot-card-body">
                      <p className="screen-slot-card-line">
                        <span className="screen-slot-char">{slot.characterName || '—'}</span>
                        <span className="screen-slot-sep"> · </span>
                        <span className="screen-slot-world">{slot.worldName || '—'}</span>
                      </p>
                      <p className="screen-slot-card-meta">
                        第 {slot.turnCount} 轮
                        {slot.lastPlayedAt ? (
                          <>
                            <span className="screen-slot-sep"> · </span>
                            {formatLastPlayed(slot.lastPlayedAt)}
                          </>
                        ) : null}
                      </p>
                    </div>
                  )}
                </button>
                {!slot.isEmpty ? (
                  <button
                    type="button"
                    className="screen-slot-delete"
                    aria-label="删除存档"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSlot(slotIndex)
                    }}
                  >
                    🗑
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/** @param {string} iso */
function formatLastPlayed(iso) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
