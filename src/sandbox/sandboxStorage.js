import { SANDBOX_SKILL_NAMES } from './config/sandbox_judge_prompt.js'

export const SANDBOX_STORAGE_KEY = 'sandbox-simulator-state-v1'

const SANDBOX_SLOT_COUNT = 4
const SANDBOX_LEGACY_MIGRATED_KEY = 'sandbox-slots-migrated-v1'

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

/** @param {number} slotIndex 1-based */
function sandboxSlotKey(slotIndex) {
  return `sandbox-save-slot-${slotIndex}`
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

/** @param {unknown} raw */
function normalizeSandboxGameFromRaw(raw) {
  if (!raw || typeof raw !== 'object') return defaultSandboxState()
  const o = /** @type {Record<string, unknown>} */ (raw)
  const gs =
    o.gameState && typeof o.gameState === 'object'
      ? /** @type {Record<string, unknown>} */ (o.gameState)
      : o
  const messages = Array.isArray(gs.messages) ? gs.messages : []
  return {
    character: normalizeCharacter(gs.character),
    world: normalizeWorld(gs.world),
    messages: messages.map(normalizeMessage).filter(Boolean),
    diceLog: normalizeDiceLog(gs.diceLog),
    playerTurnCount:
      Number.isFinite(Number(gs.playerTurnCount)) && Number(gs.playerTurnCount) >= 0
        ? Number(gs.playerTurnCount)
        : 0,
      consecutiveFails:
        Number.isFinite(Number(gs.consecutiveFails)) && Number(gs.consecutiveFails) >= 0
          ? Math.trunc(Number(gs.consecutiveFails))
          : 0,
      prologueComplete: gs.prologueComplete === true,
      turnSummaries: normalizeTurnSummaries(gs.turnSummaries),
      archivedEvents: normalizeArchivedEvents(gs.archivedEvents),
      eventIndex: normalizeEventIndex(gs.eventIndex),
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

/** @param {number} slotIndex */
function readSandboxSlotMeta(slotIndex) {
  try {
    const raw = localStorage.getItem(sandboxSlotKey(slotIndex))
    if (!raw) return emptySandboxSlotMeta()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return emptySandboxSlotMeta()
    const o = /** @type {Record<string, unknown>} */ (parsed)
    const gameState = normalizeSandboxGameFromRaw(o)
    const isEmpty = o.isEmpty === true || isSandboxStateEmpty(gameState)
    if (isEmpty) return emptySandboxSlotMeta()
    return {
      isEmpty: false,
      characterName:
        typeof o.characterName === 'string' && o.characterName.trim()
          ? o.characterName.trim()
          : gameState.character?.name?.trim() || '',
      worldName:
        typeof o.worldName === 'string' && o.worldName.trim()
          ? o.worldName.trim()
          : gameState.world?.name?.trim() || '',
      turnCount:
        typeof o.turnCount === 'number' && Number.isFinite(o.turnCount)
          ? o.turnCount
          : gameState.playerTurnCount ?? 0,
      lastPlayedAt: typeof o.lastPlayedAt === 'string' ? o.lastPlayedAt : '',
      gameState,
    }
  } catch {
    return emptySandboxSlotMeta()
  }
}

function readLegacySandboxFromMainKey() {
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY)
    if (!raw) return null
    const gs = normalizeSandboxGameFromRaw(JSON.parse(raw))
    if (isSandboxStateEmpty(gs)) return null
    return gs
  } catch {
    return null
  }
}

export function migrateLegacySandboxIfNeeded() {
  try {
    if (localStorage.getItem(SANDBOX_LEGACY_MIGRATED_KEY)) return
    if (!readSandboxSlotMeta(1).isEmpty) {
      localStorage.setItem(SANDBOX_LEGACY_MIGRATED_KEY, '1')
      return
    }
    const legacy = readLegacySandboxFromMainKey()
    if (legacy) saveSandboxSlot(1, legacy)
    localStorage.setItem(SANDBOX_LEGACY_MIGRATED_KEY, '1')
  } catch {
    /* */
  }
}

/** @returns {SandboxSlotMeta[]} */
export function listSandboxSlots() {
  migrateLegacySandboxIfNeeded()
  const out = []
  for (let i = 1; i <= SANDBOX_SLOT_COUNT; i++) out.push(readSandboxSlotMeta(i))
  return out
}

/** @param {number} slotIndex 1-based */
export function loadSandboxSlot(slotIndex) {
  migrateLegacySandboxIfNeeded()
  return readSandboxSlotMeta(slotIndex).gameState
}

/** @param {number} slotIndex 1-based @param {SandboxState} gameState */
export function saveSandboxSlot(slotIndex, gameState) {
  try {
    const meta = buildSandboxSlotMeta(gameState)
    localStorage.setItem(sandboxSlotKey(slotIndex), JSON.stringify(meta))
  } catch {
    /* quota */
  }
}

/** @param {number} slotIndex 1-based */
export function deleteSandboxSlot(slotIndex) {
  try {
    localStorage.setItem(sandboxSlotKey(slotIndex), JSON.stringify(emptySandboxSlotMeta()))
  } catch {
    /* */
  }
}

export function wipeSandboxSlots() {
  for (let i = 1; i <= SANDBOX_SLOT_COUNT; i++) deleteSandboxSlot(i)
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
      consecutiveFails:
        Number.isFinite(Number(parsed.consecutiveFails)) && Number(parsed.consecutiveFails) >= 0
          ? Math.trunc(Number(parsed.consecutiveFails))
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
        consecutiveFails: state.consecutiveFails ?? 0,
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
  wipeSandboxSlots()
}

/** @returns {SandboxState} */
export function resetSandboxState(slotIndex) {
  const s = defaultSandboxState()
  if (slotIndex) saveSandboxSlot(slotIndex, s)
  else saveSandboxState(s)
  return s
}

/** 保留角色与世界观，清空对局 */
export function resetSandboxStory(slotIndex) {
  const prev = slotIndex ? loadSandboxSlot(slotIndex) : loadSandboxState()
  const s = {
    ...defaultSandboxState(),
    character: prev.character,
    world: prev.world,
    prologueComplete: false,
  }
  if (slotIndex) saveSandboxSlot(slotIndex, s)
  else saveSandboxState(s)
  return s
}
