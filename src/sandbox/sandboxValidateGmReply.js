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

  if (!/【状态变更】/.test(t)) {
    return { valid: false, reason: 'missing_state_change' }
  }

  const stateChangeJson = extractStateChangeJson(t)
  if (!stateChangeJson) {
    return { valid: false, reason: 'invalid_state_change_json' }
  }

  return { valid: true }
}

/**
 * @param {string} raw
 * @returns {string}
 */
function normalizeStateChangeJsonText(raw) {
  let s = (raw || '').trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  return s
}

/**
 * 从GM回复中提取【状态变更】段的JSON
 * @param {string} reply
 * @returns {object | null}
 */
export function extractStateChangeJson(reply) {
  const match = reply.match(/【状态变更】\s*([\s\S]*?)(?=【|$)/)
  if (!match) return null
  const jsonStr = normalizeStateChangeJsonText(match[1])
  const start = jsonStr.indexOf('{')
  const end = jsonStr.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    console.warn('[extractStateChangeJson] no JSON object found', jsonStr.slice(0, 200))
    return null
  }
  const slice = jsonStr.slice(start, end + 1)
  try {
    return JSON.parse(slice)
  } catch (e) {
    console.warn('[extractStateChangeJson] parse failed', slice.slice(0, 300), e)
    return null
  }
}
