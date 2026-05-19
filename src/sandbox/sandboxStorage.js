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
/** @typedef {{
 *   id: string,
 *   name: string,
 *   identity: string,
 *   relationship: string,
 *   status: string,
 *   updatedAt: string,
 * }} SandboxNpcEntry */
/** @typedef {{ npcs: SandboxNpcEntry[] }} SandboxNpcArchive */
/** @typedef {'world' | 'npc' | 'location' | 'item' | 'quest'} SandboxFactCategory */
/** @typedef {{
 *   id: string,
 *   content: string,
 *   category: SandboxFactCategory,
 *   relatedNames: string[],
 *   createdAt: number,
 *   updatedAt: number,
 *   supersededBy: string | null,
 * }} SandboxFactEntry */
/** @typedef {{ facts: SandboxFactEntry[] }} SandboxFactDatabase */
/** @typedef {'story' | 'combat' | 'npc' | 'discovery' | 'quest'} SandboxTimelineCategory */
/** @typedef {{
 *   id: string,
 *   turn: number,
 *   title: string,
 *   description: string,
 *   category: SandboxTimelineCategory,
 *   relatedNames: string[],
 *   consequence: string,
 * }} SandboxTimelineEvent */
/** @typedef {{ events: SandboxTimelineEvent[] }} SandboxEventTimeline */
/** @typedef {'天气' | '时间' | '季节'} SandboxEnvironmentType */
/** @typedef {{
 *   id: string,
 *   name: string,
 *   status: string,
 *   updatedAt: number,
 * }} SandboxWorldLocation */
/** @typedef {{
 *   id: string,
 *   name: string,
 *   attitudeToPlayer: string,
 *   currentStatus: string,
 *   updatedAt: number,
 * }} SandboxWorldFaction */
/** @typedef {{
 *   type: SandboxEnvironmentType,
 *   value: string,
 *   updatedAt: number,
 * }} SandboxWorldEnvironment */
/** @typedef {{
 *   id: string,
 *   name: string,
 *   location: string,
 *   status: string,
 *   updatedAt: number,
 * }} SandboxWorldKeyItem */
/** @typedef {{
 *   locations: SandboxWorldLocation[],
 *   factions: SandboxWorldFaction[],
 *   environment: SandboxWorldEnvironment[],
 *   keyItems: SandboxWorldKeyItem[],
 * }} SandboxWorldState */
/** @typedef {'active' | 'completed' | 'failed'} SandboxQuestStatus */
/** @typedef {'main' | 'side'} SandboxQuestCategory */
/** @typedef {{
 *   id: string,
 *   description: string,
 *   completed: boolean,
 * }} SandboxQuestObjective */
/** @typedef {{
 *   id: string,
 *   title: string,
 *   description: string,
 *   status: SandboxQuestStatus,
 *   category: SandboxQuestCategory,
 *   givenBy: string,
 *   objectives: SandboxQuestObjective[],
 *   reward: string,
 *   createdAt: number,
 *   updatedAt: number,
 * }} SandboxQuestEntry */
/** @typedef {{ quests: SandboxQuestEntry[] }} SandboxQuestState */
/** @typedef {{
 *   turn: number,
 *   content: string,
 * }} SandboxNpcPlayerMemory */
/** @typedef {{
 *   turn: number,
 *   attitude: string,
 *   reason: string,
 * }} SandboxNpcAttitudeEntry */
/** @typedef {{
 *   id: string,
 *   name: string,
 *   memoriesOfPlayer: SandboxNpcPlayerMemory[],
 *   attitudeHistory: SandboxNpcAttitudeEntry[],
 * }} SandboxNpcMemoryNode */
/** @typedef {{
 *   id: string,
 *   from: string,
 *   to: string,
 *   relationship: string,
 *   updatedAt: number,
 * }} SandboxNpcMemoryEdge */
/** @typedef {{
 *   nodes: SandboxNpcMemoryNode[],
 *   edges: SandboxNpcMemoryEdge[],
 * }} SandboxNpcMemoryGraph */
/** @typedef {'active' | 'dead' | 'left'} SandboxCompanionStatus */
/** @typedef {{
 *   id: string,
 *   name: string,
 *   skills: SandboxSkills,
 *   hp: number,
 *   maxHp: number,
 *   mp: number,
 *   maxMp: number,
 *   status: SandboxCompanionStatus,
 * }} SandboxCompanion */
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
 *   eventIndex: number,
 *   companions: SandboxCompanion[],
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
    companions: [],
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
function normalizeCompanionSkills(raw) {
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
function normalizeCompanions(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue
    const o = /** @type {Record<string, unknown>} */ (e)
    const name = typeof o.name === 'string' ? o.name.trim().slice(0, 32) : ''
    if (!name) continue
    const id =
      typeof o.id === 'string' && o.id.trim()
        ? o.id.trim().slice(0, 64)
        : `companion_${Date.now()}`
    const skills = normalizeCompanionSkills(o.skills)
    const computed = computeHpMpFromSkills(skills)
    const hp = Number.parseInt(String(o.hp), 10)
    const maxHp = Number.parseInt(String(o.maxHp), 10)
    const mp = Number.parseInt(String(o.mp), 10)
    const maxMp = Number.parseInt(String(o.maxMp), 10)
    const statusRaw = typeof o.status === 'string' ? o.status : 'active'
    const status = /** @type {SandboxCompanionStatus} */ (
      ['active', 'dead', 'left'].includes(statusRaw) ? statusRaw : 'active'
    )
    out.push({
      id,
      name,
      skills,
      maxHp: Number.isFinite(maxHp) ? Math.min(999, Math.max(1, maxHp)) : computed.maxHp,
      maxMp: Number.isFinite(maxMp) ? Math.min(999, Math.max(1, maxMp)) : computed.maxMp,
      hp: Number.isFinite(hp) ? Math.min(999, Math.max(0, hp)) : computed.hp,
      mp: Number.isFinite(mp) ? Math.min(999, Math.max(0, mp)) : computed.mp,
      status,
    })
  }
  return out.slice(0, 32)
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

const NPC_ARCHIVE_FIELD = 'npc-archive'

/** @returns {SandboxNpcArchive} */
export function defaultNpcArchive() {
  return { npcs: [] }
}

/** @param {unknown} raw */
function normalizeNpcArchive(raw) {
  if (!raw || typeof raw !== 'object') return defaultNpcArchive()
  const o = /** @type {Record<string, unknown>} */ (raw)
  if (!Array.isArray(o.npcs)) return defaultNpcArchive()
  const npcs = []
  for (const e of o.npcs) {
    if (!e || typeof e !== 'object') continue
    const n = /** @type {Record<string, unknown>} */ (e)
    const name = typeof n.name === 'string' ? n.name.trim().slice(0, 32) : ''
    if (!name) continue
    const id = typeof n.id === 'string' && n.id.trim() ? n.id.trim().slice(0, 64) : `npc_${Date.now()}`
    npcs.push({
      id,
      name,
      identity: typeof n.identity === 'string' ? n.identity.trim().slice(0, 500) : '',
      relationship: typeof n.relationship === 'string' ? n.relationship.trim().slice(0, 500) : '',
      status: typeof n.status === 'string' ? n.status.trim().slice(0, 500) : '',
      updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : new Date().toISOString(),
    })
  }
  return { npcs: npcs.slice(0, 200) }
}

/** @param {number} slotIndex 1-based @returns {SandboxNpcArchive} */
export function loadNpcArchive(slotIndex) {
  const raw = readJsonKey(getSandboxSlotKey(slotIndex, NPC_ARCHIVE_FIELD))
  return normalizeNpcArchive(raw)
}

/** @param {number} slotIndex 1-based @param {SandboxNpcArchive} archive */
export function saveNpcArchive(slotIndex, archive) {
  writeJsonKey(getSandboxSlotKey(slotIndex, NPC_ARCHIVE_FIELD), normalizeNpcArchive(archive))
}

/** @param {number} slotIndex 1-based */
export function clearNpcArchive(slotIndex) {
  try {
    localStorage.removeItem(getSandboxSlotKey(slotIndex, NPC_ARCHIVE_FIELD))
  } catch {
    /* */
  }
}

const FACT_DATABASE_FIELD = 'fact-database'

/** @returns {SandboxFactDatabase} */
export function defaultFactDatabase() {
  return { facts: [] }
}

const FACT_CATEGORIES = ['world', 'npc', 'location', 'item', 'quest']

/** @param {unknown} raw */
function normalizeFactDatabase(raw) {
  if (!raw || typeof raw !== 'object') return defaultFactDatabase()
  const o = /** @type {Record<string, unknown>} */ (raw)
  if (!Array.isArray(o.facts)) return defaultFactDatabase()
  const facts = []
  for (const e of o.facts) {
    if (!e || typeof e !== 'object') continue
    const f = /** @type {Record<string, unknown>} */ (e)
    const content = typeof f.content === 'string' ? f.content.trim().slice(0, 1000) : ''
    if (!content) continue
    const id =
      typeof f.id === 'string' && f.id.trim() ? f.id.trim().slice(0, 64) : `fact_${Date.now()}`
    const catRaw = typeof f.category === 'string' ? f.category : 'world'
    const category = /** @type {SandboxFactCategory} */ (
      FACT_CATEGORIES.includes(catRaw) ? catRaw : 'world'
    )
    const relatedNames = []
    if (Array.isArray(f.relatedNames)) {
      for (const n of f.relatedNames) {
        if (typeof n === 'string' && n.trim()) relatedNames.push(n.trim().slice(0, 32))
      }
    }
    const createdAt = Number(f.createdAt)
    const updatedAt = Number(f.updatedAt)
    const supersededBy =
      typeof f.supersededBy === 'string' && f.supersededBy.trim()
        ? f.supersededBy.trim().slice(0, 64)
        : null
    facts.push({
      id,
      content,
      category,
      relatedNames: relatedNames.slice(0, 16),
      createdAt: Number.isFinite(createdAt) && createdAt >= 0 ? Math.trunc(createdAt) : 0,
      updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? Math.trunc(updatedAt) : 0,
      supersededBy,
    })
  }
  return { facts: facts.slice(0, 500) }
}

/** @param {number} slotIndex 1-based @returns {SandboxFactDatabase} */
export function loadFactDatabase(slotIndex) {
  const raw = readJsonKey(getSandboxSlotKey(slotIndex, FACT_DATABASE_FIELD))
  return normalizeFactDatabase(raw)
}

/** @param {number} slotIndex 1-based @param {SandboxFactDatabase} database */
export function saveFactDatabase(slotIndex, database) {
  writeJsonKey(getSandboxSlotKey(slotIndex, FACT_DATABASE_FIELD), normalizeFactDatabase(database))
}

/** @param {number} slotIndex 1-based @returns {SandboxFactEntry[]} */
export function getActiveFacts(slotIndex) {
  const db = loadFactDatabase(slotIndex)
  return db.facts.filter((f) => f.supersededBy == null)
}

/** @param {number} slotIndex 1-based */
export function clearFactDatabase(slotIndex) {
  try {
    localStorage.removeItem(getSandboxSlotKey(slotIndex, FACT_DATABASE_FIELD))
  } catch {
    /* */
  }
}

const EVENT_TIMELINE_FIELD = 'event-timeline'

/** @returns {SandboxEventTimeline} */
export function defaultEventTimeline() {
  return { events: [] }
}

const TIMELINE_CATEGORIES = ['story', 'combat', 'npc', 'discovery', 'quest']

/** @param {unknown} raw */
function normalizeEventTimeline(raw) {
  if (!raw || typeof raw !== 'object') return defaultEventTimeline()
  const o = /** @type {Record<string, unknown>} */ (raw)
  if (!Array.isArray(o.events)) return defaultEventTimeline()
  const events = []
  for (const e of o.events) {
    if (!e || typeof e !== 'object') continue
    const ev = /** @type {Record<string, unknown>} */ (e)
    const title = typeof ev.title === 'string' ? ev.title.trim().slice(0, 20) : ''
    const description = typeof ev.description === 'string' ? ev.description.trim().slice(0, 2000) : ''
    const consequence = typeof ev.consequence === 'string' ? ev.consequence.trim().slice(0, 500) : ''
    if (!title || !description) continue
    const id =
      typeof ev.id === 'string' && ev.id.trim() ? ev.id.trim().slice(0, 64) : `event_${Date.now()}`
    const catRaw = typeof ev.category === 'string' ? ev.category : 'story'
    const category = /** @type {SandboxTimelineCategory} */ (
      TIMELINE_CATEGORIES.includes(catRaw) ? catRaw : 'story'
    )
    const relatedNames = []
    if (Array.isArray(ev.relatedNames)) {
      for (const n of ev.relatedNames) {
        if (typeof n === 'string' && n.trim()) relatedNames.push(n.trim().slice(0, 32))
      }
    }
    const turn = Number(ev.turn)
    events.push({
      id,
      turn: Number.isFinite(turn) && turn >= 0 ? Math.trunc(turn) : 0,
      title,
      description,
      category,
      relatedNames: relatedNames.slice(0, 16),
      consequence,
    })
  }
  events.sort((a, b) => a.turn - b.turn || a.id.localeCompare(b.id))
  return { events: events.slice(0, 300) }
}

/** @param {number} slotIndex 1-based @returns {SandboxEventTimeline} */
export function loadEventTimeline(slotIndex) {
  const raw = readJsonKey(getSandboxSlotKey(slotIndex, EVENT_TIMELINE_FIELD))
  return normalizeEventTimeline(raw)
}

/** @param {number} slotIndex 1-based @param {SandboxEventTimeline} timeline */
export function saveEventTimeline(slotIndex, timeline) {
  writeJsonKey(getSandboxSlotKey(slotIndex, EVENT_TIMELINE_FIELD), normalizeEventTimeline(timeline))
}

/** @param {number} slotIndex 1-based */
export function clearEventTimeline(slotIndex) {
  try {
    localStorage.removeItem(getSandboxSlotKey(slotIndex, EVENT_TIMELINE_FIELD))
  } catch {
    /* */
  }
}

/** @param {SandboxTimelineEvent[]} events */
export function formatEventTimelineText(events) {
  if (!Array.isArray(events) || events.length === 0) return '（暂无记录）'
  return events
    .map(
      (e) =>
        `第${e.turn}轮 [${e.category}] ${e.title}：${e.description} → ${e.consequence || '无'}`,
    )
    .join('\n')
}

const WORLD_STATE_FIELD = 'world-state'

/** @returns {SandboxWorldState} */
export function defaultWorldState() {
  return { locations: [], factions: [], environment: [], keyItems: [] }
}

const ENV_TYPES = ['天气', '时间', '季节']

/** @param {unknown} raw */
function normalizeWorldState(raw) {
  if (!raw || typeof raw !== 'object') return defaultWorldState()
  const o = /** @type {Record<string, unknown>} */ (raw)
  const locations = []
  const factions = []
  const environment = []
  const keyItems = []

  if (Array.isArray(o.locations)) {
    for (const e of o.locations) {
      if (!e || typeof e !== 'object') continue
      const l = /** @type {Record<string, unknown>} */ (e)
      const name = typeof l.name === 'string' ? l.name.trim().slice(0, 32) : ''
      if (!name) continue
      const turn = Number(l.updatedAt)
      locations.push({
        id:
          typeof l.id === 'string' && l.id.trim()
            ? l.id.trim().slice(0, 64)
            : `loc_${Date.now()}`,
        name,
        status: typeof l.status === 'string' ? l.status.trim().slice(0, 500) : '',
        updatedAt: Number.isFinite(turn) && turn >= 0 ? Math.trunc(turn) : 0,
      })
    }
  }

  if (Array.isArray(o.factions)) {
    for (const e of o.factions) {
      if (!e || typeof e !== 'object') continue
      const f = /** @type {Record<string, unknown>} */ (e)
      const name = typeof f.name === 'string' ? f.name.trim().slice(0, 32) : ''
      if (!name) continue
      const turn = Number(f.updatedAt)
      factions.push({
        id:
          typeof f.id === 'string' && f.id.trim()
            ? f.id.trim().slice(0, 64)
            : `faction_${Date.now()}`,
        name,
        attitudeToPlayer:
          typeof f.attitudeToPlayer === 'string' ? f.attitudeToPlayer.trim().slice(0, 200) : '',
        currentStatus:
          typeof f.currentStatus === 'string' ? f.currentStatus.trim().slice(0, 500) : '',
        updatedAt: Number.isFinite(turn) && turn >= 0 ? Math.trunc(turn) : 0,
      })
    }
  }

  if (Array.isArray(o.environment)) {
    for (const e of o.environment) {
      if (!e || typeof e !== 'object') continue
      const env = /** @type {Record<string, unknown>} */ (e)
      const typeRaw = typeof env.type === 'string' ? env.type : '天气'
      const type = /** @type {SandboxEnvironmentType} */ (
        ENV_TYPES.includes(typeRaw) ? typeRaw : '天气'
      )
      const value = typeof env.value === 'string' ? env.value.trim().slice(0, 200) : ''
      if (!value) continue
      const turn = Number(env.updatedAt)
      environment.push({
        type,
        value,
        updatedAt: Number.isFinite(turn) && turn >= 0 ? Math.trunc(turn) : 0,
      })
    }
  }

  if (Array.isArray(o.keyItems)) {
    for (const e of o.keyItems) {
      if (!e || typeof e !== 'object') continue
      const i = /** @type {Record<string, unknown>} */ (e)
      const name = typeof i.name === 'string' ? i.name.trim().slice(0, 32) : ''
      if (!name) continue
      const turn = Number(i.updatedAt)
      keyItems.push({
        id:
          typeof i.id === 'string' && i.id.trim()
            ? i.id.trim().slice(0, 64)
            : `item_${Date.now()}`,
        name,
        location: typeof i.location === 'string' ? i.location.trim().slice(0, 200) : '',
        status: typeof i.status === 'string' ? i.status.trim().slice(0, 500) : '',
        updatedAt: Number.isFinite(turn) && turn >= 0 ? Math.trunc(turn) : 0,
      })
    }
  }

  return {
    locations: locations.slice(0, 100),
    factions: factions.slice(0, 50),
    environment: environment.slice(0, 10),
    keyItems: keyItems.slice(0, 100),
  }
}

/** @param {number} slotIndex 1-based @returns {SandboxWorldState} */
export function loadWorldState(slotIndex) {
  const raw = readJsonKey(getSandboxSlotKey(slotIndex, WORLD_STATE_FIELD))
  return normalizeWorldState(raw)
}

/** @param {number} slotIndex 1-based @param {SandboxWorldState} worldState */
export function saveWorldState(slotIndex, worldState) {
  writeJsonKey(getSandboxSlotKey(slotIndex, WORLD_STATE_FIELD), normalizeWorldState(worldState))
}

/** @param {number} slotIndex 1-based */
export function clearWorldState(slotIndex) {
  try {
    localStorage.removeItem(getSandboxSlotKey(slotIndex, WORLD_STATE_FIELD))
  } catch {
    /* */
  }
}

/** @param {SandboxWorldState} worldState */
export function formatWorldStateText(worldState) {
  const ws = normalizeWorldState(worldState)
  const factions =
    ws.factions.map((f) => `${f.name}(${f.attitudeToPlayer}·${f.currentStatus})`).join('、') ||
    '暂无'
  const locations = ws.locations.map((l) => `${l.name}(${l.status})`).join('、') || '暂无'
  const environment =
    ws.environment.map((e) => `${e.type}:${e.value}`).join('、') || '暂无'
  const keyItems =
    ws.keyItems.map((i) => `${i.name}·${i.location}·${i.status}`).join('、') || '暂无'
  return `势力：${factions}\n地点：${locations}\n环境：${environment}\n关键物品：${keyItems}`
}

const QUEST_STATE_FIELD = 'quest-state'

/** @returns {SandboxQuestState} */
export function defaultQuestState() {
  return { quests: [] }
}

/** @param {unknown} raw @returns {SandboxQuestState} */
function normalizeQuestState(raw) {
  if (!raw || typeof raw !== 'object') return defaultQuestState()
  const o = /** @type {Record<string, unknown>} */ (raw)
  const quests = []
  const statuses = ['active', 'completed', 'failed']
  const categories = ['main', 'side']

  if (Array.isArray(o.quests)) {
    for (const e of o.quests) {
      if (!e || typeof e !== 'object') continue
      const q = /** @type {Record<string, unknown>} */ (e)
      const title = typeof q.title === 'string' ? q.title.trim().slice(0, 64) : ''
      if (!title) continue
      const statusRaw = typeof q.status === 'string' ? q.status : 'active'
      const status = /** @type {SandboxQuestStatus} */ (
        statuses.includes(statusRaw) ? statusRaw : 'active'
      )
      const categoryRaw = typeof q.category === 'string' ? q.category : 'side'
      const category = /** @type {SandboxQuestCategory} */ (
        categories.includes(categoryRaw) ? categoryRaw : 'side'
      )
      const createdAt = Number(q.createdAt)
      const updatedAt = Number(q.updatedAt)
      const objectives = []
      if (Array.isArray(q.objectives)) {
        for (let i = 0; i < q.objectives.length; i++) {
          const ob = q.objectives[i]
          if (!ob || typeof ob !== 'object') continue
          const obj = /** @type {Record<string, unknown>} */ (ob)
          const desc =
            typeof obj.description === 'string' ? obj.description.trim().slice(0, 500) : ''
          if (!desc) continue
          objectives.push({
            id:
              typeof obj.id === 'string' && obj.id.trim()
                ? obj.id.trim().slice(0, 64)
                : `obj_${Date.now()}_${i}`,
            description: desc,
            completed: obj.completed === true,
          })
        }
      }
      quests.push({
        id:
          typeof q.id === 'string' && q.id.trim()
            ? q.id.trim().slice(0, 64)
            : `quest_${Date.now()}`,
        title,
        description:
          typeof q.description === 'string' ? q.description.trim().slice(0, 2000) : '',
        status,
        category,
        givenBy: typeof q.givenBy === 'string' ? q.givenBy.trim().slice(0, 64) : '',
        objectives: objectives.slice(0, 32),
        reward: typeof q.reward === 'string' ? q.reward.trim().slice(0, 500) : '',
        createdAt: Number.isFinite(createdAt) && createdAt >= 0 ? Math.trunc(createdAt) : 0,
        updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? Math.trunc(updatedAt) : 0,
      })
    }
  }

  return { quests: quests.slice(0, 100) }
}

/** @param {number} slotIndex 1-based @returns {SandboxQuestState} */
export function loadQuestState(slotIndex) {
  const raw = readJsonKey(getSandboxSlotKey(slotIndex, QUEST_STATE_FIELD))
  return normalizeQuestState(raw)
}

/** @param {number} slotIndex 1-based @param {SandboxQuestState} questState */
export function saveQuestState(slotIndex, questState) {
  writeJsonKey(getSandboxSlotKey(slotIndex, QUEST_STATE_FIELD), normalizeQuestState(questState))
}

/** @param {number} slotIndex 1-based */
export function clearQuestState(slotIndex) {
  try {
    localStorage.removeItem(getSandboxSlotKey(slotIndex, QUEST_STATE_FIELD))
  } catch {
    /* */
  }
}

/** @param {SandboxQuestState} questState */
export function formatQuestStateText(questState) {
  const qs = normalizeQuestState(questState)
  const statusLabel = (/** @type {SandboxQuestEntry} */ q) => {
    if (q.status === 'completed') return '已完成'
    if (q.status === 'failed') return '已失败'
    return '进行中'
  }
  const main =
    qs.quests
      .filter((q) => q.category === 'main')
      .map((q) => `${q.title}(${statusLabel(q)})`)
      .join('、') || '无'
  const side =
    qs.quests
      .filter((q) => q.category === 'side')
      .map((q) => `${q.title}(${statusLabel(q)})`)
      .join('、') || '无'
  return `主线任务：${main}\n支线任务：${side}`
}

const NPC_MEMORY_GRAPH_FIELD = 'npc-memory-graph'

/** @returns {SandboxNpcMemoryGraph} */
export function defaultNpcMemoryGraph() {
  return { nodes: [], edges: [] }
}

/** @param {unknown} raw @returns {SandboxNpcMemoryGraph} */
function normalizeNpcMemoryGraph(raw) {
  if (!raw || typeof raw !== 'object') return defaultNpcMemoryGraph()
  const o = /** @type {Record<string, unknown>} */ (raw)
  const nodes = []
  const edges = []

  if (Array.isArray(o.nodes)) {
    for (const e of o.nodes) {
      if (!e || typeof e !== 'object') continue
      const n = /** @type {Record<string, unknown>} */ (e)
      const id = typeof n.id === 'string' && n.id.trim() ? n.id.trim().slice(0, 64) : ''
      const name = typeof n.name === 'string' ? n.name.trim().slice(0, 32) : ''
      if (!id || !name) continue

      const memoriesOfPlayer = []
      if (Array.isArray(n.memoriesOfPlayer)) {
        for (const m of n.memoriesOfPlayer) {
          if (!m || typeof m !== 'object') continue
          const mem = /** @type {Record<string, unknown>} */ (m)
          const content = typeof mem.content === 'string' ? mem.content.trim().slice(0, 500) : ''
          if (!content) continue
          const turn = Number(mem.turn)
          memoriesOfPlayer.push({
            turn: Number.isFinite(turn) && turn >= 0 ? Math.trunc(turn) : 0,
            content,
          })
        }
      }

      const attitudeHistory = []
      if (Array.isArray(n.attitudeHistory)) {
        for (const a of n.attitudeHistory) {
          if (!a || typeof a !== 'object') continue
          const att = /** @type {Record<string, unknown>} */ (a)
          const attitude = typeof att.attitude === 'string' ? att.attitude.trim().slice(0, 200) : ''
          if (!attitude) continue
          const turn = Number(att.turn)
          attitudeHistory.push({
            turn: Number.isFinite(turn) && turn >= 0 ? Math.trunc(turn) : 0,
            attitude,
            reason: typeof att.reason === 'string' ? att.reason.trim().slice(0, 500) : '',
          })
        }
      }

      nodes.push({
        id,
        name,
        memoriesOfPlayer: memoriesOfPlayer.slice(-200),
        attitudeHistory: attitudeHistory.slice(-100),
      })
    }
  }

  if (Array.isArray(o.edges)) {
    for (const e of o.edges) {
      if (!e || typeof e !== 'object') continue
      const edge = /** @type {Record<string, unknown>} */ (e)
      const from = typeof edge.from === 'string' ? edge.from.trim().slice(0, 64) : ''
      const to = typeof edge.to === 'string' ? edge.to.trim().slice(0, 64) : ''
      const relationship =
        typeof edge.relationship === 'string' ? edge.relationship.trim().slice(0, 500) : ''
      if (!from || !to || !relationship) continue
      const updatedAt = Number(edge.updatedAt)
      edges.push({
        id:
          typeof edge.id === 'string' && edge.id.trim()
            ? edge.id.trim().slice(0, 64)
            : `edge_${Date.now()}`,
        from,
        to,
        relationship,
        updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? Math.trunc(updatedAt) : 0,
      })
    }
  }

  return { nodes: nodes.slice(0, 200), edges: edges.slice(0, 500) }
}

/** @param {number} slotIndex 1-based @returns {SandboxNpcMemoryGraph} */
export function loadNpcMemoryGraph(slotIndex) {
  const raw = readJsonKey(getSandboxSlotKey(slotIndex, NPC_MEMORY_GRAPH_FIELD))
  return normalizeNpcMemoryGraph(raw)
}

/** @param {number} slotIndex 1-based @param {SandboxNpcMemoryGraph} graph */
export function saveNpcMemoryGraph(slotIndex, graph) {
  writeJsonKey(getSandboxSlotKey(slotIndex, NPC_MEMORY_GRAPH_FIELD), normalizeNpcMemoryGraph(graph))
}

/** @param {number} slotIndex 1-based */
export function clearNpcMemoryGraph(slotIndex) {
  try {
    localStorage.removeItem(getSandboxSlotKey(slotIndex, NPC_MEMORY_GRAPH_FIELD))
  } catch {
    /* */
  }
}

/** @param {SandboxNpcMemoryGraph} graph */
export function formatNpcMemoryGraphText(graph) {
  const g = normalizeNpcMemoryGraph(graph)
  if (g.nodes.length === 0 && g.edges.length === 0) return ''

  const nodeLines = g.nodes.map((node) => {
    const currentAttitude = node.attitudeHistory[node.attitudeHistory.length - 1]
    const memories = node.memoriesOfPlayer.map((m) => m.content).join('；') || '无'
    return `${node.name}（${currentAttitude?.attitude || '未知'}）：${memories}`
  })

  const edgeLines = g.edges.map((e) => {
    const fromNode = g.nodes.find((n) => n.id === e.from)
    const toNode = g.nodes.find((n) => n.id === e.to)
    return `${fromNode?.name ?? e.from} ↔ ${toNode?.name ?? e.to}：${e.relationship}`
  })

  const parts = []
  if (nodeLines.length) parts.push(`关键NPC记忆：\n${nodeLines.join('\n')}`)
  if (edgeLines.length) parts.push(`NPC关系网络：\n${edgeLines.join('\n')}`)
  return parts.join('\n')
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
  'companions',
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
  clearNpcArchive(slotIndex)
  clearFactDatabase(slotIndex)
  clearEventTimeline(slotIndex)
  clearWorldState(slotIndex)
  clearQuestState(slotIndex)
  clearNpcMemoryGraph(slotIndex)
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
    companions: normalizeCompanions(readJsonKey(getSandboxSlotKey(slotIndex, 'companions'))),
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
  writeJsonKey(getSandboxSlotKey(slotIndex, 'companions'), gs.companions ?? [])

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
    companions: [],
  }
  saveSandboxSlot(slotIndex, s)
  clearNpcArchive(slotIndex)
  clearFactDatabase(slotIndex)
  clearEventTimeline(slotIndex)
  return s
}
