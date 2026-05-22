/**
 * 当前数据版本号，每次新增字段时 +1
 */
export const CURRENT_VERSION = 2

/**
 * @typedef {import('./sandboxStorage.js').SandboxState} SandboxState
 * @typedef {import('./sandboxStorage.js').SandboxNpcArchive} SandboxNpcArchive
 * @typedef {import('./sandboxStorage.js').SandboxFactDatabase} SandboxFactDatabase
 * @typedef {import('./sandboxStorage.js').SandboxEventTimeline} SandboxEventTimeline
 * @typedef {import('./sandboxStorage.js').SandboxWorldState} SandboxWorldState
 */

/**
 * 对加载的存档数据执行迁移，补全缺失字段
 * @param {SandboxState} state
 * @returns {SandboxState}
 */
export function migrateSandboxState(state) {
  if (!state || typeof state !== 'object') return /** @type {SandboxState} */ (state)
  const version = state.__version ?? 0

  if (version < 1) {
    state.companions = (state.companions ?? []).map((c) => ({
      background: '',
      personality: '',
      appearance: '',
      loyalty: 3,
      control: 0,
      goal: '',
      isDead: false,
      isDeparted: false,
      ...c,
    }))
  }

  if (version < 2) {
    const active = []
    const archived = []

    for (const c of state.companions ?? []) {
      const isDead = c.isDead === true || c.status === 'dead'
      const isDeparted = c.isDeparted === true || c.status === 'left' || c.status === 'departed'

      let status = 'active'
      if (isDead) status = 'dead'
      else if (isDeparted) status = 'left'

      const { isDead: _d, isDeparted: _dp, ...rest } = c
      const migrated = { ...rest, status }

      if (status === 'active') {
        active.push(migrated)
      } else {
        archived.push(migrated)
      }
    }

    state.companions = active
    state.archivedCompanions = [...(state.archivedCompanions ?? []), ...archived]
  }

  state.__version = CURRENT_VERSION
  return state
}

/**
 * @param {SandboxNpcArchive} archive
 * @returns {SandboxNpcArchive}
 */
export function migrateNpcArchive(archive) {
  if (!archive?.npcs) return archive
  archive.npcs = archive.npcs.map((n) => ({
    appearance: '',
    personality: '',
    secret: '',
    relationStrength: 3,
    isDead: false,
    ...n,
  }))
  return archive
}

/**
 * @param {SandboxFactDatabase} db
 * @returns {SandboxFactDatabase}
 */
export function migrateFactDatabase(db) {
  if (!db?.facts) return db
  db.facts = db.facts.map((f) => ({
    importance: 3,
    confidence: 'medium',
    sourceTurn: 0,
    ...f,
  }))
  return db
}

/**
 * @param {SandboxEventTimeline} timeline
 * @returns {SandboxEventTimeline}
 */
export function migrateEventTimeline(timeline) {
  if (!timeline?.events) return timeline
  timeline.events = timeline.events.map((e) => ({
    importance: 3,
    tags: [],
    ...e,
  }))
  return timeline
}

/**
 * @param {SandboxWorldState} state
 * @returns {SandboxWorldState}
 */
export function migrateWorldState(state) {
  if (!state) return state

  if (Array.isArray(state.environment)) {
    const arr = state.environment
    state.environment = {
      weather: arr.find((e) => e.type === '天气')?.value ?? '晴',
      timeOfDay: arr.find((e) => e.type === '时间')?.value ?? '正午',
      season: arr.find((e) => e.type === '季节')?.value ?? '春',
      dayCount: 1,
    }
  }
  state.environment = {
    weather: '晴',
    timeOfDay: '正午',
    season: '春',
    dayCount: 1,
    ...(state.environment ?? {}),
  }

  state.economy = {
    priceLevel: 3,
    currency: '金币',
    marketNote: '',
    ...(state.economy ?? {}),
  }

  state.locations = (state.locations ?? []).map((loc) => ({
    dangerLevel: 2,
    controlledBy: '',
    isAccessible: true,
    accessNote: '',
    ...loc,
  }))

  delete state.keyItems

  return state
}
