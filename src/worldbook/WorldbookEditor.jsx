import { useEffect, useState } from 'react'
import {
  loadCustomWorldbook,
  addCustomEntry,
  removeCustomEntry,
} from './worldbookStorage.js'
import './WorldbookEditor.css'

/**
 * @param {{ slotIndex: number, worldId: string, onClose: () => void }} props
 */
export default function WorldbookEditor({ slotIndex, worldId, onClose }) {
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState({ keywords: '', content: '', priority: 3 })

  useEffect(() => {
    setEntries(loadCustomWorldbook(slotIndex))
  }, [slotIndex])

  const handleAdd = () => {
    const keywords = form.keywords
      .split(/[,，]/)
      .map((k) => k.trim())
      .filter(Boolean)
    if (!keywords.length || !form.content.trim()) return
    const newEntry = addCustomEntry(slotIndex, {
      keywords,
      content: form.content.trim(),
      priority: form.priority,
      worldId,
    })
    setEntries((prev) => [...prev, newEntry])
    setForm({ keywords: '', content: '', priority: 3 })
  }

  const handleRemove = (id) => {
    removeCustomEntry(slotIndex, id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="worldbook-overlay" role="dialog" aria-modal="true" aria-label="世界书">
      <div className="worldbook-editor">
        <div className="worldbook-editor-header">
          <h3>世界书</h3>
          <p className="worldbook-editor-hint muted small">
            自定义条目在本存档槽生效；关键词命中时注入 GM。内置设定随世界观自动匹配。
          </p>
          <button type="button" className="worldbook-close-btn" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="worldbook-form">
          <input
            type="text"
            className="worldbook-input"
            placeholder="关键词（逗号分隔，如：奥术,魔法,学院）"
            value={form.keywords}
            onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
          />
          <textarea
            className="worldbook-textarea"
            placeholder="条目内容（200字以内）"
            value={form.content}
            maxLength={200}
            rows={4}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          />
          <div className="worldbook-form-row">
            <label className="worldbook-priority-label">
              优先级
              <select
                className="worldbook-select"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: Number(e.target.value) }))
                }
              >
                <option value={1}>1 低</option>
                <option value={2}>2</option>
                <option value={3}>3 普通</option>
                <option value={4}>4</option>
                <option value={5}>5 高</option>
              </select>
            </label>
            <button type="button" className="worldbook-add-btn" onClick={handleAdd}>
              添加
            </button>
          </div>
        </div>

        <div className="worldbook-list">
          {entries.length === 0 ? (
            <p className="worldbook-empty">暂无自定义条目</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="worldbook-entry">
                <div className="worldbook-entry-keywords">🔑 {entry.keywords.join('、')}</div>
                <div className="worldbook-entry-content">{entry.content}</div>
                <div className="worldbook-entry-footer">
                  <span>优先级 {entry.priority}</span>
                  <button type="button" onClick={() => handleRemove(entry.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
