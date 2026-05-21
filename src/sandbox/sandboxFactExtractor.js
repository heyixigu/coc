import { postChatNonStream } from '../deepseek.js'
import { rollbackSandboxExtractForTurn } from './sandboxExtractRollback.js'
import {
  applyCompanionDefaults,
  applyNpcArchiveDefaults,
  formatCompanionArchiveInjectLine,
  formatNpcArchiveInjectLine,
  getActiveFacts,
  getInjectableTimeline,
  loadEventTimeline,
  loadFactDatabase,
  formatTimelineEventInjectLine,
  loadNpcArchive,
  loadNpcMemoryGraph,
  loadQuestState,
  loadWorldState,
  saveEventTimeline,
  saveFactDatabase,
  saveNpcArchive,
  saveNpcMemoryGraph,
  loadSandboxSlot,
  saveQuestState,
  saveSandboxSlot,
  saveWorldState,
} from './sandboxStorage.js'
import {
  applyInventoryExtractToSlotState,
  formatCompanionInventoryForExtractPrompt,
  formatPlayerInventoryForExtractPrompt,
  normalizeCompanionInventoryExtracts,
  normalizePlayerInventoryExtract,
} from './sandboxInventoryExtract.js'

/**
 * @typedef {import('./sandboxStorage.js').SandboxFactCategory} SandboxFactCategory
 * @typedef {import('./sandboxStorage.js').SandboxFactEntry} SandboxFactEntry
 * @typedef {import('./sandboxStorage.js').SandboxTimelineCategory} SandboxTimelineCategory
 * @typedef {import('./sandboxStorage.js').SandboxWorldState} SandboxWorldState
 * @typedef {import('./sandboxStorage.js').SandboxQuestState} SandboxQuestState
 * @typedef {import('./sandboxStorage.js').SandboxQuestCategory} SandboxQuestCategory
 * @typedef {import('./sandboxStorage.js').SandboxQuestStatus} SandboxQuestStatus
 * @typedef {import('./sandboxStorage.js').SandboxNpcMemoryGraph} SandboxNpcMemoryGraph
 * @typedef {import('./sandboxStorage.js').SandboxNpcArchive} SandboxNpcArchive
 */

/**
 * @typedef {{
 *   content: string,
 *   category: SandboxFactCategory,
 *   relatedNames: string[],
 *   importance: number,
 *   confidence: 'high' | 'medium' | 'low',
 * }} FactExtractNew
 */

/**
 * @typedef {{
 *   supersedes: string,
 *   content: string,
 *   category: SandboxFactCategory,
 *   relatedNames: string[],
 *   importance: number,
 *   confidence: 'high' | 'medium' | 'low',
 * }} FactExtractUpdate
 */

/**
 * @typedef {{
 *   title: string,
 *   description: string,
 *   category: SandboxTimelineCategory,
 *   relatedNames: string[],
 *   consequence: string,
 *   importance: number,
 *   tags: string[],
 * }} TimelineExtractEvent
 */

const TIMELINE_VALID_TAGS = [
  'death',
  'boss',
  'turning_point',
  'first_meet',
  'betrayal',
  'discovery',
  'quest_complete',
]

/**
 * @typedef {{
 *   name: string,
 *   isNew?: boolean,
 *   identity?: string,
 *   appearance?: string,
 *   personality?: string,
 *   secret?: string,
 *   relationship?: string,
 *   relationStrength?: number,
 *   status?: string,
 *   isDead?: boolean,
 * }} NpcExtractUpdate
 */

/**
 * @typedef {{
 *   name: string,
 *   isNew?: boolean,
 *   role?: string,
 *   background?: string,
 *   personality?: string,
 *   appearance?: string,
 *   loyalty?: number,
 *   control?: number,
 *   goal?: string,
 *   isDead?: boolean,
 *   isDeparted?: boolean,
 * }} CompanionProfileExtract
 */

/**
 * @typedef {{
 *   name: string,
 *   status?: string,
 *   dangerLevel?: number,
 *   controlledBy?: string,
 *   isAccessible?: boolean,
 *   accessNote?: string,
 *   isNew?: boolean,
 * }} LocationUpdate
 */

/**
 * @typedef {{
 *   name: string,
 *   attitudeToPlayer?: string,
 *   currentStatus?: string,
 *   isNew?: boolean,
 * }} FactionUpdate
 */

/**
 * @typedef {{
 *   weather?: string,
 *   timeOfDay?: string,
 *   season?: string,
 *   dayPassed?: boolean,
 * }} EnvironmentUpdate
 */

/**
 * @typedef {{
 *   priceLevel?: number,
 *   currency?: string,
 *   marketNote?: string,
 * }} EconomyUpdate
 */

/**
 * @typedef {{
 *   locations?: LocationUpdate[],
 *   factions?: FactionUpdate[],
 *   environment?: EnvironmentUpdate | null,
 *   economy?: EconomyUpdate | null,
 * }} WorldStateUpdates
 */

/**
 * @typedef {{
 *   newFacts: FactExtractNew[],
 *   updatedFacts: FactExtractUpdate[],
 *   timelineEvent: TimelineExtractEvent | null,
 *   memoryGraphUpdates: MemoryGraphUpdates | null,
 * }} AllStateExtractResult
 */

/**
 * @typedef {{
 *   title: string,
 *   description: string,
 *   category: SandboxQuestCategory,
 *   givenBy: string,
 *   objectives: { description: string }[],
 *   reward: string,
 * }} NewQuestExtract
 */

/**
 * @typedef {{
 *   id: string,
 *   status?: SandboxQuestStatus,
 *   completedObjectives?: string[],
 *   newObjectives?: { description: string }[],
 * }} UpdatedQuestExtract
 */

/**
 * @typedef {{
 *   newQuests?: NewQuestExtract[],
 *   updatedQuests?: UpdatedQuestExtract[],
 * }} QuestUpdates
 */

/**
 * @typedef {{
 *   npcName: string,
 *   newMemory?: string,
 *   newAttitude?: string,
 *   attitudeReason?: string,
 * }} MemoryNodeUpdate
 */

/**
 * @typedef {{
 *   fromName: string,
 *   toName: string,
 *   relationship: string,
 *   isNew?: boolean,
 * }} MemoryEdgeUpdate
 */

/**
 * @typedef {{
 *   nodeUpdates?: MemoryNodeUpdate[],
 *   edgeUpdates?: MemoryEdgeUpdate[],
 * }} MemoryGraphUpdates
 */

function newFactId() {
  return `fact_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function newEventId() {
  return `event_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function newLocId() {
  return `loc_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function newFactionId() {
  return `faction_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function newQuestId() {
  return `quest_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function newObjectiveId() {
  return `obj_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function newMemoryEdgeId() {
  return `edge_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

/** @param {unknown} raw */
function normalizeQuestCategory(raw) {
  const c = String(raw ?? 'side').trim()
  return c === 'main' ? 'main' : 'side'
}

/** @param {unknown} raw */
function normalizeQuestStatus(raw) {
  const s = String(raw ?? 'active').trim()
  if (s === 'completed' || s === 'failed' || s === 'active') {
    return /** @type {SandboxQuestStatus} */ (s)
  }
  return 'active'
}

/** @param {string} raw */
function extractJsonObject(raw) {
  const t = (raw || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fence ? fence[1].trim() : t
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return body.slice(start, end + 1)
}

/** @param {unknown} raw */
function normalizeFactCategory(raw) {
  const c = String(raw ?? 'world').trim()
  if (c === 'world' || c === 'npc' || c === 'location' || c === 'item' || c === 'quest') {
    return /** @type {SandboxFactCategory} */ (c)
  }
  return 'world'
}

/** @param {unknown} raw */
function normalizeTimelineCategory(raw) {
  const c = String(raw ?? 'story').trim()
  if (
    c === 'story' ||
    c === 'combat' ||
    c === 'npc' ||
    c === 'discovery' ||
    c === 'quest'
  ) {
    return /** @type {SandboxTimelineCategory} */ (c)
  }
  return 'story'
}

/** @param {unknown} raw */
function normalizeRelatedNames(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const n of raw) {
    if (typeof n === 'string' && n.trim()) out.push(n.trim().slice(0, 32))
  }
  return out.slice(0, 16)
}

/**
 * @param {unknown} raw
 * @returns {TimelineExtractEvent | null}
 */
function normalizeTimelineEvent(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (raw)
  const title = typeof o.title === 'string' ? o.title.trim().slice(0, 20) : ''
  const description = typeof o.description === 'string' ? o.description.trim().slice(0, 2000) : ''
  if (!title || !description) return null

  const rawTags = Array.isArray(o.tags) ? o.tags : []
  const tags = rawTags
    .filter((t) => typeof t === 'string' && TIMELINE_VALID_TAGS.includes(t))
    .slice(0, 5)

  return {
    title,
    description,
    category: normalizeTimelineCategory(o.category),
    relatedNames: normalizeRelatedNames(o.relatedNames),
    consequence: typeof o.consequence === 'string' ? o.consequence.trim().slice(0, 500) : '',
    importance:
      typeof o.importance === 'number'
        ? Math.min(5, Math.max(1, Math.round(o.importance)))
        : 3,
    tags,
  }
}

function normalizeExtractFactImportance(raw) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 3
  return Math.min(5, Math.max(1, Math.round(raw)))
}

/**
 * @param {unknown} raw
 * @returns {'high' | 'medium' | 'low'}
 */
function normalizeExtractFactConfidence(raw) {
  if (raw === 'high' || raw === 'low' || raw === 'medium') return raw
  return 'medium'
}

/**
 * @param {string} raw
 * @returns {AllStateExtractResult | null}
 */
function parseAllStateExtractJson(raw) {
  const jsonStr = extractJsonObject(raw)
  if (!jsonStr) return null
  try {
    const parsed = JSON.parse(jsonStr)
    if (!parsed || typeof parsed !== 'object') return null
    const o = /** @type {Record<string, unknown>} */ (parsed)
    const newFacts = []
    const updatedFacts = []

    if (Array.isArray(o.newFacts)) {
      for (const item of o.newFacts) {
        if (!item || typeof item !== 'object') continue
        const f = /** @type {Record<string, unknown>} */ (item)
        const content = typeof f.content === 'string' ? f.content.trim().slice(0, 1000) : ''
        if (!content) continue
        const importance = normalizeExtractFactImportance(f.importance)
        const confidence = normalizeExtractFactConfidence(f.confidence)
        if (importance <= 2 && confidence === 'low') continue
        newFacts.push({
          content,
          category: normalizeFactCategory(f.category),
          relatedNames: normalizeRelatedNames(f.relatedNames),
          importance,
          confidence,
        })
      }
    }

    if (Array.isArray(o.updatedFacts)) {
      for (const item of o.updatedFacts) {
        if (!item || typeof item !== 'object') continue
        const f = /** @type {Record<string, unknown>} */ (item)
        const supersedes = typeof f.supersedes === 'string' ? f.supersedes.trim() : ''
        const content = typeof f.content === 'string' ? f.content.trim().slice(0, 1000) : ''
        if (!supersedes || !content) continue
        const importance = normalizeExtractFactImportance(f.importance)
        const confidence = normalizeExtractFactConfidence(f.confidence)
        if (importance <= 2 && confidence === 'low') continue
        updatedFacts.push({
          supersedes: supersedes.slice(0, 64),
          content,
          category: normalizeFactCategory(f.category),
          relatedNames: normalizeRelatedNames(f.relatedNames),
          importance,
          confidence,
        })
      }
    }

    let timelineEvent = null
    if (o.timelineEvent != null && typeof o.timelineEvent === 'object') {
      timelineEvent = normalizeTimelineEvent(o.timelineEvent)
    }

    let memoryGraphUpdates = null
    if (o.memoryGraphUpdates != null && typeof o.memoryGraphUpdates === 'object') {
      const mg = /** @type {Record<string, unknown>} */ (o.memoryGraphUpdates)
      /** @type {MemoryGraphUpdates} */
      const outMg = {}
      if (Array.isArray(mg.nodeUpdates)) {
        outMg.nodeUpdates = mg.nodeUpdates
          .filter((x) => x && typeof x === 'object')
          .map((x) => {
            const u = /** @type {Record<string, unknown>} */ (x)
            const npcName = typeof u.npcName === 'string' ? u.npcName.trim().slice(0, 32) : ''
            if (!npcName) return null
            return {
              npcName,
              newMemory:
                typeof u.newMemory === 'string' ? u.newMemory.trim().slice(0, 500) : undefined,
              newAttitude:
                typeof u.newAttitude === 'string' ? u.newAttitude.trim().slice(0, 200) : undefined,
              attitudeReason:
                typeof u.attitudeReason === 'string'
                  ? u.attitudeReason.trim().slice(0, 500)
                  : undefined,
            }
          })
          .filter((u) => u != null)
      }
      if (Array.isArray(mg.edgeUpdates)) {
        outMg.edgeUpdates = mg.edgeUpdates
          .filter((x) => x && typeof x === 'object')
          .map((x) => {
            const e = /** @type {Record<string, unknown>} */ (x)
            const fromName = typeof e.fromName === 'string' ? e.fromName.trim().slice(0, 32) : ''
            const toName = typeof e.toName === 'string' ? e.toName.trim().slice(0, 32) : ''
            const relationship =
              typeof e.relationship === 'string' ? e.relationship.trim().slice(0, 500) : ''
            if (!fromName || !toName || !relationship) return null
            return {
              fromName,
              toName,
              relationship,
              isNew: e.isNew === true,
            }
          })
          .filter((e) => e != null)
      }
      memoryGraphUpdates = outMg
    }

    return {
      newFacts,
      updatedFacts,
      timelineEvent,
      memoryGraphUpdates,
    }
  } catch {
    return null
  }
}

function buildNewFactEntry(item, currentTurn) {
  const turn = Math.max(0, Math.trunc(currentTurn))
  return {
    id: newFactId(),
    content: item.content,
    category: item.category,
    relatedNames: item.relatedNames,
    createdAt: turn,
    updatedAt: turn,
    supersededBy: null,
    importance: normalizeExtractFactImportance(item.importance),
    confidence: normalizeExtractFactConfidence(item.confidence),
    sourceTurn: turn,
  }
}

function applyFactUpdate(facts, update, currentTurn) {
  const turn = Math.max(0, Math.trunc(currentTurn))
  const idx = facts.findIndex((f) => f.id === update.supersedes)
  const newId = newFactId()
  if (idx >= 0) {
    facts[idx] = { ...facts[idx], supersededBy: newId, updatedAt: turn }
  }
  facts.push({
    id: newId,
    content: update.content,
    category: update.category,
    relatedNames: update.relatedNames,
    createdAt: turn,
    updatedAt: turn,
    supersededBy: null,
    importance: normalizeExtractFactImportance(update.importance),
    confidence: normalizeExtractFactConfidence(update.confidence),
    sourceTurn: turn,
  })
}

export function mergeFactDatabase(facts, parsed, currentTurn) {
  for (const update of parsed.updatedFacts) {
    applyFactUpdate(facts, update, currentTurn)
  }
  for (const item of parsed.newFacts) {
    facts.push(buildNewFactEntry(item, currentTurn))
  }
  return { facts: facts.slice(0, 500) }
}

/**
 * @param {AllStateExtractResult} parsed
 * @param {number} currentTurn
 * @param {number} slotIndex
 */
function updateFactDatabase(parsed, currentTurn, slotIndex) {
  if (parsed.newFacts.length === 0 && parsed.updatedFacts.length === 0) return false
  const loaded = loadFactDatabase(slotIndex)
  const db = {
    ...loaded,
    facts: loaded.facts.map((f) => ({
      importance: 3,
      confidence: 'medium',
      sourceTurn: 0,
      ...f,
    })),
  }
  const merged = mergeFactDatabase([...db.facts], parsed, currentTurn)
  saveFactDatabase(slotIndex, merged)
  return true
}

function updateEventTimeline(parsed, currentTurn, slotIndex) {
  if (!parsed.timelineEvent) return false
  const turn = Math.max(0, Math.trunc(currentTurn))
  const existingTimeline = loadEventTimeline(slotIndex)
  saveEventTimeline(slotIndex, {
    events: [
      ...existingTimeline.events,
      {
        id: newEventId(),
        turn,
        title: parsed.timelineEvent.title,
        description: parsed.timelineEvent.description,
        category: parsed.timelineEvent.category,
        relatedNames: parsed.timelineEvent.relatedNames,
        consequence: parsed.timelineEvent.consequence,
        importance: parsed.timelineEvent.importance ?? 3,
        tags: parsed.timelineEvent.tags ?? [],
      },
    ],
  })
  return true
}

function updateNpcArchiveFromExtract(parsed, slotIndex) {
  if (!parsed.npcUpdates.length) return false
  const archive = loadNpcArchive(slotIndex)
  let npcs = (archive.npcs ?? []).map((n) => applyNpcArchiveDefaults(n))
  const now = new Date().toISOString()
  let changed = false

  for (const update of parsed.npcUpdates) {
    const name = update.name.trim()
    if (!name) continue
    let idx = npcs.findIndex((n) => n.name === name)
    if (idx < 0) {
      if (!update.isNew) continue
      npcs.push(
        applyNpcArchiveDefaults({
          id: `npc_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          name,
          identity: '',
          appearance: '',
          personality: '',
          secret: '',
          relationship: '',
          relationStrength: 3,
          status: '',
          isDead: false,
          updatedAt: now,
        }),
      )
      idx = npcs.length - 1
      changed = true
    }

    const existing = npcs[idx]
    if (typeof update.identity === 'string' && update.identity.trim()) {
      existing.identity = update.identity.trim().slice(0, 500)
      changed = true
    }
    if (typeof update.appearance === 'string') {
      existing.appearance = update.appearance.trim().slice(0, 200)
      changed = true
    }
    if (typeof update.personality === 'string') {
      existing.personality = update.personality.trim().slice(0, 200)
      changed = true
    }
    if (typeof update.secret === 'string') {
      existing.secret = update.secret.trim().slice(0, 200)
      changed = true
    }
    if (typeof update.relationship === 'string' && update.relationship.trim()) {
      existing.relationship = update.relationship.trim().slice(0, 500)
      changed = true
    }
    if (typeof update.relationStrength === 'number') {
      existing.relationStrength = Math.min(5, Math.max(1, Math.round(update.relationStrength)))
      changed = true
    }
    if (typeof update.status === 'string') {
      existing.status = update.status.trim().slice(0, 500)
      changed = true
    }
    if (update.isDead === true && !existing.isDead) {
      existing.isDead = true
      changed = true
    }
    existing.updatedAt = now
  }

  if (changed) saveNpcArchive(slotIndex, { npcs })
  return changed
}

function updateCompanionProfileFromExtract(parsed, slotIndex) {
  if (!parsed.companionProfileUpdates?.length) return false
  const slot = loadSandboxSlot(slotIndex)
  const companions = (slot.companions ?? []).map((c) => applyCompanionDefaults(c))
  let changed = false

  for (const update of parsed.companionProfileUpdates) {
    const companion = companions.find((c) => c.name === update.name)
    if (!companion) continue

    if (typeof update.role === 'string') {
      companion.role = update.role.trim().slice(0, 50)
      changed = true
    }
    if (typeof update.background === 'string') {
      companion.background = update.background.trim().slice(0, 300)
      changed = true
    }
    if (typeof update.personality === 'string') {
      companion.personality = update.personality.trim().slice(0, 200)
      changed = true
    }
    if (typeof update.appearance === 'string') {
      companion.appearance = update.appearance.trim().slice(0, 200)
      changed = true
    }
    if (typeof update.loyalty === 'number') {
      companion.loyalty = Math.min(5, Math.max(1, Math.round(update.loyalty)))
      changed = true
    }
    if (typeof update.control === 'number') {
      companion.control = Math.min(5, Math.max(0, Math.round(update.control)))
      changed = true
    }
    if (typeof update.goal === 'string') {
      companion.goal = update.goal.trim().slice(0, 200)
      changed = true
    }
    if (update.isDead === true && !companion.isDead) {
      companion.isDead = true
      companion.status = 'dead'
      changed = true
    }
    if (update.isDeparted === true && !companion.isDeparted) {
      companion.isDeparted = true
      companion.status = 'left'
      changed = true
    }
  }

  if (changed) {
    saveSandboxSlot(slotIndex, { ...slot, companions })
  }
  return changed
}

/**
 * @param {WorldStateUpdates | null} updates
 * @param {SandboxWorldState} existing
 * @param {number} currentTurn
 */
function applyWorldStateUpdates(updates, existing, currentTurn) {
  if (!updates) return false
  const turn = Math.max(0, Math.trunc(currentTurn))
  const newState = {
    locations: [...existing.locations],
    factions: [...existing.factions],
    environment: { ...existing.environment },
    economy: { ...existing.economy },
  }
  let changed = false

  for (const loc of updates.locations ?? []) {
    if (!loc.name) continue
    const idx = newState.locations.findIndex((l) => l.name === loc.name)
    if (idx >= 0) {
      const existingLoc = newState.locations[idx]
      const next = { ...existingLoc, updatedAt: turn }
      if (typeof loc.status === 'string') next.status = loc.status
      if (typeof loc.dangerLevel === 'number') {
        next.dangerLevel = Math.min(5, Math.max(1, Math.round(loc.dangerLevel)))
      }
      if (typeof loc.controlledBy === 'string') next.controlledBy = loc.controlledBy.trim().slice(0, 50)
      if (typeof loc.isAccessible === 'boolean') next.isAccessible = loc.isAccessible
      if (typeof loc.accessNote === 'string') next.accessNote = loc.accessNote.trim().slice(0, 100)
      newState.locations[idx] = next
    } else {
      newState.locations.push({
        id: newLocId(),
        name: loc.name,
        status: loc.status || '',
        dangerLevel:
          typeof loc.dangerLevel === 'number'
            ? Math.min(5, Math.max(1, Math.round(loc.dangerLevel)))
            : 2,
        controlledBy:
          typeof loc.controlledBy === 'string' ? loc.controlledBy.trim().slice(0, 50) : '',
        isAccessible: loc.isAccessible !== false,
        accessNote: typeof loc.accessNote === 'string' ? loc.accessNote.trim().slice(0, 100) : '',
        updatedAt: turn,
      })
    }
    changed = true
  }

  for (const faction of updates.factions ?? []) {
    if (!faction.name) continue
    const idx = newState.factions.findIndex((f) => f.name === faction.name)
    if (idx >= 0) {
      newState.factions[idx] = {
        ...newState.factions[idx],
        attitudeToPlayer: faction.attitudeToPlayer ?? newState.factions[idx].attitudeToPlayer,
        currentStatus: faction.currentStatus ?? newState.factions[idx].currentStatus,
        updatedAt: turn,
      }
    } else {
      newState.factions.push({
        id: newFactionId(),
        name: faction.name,
        attitudeToPlayer: faction.attitudeToPlayer || '',
        currentStatus: faction.currentStatus || '',
        updatedAt: turn,
      })
    }
    changed = true
  }

  const envUpdate = updates.environment
  if (envUpdate) {
    const env = newState.environment
    if (typeof envUpdate.weather === 'string' && envUpdate.weather.trim()) {
      env.weather = envUpdate.weather.trim().slice(0, 50)
      changed = true
    }
    if (typeof envUpdate.timeOfDay === 'string' && envUpdate.timeOfDay.trim()) {
      env.timeOfDay = envUpdate.timeOfDay.trim().slice(0, 20)
      changed = true
    }
    if (typeof envUpdate.season === 'string' && envUpdate.season.trim()) {
      env.season = envUpdate.season.trim().slice(0, 10)
      changed = true
    }
    if (envUpdate.dayPassed === true) {
      env.dayCount = (env.dayCount ?? 1) + 1
      changed = true
    }
  }

  const ecoUpdate = updates.economy
  if (ecoUpdate) {
    const eco = newState.economy
    if (typeof ecoUpdate.priceLevel === 'number') {
      eco.priceLevel = Math.min(5, Math.max(1, Math.round(ecoUpdate.priceLevel)))
      changed = true
    }
    if (typeof ecoUpdate.currency === 'string' && ecoUpdate.currency.trim()) {
      eco.currency = ecoUpdate.currency.trim().slice(0, 20)
      changed = true
    }
    if (typeof ecoUpdate.marketNote === 'string') {
      eco.marketNote = ecoUpdate.marketNote.trim().slice(0, 100)
      changed = true
    }
  }

  return changed ? newState : null
}

/**
 * @param {QuestUpdates | null} updates
 * @param {SandboxQuestState} existing
 * @param {number} currentTurn
 */
function applyQuestStateUpdates(updates, existing, currentTurn) {
  if (!updates) return null
  const turn = Math.max(0, Math.trunc(currentTurn))
  const newQuests = [...existing.quests]
  let changed = false

  for (const quest of updates.newQuests ?? []) {
    if (!quest.title) continue
    newQuests.push({
      id: newQuestId(),
      title: quest.title,
      description: quest.description || '',
      status: 'active',
      category: quest.category,
      givenBy: quest.givenBy || '',
      objectives: (quest.objectives ?? []).map((o, i) => ({
        id: `${newObjectiveId()}_${i}`,
        description: o.description,
        completed: false,
      })),
      reward: quest.reward || '',
      createdAt: turn,
      updatedAt: turn,
    })
    changed = true
  }

  for (const update of updates.updatedQuests ?? []) {
    const idx = newQuests.findIndex((q) => q.id === update.id)
    if (idx === -1) continue
    const quest = { ...newQuests[idx], updatedAt: turn }

    if (update.status) quest.status = update.status

    if (update.completedObjectives?.length) {
      const done = new Set(update.completedObjectives)
      quest.objectives = quest.objectives.map((o) => ({
        ...o,
        completed: done.has(o.id) ? true : o.completed,
      }))
    }

    if (update.newObjectives?.length) {
      quest.objectives = [
        ...quest.objectives,
        ...update.newObjectives.map((o, i) => ({
          id: `${newObjectiveId()}_${i}`,
          description: o.description,
          completed: false,
        })),
      ]
    }

    newQuests[idx] = quest
    changed = true
  }

  return changed ? { quests: newQuests } : null
}

function updateWorldStateFromExtract(parsed, currentTurn, slotIndex) {
  const existing = loadWorldState(slotIndex)
  const next = applyWorldStateUpdates(parsed.worldStateUpdates, existing, currentTurn)
  if (!next) return false
  saveWorldState(slotIndex, next)
  return true
}

function updateQuestStateFromExtract(parsed, currentTurn, slotIndex) {
  const existing = loadQuestState(slotIndex)
  const next = applyQuestStateUpdates(parsed.questUpdates, existing, currentTurn)
  if (!next) return false
  saveQuestState(slotIndex, next)
  return true
}

/**
 * @param {MemoryGraphUpdates | null} updates
 * @param {SandboxNpcMemoryGraph} existing
 * @param {SandboxNpcArchive} npcArchive
 * @param {number} currentTurn
 */
function applyMemoryGraphUpdates(updates, existing, npcArchive, currentTurn) {
  if (!updates) return null
  const turn = Math.max(0, Math.trunc(currentTurn))
  const newGraph = {
    nodes: [...existing.nodes],
    edges: [...existing.edges],
  }
  let changed = false
  const npcs = npcArchive.npcs ?? []

  for (const update of updates.nodeUpdates ?? []) {
    const npc = npcs.find((n) => n.name === update.npcName)
    if (!npc) continue

    const nodeIdx = newGraph.nodes.findIndex((n) => n.id === npc.id)
    if (nodeIdx === -1) {
      /** @type {import('./sandboxStorage.js').SandboxNpcMemoryNode} */
      const newNode = {
        id: npc.id,
        name: update.npcName,
        memoriesOfPlayer: [],
        attitudeHistory: [],
      }
      if (update.newMemory) {
        newNode.memoriesOfPlayer.push({ turn, content: update.newMemory })
      }
      if (update.newAttitude) {
        newNode.attitudeHistory.push({
          turn,
          attitude: update.newAttitude,
          reason: update.attitudeReason || '',
        })
      }
      if (newNode.memoriesOfPlayer.length || newNode.attitudeHistory.length) {
        newGraph.nodes.push(newNode)
        changed = true
      }
    } else {
      const node = { ...newGraph.nodes[nodeIdx] }
      if (update.newMemory) {
        node.memoriesOfPlayer = [...node.memoriesOfPlayer, { turn, content: update.newMemory }]
        changed = true
      }
      if (update.newAttitude) {
        node.attitudeHistory = [
          ...node.attitudeHistory,
          {
            turn,
            attitude: update.newAttitude,
            reason: update.attitudeReason || '',
          },
        ]
        changed = true
      }
      newGraph.nodes[nodeIdx] = node
    }
  }

  for (const update of updates.edgeUpdates ?? []) {
    const fromNpc = npcs.find((n) => n.name === update.fromName)
    const toNpc = npcs.find((n) => n.name === update.toName)
    if (!fromNpc || !toNpc) continue

    const edgeIdx = newGraph.edges.findIndex(
      (e) =>
        (e.from === fromNpc.id && e.to === toNpc.id) ||
        (e.from === toNpc.id && e.to === fromNpc.id),
    )

    if (edgeIdx === -1) {
      newGraph.edges.push({
        id: newMemoryEdgeId(),
        from: fromNpc.id,
        to: toNpc.id,
        relationship: update.relationship,
        updatedAt: turn,
      })
      changed = true
    } else {
      newGraph.edges[edgeIdx] = {
        ...newGraph.edges[edgeIdx],
        relationship: update.relationship,
        updatedAt: turn,
      }
      changed = true
    }
  }

  return changed ? newGraph : null
}

function updateNpcMemoryGraphFromExtract(parsed, currentTurn, slotIndex) {
  const existing = loadNpcMemoryGraph(slotIndex)
  const npcArchive = loadNpcArchive(slotIndex)
  const next = applyMemoryGraphUpdates(
    parsed.memoryGraphUpdates,
    existing,
    npcArchive,
    currentTurn,
  )
  if (!next) return false
  saveNpcMemoryGraph(slotIndex, next)
  return true
}

function buildAllStateExtractPrompt(gmReply, activeFacts, existingNpcs, existingMemoryGraph, slotIndex) {
  const factLines =
    activeFacts.length > 0
      ? activeFacts
          .map(
            (f) =>
              `[${f.id}] ${f.category}(importance:${f.importance ?? 3}, confidence:${f.confidence ?? 'medium'}): ${f.content}`,
          )
          .join('\n')
      : '暂无'

  const npcLines =
    existingNpcs.length > 0
      ? existingNpcs.map((n) => formatNpcArchiveInjectLine(n)).join('\n\n')
      : '暂无'

  const graph = existingMemoryGraph
  const memoryNodeLines =
    graph.nodes.length > 0
      ? graph.nodes
          .map((node) => {
            const mem =
              node.memoriesOfPlayer.map((m) => `第${m.turn}轮：${m.content}`).join('；') || '无'
            const attitude =
              node.attitudeHistory[node.attitudeHistory.length - 1]?.attitude || '未知'
            return `[${node.id}] ${node.name}\n  对玩家的记忆：${mem}\n  当前态度：${attitude}`
          })
          .join('\n')
      : '暂无'

  const memoryEdgeLines =
    graph.edges.length > 0
      ? graph.edges
          .map((e) => {
            const fromNode = graph.nodes.find((n) => n.id === e.from)
            const toNode = graph.nodes.find((n) => n.id === e.to)
            return `${fromNode?.name ?? e.from} ↔ ${toNode?.name ?? e.to}：${e.relationship}`
          })
          .join('\n')
      : '暂无'

  const timelineEvents = getInjectableTimeline(slotIndex)
  const timelineLines =
    timelineEvents.length > 0
      ? timelineEvents.map((e) => formatTimelineEventInjectLine(e)).join('\n')
      : '暂无'

  return `你是一个跑团状态提取器。请从以下GM回复中提取事实库、事件时间线与NPC记忆图谱更新（NPC/任务/世界/物品/同伴状态已由【状态变更】段处理，勿重复提取）。

=== 现有数据 ===

事实库：
${factLines}

事件时间线（近期参考，importance>=4 为永久保留）：
${timelineLines}

NPC档案：
${npcLines}

NPC记忆图谱：
${memoryNodeLines}

NPC关系网络：
${memoryEdgeLines}

=== 本轮GM回复 ===
${gmReply}

=== 输出要求 ===
严格按以下JSON格式输出，不得添加任何其他内容。
无变化的字段输出空数组或null：

{
  "newFacts": [
    {
      "content": "事实内容，细粒度，不记录琐碎对话",
      "category": "world|npc|location|item|quest",
      "relatedNames": ["相关名称"],
      "importance": 3,
      "confidence": "high|medium|low"
    }
  ],
  "updatedFacts": [
    {
      "supersedes": "被替代的事实id",
      "content": "新事实内容",
      "category": "world|npc|location|item|quest",
      "relatedNames": ["相关名称"],
      "importance": 3,
      "confidence": "high|medium|low"
    }
  ],
  "timelineEvent": {
    "title": "事件标题（10字以内）",
    "description": "详细描述2~3句",
    "category": "story|combat|npc|discovery|quest",
    "relatedNames": ["相关名称"],
    "consequence": "直接后果1句",
    "importance": 3,
    "tags": ["death|boss|turning_point|first_meet|betrayal|discovery|quest_complete"]
  },
  "memoryGraphUpdates": {
    "nodeUpdates": [
      {
        "npcName": "NPC姓名",
        "newMemory": "本轮新增的细粒度记忆描述（若有）",
        "newAttitude": "新态度（若有变化）",
        "attitudeReason": "变化原因（若有变化）"
      }
    ],
    "edgeUpdates": [
      {
        "fromName": "NPC姓名",
        "toName": "NPC姓名",
        "relationship": "关系描述",
        "isNew": true
      }
    ]
  }
}

注意：
- importance 1~5：5=改变剧情走向的核心事实，4=重要NPC/地点/物品信息，3=普通背景信息，2=次要细节，1=几乎无用的琐碎信息
- confidence high=GM明确叙述，medium=可合理推断，low=不确定或玩家猜测
- importance<=2 且 confidence=low 的事实不要提取，直接忽略
- timelineEvent 只在有关键事件时输出，否则为 null
- 琐碎对话不记录为时间线事件，战斗/重要发现/关键NPC/任务推进才记录
- importance>=4 的事件会永久保留不被挤出，请谨慎给高分
- tags 从以下选择（可多选）：death, boss, turning_point, first_meet, betrayal, discovery, quest_complete；无合适 tag 时输出空数组
- memoryGraphUpdates 只包含本轮有记忆变化或新关系的 NPC
- newMemory 只在 NPC 与玩家有实质互动时填写；态度变化只在有明确原因时记录
- NPC 之间的关系只在 GM 明确描述时提取，不推测`
}

function updateInventoryFromExtract(parsed, slotIndex) {
  if (!parsed.playerInventory && !parsed.companionInventoryUpdates.length) return false
  const slot = loadSandboxSlot(slotIndex)
  const next = applyInventoryExtractToSlotState(
    slot,
    parsed.playerInventory,
    parsed.companionInventoryUpdates,
  )
  if (!next) return false
  saveSandboxSlot(slotIndex, next)
  return true
}

function hasMemoryGraphExtractChanges(memoryGraphUpdates) {
  if (!memoryGraphUpdates) return false
  return (
    (memoryGraphUpdates.nodeUpdates?.length ?? 0) > 0 ||
    (memoryGraphUpdates.edgeUpdates?.length ?? 0) > 0
  )
}

function hasAnyExtractChanges(parsed) {
  if (parsed.newFacts.length || parsed.updatedFacts.length) return true
  if (parsed.timelineEvent) return true
  if (hasMemoryGraphExtractChanges(parsed.memoryGraphUpdates)) return true
  return false
}

/**
 * GM 回复后事实库/时间线/记忆图谱后台提取；失败静默跳过。
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.gmReply
 * @param {number} opts.currentTurn
 * @param {number} opts.slotIndex
 * @param {() => void} [opts.onComplete]
 * @param {boolean} [opts.rollbackBeforeExtract] 重新生成时先回滚 currentTurn 的提取结果
 */
export async function extractAllStateUpdates({
  apiKey,
  gmReply,
  currentTurn,
  slotIndex,
  onComplete,
  rollbackBeforeExtract = false,
}) {
  const key = (apiKey || '').trim()
  const text = (gmReply || '').trim()
  if (!key || !text || !slotIndex) return

  if (rollbackBeforeExtract) {
    try {
      rollbackSandboxExtractForTurn(slotIndex, currentTurn)
      if (typeof onComplete === 'function') onComplete()
    } catch {
      /* */
    }
  }

  const activeFacts = getActiveFacts(slotIndex)
  const npcArchive = loadNpcArchive(slotIndex)
  const memoryGraph = loadNpcMemoryGraph(slotIndex)
  const prompt = buildAllStateExtractPrompt(
    text,
    activeFacts,
    npcArchive.npcs,
    memoryGraph,
    slotIndex,
  )

  let raw
  try {
    raw = await postChatNonStream({
      apiKey: key,
      messages: [
        { role: 'system', content: '你只输出 JSON 对象，不添加任何其他文字。' },
        { role: 'user', content: prompt },
      ],
    })
  } catch {
    return
  }

  const parsed = parseAllStateExtractJson(raw)
  if (!parsed || !hasAnyExtractChanges(parsed)) return

  let changed = false
  try {
    if (updateFactDatabase(parsed, currentTurn, slotIndex)) changed = true
  } catch {
    /* */
  }
  try {
    if (updateEventTimeline(parsed, currentTurn, slotIndex)) changed = true
  } catch {
    /* */
  }
  try {
    if (updateNpcMemoryGraphFromExtract(parsed, currentTurn, slotIndex)) changed = true
  } catch {
    /* */
  }

  if (changed && typeof onComplete === 'function') {
    onComplete()
  }
}

/** @deprecated 使用 extractAllStateUpdates */
export async function extractFactsAndEvents(opts) {
  return extractAllStateUpdates(opts)
}

/** @deprecated 使用 extractAllStateUpdates */
export async function extractAndUpdateFacts(opts) {
  return extractAllStateUpdates(opts)
}
