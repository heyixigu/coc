import { getSandboxSlotKey } from '../sandbox/sandboxStorage.js'

const WORLDBOOK_FIELD = 'worldbook'

/** @param {number} slotIndex 1-based */
function getCustomWorldbookKey(slotIndex) {
  return getSandboxSlotKey(slotIndex, WORLDBOOK_FIELD)
}

/**
 * @param {unknown} raw
 * @returns {import('./worldbookData.js').WorldbookEntry[]}
 */
function normalizeCustomEntries(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e) => e && typeof e === 'object')
    .map((e) => {
      const o = /** @type {Record<string, unknown>} */ (e)
      const keywords = Array.isArray(o.keywords)
        ? o.keywords.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim())
        : []
      const content = typeof o.content === 'string' ? o.content.trim().slice(0, 200) : ''
      if (!keywords.length || !content) return null
      return {
        id: typeof o.id === 'string' ? o.id : `wb_custom_${Date.now()}`,
        keywords,
        content,
        priority:
          typeof o.priority === 'number' && Number.isFinite(o.priority)
            ? Math.min(5, Math.max(1, Math.round(o.priority)))
            : 3,
        worldId: typeof o.worldId === 'string' ? o.worldId : 'custom',
        isCustom: true,
      }
    })
    .filter(Boolean)
}

/**
 * @param {number} slotIndex 1-based
 * @returns {import('./worldbookData.js').WorldbookEntry[]}
 */
export function loadCustomWorldbook(slotIndex) {
  if (!slotIndex || !Number.isFinite(slotIndex)) return []
  try {
    const raw = localStorage.getItem(getCustomWorldbookKey(slotIndex))
    if (!raw) return []
    return normalizeCustomEntries(JSON.parse(raw))
  } catch {
    return []
  }
}

/**
 * @param {number} slotIndex 1-based
 * @param {import('./worldbookData.js').WorldbookEntry[]} entries
 */
export function saveCustomWorldbook(slotIndex, entries) {
  if (!slotIndex || !Number.isFinite(slotIndex)) return
  try {
    localStorage.setItem(getCustomWorldbookKey(slotIndex), JSON.stringify(entries))
  } catch {
    /* */
  }
}

/**
 * @param {number} slotIndex 1-based
 * @param {Omit<import('./worldbookData.js').WorldbookEntry, 'id' | 'isCustom'> & { id?: string }} entry
 */
export function addCustomEntry(slotIndex, entry) {
  const entries = loadCustomWorldbook(slotIndex)
  const newEntry = {
    ...entry,
    id: `wb_custom_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    isCustom: true,
  }
  entries.push(newEntry)
  saveCustomWorldbook(slotIndex, entries)
  return newEntry
}

/** @param {number} slotIndex 1-based @param {string} entryId */
export function removeCustomEntry(slotIndex, entryId) {
  const entries = loadCustomWorldbook(slotIndex)
  saveCustomWorldbook(
    slotIndex,
    entries.filter((e) => e.id !== entryId),
  )
}

/**
 * @param {number} slotIndex 1-based
 * @param {string} entryId
 * @param {Partial<import('./worldbookData.js').WorldbookEntry>} updates
 */
export function updateCustomEntry(slotIndex, entryId, updates) {
  const entries = loadCustomWorldbook(slotIndex)
  const idx = entries.findIndex((e) => e.id === entryId)
  if (idx === -1) return
  entries[idx] = { ...entries[idx], ...updates }
  saveCustomWorldbook(slotIndex, entries)
}

/** @param {number} slotIndex 1-based */
export function clearCustomWorldbook(slotIndex) {
  if (!slotIndex || !Number.isFinite(slotIndex)) return
  try {
    localStorage.removeItem(getCustomWorldbookKey(slotIndex))
  } catch {
    /* */
  }
}
