import { SANDBOX_SKILL_NAMES } from './config/sandbox_judge_prompt.js'
import { extractSandboxStatusBlock } from './sandboxValidateGmReply.js'

const MAX_ACTIVE_COMPANIONS = 2

/**
 * @typedef {{ hp: number, maxHp: number, mp: number, maxMp: number, items: string[] }} ParsedSandboxPlayerStatus
 * @typedef {import('./sandboxStorage.js').SandboxCompanion} SandboxCompanion
 * @typedef {import('./sandboxStorage.js').SandboxCompanionStatus} SandboxCompanionStatus
 */

/**
 * @typedef {{
 *   player: { hp: number | null, maxHp: number | null, mp: number | null, maxMp: number | null, items: string[] },
 *   companions: SandboxCompanion[],
 *   newCompanions: SandboxCompanion[],
 * }} ParsedSandboxGmStatus
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
 * @param {string} name
 * @param {number} hp
 * @param {number} maxHp
 * @param {number} mp
 * @param {number} maxMp
 * @param {Record<string, number>} skills
 * @returns {SandboxCompanion}
 */
function buildCompanion(name, hp, maxHp, mp, maxMp, skills) {
  return {
    id: `companion_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: name.trim().slice(0, 32),
    role: '',
    background: '',
    personality: '',
    appearance: '',
    skills,
    hp,
    maxHp,
    mp,
    maxMp,
    loyalty: 3,
    control: 0,
    goal: '',
    status: 'active',
    isDead: false,
    isDeparted: false,
    equipped: [],
    carried: [],
  }
}

/**
 * @param {SandboxCompanion[]} companions
 */
function countActiveCompanions(companions) {
  return companions.filter((c) => c.status === 'active').length
}

/**
 * @param {SandboxCompanion[]} companions
 * @param {string} name
 */
function findCompanionByName(companions, name) {
  return companions.find((c) => c.name === name)
}

/**
 * @param {string} gmText
 * @param {SandboxCompanion[]} [currentCompanions]
 * @param {string} [playerName]
 * @returns {ParsedSandboxGmStatus | null}
 */
export function parseSandboxGmStatus(gmText, currentCompanions = [], playerName = '') {
  const block = extractSandboxStatusBlock(gmText)
  if (!block) return null

  const companions = currentCompanions.map((c) => ({ ...c, skills: { ...c.skills } }))
  const newCompanions = []

  const companionStatusRegex = /\[伙伴:(.+?)\]\s*(已死亡|已离队)/g
  let statusMatch
  while ((statusMatch = companionStatusRegex.exec(block)) !== null) {
    const name = statusMatch[1].trim()
    const label = statusMatch[2]
    const existing = findCompanionByName(companions, name)
    if (!existing) continue
    if (label === '已死亡') {
      existing.isDead = true
      existing.status = 'dead'
    } else {
      existing.isDeparted = true
      existing.status = 'left'
    }
  }

  const companionRegex = /\[伙伴:(.+?)\]\s*HP\s*(\d+)\s*\/\s*(\d+)\s*MP\s*(\d+)\s*\/\s*(\d+)/g
  let compMatch
  while ((compMatch = companionRegex.exec(block)) !== null) {
    const name = compMatch[1].trim()
    const hp = Number.parseInt(compMatch[2], 10)
    const maxHp = Number.parseInt(compMatch[3], 10)
    const mp = Number.parseInt(compMatch[4], 10)
    const maxMp = Number.parseInt(compMatch[5], 10)
    if (![hp, maxHp, mp, maxMp].every((n) => Number.isFinite(n))) continue
    const existing = findCompanionByName(companions, name)
    if (!existing) continue
    existing.hp = Math.min(999, Math.max(0, hp))
    existing.maxHp = Math.min(999, Math.max(1, maxHp))
    existing.mp = Math.min(999, Math.max(0, mp))
    existing.maxMp = Math.min(999, Math.max(1, maxMp))
    if (!existing.isDead && !existing.isDeparted && existing.status !== 'dead' && existing.status !== 'left') {
      existing.status = 'active'
    }
  }

  const newCompanionRegex =
    /\[新伙伴:(.+?)\]\s*HP\s*(\d+)\s*\/\s*(\d+)\s*MP\s*(\d+)\s*\/\s*(\d+)\s*[\r\n]+\s*技能：战斗(\d+)\s*交涉(\d+)\s*感知(\d+)\s*潜行(\d+)\s*学识(\d+)\s*意志(\d+)\s*体魄(\d+)/g
  let newMatch
  while ((newMatch = newCompanionRegex.exec(block)) !== null) {
    if (countActiveCompanions(companions) >= MAX_ACTIVE_COMPANIONS) continue

    const name = newMatch[1].trim()
    if (!name) continue

    const skills = {}
    const skillVals = [
      newMatch[6],
      newMatch[7],
      newMatch[8],
      newMatch[9],
      newMatch[10],
      newMatch[11],
      newMatch[12],
    ]
    SANDBOX_SKILL_NAMES.forEach((skillName, i) => {
      const n = Number.parseInt(skillVals[i], 10)
      skills[skillName] = Number.isFinite(n)
        ? Math.min(80, Math.max(5, n))
        : 50
    })

    const hp = Number.parseInt(newMatch[2], 10)
    const maxHp = Number.parseInt(newMatch[3], 10)
    const mp = Number.parseInt(newMatch[4], 10)
    const maxMp = Number.parseInt(newMatch[5], 10)
    if (![hp, maxHp, mp, maxMp].every((n) => Number.isFinite(n))) continue

    const existing = findCompanionByName(companions, name)
    if (existing) {
      existing.skills = skills
      existing.hp = Math.min(999, Math.max(0, hp))
      existing.maxHp = Math.min(999, Math.max(1, maxHp))
      existing.mp = Math.min(999, Math.max(0, mp))
      existing.maxMp = Math.min(999, Math.max(1, maxMp))
      existing.status = 'active'
      continue
    }

    const created = buildCompanion(name, hp, maxHp, mp, maxMp, skills)
    companions.push(created)
    newCompanions.push(created)
  }

  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
  let playerLine = lines[0] || ''
  if (playerName) {
    const named = lines.find((l) => l.includes(playerName) && /HP\s*\d+/i.test(l) && !l.includes('[伙伴'))
    if (named) playerLine = named
  }

  const stats = parseHpMpPair(playerLine)
  const player = stats
    ? {
        hp: stats.hp,
        maxHp: stats.maxHp,
        mp: stats.mp,
        maxMp: stats.maxMp,
        items: parseItemsLine(block),
      }
    : { hp: null, maxHp: null, mp: null, maxMp: null, items: [] }

  return { player, companions, newCompanions }
}

/**
 * @param {string} gmText
 * @returns {ParsedSandboxPlayerStatus | null}
 */
export function parseSandboxGmStatusLegacy(gmText) {
  const parsed = parseSandboxGmStatus(gmText, [])
  if (!parsed || parsed.player.hp == null) return null
  return {
    hp: parsed.player.hp,
    maxHp: parsed.player.maxHp ?? parsed.player.hp,
    mp: parsed.player.mp ?? 0,
    maxMp: parsed.player.maxMp ?? 1,
    items: parsed.player.items,
  }
}

/**
 * @param {string} gmText
 * @param {import('./sandboxStorage.js').SandboxCharacter} character
 * @param {SandboxCompanion[]} [companions]
 * @returns {{ character: import('./sandboxStorage.js').SandboxCharacter, companions: SandboxCompanion[] } | null}
 */
export function mergeSandboxFromGmText(gmText, character, companions = []) {
  if (!character) return null
  try {
    const parsed = parseSandboxGmStatus(gmText, companions, character.name)
    if (!parsed) return { character, companions }

    let nextCharacter = character
    if (parsed.player.hp != null && parsed.player.maxHp != null) {
      nextCharacter = {
        ...character,
        hp: parsed.player.hp,
        maxHp: parsed.player.maxHp,
        mp: parsed.player.mp ?? character.mp,
        maxMp: parsed.player.maxMp ?? character.maxMp,
        items: parsed.player.items,
      }
    }

    return { character: nextCharacter, companions: parsed.companions }
  } catch {
    return { character, companions }
  }
}

/**
 * @param {string} gmText
 * @param {import('./sandboxStorage.js').SandboxCharacter} character
 * @returns {import('./sandboxStorage.js').SandboxCharacter | null}
 */
export function mergeCharacterFromGmText(gmText, character) {
  const merged = mergeSandboxFromGmText(gmText, character, [])
  return merged?.character ?? character
}
