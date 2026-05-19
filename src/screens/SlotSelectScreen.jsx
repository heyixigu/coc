import { exportSlot, importSlot } from '../sandbox/sandboxStorage.js'
import ScreenBackButton from './ScreenBackButton.jsx'
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
 *   onSlotsChanged?: () => void,
 *   onNavigateBack?: () => void,
 * }} props
 */
export default function SlotSelectScreen({
  mode,
  slots,
  onSelectSlot,
  onDeleteSlot,
  onSlotsChanged,
  onNavigateBack,
}) {
  const modeLabel = mode === 'coc' ? '克苏鲁的呼唤' : '沙盒模式'

  /** @param {number} slotIndex 1-based */
  const handleExport = (slotIndex) => {
    const data = exportSlot(slotIndex, mode)
    if (!data) {
      alert('该存档槽为空')
      return
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `秘仪残卷_${mode}_存档${slotIndex}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** @param {number} slotIndex 1-based */
  const handleImport = (slotIndex) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = (e) => {
      const file = /** @type {HTMLInputElement} */ (e.target).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const text = /** @type {string} */ (ev.target?.result)
          const data = JSON.parse(text)
          importSlot(slotIndex, mode, data)
          alert(`存档${slotIndex}导入成功`)
          onSlotsChanged?.()
        } catch {
          alert('导入失败：文件格式不正确')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="screen-root screen-root--scroll">
      {onNavigateBack ? <ScreenBackButton onBack={onNavigateBack} /> : null}
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
                <div className="screen-slot-actions">
                  <button
                    type="button"
                    className="screen-slot-action-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleExport(slotIndex)
                    }}
                  >
                    导出
                  </button>
                  <button
                    type="button"
                    className="screen-slot-action-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleImport(slotIndex)
                    }}
                  >
                    导入
                  </button>
                </div>
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
