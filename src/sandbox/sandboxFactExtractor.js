import { postChatNonStream } from '../deepseek.js'
import { rollbackSandboxExtractForTurn } from './sandboxExtractRollback.js'
import { mergeNpcArchive } from './sandboxNpcExtractor.js'
import {
  getActiveFacts,
  loadEventTimeline,
  loadFactDatabase,
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
 * }} TimelineExtractEvent
 */

/**
 * @typedef {{
 *   name: string,
 *   isNew?: boolean,
 *   identity?: string,
 *   relationship?: string,
 *   status?: string,
 * }} NpcExtractUpdate
 */

/**
 * @typedef {{
 *   name: string,
 *   status?: string,
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
 *   type: string,
 *   value: string,
 * }} EnvironmentUpdate
 */

/**
 * @typedef {{
 *   name: string,
 *   location?: string,
 *   status?: string,
 *   isNew?: boolean,
 * }} KeyItemUpdate
 */

/**
 * @typedef {{
 *   locations?: LocationUpdate[],
 *   factions?: FactionUpdate[],
 *   environment?: EnvironmentUpdate[],
 *   keyItems?: KeyItemUpdate[],
 * }} WorldStateUpdates
 */

/**
 * @typedef {{
 *   newFacts: FactExtractNew[],
 *   updatedFacts: FactExtractUpdate[],
 *   timelineEvent: TimelineExtractEvent | null,
 *   npcUpdates: NpcExtractUpdate[],
 *   worldStateUpdates: WorldStateUpdates | null,
 *   questUpdates: QuestUpdates | null,
 *   memoryGraphUpdates: MemoryGraphUpdates | null,
 *   playerInventory: import('./sandboxInventoryExtract.js').PlayerInventoryExtract | null,
 *   companionInventoryUpdates: import('./sandboxInventoryExtract.js').CompanionInventoryExtract[],
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

function newKeyItemId() {
  return `item_${Date.now()}_${Math.random().toString(16).slice(2)}`
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

/** @param {unknown} raw */
function normalizeEnvType(raw) {
  const t = String(raw ?? '天气').trim()
  if (t === '天气' || t === '时间' || t === '季节') return t
  return '天气'
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
  return {
    title,
    description,
    category: normalizeTimelineCategory(o.category),
    relatedNames: normalizeRelatedNames(o.relatedNames),
    consequence: typeof o.consequence === 'string' ? o.consequence.trim().slice(0, 500) : '',
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
    const npcUpdates = []

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

    if (Array.isArray(o.npcUpdates)) {
      for (const item of o.npcUpdates) {
        if (!item || typeof item !== 'object') continue
        const n = /** @type {Record<string, unknown>} */ (item)
        const name = typeof n.name === 'string' ? n.name.trim().slice(0, 32) : ''
        if (!name) continue
        npcUpdates.push({
          name,
          isNew: n.isNew === true,
          identity: typeof n.identity === 'string' ? n.identity.trim().slice(0, 500) : '',
          relationship:
            typeof n.relationship === 'string' ? n.relationship.trim().slice(0, 500) : '',
          status: typeof n.status === 'string' ? n.status.trim().slice(0, 500) : '',
        })
      }
    }

    let worldStateUpdates = null
    if (o.worldStateUpdates != null && typeof o.worldStateUpdates === 'object') {
      const ws = /** @type {Record<string, unknown>} */ (o.worldStateUpdates)
      /** @type {WorldStateUpdates} */
      const out = {}
      if (Array.isArray(ws.locations)) {
        out.locations = ws.locations
          .filter((x) => x && typeof x === 'object')
          .map((x) => {
            const l = /** @type {Record<string, unknown>} */ (x)
            return {
              name: typeof l.name === 'string' ? l.name.trim().slice(0, 32) : '',
              status: typeof l.status === 'string' ? l.status.trim().slice(0, 500) : '',
              isNew: l.isNew === true,
            }
          })
          .filter((l) => l.name)
      }
      if (Array.isArray(ws.factions)) {
        out.factions = ws.factions
          .filter((x) => x && typeof x === 'object')
          .map((x) => {
            const f = /** @type {Record<string, unknown>} */ (x)
            return {
              name: typeof f.name === 'string' ? f.name.trim().slice(0, 32) : '',
              attitudeToPlayer:
                typeof f.attitudeToPlayer === 'string'
                  ? f.attitudeToPlayer.trim().slice(0, 200)
                  : '',
              currentStatus:
                typeof f.currentStatus === 'string' ? f.currentStatus.trim().slice(0, 500) : '',
              isNew: f.isNew === true,
            }
          })
          .filter((f) => f.name)
      }
      if (Array.isArray(ws.environment)) {
        out.environment = ws.environment
          .filter((x) => x && typeof x === 'object')
          .map((x) => {
            const e = /** @type {Record<string, unknown>} */ (x)
            return {
              type: normalizeEnvType(e.type),
              value: typeof e.value === 'string' ? e.value.trim().slice(0, 200) : '',
            }
          })
          .filter((e) => e.value)
      }
      if (Array.isArray(ws.keyItems)) {
        out.keyItems = ws.keyItems
          .filter((x) => x && typeof x === 'object')
          .map((x) => {
            const i = /** @type {Record<string, unknown>} */ (x)
            return {
              name: typeof i.name === 'string' ? i.name.trim().slice(0, 32) : '',
              location: typeof i.location === 'string' ? i.location.trim().slice(0, 200) : '',
              status: typeof i.status === 'string' ? i.status.trim().slice(0, 500) : '',
              isNew: i.isNew === true,
            }
          })
          .filter((i) => i.name)
      }
      worldStateUpdates = out
    }

    let questUpdates = null
    if (o.questUpdates != null && typeof o.questUpdates === 'object') {
      const qu = /** @type {Record<string, unknown>} */ (o.questUpdates)
      /** @type {QuestUpdates} */
      const outQuest = {}
      if (Array.isArray(qu.newQuests)) {
        outQuest.newQuests = qu.newQuests
          .filter((x) => x && typeof x === 'object')
          .map((x) => {
            const q = /** @type {Record<string, unknown>} */ (x)
            const title = typeof q.title === 'string' ? q.title.trim().slice(0, 64) : ''
            const objectives = []
            if (Array.isArray(q.objectives)) {
              for (const ob of q.objectives) {
                if (!ob || typeof ob !== 'object') continue
                const obj = /** @type {Record<string, unknown>} */ (ob)
                const desc =
                  typeof obj.description === 'string' ? obj.description.trim().slice(0, 500) : ''
                if (!desc) continue
                objectives.push({ description: desc })
              }
            }
            return {
              title,
              description:
                typeof q.description === 'string' ? q.description.trim().slice(0, 2000) : '',
              category: normalizeQuestCategory(q.category),
              givenBy: typeof q.givenBy === 'string' ? q.givenBy.trim().slice(0, 64) : '',
              objectives,
              reward: typeof q.reward === 'string' ? q.reward.trim().slice(0, 500) : '',
            }
          })
          .filter((q) => q.title)
      }
      if (Array.isArray(qu.updatedQuests)) {
        outQuest.updatedQuests = qu.updatedQuests
          .filter((x) => x && typeof x === 'object')
          .map((x) => {
            const u = /** @type {Record<string, unknown>} */ (x)
            const id = typeof u.id === 'string' ? u.id.trim().slice(0, 64) : ''
            if (!id) return null
            const completedObjectives = []
            if (Array.isArray(u.completedObjectives)) {
              for (const cid of u.completedObjectives) {
                if (typeof cid === 'string' && cid.trim()) {
                  completedObjectives.push(cid.trim().slice(0, 64))
                }
              }
            }
            const newObjectives = []
            if (Array.isArray(u.newObjectives)) {
              for (const ob of u.newObjectives) {
                if (!ob || typeof ob !== 'object') continue
                const obj = /** @type {Record<string, unknown>} */ (ob)
                const desc =
                  typeof obj.description === 'string' ? obj.description.trim().slice(0, 500) : ''
                if (!desc) continue
                newObjectives.push({ description: desc })
              }
            }
            return {
              id,
              status: u.status != null ? normalizeQuestStatus(u.status) : undefined,
              completedObjectives,
              newObjectives,
            }
          })
          .filter((u) => u != null)
      }
      questUpdates = outQuest
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

    let playerInventory = null
    if (o.playerInventory != null && typeof o.playerInventory === 'object') {
      playerInventory = normalizePlayerInventoryExtract(o.playerInventory)
    }

    const companionInventoryUpdates = normalizeCompanionInventoryExtracts(
      o.companionInventoryUpdates,
    )

    return {
      newFacts,
      updatedFacts,
      timelineEvent,
      npcUpdates,
      worldStateUpdates,
      questUpdates,
      memoryGraphUpdates,
      playerInventory,
      companionInventoryUpdates,
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
      },
    ],
  })
  return true
}

function updateNpcArchiveFromExtract(parsed, slotIndex) {
  if (!parsed.npcUpdates.length) return false
  const existing = loadNpcArchive(slotIndex)
  const items = parsed.npcUpdates.map((n) => ({
    name: n.name,
    identity: n.identity || '',
    relationship: n.relationship || '',
    status: n.status || '',
  }))
  saveNpcArchive(slotIndex, mergeNpcArchive(existing, items))
  return true
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
    environment: [...existing.environment],
    keyItems: [...existing.keyItems],
  }
  let changed = false

  for (const loc of updates.locations ?? []) {
    if (!loc.name) continue
    const idx = newState.locations.findIndex((l) => l.name === loc.name)
    if (idx >= 0) {
      newState.locations[idx] = {
        ...newState.locations[idx],
        status: loc.status ?? newState.locations[idx].status,
        updatedAt: turn,
      }
    } else {
      newState.locations.push({
        id: newLocId(),
        name: loc.name,
        status: loc.status || '',
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

  for (const env of updates.environment ?? []) {
    if (!env.value) continue
    const type = normalizeEnvType(env.type)
    const idx = newState.environment.findIndex((e) => e.type === type)
    if (idx >= 0) {
      newState.environment[idx] = { type, value: env.value, updatedAt: turn }
    } else {
      newState.environment.push({ type, value: env.value, updatedAt: turn })
    }
    changed = true
  }

  for (const item of updates.keyItems ?? []) {
    if (!item.name) continue
    const idx = newState.keyItems.findIndex((i) => i.name === item.name)
    if (idx >= 0) {
      newState.keyItems[idx] = {
        ...newState.keyItems[idx],
        location: item.location ?? newState.keyItems[idx].location,
        status: item.status ?? newState.keyItems[idx].status,
        updatedAt: turn,
      }
    } else {
      newState.keyItems.push({
        id: newKeyItemId(),
        name: item.name,
        location: item.location || '',
        status: item.status || '',
        updatedAt: turn,
      })
    }
    changed = true
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

function buildAllStateExtractPrompt(
  gmReply,
  activeFacts,
  existingNpcs,
  existingMemoryGraph,
  existingWorldState,
  activeQuests,
  playerInventory,
  companions,
) {
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
      ? existingNpcs
          .map((n) => `[${n.id}] ${n.name}：${n.identity} | 关系：${n.relationship} | 状态：${n.status}`)
          .join('\n')
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

  const ws = existingWorldState
  const wsFactions =
    ws.factions.map((f) => `${f.name}(${f.attitudeToPlayer}·${f.currentStatus})`).join('、') ||
    '暂无'
  const wsLocations =
    ws.locations.map((l) => `${l.name}(${l.status})`).join('、') || '暂无'
  const wsEnv =
    ws.environment.map((e) => `${e.type}:${e.value}`).join('、') || '暂无'

  const playerInvText = formatPlayerInventoryForExtractPrompt(playerInventory)
  const companionInvText =
    companions.length > 0
      ? companions.map((c) => formatCompanionInventoryForExtractPrompt(c)).join('\n')
      : '暂无'

  const questLines =
    activeQuests.length > 0
      ? activeQuests
          .map(
            (q) =>
              `[${q.id}] [${q.category}] ${q.title}：${q.description}\n   目标：${q.objectives.map((o) => `${o.completed ? '✓' : '○'} ${o.description}`).join('、')}`,
          )
          .join('\n')
      : '暂无'

  return `你是一个跑团状态提取器。请从以下GM回复中同时提取各类结构化信息。

=== 现有数据 ===

事实库：
${factLines}

NPC档案：
${npcLines}

NPC记忆图谱：
${memoryNodeLines}

NPC关系网络：
${memoryEdgeLines}

世界状态：
势力：${wsFactions}
地点：${wsLocations}
环境：${wsEnv}

主角物品（装备栏=穿戴/手持，物品栏=背包携带）：
${playerInvText}

伙伴物品与状态：
${companionInvText}

进行中任务：
${questLines}

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
    "consequence": "直接后果1句"
  },
  "npcUpdates": [
    {
      "name": "NPC姓名",
      "isNew": true,
      "identity": "身份背景1~2句",
      "relationship": "与玩家关系",
      "status": "当前状态或位置"
    }
  ],
  "worldStateUpdates": {
    "locations": [
      { "name": "地点名", "status": "当前状态", "isNew": true }
    ],
    "factions": [
      { "name": "势力名", "attitudeToPlayer": "态度", "currentStatus": "当前状况", "isNew": true }
    ],
    "environment": [
      { "type": "天气|时间|季节", "value": "值" }
    ]
  },
  "playerInventory": {
    "equipped": [
      { "name": "物品名", "description": "简述" }
    ],
    "carried": [
      { "name": "物品名", "description": "简述", "quantity": 1 }
    ]
  },
  "companionInventoryUpdates": [
    {
      "name": "伙伴名",
      "role": "定位",
      "hp": 0,
      "maxHp": 0,
      "mp": 0,
      "maxMp": 0,
      "skills": { "战斗": 0, "交涉": 0, "感知": 0, "潜行": 0, "学识": 0, "意志": 0, "体魄": 0 },
      "equipped": [{ "name": "物品名", "description": "简述" }],
      "carried": [{ "name": "物品名", "description": "简述", "quantity": 1 }],
      "status": "active|dead|departed"
    }
  ],
  "questUpdates": {
    "newQuests": [
      {
        "title": "任务标题",
        "description": "任务描述",
        "category": "main|side",
        "givenBy": "委托人",
        "objectives": [
          { "description": "目标描述" }
        ],
        "reward": "奖励描述"
      }
    ],
    "updatedQuests": [
      {
        "id": "被更新的任务id",
        "status": "active|completed|failed",
        "completedObjectives": ["已完成的目标id列表"],
        "newObjectives": [
          { "description": "新增目标描述" }
        ]
      }
    ]
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
- npcUpdates 只包含本轮出现或状态变化的 NPC
- worldStateUpdates 只包含本轮发生变化的条目
- isNew 为 true 表示新增，false 表示更新现有条目
- questUpdates 只包含本轮发生变化的任务
- 新任务只在 GM 明确给出委托/任务时创建，不要推测
- 任务完成/失败只在 GM 明确叙述结果时标记
- memoryGraphUpdates 只包含本轮有记忆变化或新关系的 NPC
- newMemory 只在 NPC 与玩家有实质互动时填写，路人 NPC 忽略
- 态度变化只在有明确原因时记录
- NPC 之间的关系只在 GM 明确描述时提取，不推测
- playerInventory 与 companionInventoryUpdates 若输出则表示该角色当前完整装备/背包快照（全量列表），物品丢失/损毁/转让后从列表移除
- equipped=穿戴或手持，carried=背包未穿戴；伙伴 status=departed 表示离队`
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

function hasQuestExtractChanges(questUpdates) {
  if (!questUpdates) return false
  return (questUpdates.newQuests?.length ?? 0) > 0 || (questUpdates.updatedQuests?.length ?? 0) > 0
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
  if (parsed.npcUpdates.length) return true
  if (hasQuestExtractChanges(parsed.questUpdates)) return true
  if (hasMemoryGraphExtractChanges(parsed.memoryGraphUpdates)) return true
  if (parsed.playerInventory) return true
  if (parsed.companionInventoryUpdates.length > 0) return true
  const ws = parsed.worldStateUpdates
  if (!ws) return false
  return (
    (ws.locations?.length ?? 0) > 0 ||
    (ws.factions?.length ?? 0) > 0 ||
    (ws.environment?.length ?? 0) > 0 ||
    (ws.keyItems?.length ?? 0) > 0
  )
}

/**
 * GM 回复后六合一后台提取；失败静默跳过。
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
  const worldState = loadWorldState(slotIndex)
  const questState = loadQuestState(slotIndex)
  const activeQuests = questState.quests.filter((q) => q.status === 'active')
  const slot = loadSandboxSlot(slotIndex)
  const prompt = buildAllStateExtractPrompt(
    text,
    activeFacts,
    npcArchive.npcs,
    memoryGraph,
    worldState,
    activeQuests,
    slot.playerInventory,
    slot.companions ?? [],
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
    if (updateNpcArchiveFromExtract(parsed, slotIndex)) changed = true
  } catch {
    /* */
  }
  try {
    if (updateWorldStateFromExtract(parsed, currentTurn, slotIndex)) changed = true
  } catch {
    /* */
  }
  try {
    if (updateQuestStateFromExtract(parsed, currentTurn, slotIndex)) changed = true
  } catch {
    /* */
  }
  try {
    if (updateNpcMemoryGraphFromExtract(parsed, currentTurn, slotIndex)) changed = true
  } catch {
    /* */
  }
  try {
    if (updateInventoryFromExtract(parsed, slotIndex)) changed = true
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
