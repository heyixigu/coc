import { SANDBOX_SKILL_NAMES } from './config/sandbox_judge_prompt.js'

export const SANDBOX_STORAGE_KEY = 'sandbox-simulator-state-v1'

/** @typedef {{ id: string, role: 'gm' | 'player' | 'system', content: string, ts: number, isSummary?: boolean }} SandboxChatMessage */
/** @typedef {'extreme' | 'success' | 'fail' | 'fumble'} SandboxD100Outcome */
/** @typedef {{ id: string, skillName: string, value: number, dice: string, outcome: SandboxD100Outcome | null, judgeText: string, ts: number }} SandboxDiceLogEntry */
/** @typedef {Record<string, number>} SandboxSkills */
/** @typedef {'男' | '女' | '其他'} SandboxGender */

/**
 * @typedef {{
 *   name: string,
 *   gender: SandboxGender,
 *   background: string,
 *   skills: SandboxSkills,
 *   hp: number,
 *   maxHp: number,
 *   mp: number,
 *   maxMp: number,
 *   items: string[],
 * }} SandboxCharacter
 */

/**
 * @typedef {{
 *   id: import('./config/sandbox_worlds.js').SandboxWorldId,
 *   name: string,
 *   flavor: string,
 * }} SandboxWorldRef
 */

/**
 * @typedef {{
 *   character: SandboxCharacter | null,
 *   world: SandboxWorldRef | null,
 *   messages: SandboxChatMessage[],
 *   diceLog: SandboxDiceLogEntry[],
 *   playerTurnCount: number,
 *   prologueComplete: boolean,
 * }} SandboxState
 */

const DEFAULT_SKILLS = () =>
  Object.fromEntries(SANDBOX_SKILL_NAMES.map((n) => [n, 10]))

/** @param {SandboxSkills} skills */
export function computeHpMpFromSkills(skills) {
  const physique = Number(skills.体魄) || 5
  const knowledge = Number(skills.学识) || 5
  const maxHp = 10 + Math.floor(physique / 5)
  const maxMp = 10 + Math.floor(knowledge / 5)
  return { maxHp, maxMp, hp: maxHp, mp: maxMp }
}

/** @returns {SandboxState} */
export function defaultSandboxState() {
  return {
    character: null,
    world: null,
    messages: [],
    diceLog: [],
    playerTurnCount: 0,
    prologueComplete: false,
  }
}

/** @param {unknown} raw */
function normalizeSkills(raw) {
  const base = DEFAULT_SKILLS()
  if (!raw || typeof raw !== 'object') return base
  const o = /** @type {Record<string, unknown>} */ (raw)
  for (const name of SANDBOX_SKILL_NAMES) {
    const n = Number.parseInt(String(o[name]), 10)
    if (Number.isFinite(n)) base[name] = Math.min(30, Math.max(5, n))
  }
  return base
}

/** @param {unknown} raw */
function normalizeCharacter(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (raw)
  const name = typeof o.name === 'string' ? o.name.trim().slice(0, 32) : ''
  if (!name) return null
  const genderRaw = typeof o.gender === 'string' ? o.gender : '其他'
  const gender = /** @type {SandboxGender} */ (
    ['男', '女', '其他'].includes(genderRaw) ? genderRaw : '其他'
  )
  const background = typeof o.background === 'string' ? o.background.trim().slice(0, 500) : ''
  const skills = normalizeSkills(o.skills)
  const maxHp = Number.parseInt(String(o.maxHp), 10)
  const maxMp = Number.parseInt(String(o.maxMp), 10)
  const hp = Number.parseInt(String(o.hp), 10)
  const mp = Number.parseInt(String(o.mp), 10)
  const computed = computeHpMpFromSkills(skills)
  const items = normalizeItemList(o.items)

  return {
    name,
    gender,
    background,
    skills,
    maxHp: Number.isFinite(maxHp) ? Math.min(999, Math.max(1, maxHp)) : computed.maxHp,
    maxMp: Number.isFinite(maxMp) ? Math.min(999, Math.max(1, maxMp)) : computed.maxMp,
    hp: Number.isFinite(hp) ? Math.min(999, Math.max(0, hp)) : computed.hp,
    mp: Number.isFinite(mp) ? Math.min(999, Math.max(0, mp)) : computed.mp,
    items,
  }
}

/** @param {unknown} raw */
function normalizeItemList(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const t = item.trim().slice(0, 64)
    if (t) out.push(t)
  }
  return out.slice(0, 48)
}

/** @param {unknown} raw */
function normalizeWorld(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (raw)
  const id = o.id
  if (id !== 'east' && id !== 'fantasy' && id !== 'cyberpunk' && id !== 'wasteland') return null
  const name = typeof o.name === 'string' ? o.name.trim().slice(0, 32) : ''
  const flavor = typeof o.flavor === 'string' ? o.flavor.trim().slice(0, 2000) : ''
  if (!name) return null
  return { id, name, flavor }
}

/** @param {unknown} m */
function normalizeMessage(m) {
  if (!m || typeof m !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (m)
  const role = o.role
  if (typeof role !== 'string' || !['gm', 'player', 'system'].includes(role)) return null
  const id = typeof o.id === 'string' ? o.id : ''
  if (!id) return null
  return {
    id,
    role: /** @type {'gm' | 'player' | 'system'} */ (role),
    content: typeof o.content === 'string' ? o.content : '',
    ts: typeof o.ts === 'number' && Number.isFinite(o.ts) ? o.ts : Date.now(),
    ...(o.isSummary === true ? { isSummary: true } : {}),
  }
}

/** @param {unknown} raw */
function normalizeDiceLog(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue
    const o = /** @type {Record<string, unknown>} */ (e)
    if (typeof o.id !== 'string' || typeof o.skillName !== 'string') continue
    if (typeof o.value !== 'number' || !Number.isFinite(o.value)) continue
    out.push({
      id: o.id,
      skillName: o.skillName,
      value: o.value,
      dice: typeof o.dice === 'string' ? o.dice : '1d100',
      outcome: /** @type {SandboxD100Outcome | null} */ (o.outcome ?? null),
      judgeText: typeof o.judgeText === 'string' ? o.judgeText : '',
      ts: typeof o.ts === 'number' ? o.ts : Date.now(),
    })
  }
  return out.slice(0, 5)
}

/** @returns {SandboxState} */
export function loadSandboxState() {
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY)
    if (!raw) return defaultSandboxState()
    const parsed = JSON.parse(raw)
    const base = defaultSandboxState()
    const messages = Array.isArray(parsed.messages) ? parsed.messages : []
    return {
      ...base,
      character: normalizeCharacter(parsed.character),
      world: normalizeWorld(parsed.world),
      messages: messages.map(normalizeMessage).filter(Boolean),
      diceLog: normalizeDiceLog(parsed.diceLog),
      playerTurnCount:
        Number.isFinite(Number(parsed.playerTurnCount)) && Number(parsed.playerTurnCount) >= 0
          ? Number(parsed.playerTurnCount)
          : 0,
      prologueComplete: parsed.prologueComplete === true,
    }
  } catch {
    return defaultSandboxState()
  }
}

/** @param {SandboxState} state */
export function saveSandboxState(state) {
  try {
    localStorage.setItem(
      SANDBOX_STORAGE_KEY,
      JSON.stringify({
        character: state.character,
        world: state.world,
        messages: state.messages,
        diceLog: state.diceLog,
        playerTurnCount: state.playerTurnCount ?? 0,
        prologueComplete: !!state.prologueComplete,
      }),
    )
  } catch {
    /* quota */
  }
}

export function wipeSandboxStorage() {
  try {
    localStorage.removeItem(SANDBOX_STORAGE_KEY)
  } catch {
    /* */
  }
}

/** @returns {SandboxState} */
export function resetSandboxState() {
  const s = defaultSandboxState()
  saveSandboxState(s)
  return s
}

/** 保留角色与世界观，清空对局 */
export function resetSandboxStory() {
  const prev = loadSandboxState()
  const s = {
    ...defaultSandboxState(),
    character: prev.character,
    world: prev.world,
    prologueComplete: false,
  }
  saveSandboxState(s)
  return s
}
