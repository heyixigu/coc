const REQUIRED_SECTIONS = [
  '【场景】',
  '【主角行为】',
  '【他人行为】',
  '【当前状态】',
  '【你可以：】',
]

/**
 * @param {string} text
 */
export function extractSandboxStatusBlock(text) {
  if (!text || typeof text !== 'string') return null
  const idx = text.indexOf('【当前状态】')
  if (idx === -1) return null
  const after = text.slice(idx + '【当前状态】'.length)
  const nextMarkers = ['【你可以：】', '【场景】', '【主角行为】', '【他人行为】']
  let end = after.length
  for (const m of nextMarkers) {
    const p = after.indexOf(m)
    if (p !== -1 && p < end) end = p
  }
  return after.slice(0, end).trim()
}

/**
 * @param {string} text
 * @param {string} [characterName]
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateSandboxGmReply(text, characterName = '') {
  if (!text || typeof text !== 'string') {
    return { valid: false, reason: 'empty' }
  }
  const t = text.trim()
  if (!t) return { valid: false, reason: 'empty' }

  for (const section of REQUIRED_SECTIONS) {
    if (!t.includes(section)) {
      return { valid: false, reason: `missing ${section}` }
    }
  }

  const block = extractSandboxStatusBlock(t)
  if (!block) return { valid: false, reason: 'status block' }

  // 支持 HP 12/15、HP：12/15、HP:12/15
  if (!/HP[：:\s]*\d+\s*\/\s*\d+/i.test(block)) {
    return { valid: false, reason: 'hp format' }
  }
  if (!/MP[：:\s]*\d+\s*\/\s*\d+/i.test(block)) {
    return { valid: false, reason: 'mp format' }
  }
  if (!/物品[：:]/.test(block)) {
    return { valid: false, reason: 'items line' }
  }

  if (characterName) {
    const escaped = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (!new RegExp(escaped).test(block)) {
      return { valid: false, reason: 'character name in status' }
    }
  }

  return { valid: true }
}

/**
 * 从GM回复中提取【状态变更】段的JSON
 * @param {string} reply
 * @returns {object | null}
 */
export function extractStateChangeJson(reply) {
  const marker = '【状态变更】'
  const markerIndex = reply.indexOf(marker)
  if (markerIndex === -1) return null
  const text = reply.slice(markerIndex + marker.length)
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false
  let end = -1

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') depth += 1
    if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        end = i
        break
      }
    }
  }

  if (end === -1) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}
