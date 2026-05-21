/** 全局偏好（apiKey / selectedMode / selectedSlot），不含对局数据 */
export const STORAGE_KEY = 'coc-simulator-state-v1'

/** @typedef {{ turn: number, summary: string }} TurnSummaryEntry */
/** @typedef {{ index: number, summary: string, archivedAt: string, endMessageId?: string }} ArchivedEventEntry */
/** @typedef {{ id: string, role: 'gm' | 'player' | 'system', content: string, ts: number, isSummary?: boolean, isArchive?: boolean }} ChatMessage */
/** @typedef {'extreme' | 'success' | 'fail' | 'fumble'} D100Outcome */
/** @typedef {{ id: string, skillName: string, value: number, dice: string, outcome: D100Outcome | null, judgeText: string, ts: number }} DiceLogEntry */
/** @typedef {{ name: string, hp: number, mp: number, san: number, talisman: number }} PlayerChar */
/** @typedef {{ name: string, hp: number, mp: number, san: number }} PartnerChar */
/** @typedef {{ title: string, summary: string, tags: string[], opening: string }} SelectedScenario */
/** @typedef {'coc' | 'sandbox'} GameMode */

/** @typedef {1 | 2} CocSlotIndex */

/**
 * @typedef {{
 *   isEmpty: boolean,
 *   characterName: string,
 *   worldName: string,
 *   turnCount: number,
 *   lastPlayedAt: string,
 *   gameState: CocGameState
 * }} CocSlotMeta
 */

/**
 * @typedef {{
 *   player: PlayerChar | null,
 *   partner: PartnerChar | null,
 *   messages: ChatMessage[],
 *   diceLog: DiceLogEntry[],
 *   prologueComplete: boolean,
 *   selectedScenario: SelectedScenario | null,
 *   scenarioTitle: string | null,
 *   playerTurnCount: number,
 *   playerItems: string[],
 *   partnerItems: string[],
 *   sceneItems: string[],
 *   turnSummaries: TurnSummaryEntry[],
 *   archivedEvents: ArchivedEventEntry[],
 *   eventIndex: number
 * }} CocGameState
 */

/**
 * @typedef {{
 *   apiKey: string,
 *   selectedMode: GameMode | null,
 *   selectedSlot: number | null,
 *   player: PlayerChar | null,
 *   partner: PartnerChar | null,
 *   messages: ChatMessage[],
 *   diceLog: DiceLogEntry[],
 *   prologueComplete: boolean,
 *   selectedScenario: SelectedScenario | null,
 *   scenarioTitle: string | null,
 *   playerTurnCount: number,
 *   playerItems: string[],
 *   partnerItems: string[],
 *   sceneItems: string[]
 * }} AppState
 */

/** @param {unknown} raw */
function normalizePlayer(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (raw)
  const name = typeof o.name === 'string' ? o.name.trim().slice(0, 32) : ''
  if (!name) return null
  const hp = Number.parseInt(String(o.hp), 10)
  const mp = Number.parseInt(String(o.mp), 10)
  const san = Number.parseInt(String(o.san), 10)
  const talisman = Number.parseInt(String(o.talisman ?? o.papers ?? 0), 10)
  if (![hp, mp, san, talisman].every((n) => Number.isFinite(n))) return null
  return {
    name,
    hp: Math.min(999, Math.max(0, hp)),
    mp: Math.min(999, Math.max(0, mp)),
    san: Math.min(999, Math.max(0, san)),
    talisman: Math.min(999, Math.max(0, talisman)),
  }
}

/** @param {unknown} raw */
function normalizePartner(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (raw)
  const name = typeof o.name === 'string' ? o.name.trim().slice(0, 32) : ''
  if (!name) return null
  const hp = Number.parseInt(String(o.hp), 10)
  const mp = Number.parseInt(String(o.mp), 10)
  const san = Number.parseInt(String(o.san), 10)
  if (![hp, mp, san].every((n) => Number.isFinite(n))) return null
  return {
    name,
    hp: Math.min(999, Math.max(0, hp)),
    mp: Math.min(999, Math.max(0, mp)),
    san: Math.min(999, Math.max(0, san)),
  }
}

/** @param {unknown} parsed */
function rosterFromLegacy(parsed) {
  const x = /** @type {Record<string, unknown> | undefined} */ (parsed?.xigu)
  const l = /** @type {Record<string, unknown> | undefined} */ (parsed?.lin)
  if (!x || !l) return null
  const xh = Number.parseInt(String(x.hp), 10)
  const xm = Number.parseInt(String(x.mp), 10)
  const xs = Number.parseInt(String(x.san), 10)
  const lh = Number.parseInt(String(l.hp), 10)
  const lm = Number.parseInt(String(l.mp), 10)
  const ls = Number.parseInt(String(l.san), 10)
  if (![xh, xm, xs, lh, lm, ls].every((n) => Number.isFinite(n))) return null
  const tal = Number.parseInt(String(x.papers ?? x.talisman ?? l.papers ?? 5), 10)
  const talisman = Number.isFinite(tal) ? Math.min(999, Math.max(0, tal)) : 5
  return {
    player: { name: '何以惜顾', hp: xh, mp: xm, san: xs, talisman },
    partner: { name: '林知渺', hp: lh, mp: lm, san: ls },
  }
}

/** @returns {AppState} */
/** @param {unknown} raw */
function normalizeSelectedMode(raw) {
  if (raw === 'coc' || raw === 'sandbox') return raw
  return null
}

/**
 * 已有 CoC 存档但无 selectedMode 时视为 coc（跳过模式选择）。
 * @param {AppState} state
 * @returns {GameMode | null}
 */
export function resolveSelectedMode(state) {
  const explicit = normalizeSelectedMode(state.selectedMode)
  if (explicit) return explicit
  if (listSlots().some((s) => !s.isEmpty)) return 'coc'
  if (hasAnySandboxSlotSave()) return 'sandbox'
  return null
}

const COC_SLOT_COUNT = 2

/** 全局 selectedSlot 索引上限（沙盒 4 槽；CoC 对局数据仍仅使用 1~2 号槽） */
const APP_SELECTED_SLOT_MAX = 4

/** @param {unknown} raw @returns {number | null} */
export function normalizeAppSelectedSlot(raw) {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n < 1 || n > APP_SELECTED_SLOT_MAX) return null
  return Math.trunc(n)
}

/** @param {number} slotIndex 1-based @param {string} field */
export function getSlotKey(slotIndex, field) {
  return `coc-slot-${slotIndex}-${field}`
}

const COC_SLOT_FIELDS = [
  'messages',
  'inventory',
  'roster',
  'diceLog',
  'turnSummaries',
  'archivedEvents',
  'eventIndex',
  'playerTurnCount',
  'prologueComplete',
  'selectedScenario',
  'scenarioTitle',
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
function removeCocSlotKeys(slotIndex) {
  for (const field of COC_SLOT_FIELDS) {
    try {
      localStorage.removeItem(getSlotKey(slotIndex, field))
    } catch {
      /* */
    }
  }
  try {
    localStorage.removeItem(`coc-save-slot-${slotIndex}`)
  } catch {
    /* */
  }
}

/** @returns {CocGameState} */
export function defaultCocGameState() {
  return {
    player: null,
    partner: null,
    messages: [],
    diceLog: [],
    prologueComplete: false,
    selectedScenario: null,
    scenarioTitle: null,
    playerTurnCount: 0,
    playerItems: [],
    partnerItems: [],
    sceneItems: [],
    turnSummaries: [],
    archivedEvents: [],
    eventIndex: 1,
  }
}

export function defaultState() {
  return {
    apiKey: '',
    selectedMode: null,
    selectedSlot: null,
    player: null,
    partner: null,
    messages: [],
    diceLog: [],
    prologueComplete: false,
    selectedScenario: null,
    scenarioTitle: null,
    playerTurnCount: 0,
    playerItems: [],
    partnerItems: [],
    sceneItems: [],
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
function normalizePlayerTurnCount(raw) {
  const n = Number.parseInt(String(raw ?? 0), 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/** @param {unknown} m */
function normalizeChatMessage(m) {
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
function normalizeSelectedScenario(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (raw)
  const title = typeof o.title === 'string' ? o.title.trim().slice(0, 32) : ''
  const summary = typeof o.summary === 'string' ? o.summary.trim().slice(0, 200) : ''
  const opening = typeof o.opening === 'string' ? o.opening.trim().slice(0, 4000) : ''
  if (!title || !summary || !opening) return null
  const tagsRaw = Array.isArray(o.tags) ? o.tags : []
  const tags = tagsRaw.map((t) => String(t).trim().slice(0, 12)).filter(Boolean).slice(0, 4)
  return { title, summary, opening, tags }
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
      outcome: /** @type {D100Outcome | null} */ (o.outcome ?? null),
      judgeText: typeof o.judgeText === 'string' ? o.judgeText : '',
      ts: typeof o.ts === 'number' ? o.ts : Date.now(),
    })
  }
  return out.slice(0, 5)
}

/** @param {unknown} parsed */
function normalizeCocGameState(parsed) {
  const base = defaultCocGameState()
  if (!parsed || typeof parsed !== 'object') return base
  const p = /** @type {Record<string, unknown>} */ (parsed)
  const gs =
    p.gameState && typeof p.gameState === 'object'
      ? /** @type {Record<string, unknown>} */ (p.gameState)
      : p
  const messages = Array.isArray(gs.messages) ? gs.messages : []
  const safeMessages = messages.map(normalizeChatMessage).filter(Boolean)

  let player = normalizePlayer(gs.player)
  let partner = normalizePartner(gs.partner)
  if (!player || !partner) {
    const leg = rosterFromLegacy(gs)
    if (leg) {
      player = leg.player
      partner = leg.partner
    }
  }

  const prologueComplete =
    gs.prologueComplete === true || (safeMessages.length > 0 && !!player && !!partner)

  return {
    ...base,
    player,
    partner,
    messages: safeMessages,
    diceLog: normalizeDiceLog(gs.diceLog),
    prologueComplete,
    selectedScenario: normalizeSelectedScenario(gs.selectedScenario),
    scenarioTitle:
      typeof gs.scenarioTitle === 'string' && gs.scenarioTitle.trim()
        ? gs.scenarioTitle.trim().slice(0, 32)
        : null,
    playerTurnCount: normalizePlayerTurnCount(gs.playerTurnCount),
    playerItems: normalizeItemList(gs.playerItems),
    partnerItems: normalizeItemList(gs.partnerItems),
    sceneItems: normalizeItemList(gs.sceneItems),
    turnSummaries: normalizeTurnSummaries(gs.turnSummaries),
    archivedEvents: normalizeArchivedEvents(gs.archivedEvents),
    eventIndex: normalizeEventIndex(gs.eventIndex),
  }
}

function isCocGameStateEmpty(gs) {
  return (
    !gs.prologueComplete &&
    !gs.player &&
    !gs.partner &&
    (gs.messages?.length ?? 0) === 0 &&
    !gs.selectedScenario
  )
}

/** @returns {CocSlotMeta} */
function emptyCocSlotMeta() {
  return {
    isEmpty: true,
    characterName: '',
    worldName: '',
    turnCount: 0,
    lastPlayedAt: '',
    gameState: defaultCocGameState(),
  }
}

/** @param {CocGameState} gs */
function buildCocSlotMeta(gs) {
  const empty = isCocGameStateEmpty(gs)
  return {
    isEmpty: empty,
    characterName: gs.player?.name?.trim() || '何以惜顾',
    worldName: gs.scenarioTitle || gs.selectedScenario?.title || '',
    turnCount: gs.playerTurnCount ?? 0,
    lastPlayedAt: empty ? '' : new Date().toISOString(),
    gameState: gs,
  }
}

/** @param {number} slotIndex 1-based @returns {CocGameState} */
function assembleCocGameState(slotIndex) {
  const base = defaultCocGameState()
  const roster = readJsonKey(getSlotKey(slotIndex, 'roster'))
  const inventory = readJsonKey(getSlotKey(slotIndex, 'inventory'))
  const messagesRaw = readJsonKey(getSlotKey(slotIndex, 'messages'))
  const messages = Array.isArray(messagesRaw) ? messagesRaw : []
  const safeMessages = messages.map(normalizeChatMessage).filter(Boolean)

  let player =
    roster && typeof roster === 'object' ? normalizePlayer(/** @type {object} */ (roster).player) : null
  let partner =
    roster && typeof roster === 'object' ? normalizePartner(/** @type {object} */ (roster).partner) : null
  if (!player || !partner) {
    const leg = rosterFromLegacy(roster)
    if (leg) {
      player = leg.player
      partner = leg.partner
    }
  }

  const inv =
    inventory && typeof inventory === 'object'
      ? /** @type {Record<string, unknown>} */ (inventory)
      : {}
  const prologueFlag = readJsonKey(getSlotKey(slotIndex, 'prologueComplete'))
  const prologueComplete =
    prologueFlag === true || (safeMessages.length > 0 && !!player && !!partner)

  return {
    ...base,
    player,
    partner,
    messages: safeMessages,
    diceLog: normalizeDiceLog(readJsonKey(getSlotKey(slotIndex, 'diceLog'))),
    prologueComplete,
    selectedScenario: normalizeSelectedScenario(readJsonKey(getSlotKey(slotIndex, 'selectedScenario'))),
    scenarioTitle: (() => {
      const t = readJsonKey(getSlotKey(slotIndex, 'scenarioTitle'))
      return typeof t === 'string' && t.trim() ? t.trim().slice(0, 32) : null
    })(),
    playerTurnCount: normalizePlayerTurnCount(readJsonKey(getSlotKey(slotIndex, 'playerTurnCount'))),
    playerItems: normalizeItemList(inv.playerItems),
    partnerItems: normalizeItemList(inv.partnerItems),
    sceneItems: normalizeItemList(inv.sceneItems),
    turnSummaries: normalizeTurnSummaries(readJsonKey(getSlotKey(slotIndex, 'turnSummaries'))),
    archivedEvents: normalizeArchivedEvents(readJsonKey(getSlotKey(slotIndex, 'archivedEvents'))),
    eventIndex: normalizeEventIndex(readJsonKey(getSlotKey(slotIndex, 'eventIndex'))),
  }
}

/** @param {number} slotIndex 1-based @param {CocGameState} gs */
function persistCocGameState(slotIndex, gs) {
  writeJsonKey(getSlotKey(slotIndex, 'roster'), { player: gs.player, partner: gs.partner })
  writeJsonKey(getSlotKey(slotIndex, 'inventory'), {
    playerItems: gs.playerItems ?? [],
    partnerItems: gs.partnerItems ?? [],
    sceneItems: gs.sceneItems ?? [],
  })
  writeJsonKey(getSlotKey(slotIndex, 'messages'), gs.messages ?? [])
  writeJsonKey(getSlotKey(slotIndex, 'diceLog'), gs.diceLog ?? [])
  writeJsonKey(getSlotKey(slotIndex, 'turnSummaries'), gs.turnSummaries ?? [])
  writeJsonKey(getSlotKey(slotIndex, 'archivedEvents'), gs.archivedEvents ?? [])
  writeJsonKey(getSlotKey(slotIndex, 'eventIndex'), gs.eventIndex ?? 1)
  writeJsonKey(getSlotKey(slotIndex, 'playerTurnCount'), gs.playerTurnCount ?? 0)
  writeJsonKey(getSlotKey(slotIndex, 'prologueComplete'), !!gs.prologueComplete)
  writeJsonKey(getSlotKey(slotIndex, 'selectedScenario'), gs.selectedScenario)
  writeJsonKey(getSlotKey(slotIndex, 'scenarioTitle'), gs.scenarioTitle)

  const meta = buildCocSlotMeta(gs)
  writeJsonKey(getSlotKey(slotIndex, 'meta'), {
    isEmpty: meta.isEmpty,
    characterName: meta.characterName,
    worldName: meta.worldName,
    turnCount: meta.turnCount,
    lastPlayedAt: meta.lastPlayedAt,
  })
}

/** @param {number} slotIndex 1-based */
function readCocSlotMeta(slotIndex) {
  try {
    const gameState = assembleCocGameState(slotIndex)
    if (isCocGameStateEmpty(gameState)) return emptyCocSlotMeta()

    const meta = readJsonKey(getSlotKey(slotIndex, 'meta'))
    const o = meta && typeof meta === 'object' ? /** @type {Record<string, unknown>} */ (meta) : null

    return {
      isEmpty: false,
      characterName:
        o && typeof o.characterName === 'string' && o.characterName.trim()
          ? o.characterName.trim()
          : gameState.player?.name?.trim() || '何以惜顾',
      worldName:
        o && typeof o.worldName === 'string' && o.worldName.trim()
          ? o.worldName.trim()
          : gameState.scenarioTitle || gameState.selectedScenario?.title || '',
      turnCount:
        o && typeof o.turnCount === 'number' && Number.isFinite(o.turnCount)
          ? o.turnCount
          : gameState.playerTurnCount ?? 0,
      lastPlayedAt: o && typeof o.lastPlayedAt === 'string' ? o.lastPlayedAt : '',
      gameState,
    }
  } catch {
    return emptyCocSlotMeta()
  }
}

function hasAnySandboxSlotSave() {
  for (let i = 1; i <= 4; i++) {
    const meta = readJsonKey(`sandbox-slot-${i}-meta`)
    if (meta && typeof meta === 'object' && /** @type {Record<string, unknown>} */ (meta).isEmpty === false) {
      return true
    }
    if (readJsonKey(`sandbox-slot-${i}-prologueComplete`) === true) return true
    const msgs = readJsonKey(`sandbox-slot-${i}-messages`)
    if (Array.isArray(msgs) && msgs.length > 0) return true
  }
  return false
}

/** @returns {CocSlotMeta[]} */
export function listSlots() {
  const out = []
  for (let i = 1; i <= COC_SLOT_COUNT; i++) out.push(readCocSlotMeta(i))
  return out
}

/** @param {number} slotIndex 1-based */
export function loadSlot(slotIndex) {
  return assembleCocGameState(slotIndex)
}

/** @param {number} slotIndex 1-based @param {CocGameState} gameState */
export function saveSlot(slotIndex, gameState) {
  persistCocGameState(slotIndex, gameState)
}

/** @param {number} slotIndex 1-based */
export function deleteSlot(slotIndex) {
  removeCocSlotKeys(slotIndex)
}

const SLOT_EXPORT_VERSION = 1

/**
 * @typedef {{
 *   version: number,
 *   mode: 'sandbox' | 'coc',
 *   slotIndex: number,
 *   exportedAt: string,
 *   fields: Record<string, unknown>,
 * }} CocSlotExportBundle
 */

/** @param {number} slotIndex 1-based @returns {CocSlotExportBundle | null} */
export function exportCocSlot(slotIndex) {
  /** @type {Record<string, unknown>} */
  const fields = {}
  let hasAny = false
  for (const field of COC_SLOT_FIELDS) {
    const raw = localStorage.getItem(getSlotKey(slotIndex, field))
    if (raw == null) continue
    try {
      fields[field] = JSON.parse(raw)
      hasAny = true
    } catch {
      /* skip corrupt */
    }
  }
  const legacyKey = `coc-save-slot-${slotIndex}`
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
  return {
    version: SLOT_EXPORT_VERSION,
    mode: 'coc',
    slotIndex,
    exportedAt: new Date().toISOString(),
    fields,
  }
}

/**
 * @param {number} slotIndex 1-based
 * @param {unknown} data
 */
export function importCocSlot(slotIndex, data) {
  const bundle = normalizeCocSlotExportBundle(data)
  removeCocSlotKeys(slotIndex)
  for (const [field, value] of Object.entries(bundle.fields)) {
    if (field === '__legacySaveSlot') {
      writeJsonKey(`coc-save-slot-${slotIndex}`, value)
      continue
    }
    writeJsonKey(getSlotKey(slotIndex, field), value)
  }
}

/** @param {unknown} data @returns {CocSlotExportBundle} */
function normalizeCocSlotExportBundle(data) {
  if (!data || typeof data !== 'object') throw new Error('invalid bundle')
  const o = /** @type {Record<string, unknown>} */ (data)
  if (o.mode != null && o.mode !== 'coc') throw new Error('mode mismatch')
  const fields =
    o.fields && typeof o.fields === 'object' && !Array.isArray(o.fields)
      ? /** @type {Record<string, unknown>} */ (o.fields)
      : o
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw new Error('invalid fields')
  }
  return {
    version: typeof o.version === 'number' ? o.version : SLOT_EXPORT_VERSION,
    mode: 'coc',
    slotIndex: typeof o.slotIndex === 'number' ? o.slotIndex : 0,
    exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : '',
    fields: /** @type {Record<string, unknown>} */ (fields),
  }
}

export function wipeCocSlots() {
  for (let i = 1; i <= COC_SLOT_COUNT; i++) deleteSlot(i)
}

/** @returns {AppState} */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    const base = defaultState()
    const selectedSlot = normalizeAppSelectedSlot(parsed.selectedSlot)

    return {
      ...base,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : base.apiKey,
      selectedMode: normalizeSelectedMode(parsed.selectedMode),
      selectedSlot,
    }
  } catch {
    return defaultState()
  }
}

/** @param {Partial<AppState>} state */
export function saveState(state) {
  try {
    const prev = loadState()
    const payload = {
      apiKey: typeof state.apiKey === 'string' ? state.apiKey : prev.apiKey,
      selectedMode:
        state.selectedMode !== undefined ? normalizeSelectedMode(state.selectedMode) : prev.selectedMode,
      selectedSlot:
        state.selectedSlot !== undefined
          ? state.selectedSlot === null
            ? null
            : (normalizeAppSelectedSlot(state.selectedSlot) ?? prev.selectedSlot)
          : prev.selectedSlot,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota */
  }
}

export function wipePersistedState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * 保留 API Key 与模式，清空对局并回到模式选择（不删密钥本身）。
 * @param {string} [apiKey]
 * @param {GameMode | null} [selectedMode]
 */
export function resetStoryKeepMode(apiKey = '', selectedMode = 'coc', slotIndex) {
  const mode = normalizeSelectedMode(selectedMode) ?? 'coc'
  const slot = slotIndex ?? loadState().selectedSlot
  if (slot) saveSlot(slot, defaultCocGameState())
  saveState({
    apiKey: typeof apiKey === 'string' ? apiKey : '',
    selectedMode: mode,
    selectedSlot: slot,
  })
}

/**
 * 保留 API Key 与模式，清空对局并回到开场序幕（不删密钥本身）。
 * @param {string} [apiKey]
 * @param {GameMode | null} [selectedMode]
 */
export function resetForPrologueReplay(apiKey = '', selectedMode = 'coc', slotIndex) {
  const mode = normalizeSelectedMode(selectedMode) ?? 'coc'
  const slot = slotIndex ?? loadState().selectedSlot
  if (slot) deleteSlot(slot)
  saveState({
    apiKey: typeof apiKey === 'string' ? apiKey : '',
    selectedMode: mode,
    selectedSlot: slot,
  })
}

/** 清空全部本地存档（含 API Key） */
export function wipeAllIncludingApiKey() {
  wipePersistedState()
  wipeCocSlots()
}
