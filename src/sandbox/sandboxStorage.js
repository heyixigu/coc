import { SANDBOX_SKILL_NAMES } from './config/sandbox_judge_prompt.js'

const SANDBOX_SLOT_COUNT = 4

/**
 * @typedef {{
 *   isEmpty: boolean,
 *   characterName: string,
 *   worldName: string,
 *   turnCount: number,
 *   lastPlayedAt: string,
 *   gameState: SandboxState
 * }} SandboxSlotMeta
 */

/** @typedef {{ turn: number, summary: string }} SandboxTurnSummaryEntry */
/** @typedef {{ index: number, summary: string, archivedAt: string, endMessageId?: string }} SandboxArchivedEventEntry */
/** @typedef {{ id: string, role: 'gm' | 'player' | 'system', content: string, ts: number, isSummary?: boolean, isArchive?: boolean }} SandboxChatMessage */
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
 *   consecutiveFails: number,
 *   prologueComplete: boolean,
 *   turnSummaries: SandboxTurnSummaryEntry[],
 *   archivedEvents: SandboxArchivedEventEntry[],
 *   eventIndex: number
 * }} SandboxState
 */

const DEFAULT_SKILLS = () =>
  Object.fromEntries(SANDBOX_SKILL_NAMES.map((n) => [n, 50]))

/** @param {SandboxSkills} skills */
export function computeHpMpFromSkills(skills) {
  const physique = Number(skills.体魄) || 5
  const knowledge = Number(skills.学识) || 5
  const maxHp = Math.min(18, Math.max(11, 10 + Math.floor(physique / 10)))
  const maxMp = Math.min(18, Math.max(11, 10 + Math.floor(knowledge / 10)))
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
    consecutiveFails: 0,
    prologueComplete: false,
    turnSummaries: [],
    archivedEvents: [],
    eventIndex: 1,
  }
}

/** @param {unknown} raw */
function normalizeSkills(raw) {
  const base = DEFAULT_SKILLS()
  if (!raw || typeof raw !== 'object') return base
  const o = /** @type {Record<string, unknown>} */ (raw)
  for (const name of SANDBOX_SKILL_NAMES) {
    const n = Number.parseInt(String(o[name]), 10)
    if (Number.isFinite(n)) base[name] = Math.min(80, Math.max(5, n))
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
    ...(o.isArchive === true ? { isArchive: true } : {}),
  }
}

/** @param {unknown} raw */
function normalizeTurnSummaries(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue
    const o = /** @type {Record<string, unknown>} */ (e)
    const turn = Number.parseInt(String(o.turn), 10)
    const summary = typeof o.summary === 'string' ? o.summary.trim().slice(0, 2000) : ''
    if (!Number.isFinite(turn) || turn < 1 || !summary) continue
    out.push({ turn, summary })
  }
  return out.slice(0, 500)
}

/** @param {unknown} raw */
function normalizeArchivedEvents(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue
    const o = /** @type {Record<string, unknown>} */ (e)
    const index = Number.parseInt(String(o.index), 10)
    const summary = typeof o.summary === 'string' ? o.summary.trim().slice(0, 8000) : ''
    const archivedAt = typeof o.archivedAt === 'string' ? o.archivedAt : ''
    if (!Number.isFinite(index) || index < 1 || !summary) continue
    out.push({
      index,
      summary,
      archivedAt,
      ...(typeof o.endMessageId === 'string' && o.endMessageId
        ? { endMessageId: o.endMessageId }
        : {}),
    })
  }
  return out.slice(0, 50)
}

/** @param {unknown} raw */
function normalizeEventIndex(raw) {
  const n = Number.parseInt(String(raw ?? 1), 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
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

/** @param {number} slotIndex 1-based @param {string} field */
export function getSandboxSlotKey(slotIndex, field) {
  return `sandbox-slot-${slotIndex}-${field}`
}

const SANDBOX_SLOT_FIELDS = [
  'messages',
  'character',
  'diceLog',
  'turnSummaries',
  'archivedEvents',
  'eventIndex',
  'playerTurnCount',
  'consecutiveFails',
  'prologueComplete',
  'world',
  'meta',
]

/** @param {string} key */
function readJsonKey(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** @param {string} key @param {unknown} value */
function writeJsonKey(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota */
  }
}

/** @param {number} slotIndex 1-based */
function removeSandboxSlotKeys(slotIndex) {
  for (const field of SANDBOX_SLOT_FIELDS) {
    try {
      localStorage.removeItem(getSandboxSlotKey(slotIndex, field))
    } catch {
      /* */
    }
  }
  try {
    localStorage.removeItem(`sandbox-save-slot-${slotIndex}`)
  } catch {
    /* */
  }
}

function isSandboxStateEmpty(gs) {
  return (
    !gs.prologueComplete &&
    !gs.character &&
    !gs.world &&
    (gs.messages?.length ?? 0) === 0
  )
}

/** @returns {SandboxSlotMeta} */
function emptySandboxSlotMeta() {
  return {
    isEmpty: true,
    characterName: '',
    worldName: '',
    turnCount: 0,
    lastPlayedAt: '',
    gameState: defaultSandboxState(),
  }
}

/** @param {SandboxState} gs */
function buildSandboxSlotMeta(gs) {
  const empty = isSandboxStateEmpty(gs)
  return {
    isEmpty: empty,
    characterName: gs.character?.name?.trim() || '',
    worldName: gs.world?.name?.trim() || '',
    turnCount: gs.playerTurnCount ?? 0,
    lastPlayedAt: empty ? '' : new Date().toISOString(),
    gameState: gs,
  }
}

/** @param {number} slotIndex 1-based @returns {SandboxState} */
function assembleSandboxState(slotIndex) {
  const base = defaultSandboxState()
  const messagesRaw = readJsonKey(getSandboxSlotKey(slotIndex, 'messages'))
  const messages = Array.isArray(messagesRaw) ? messagesRaw : []
  const prologueFlag = readJsonKey(getSandboxSlotKey(slotIndex, 'prologueComplete'))

  return {
    character: normalizeCharacter(readJsonKey(getSandboxSlotKey(slotIndex, 'character'))),
    world: normalizeWorld(readJsonKey(getSandboxSlotKey(slotIndex, 'world'))),
    messages: messages.map(normalizeMessage).filter(Boolean),
    diceLog: normalizeDiceLog(readJsonKey(getSandboxSlotKey(slotIndex, 'diceLog'))),
    playerTurnCount: (() => {
      const n = Number(readJsonKey(getSandboxSlotKey(slotIndex, 'playerTurnCount')))
      return Number.isFinite(n) && n >= 0 ? n : 0
    })(),
    consecutiveFails: (() => {
      const n = Number(readJsonKey(getSandboxSlotKey(slotIndex, 'consecutiveFails')))
      return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0
    })(),
    prologueComplete: prologueFlag === true,
    turnSummaries: normalizeTurnSummaries(readJsonKey(getSandboxSlotKey(slotIndex, 'turnSummaries'))),
    archivedEvents: normalizeArchivedEvents(readJsonKey(getSandboxSlotKey(slotIndex, 'archivedEvents'))),
    eventIndex: normalizeEventIndex(readJsonKey(getSandboxSlotKey(slotIndex, 'eventIndex'))),
  }
}

/** @param {number} slotIndex 1-based @param {SandboxState} gs */
function persistSandboxState(slotIndex, gs) {
  writeJsonKey(getSandboxSlotKey(slotIndex, 'character'), gs.character)
  writeJsonKey(getSandboxSlotKey(slotIndex, 'world'), gs.world)
  writeJsonKey(getSandboxSlotKey(slotIndex, 'messages'), gs.messages ?? [])
  writeJsonKey(getSandboxSlotKey(slotIndex, 'diceLog'), gs.diceLog ?? [])
  writeJsonKey(getSandboxSlotKey(slotIndex, 'playerTurnCount'), gs.playerTurnCount ?? 0)
  writeJsonKey(getSandboxSlotKey(slotIndex, 'consecutiveFails'), gs.consecutiveFails ?? 0)
  writeJsonKey(getSandboxSlotKey(slotIndex, 'prologueComplete'), !!gs.prologueComplete)
  writeJsonKey(getSandboxSlotKey(slotIndex, 'turnSummaries'), gs.turnSummaries ?? [])
  writeJsonKey(getSandboxSlotKey(slotIndex, 'archivedEvents'), gs.archivedEvents ?? [])
  writeJsonKey(getSandboxSlotKey(slotIndex, 'eventIndex'), gs.eventIndex ?? 1)

  const meta = buildSandboxSlotMeta(gs)
  writeJsonKey(getSandboxSlotKey(slotIndex, 'meta'), {
    isEmpty: meta.isEmpty,
    characterName: meta.characterName,
    worldName: meta.worldName,
    turnCount: meta.turnCount,
    lastPlayedAt: meta.lastPlayedAt,
  })
}

/** @param {number} slotIndex */
function readSandboxSlotMeta(slotIndex) {
  try {
    const gameState = assembleSandboxState(slotIndex)
    if (isSandboxStateEmpty(gameState)) return emptySandboxSlotMeta()

    const meta = readJsonKey(getSandboxSlotKey(slotIndex, 'meta'))
    const o = meta && typeof meta === 'object' ? /** @type {Record<string, unknown>} */ (meta) : null

    return {
      isEmpty: false,
      characterName:
        o && typeof o.characterName === 'string' && o.characterName.trim()
          ? o.characterName.trim()
          : gameState.character?.name?.trim() || '',
      worldName:
        o && typeof o.worldName === 'string' && o.worldName.trim()
          ? o.worldName.trim()
          : gameState.world?.name?.trim() || '',
      turnCount:
        o && typeof o.turnCount === 'number' && Number.isFinite(o.turnCount)
          ? o.turnCount
          : gameState.playerTurnCount ?? 0,
      lastPlayedAt: o && typeof o.lastPlayedAt === 'string' ? o.lastPlayedAt : '',
      gameState,
    }
  } catch {
    return emptySandboxSlotMeta()
  }
}

/** @returns {SandboxSlotMeta[]} */
export function listSandboxSlots() {
  const out = []
  for (let i = 1; i <= SANDBOX_SLOT_COUNT; i++) out.push(readSandboxSlotMeta(i))
  return out
}

/** @param {number} slotIndex 1-based */
export function loadSandboxSlot(slotIndex) {
  return assembleSandboxState(slotIndex)
}

/** @param {number} slotIndex 1-based @param {SandboxState} gameState */
export function saveSandboxSlot(slotIndex, gameState) {
  persistSandboxState(slotIndex, gameState)
}

/** @param {number} slotIndex 1-based */
export function deleteSandboxSlot(slotIndex) {
  removeSandboxSlotKeys(slotIndex)
}

export function wipeSandboxSlots() {
  for (let i = 1; i <= SANDBOX_SLOT_COUNT; i++) deleteSandboxSlot(i)
}

export function wipeSandboxStorage() {
  try {
    localStorage.removeItem('sandbox-simulator-state-v1')
  } catch {
    /* */
  }
  wipeSandboxSlots()
}

/** @param {number} slotIndex 1-based @returns {SandboxState} */
export function resetSandboxState(slotIndex) {
  const s = defaultSandboxState()
  if (slotIndex) saveSandboxSlot(slotIndex, s)
  return s
}

/** 保留角色与世界观，清空对局 @param {number} slotIndex 1-based */
export function resetSandboxStory(slotIndex) {
  const prev = loadSandboxSlot(slotIndex)
  const s = {
    ...defaultSandboxState(),
    character: prev.character,
    world: prev.world,
    prologueComplete: false,
  }
  saveSandboxSlot(slotIndex, s)
  return s
}
