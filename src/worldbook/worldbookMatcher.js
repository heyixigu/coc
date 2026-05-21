import { BUILTIN_WORLDBOOK } from './worldbookData.js'
import { loadCustomWorldbook } from './worldbookStorage.js'

const MAX_INJECT_COUNT = 5
const MAX_ENTRY_LENGTH = 200

/**
 * @param {string} text
 * @param {string} worldId
 * @param {number | null | undefined} slotIndex
 * @returns {import('./worldbookData.js').WorldbookEntry[]}
 */
export function matchWorldbookEntries(text, worldId, slotIndex) {
  if (!text || !worldId) return []

  const customEntries =
    slotIndex != null && Number.isFinite(slotIndex) && slotIndex >= 1
      ? loadCustomWorldbook(slotIndex)
      : []
  const allEntries = [...BUILTIN_WORLDBOOK, ...customEntries]

  const relevant = allEntries.filter(
    (e) => e.worldId === worldId || e.worldId === 'global' || e.isCustom,
  )

  const matched = relevant.filter((entry) =>
    entry.keywords.some((kw) => kw && text.includes(kw)),
  )

  matched.sort((a, b) => (b.priority ?? 3) - (a.priority ?? 3))
  return matched.slice(0, MAX_INJECT_COUNT)
}

/**
 * @param {import('./worldbookData.js').WorldbookEntry[]} entries
 * @returns {string}
 */
export function formatWorldbookInject(entries) {
  if (!entries.length) return ''
  const lines = entries.map((e) => {
    const content = e.content.slice(0, MAX_ENTRY_LENGTH)
    return `- ${content}`
  })
  return `\n=== 世界书（相关设定）===\n${lines.join('\n')}`
}

/**
 * @param {string} scanText
 * @param {string} worldId
 * @param {number | null | undefined} slotIndex
 * @returns {string}
 */
export function getWorldbookInject(scanText, worldId, slotIndex) {
  const entries = matchWorldbookEntries(scanText, worldId, slotIndex)
  return formatWorldbookInject(entries)
}
