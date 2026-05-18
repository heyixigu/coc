import { extractSandboxStatusBlock } from './sandboxValidateGmReply.js'

/**
 * @typedef {{ hp: number, maxHp: number, mp: number, maxMp: number, items: string[] }} ParsedSandboxStatus
 */

/**
 * @param {string} line
 */
function parseHpMpPair(line) {
  const hp = line.match(/HP\s*(\d+)\s*\/\s*(\d+)/i)
  const mp = line.match(/MP\s*(\d+)\s*\/\s*(\d+)/i)
  if (!hp || !mp) return null
  const curHp = Number.parseInt(hp[1], 10)
  const maxHp = Number.parseInt(hp[2], 10)
  const curMp = Number.parseInt(mp[1], 10)
  const maxMp = Number.parseInt(mp[2], 10)
  if (![curHp, maxHp, curMp, maxMp].every((n) => Number.isFinite(n))) return null
  return {
    hp: Math.min(999, Math.max(0, curHp)),
    maxHp: Math.min(999, Math.max(1, maxHp)),
    mp: Math.min(999, Math.max(0, curMp)),
    maxMp: Math.min(999, Math.max(1, maxMp)),
  }
}

/**
 * @param {string} block
 */
function parseItemsLine(block) {
  const m = block.match(/物品[：:]\s*([^\n]+)/)
  if (!m) return []
  const raw = m[1].trim()
  if (!raw || raw === '无') return []
  return raw
    .split(/[、,，]/)
    .map((s) => s.trim().slice(0, 64))
    .filter(Boolean)
    .slice(0, 48)
}

/**
 * @param {string} gmText
 * @returns {ParsedSandboxStatus | null}
 */
export function parseSandboxGmStatus(gmText) {
  const block = extractSandboxStatusBlock(gmText)
  if (!block) return null
  const firstLine = block.split('\n').map((l) => l.trim()).find(Boolean) || block
  const stats = parseHpMpPair(firstLine)
  if (!stats) return null
  return {
    ...stats,
    items: parseItemsLine(block),
  }
}

/**
 * @param {string} gmText
 * @param {import('./sandboxStorage.js').SandboxCharacter} character
 * @returns {import('./sandboxStorage.js').SandboxCharacter | null}
 */
export function mergeCharacterFromGmText(gmText, character) {
  if (!character) return null
  const parsed = parseSandboxGmStatus(gmText)
  if (!parsed) return character
  return {
    ...character,
    hp: parsed.hp,
    maxHp: parsed.maxHp,
    mp: parsed.mp,
    maxMp: parsed.maxMp,
    items: parsed.items,
  }
}
