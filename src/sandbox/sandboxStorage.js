import { exportCocSlot, importCocSlot } from '../storage.js'
import { SANDBOX_SKILL_NAMES } from './config/sandbox_judge_prompt.js'
import { clearCustomWorldbook } from '../worldbook/worldbookStorage.js'
import {
  migrateSandboxState,
  migrateNpcArchive,
  migrateFactDatabase,
  migrateEventTimeline,
  migrateWorldState,
} from './sandboxMigration.js'

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
 *   appearance: string,
 *   personality: string,
 *   secret: string,
 *   relationship: string,
 *   relationStrength: number,
 *   status: string,
 *   isDead: boolean,
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
 *   importance: number,
 *   confidence: 'high' | 'medium' | 'low',
 *   sourceTurn: number,
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
 *   importance: number,
 *   tags: string[],
 * }} SandboxTimelineEvent */
/** @typedef {{ events: SandboxTimelineEvent[] }} SandboxEventTimeline */
/** @typedef {{
 *   id: string,
 *   name: string,
 *   status: string,
 *   dangerLevel: number,
 *   controlledBy: string,
 *   isAccessible: boolean,
 *   accessNote: string,
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
 *   weather: string,
 *   timeOfDay: string,
 *   season: string,
 *   dayCount: number,
 * }} SandboxWorldEnvironment */

/** @typedef {{
 *   priceLevel: number,
 *   currency: string,
 *   marketNote: string,
 * }} SandboxWorldEconomy */

/** @typedef {{
 *   locations: SandboxWorldLocation[],
 *   factions: SandboxWorldFaction[],
 *   environment: SandboxWorldEnvironment,
 *   economy: SandboxWorldEconomy,
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
 *   name: string,
 *   description: string,
 *   quantity?: number,
 * }} SandboxInventoryItem */
/** @typedef {{
 *   equipped: SandboxInventoryItem[],
 *   carried: SandboxInventoryItem[],
 * }} SandboxPlayerInventory */
/** @typedef {{
 *   id: string,
 *   name: string,
 *   role: string,
 *   background: string,
 *   personality: string,
 *   appearance: string,
 *   skills: SandboxSkills,
 *   hp: number,
 *   maxHp: number,
 *   mp: number,
 *   maxMp: number,
 *   loyalty: number,
 *   control: number,
 *   goal: string,
 *   status: SandboxCompanionStatus,
 *   isDead: boolean,
 *   isDeparted: boolean,
 *   equipped: SandboxInventoryItem[],
 *   carried: SandboxInventoryItem[],
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
 *   playerInventory: SandboxPlayerInventory,
 *   __version?: number,
 * }} SandboxState
 */

/** @returns {SandboxPlayerInventory} */
export function defaultPlayerInventory() {
  return { equipped: [], carried: [] }
}

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
    playerInventory: defaultPlayerInventory(),
  }
}

/** @param {unknown} raw @returns {SandboxInventoryItem[]} */
export function normalizeInventoryItems(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue
    const o = /** @type {Record<string, unknown>} */ (e)
    const name = typeof o.name === 'string' ? o.name.trim().slice(0, 64) : ''
    if (!name) continue
    const qty = Number(o.quantity)
    const item = {
      name,
      description: typeof o.description === 'string' ? o.description.trim().slice(0, 200) : '',
    }
    if (Number.isFinite(qty) && qty > 1) item.quantity = Math.min(999, Math.trunc(qty))
    out.push(item)
  }
  return out.slice(0, 64)
}

/** @param {unknown} raw @returns {SandboxPlayerInventory} */
export function normalizePlayerInventory(raw) {
  if (!raw || typeof raw !== 'object') return defaultPlayerInventory()
  const o = /** @type {Record<string, unknown>} */ (raw)
  return {
    equipped: normalizeInventoryItems(o.equipped),
    carried: normalizeInventoryItems(o.carried),
  }
}

/** @param {SandboxPlayerInventory} inv */
export function inventoryToLegacyItemNames(inv) {
  const names = []
  for (const item of inv.carried) {
    if (!item.name) continue
    names.push(item.quantity && item.quantity > 1 ? `${item.name}x${item.quantity}` : item.name)
  }
  return names.slice(0, 48)
}

/** @param {SandboxCharacter | null} character @param {unknown} existingInv */
export function resolvePlayerInventory(character, existingInv) {
  const normalized = normalizePlayerInventory(existingInv)
  if (normalized.equipped.length > 0 || normalized.carried.length > 0) return normalized
  if (!character) return defaultPlayerInventory()
  return {
    equipped: [],
    carried: normalizeItemList(character.items).map((name) => ({
      name,
      description: '',
      quantity: 1,
    })),
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
export function normalizeCompanionSkills(raw) {
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
function normalizeRelationStrength(raw) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 3
  return Math.min(5, Math.max(1, Math.round(raw)))
}

/** @param {unknown} raw */
function normalizeCompanionLoyalty(raw) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 3
  return Math.min(5, Math.max(1, Math.round(raw)))
}

/** @param {unknown} raw */
function normalizeCompanionControl(raw) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  return Math.min(5, Math.max(0, Math.round(raw)))
}

/** @param {SandboxCompanion} c */
export function applyCompanionDefaults(c) {
  const status = c.status ?? 'active'
  const isDead = c.isDead === true || status === 'dead'
  const isDeparted = c.isDeparted === true || status === 'left'
  return {
    background: '',
    personality: '',
    appearance: '',
    loyalty: 3,
    control: 0,
    goal: '',
    isDead: false,
    isDeparted: false,
    role: '',
    equipped: [],
    carried: [],
    ...c,
    isDead,
    isDeparted,
    status: isDead ? 'dead' : isDeparted ? 'left' : status === 'left' ? 'left' : status,
    loyalty: normalizeCompanionLoyalty(c.loyalty),
    control: normalizeCompanionControl(c.control),
  }
}

/** @param {unknown} raw */
export function normalizeCompanions(raw) {
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
    const statusNorm = statusRaw === 'departed' ? 'left' : statusRaw
    const isDead = o.isDead === true || statusNorm === 'dead'
    const isDeparted = o.isDeparted === true || statusNorm === 'left'
    const status = /** @type {SandboxCompanionStatus} */ (
      isDead ? 'dead' : isDeparted ? 'left' : ['active', 'dead', 'left'].includes(statusNorm) ? statusNorm : 'active'
    )
    const role = typeof o.role === 'string' ? o.role.trim().slice(0, 50) : ''
    out.push(
      applyCompanionDefaults({
        id,
        name,
        role,
        background: typeof o.background === 'string' ? o.background.trim().slice(0, 300) : '',
        personality: typeof o.personality === 'string' ? o.personality.trim().slice(0, 200) : '',
        appearance: typeof o.appearance === 'string' ? o.appearance.trim().slice(0, 200) : '',
        skills,
        maxHp: Number.isFinite(maxHp) ? Math.min(999, Math.max(1, maxHp)) : computed.maxHp,
        maxMp: Number.isFinite(maxMp) ? Math.min(999, Math.max(1, maxMp)) : computed.maxMp,
        hp: Number.isFinite(hp) ? Math.min(999, Math.max(0, hp)) : computed.hp,
        mp: Number.isFinite(mp) ? Math.min(999, Math.max(0, mp)) : computed.mp,
        loyalty: normalizeCompanionLoyalty(o.loyalty),
        control: normalizeCompanionControl(o.control),
        goal: typeof o.goal === 'string' ? o.goal.trim().slice(0, 200) : '',
        status,
        isDead,
        isDeparted,
        equipped: normalizeInventoryItems(o.equipped),
        carried: normalizeInventoryItems(o.carried),
      }),
    )
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
    const isDead = n.isDead === true
    npcs.push({
      id,
      name,
      identity: typeof n.identity === 'string' ? n.identity.trim().slice(0, 500) : '',
      appearance: typeof n.appearance === 'string' ? n.appearance.trim().slice(0, 200) : '',
      personality: typeof n.personality === 'string' ? n.personality.trim().slice(0, 200) : '',
      secret: typeof n.secret === 'string' ? n.secret.trim().slice(0, 200) : '',
      relationship: typeof n.relationship === 'string' ? n.relationship.trim().slice(0, 500) : '',
      relationStrength: normalizeRelationStrength(n.relationStrength),
      status: typeof n.status === 'string' ? n.status.trim().slice(0, 500) : '',
      isDead,
      updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : new Date().toISOString(),
    })
  }
  return { npcs: npcs.slice(0, 200) }
}

/** @param {number} slotIndex 1-based @returns {SandboxNpcArchive} */
export function loadNpcArchive(slotIndex) {
  const raw = readJsonKey(getSandboxSlotKey(slotIndex, NPC_ARCHIVE_FIELD))
  return migrateNpcArchive(normalizeNpcArchive(raw))
}

/** @param {number} slotIndex 1-based @param {SandboxNpcArchive} archive */
export function saveNpcArchive(slotIndex, archive) {
  writeJsonKey(getSandboxSlotKey(slotIndex, NPC_ARCHIVE_FIELD), normalizeNpcArchive(archive))
}

/** @param {SandboxNpcEntry} n */
export function applyNpcArchiveDefaults(n) {
  return {
    appearance: '',
    personality: '',
    secret: '',
    relationStrength: 3,
    isDead: false,
    ...n,
    isDead: n.isDead === true,
    relationStrength: normalizeRelationStrength(n.relationStrength),
  }
}

/** @param {SandboxNpcEntry} n */
export function formatNpcArchiveInjectLine(n) {
  const npc = applyNpcArchiveDefaults(n)
  return `[${npc.id}] ${npc.name}${npc.isDead ? '【已死亡】' : ''}
  身份：${npc.identity}
  外貌：${npc.appearance || '未知'}
  性格：${npc.personality || '未知'}
  关系：${npc.relationship}（强度${npc.relationStrength}/5）
  秘密：${npc.secret || '无'}
  状态：${npc.status}`
}

/** @param {SandboxCompanion} c */
export function formatCompanionArchiveInjectLine(c) {
  const comp = applyCompanionDefaults(c)
  const flag = comp.isDead ? '【已死亡】' : comp.isDeparted ? '【已离队】' : ''
  return `${comp.name}${flag}
  定位：${comp.role} | 忠诚度：${comp.loyalty}/5 | 控制度：${comp.control}/5
  目标：${comp.goal || '无'}
  背景：${comp.background || '未知'}
  性格：${comp.personality || '未知'}`
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
    const impRaw = Number(f.importance)
    const importance =
      Number.isFinite(impRaw) && impRaw >= 1 && impRaw <= 5 ? Math.round(impRaw) : 3
    const confRaw = f.confidence
    const confidence =
      confRaw === 'high' || confRaw === 'medium' || confRaw === 'low' ? confRaw : 'medium'
    const stRaw = Number(f.sourceTurn)
    const sourceTurn = Number.isFinite(stRaw) && stRaw >= 0 ? Math.trunc(stRaw) : 0
    facts.push({
      id,
      content,
      category,
      relatedNames: relatedNames.slice(0, 16),
      createdAt: Number.isFinite(createdAt) && createdAt >= 0 ? Math.trunc(createdAt) : 0,
      updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? Math.trunc(updatedAt) : 0,
      supersededBy,
      importance,
      confidence,
      sourceTurn,
    })
  }
  return { facts: facts.slice(0, 500) }
}

/** @param {number} slotIndex 1-based @returns {SandboxFactDatabase} */
export function loadFactDatabase(slotIndex) {
  const raw = readJsonKey(getSandboxSlotKey(slotIndex, FACT_DATABASE_FIELD))
  return migrateFactDatabase(normalizeFactDatabase(raw))
}

/** @param {number} slotIndex 1-based @param {SandboxFactDatabase} database */
export function saveFactDatabase(slotIndex, database) {
  writeJsonKey(getSandboxSlotKey(slotIndex, FACT_DATABASE_FIELD), normalizeFactDatabase(database))
}

/**
 * 获取有效事实列表，过滤低置信度和超期低权重事实，按重要性排序，上限50条
 * @param {number} slotIndex
 * @param {number} [currentTurn]
 * @returns {SandboxFactEntry[]}
 */
export function getActiveFacts(slotIndex, currentTurn = 9999) {
  const db = loadFactDatabase(slotIndex)
  const active = db.facts.filter((f) => {
    if (f.supersededBy) return false
    if (f.confidence === 'low') return false
    const age = currentTurn - (f.sourceTurn ?? 0)
    if (age > 30 && (f.importance ?? 3) < 3) return false
    return true
  })
  active.sort((a, b) => (b.importance ?? 3) - (a.importance ?? 3))
  return active.slice(0, 50)
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

const TIMELINE_VALID_TAGS = [
  'death',
  'boss',
  'turning_point',
  'first_meet',
  'betrayal',
  'discovery',
  'quest_complete',
]

/** @param {unknown} rawTags */
function normalizeTimelineTags(rawTags) {
  if (!Array.isArray(rawTags)) return []
  return rawTags
    .filter((t) => typeof t === 'string' && TIMELINE_VALID_TAGS.includes(t))
    .slice(0, 5)
}

/** @param {unknown} raw */
function normalizeTimelineImportance(raw) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 3
  return Math.min(5, Math.max(1, Math.round(raw)))
}

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
      importance: normalizeTimelineImportance(ev.importance),
      tags: normalizeTimelineTags(ev.tags),
    })
  }
  events.sort((a, b) => a.turn - b.turn || a.id.localeCompare(b.id))
  return { events: events.slice(0, 300) }
}

/** @param {number} slotIndex 1-based @returns {SandboxEventTimeline} */
export function loadEventTimeline(slotIndex) {
  const raw = readJsonKey(getSandboxSlotKey(slotIndex, EVENT_TIMELINE_FIELD))
  return migrateEventTimeline(normalizeEventTimeline(raw))
}

/** @param {number} slotIndex 1-based @param {SandboxEventTimeline} timeline */
export function saveEventTimeline(slotIndex, timeline) {
  writeJsonKey(getSandboxSlotKey(slotIndex, EVENT_TIMELINE_FIELD), normalizeEventTimeline(timeline))
}

/**
 * 获取注入 GM / 提取 prompt 用的时间线事件列表。
 * importance>=4 永久保留，其余取最近 10 条，合并去重按 turn 排序，上限 20 条。
 * @param {number} slotIndex 1-based
 * @returns {SandboxTimelineEvent[]}
 */
export function getInjectableTimeline(slotIndex) {
  const timeline = loadEventTimeline(slotIndex)
  const all = timeline.events ?? []

  const normalized = all.map((e) => ({
    importance: 3,
    tags: [],
    ...e,
  }))

  const pinned = normalized.filter((e) => (e.importance ?? 3) >= 4)
  const rest = normalized.filter((e) => (e.importance ?? 3) < 4).slice(-10)

  const merged = [...pinned, ...rest]
  const deduped = Array.from(new Map(merged.map((e) => [e.id, e])).values())
  deduped.sort((a, b) => a.turn - b.turn)
  return deduped.slice(-20)
}

/** @param {SandboxTimelineEvent} e */
export function formatTimelineEventInjectLine(e) {
  const imp = e.importance ?? 3
  const tags = (e.tags ?? []).join(',') || '无'
  return `[turn:${e.turn}] [importance:${imp}] [tags:${tags}] ${e.category}: ${e.title} - ${e.description}`
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

/** @returns {SandboxWorldEnvironment} */
export function defaultWorldEnvironment() {
  return { weather: '晴', timeOfDay: '正午', season: '春', dayCount: 1 }
}

/** @returns {SandboxWorldEconomy} */
export function defaultWorldEconomy() {
  return { priceLevel: 3, currency: '金币', marketNote: '' }
}

/** @returns {SandboxWorldState} */
export function defaultWorldState() {
  return {
    locations: [],
    factions: [],
    environment: defaultWorldEnvironment(),
    economy: defaultWorldEconomy(),
  }
}

/** @param {unknown} raw */
function normalizeDangerLevel(raw) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 2
  return Math.min(5, Math.max(1, Math.round(raw)))
}

/** @param {unknown} raw */
function normalizePriceLevel(raw) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 3
  return Math.min(5, Math.max(1, Math.round(raw)))
}

/** @param {unknown} rawEnv */
function normalizeEnvironmentObject(rawEnv) {
  const o =
    rawEnv && typeof rawEnv === 'object' && !Array.isArray(rawEnv)
      ? /** @type {Record<string, unknown>} */ (rawEnv)
      : {}
  const day = Number(o.dayCount)
  return {
    weather:
      typeof o.weather === 'string' && o.weather.trim()
        ? o.weather.trim().slice(0, 50)
        : '晴',
    timeOfDay:
      typeof o.timeOfDay === 'string' && o.timeOfDay.trim()
        ? o.timeOfDay.trim().slice(0, 20)
        : '正午',
    season:
      typeof o.season === 'string' && o.season.trim() ? o.season.trim().slice(0, 10) : '春',
    dayCount: Number.isFinite(day) && day >= 1 ? Math.trunc(day) : 1,
  }
}

/** @param {unknown} rawEco */
function normalizeEconomyObject(rawEco) {
  const o =
    rawEco && typeof rawEco === 'object' && !Array.isArray(rawEco)
      ? /** @type {Record<string, unknown>} */ (rawEco)
      : {}
  return {
    priceLevel: normalizePriceLevel(o.priceLevel),
    currency:
      typeof o.currency === 'string' && o.currency.trim()
        ? o.currency.trim().slice(0, 20)
        : '金币',
    marketNote:
      typeof o.marketNote === 'string' ? o.marketNote.trim().slice(0, 100) : '',
  }
}

/** @param {unknown} rawEnvArray */
function migrateEnvironmentArray(rawEnvArray) {
  const arr = Array.isArray(rawEnvArray) ? rawEnvArray : []
  const findVal = (/** @type {string} */ type) => {
    for (const e of arr) {
      if (!e || typeof e !== 'object') continue
      const item = /** @type {Record<string, unknown>} */ (e)
      if (item.type === type && typeof item.value === 'string' && item.value.trim()) {
        return item.value.trim().slice(0, 50)
      }
    }
    return null
  }
  return {
    weather: findVal('天气') ?? '晴',
    timeOfDay: findVal('时间') ?? '正午',
    season: findVal('季节') ?? '春',
    dayCount: 1,
  }
}

/** @param {SandboxWorldState} state */
export function applyWorldStateDefaults(state) {
  let environment = state.environment
  if (Array.isArray(environment)) {
    environment = migrateEnvironmentArray(environment)
  }
  environment = {
    weather: '晴',
    timeOfDay: '正午',
    season: '春',
    dayCount: 1,
    ...normalizeEnvironmentObject(environment),
  }

  const economy = {
    priceLevel: 3,
    currency: '金币',
    marketNote: '',
    ...normalizeEconomyObject(state.economy),
  }

  const locations = (state.locations ?? []).map((loc) => ({
    dangerLevel: 2,
    controlledBy: '',
    isAccessible: true,
    accessNote: '',
    ...loc,
    dangerLevel: normalizeDangerLevel(loc.dangerLevel),
    controlledBy:
      typeof loc.controlledBy === 'string' ? loc.controlledBy.trim().slice(0, 50) : '',
    isAccessible: loc.isAccessible !== false,
    accessNote: typeof loc.accessNote === 'string' ? loc.accessNote.trim().slice(0, 100) : '',
  }))

  return {
    locations,
    factions: state.factions ?? [],
    environment,
    economy,
  }
}

/** @param {unknown} raw */
function normalizeWorldState(raw) {
  if (!raw || typeof raw !== 'object') return defaultWorldState()
  const o = /** @type {Record<string, unknown>} */ (raw)
  const locations = []
  const factions = []

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
        dangerLevel: normalizeDangerLevel(l.dangerLevel),
        controlledBy:
          typeof l.controlledBy === 'string' ? l.controlledBy.trim().slice(0, 50) : '',
        isAccessible: l.isAccessible !== false,
        accessNote: typeof l.accessNote === 'string' ? l.accessNote.trim().slice(0, 100) : '',
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

  let environment = defaultWorldEnvironment()
  if (Array.isArray(o.environment)) {
    environment = migrateEnvironmentArray(o.environment)
  } else if (o.environment != null && typeof o.environment === 'object') {
    environment = normalizeEnvironmentObject(o.environment)
  }

  const economy = normalizeEconomyObject(o.economy)

  return applyWorldStateDefaults({
    locations: locations.slice(0, 100),
    factions: factions.slice(0, 50),
    environment,
    economy,
  })
}

/** @param {number} slotIndex 1-based @returns {SandboxWorldState} */
export function loadWorldState(slotIndex) {
  const raw = readJsonKey(getSandboxSlotKey(slotIndex, WORLD_STATE_FIELD))
  return migrateWorldState(normalizeWorldState(raw))
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
  const locations =
    ws.locations
      .map(
        (l) =>
          `${l.name}${l.isAccessible ? '' : '[封锁]'} 危险${l.dangerLevel}/5 ${l.controlledBy || '无主'} ${l.status}`,
      )
      .join('、') || '暂无'
  const env = ws.environment
  const environment = `第${env.dayCount}天 ${env.season} ${env.timeOfDay} ${env.weather}`
  const eco = ws.economy
  const economy = `物价${eco.priceLevel}/5 ${eco.currency} ${eco.marketNote || '市场正常'}`
  return `势力：${factions}\n地点：${locations}\n环境：${environment}\n经济：${economy}`
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
  try {
    localStorage.removeItem(getSandboxSlotKey(slotIndex, 'player-inventory'))
  } catch {
    /* */
  }
  for (const legacy of LEGACY_SANDBOX_STORAGE_SUFFIXES) {
    try {
      localStorage.removeItem(getSandboxSlotKey(slotIndex, legacy))
    } catch {
      /* */
    }
  }
  clearUndoSnapshot(slotIndex)
  clearCustomWorldbook(slotIndex)
}

/** 已移除的地图 / 世界记忆模块遗留 localStorage 字段 */
const LEGACY_SANDBOX_STORAGE_SUFFIXES = [
  'map-state',
  'world-memory-global-events',
  'world-memory-local-events',
  'world-memory-locations',
  'world-memory-location-profiles',
]

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
  const character = normalizeCharacter(readJsonKey(getSandboxSlotKey(slotIndex, 'character')))

  return {
    character,
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
    playerInventory: resolvePlayerInventory(
      character,
      readJsonKey(getSandboxSlotKey(slotIndex, 'player-inventory')),
    ),
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
  writeJsonKey(
    getSandboxSlotKey(slotIndex, 'player-inventory'),
    normalizePlayerInventory(gs.playerInventory),
  )

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
  return migrateSandboxState(assembleSandboxState(slotIndex))
}

const UNDO_SNAPSHOT_FIELD = 'undo-snapshot'

/** @param {number} slotIndex 1-based */
export function saveUndoSnapshot(slotIndex) {
  const slot = loadSandboxSlot(slotIndex)
  if (!slot) return
  try {
    writeJsonKey(getSandboxSlotKey(slotIndex, UNDO_SNAPSHOT_FIELD), {
      messages: slot.messages,
      playerTurnCount: slot.playerTurnCount,
      consecutiveFails: slot.consecutiveFails,
      factDatabase: loadFactDatabase(slotIndex),
      eventTimeline: loadEventTimeline(slotIndex),
      npcArchive: loadNpcArchive(slotIndex),
      worldState: loadWorldState(slotIndex),
      questState: loadQuestState(slotIndex),
      npcMemoryGraph: loadNpcMemoryGraph(slotIndex),
      lastPlayerMessage:
        slot.messages.filter((m) => m.role === 'player').slice(-1)[0]?.content ?? '',
      snapshotAt: Date.now(),
    })
  } catch {
    /* */
  }
}

/** @param {number} slotIndex 1-based */
export function loadUndoSnapshot(slotIndex) {
  return readJsonKey(getSandboxSlotKey(slotIndex, UNDO_SNAPSHOT_FIELD))
}

/** @param {number} slotIndex 1-based */
export function clearUndoSnapshot(slotIndex) {
  try {
    localStorage.removeItem(getSandboxSlotKey(slotIndex, UNDO_SNAPSHOT_FIELD))
  } catch {
    /* */
  }
}

/**
 * @param {number} slotIndex 1-based
 * @returns {string | null} 恢复后填回输入框的玩家消息
 */
export function restoreUndoSnapshot(slotIndex) {
  const snapshot = loadUndoSnapshot(slotIndex)
  if (!snapshot || typeof snapshot !== 'object') return null

  try {
    const slot = loadSandboxSlot(slotIndex)
    saveSandboxSlot(slotIndex, {
      ...slot,
      messages: Array.isArray(snapshot.messages) ? snapshot.messages : slot.messages,
      playerTurnCount:
        typeof snapshot.playerTurnCount === 'number' ? snapshot.playerTurnCount : slot.playerTurnCount,
      consecutiveFails:
        typeof snapshot.consecutiveFails === 'number'
          ? snapshot.consecutiveFails
          : slot.consecutiveFails,
    })

    if (snapshot.factDatabase) saveFactDatabase(slotIndex, snapshot.factDatabase)
    if (snapshot.eventTimeline) saveEventTimeline(slotIndex, snapshot.eventTimeline)
    if (snapshot.npcArchive) saveNpcArchive(slotIndex, snapshot.npcArchive)
    if (snapshot.worldState) saveWorldState(slotIndex, snapshot.worldState)
    if (snapshot.questState) saveQuestState(slotIndex, snapshot.questState)
    if (snapshot.npcMemoryGraph) saveNpcMemoryGraph(slotIndex, snapshot.npcMemoryGraph)

    clearUndoSnapshot(slotIndex)

    return typeof snapshot.lastPlayerMessage === 'string' ? snapshot.lastPlayerMessage : ''
  } catch {
    return null
  }
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

const SANDBOX_EXPORT_EXTRA_FIELDS = [
  NPC_ARCHIVE_FIELD,
  FACT_DATABASE_FIELD,
  EVENT_TIMELINE_FIELD,
  WORLD_STATE_FIELD,
  QUEST_STATE_FIELD,
  NPC_MEMORY_GRAPH_FIELD,
  'player-inventory',
]

const SANDBOX_EXPORT_ALL_FIELDS = [...SANDBOX_SLOT_FIELDS, ...SANDBOX_EXPORT_EXTRA_FIELDS]

const SLOT_EXPORT_VERSION = 1

/**
 * @typedef {{
 *   version: number,
 *   mode: 'sandbox' | 'coc',
 *   slotIndex: number,
 *   exportedAt: string,
 *   fields: Record<string, unknown>,
 * }} SlotExportBundle
 */

/** @param {number} slotIndex 1-based */
export function exportSandboxSlot(slotIndex) {
  /** @type {Record<string, unknown>} */
  const fields = {}
  let hasAny = false
  for (const field of SANDBOX_EXPORT_ALL_FIELDS) {
    const raw = localStorage.getItem(getSandboxSlotKey(slotIndex, field))
    if (raw == null) continue
    try {
      fields[field] = JSON.parse(raw)
      hasAny = true
    } catch {
      /* skip corrupt */
    }
  }
  const legacyKey = `sandbox-save-slot-${slotIndex}`
  const legacyRaw = localStorage.getItem(legacyKey)
  if (legacyRaw != null) {
    try {
      fields.__legacySaveSlot = JSON.parse(legacyRaw)
      hasAny = true
    } catch {
      /* */
    }
  }
  if (!hasAny) return null
  return /** @type {SlotExportBundle} */ ({
    version: SLOT_EXPORT_VERSION,
    mode: 'sandbox',
    slotIndex,
    exportedAt: new Date().toISOString(),
    fields,
  })
}

/**
 * @param {number} slotIndex 1-based
 * @param {unknown} data
 */
export function importSandboxSlot(slotIndex, data) {
  const bundle = normalizeSlotExportBundle(data, 'sandbox')
  removeSandboxSlotKeys(slotIndex)
  for (const [field, value] of Object.entries(bundle.fields)) {
    if (field === '__legacySaveSlot') {
      writeJsonKey(`sandbox-save-slot-${slotIndex}`, value)
      continue
    }
    writeJsonKey(getSandboxSlotKey(slotIndex, field), value)
  }
}

/**
 * @param {'coc' | 'sandbox'} mode
 * @param {number} slotIndex 1-based
 * @returns {SlotExportBundle | null}
 */
export function exportSlot(slotIndex, mode) {
  if (mode === 'sandbox') return exportSandboxSlot(slotIndex)
  if (mode === 'coc') return exportCocSlot(slotIndex)
  return null
}

/**
 * @param {number} slotIndex 1-based
 * @param {'coc' | 'sandbox'} mode
 * @param {unknown} data
 */
export function importSlot(slotIndex, mode, data) {
  if (mode === 'sandbox') {
    importSandboxSlot(slotIndex, data)
    return
  }
  if (mode === 'coc') importCocSlot(slotIndex, data)
}

/**
 * @param {unknown} data
 * @param {'sandbox' | 'coc'} expectedMode
 * @returns {SlotExportBundle}
 */
function normalizeSlotExportBundle(data, expectedMode) {
  if (!data || typeof data !== 'object') throw new Error('invalid bundle')
  const o = /** @type {Record<string, unknown>} */ (data)
  const mode = o.mode === 'sandbox' || o.mode === 'coc' ? o.mode : expectedMode
  if (mode !== expectedMode) throw new Error('mode mismatch')
  const fields =
    o.fields && typeof o.fields === 'object' && !Array.isArray(o.fields)
      ? /** @type {Record<string, unknown>} */ (o.fields)
      : o
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw new Error('invalid fields')
  }
  return {
    version: typeof o.version === 'number' ? o.version : SLOT_EXPORT_VERSION,
    mode,
    slotIndex: typeof o.slotIndex === 'number' ? o.slotIndex : 0,
    exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : '',
    fields: /** @type {Record<string, unknown>} */ (fields),
  }
}
