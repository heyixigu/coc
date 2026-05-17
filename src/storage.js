export const STORAGE_KEY = 'coc-simulator-state-v1'

/** @typedef {{ id: string, role: 'gm' | 'player' | 'system', content: string, ts: number, isSummary?: boolean }} ChatMessage */
/** @typedef {'extreme' | 'success' | 'fail' | 'fumble'} D100Outcome */
/** @typedef {{ id: string, skillName: string, value: number, dice: string, outcome: D100Outcome | null, judgeText: string, ts: number }} DiceLogEntry */
/** @typedef {{ name: string, hp: number, mp: number, san: number, talisman: number }} PlayerChar */
/** @typedef {{ name: string, hp: number, mp: number, san: number }} PartnerChar */
/** @typedef {{ title: string, summary: string, tags: string[], opening: string }} SelectedScenario */

/**
 * @typedef {{
 *   apiKey: string,
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
export function defaultState() {
  return {
    apiKey: '',
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
  }
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

/** @returns {AppState} */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    const base = defaultState()
    const messages = Array.isArray(parsed.messages) ? parsed.messages : []
    const safeMessages = messages.map(normalizeChatMessage).filter(Boolean)

    let player = normalizePlayer(parsed.player)
    let partner = normalizePartner(parsed.partner)
    if (!player || !partner) {
      const leg = rosterFromLegacy(parsed)
      if (leg) {
        player = leg.player
        partner = leg.partner
      }
    }

    const prologueComplete =
      parsed.prologueComplete === true ||
      (safeMessages.length > 0 && !!player && !!partner)

    return {
      ...base,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : base.apiKey,
      player,
      partner,
      messages: safeMessages,
      diceLog: normalizeDiceLog(parsed.diceLog),
      prologueComplete,
      selectedScenario: normalizeSelectedScenario(parsed.selectedScenario),
      scenarioTitle:
        typeof parsed.scenarioTitle === 'string' && parsed.scenarioTitle.trim()
          ? parsed.scenarioTitle.trim().slice(0, 32)
          : null,
      playerTurnCount: normalizePlayerTurnCount(parsed.playerTurnCount),
      playerItems: normalizeItemList(parsed.playerItems),
      partnerItems: normalizeItemList(parsed.partnerItems),
      sceneItems: normalizeItemList(parsed.sceneItems),
    }
  } catch {
    return defaultState()
  }
}

/** @param {AppState} state */
export function saveState(state) {
  try {
    const payload = {
      apiKey: state.apiKey,
      player: state.player,
      partner: state.partner,
      messages: state.messages,
      diceLog: state.diceLog,
      prologueComplete: !!state.prologueComplete,
      selectedScenario: state.selectedScenario ?? null,
      scenarioTitle: state.scenarioTitle ?? null,
      playerTurnCount: normalizePlayerTurnCount(state.playerTurnCount),
      playerItems: normalizeItemList(state.playerItems),
      partnerItems: normalizeItemList(state.partnerItems),
      sceneItems: normalizeItemList(state.sceneItems),
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
 * 保留 API Key，清空对局并回到开场序幕（不删密钥本身）。
 * @param {string} [apiKey]
 */
export function resetForPrologueReplay(apiKey = '') {
  saveState({
    apiKey: typeof apiKey === 'string' ? apiKey : '',
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
  })
}

/** 清空全部本地存档（含 API Key） */
export function wipeAllIncludingApiKey() {
  wipePersistedState()
}
