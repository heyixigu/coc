// 世界记忆模块：管理全局事件、局部事件、地点档案

/** @typedef {'war' | 'disaster' | 'discovery' | 'curse' | 'founding' | 'other'} WorldEventType */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   era: string,
 *   type: WorldEventType,
 *   summary: string,
 *   affectedRaces?: string[],
 *   affectedLocations?: string[],
 *   promotedFrom?: string,
 * }} GlobalWorldEvent
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   era: string,
 *   type: WorldEventType,
 *   location: string,
 *   coords: { x: number, y: number },
 *   baseRadius: number,
 *   radiusModifier: number,
 *   radius: number,
 *   scale: number,
 *   summary: string,
 *   affectedLocations: string[],
 * }} LocalWorldEvent
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   type?: string,
 *   coords?: { x: number, y: number },
 *   race?: string,
 *   population?: string,
 *   currentState?: string,
 *   notable?: string,
 *   history?: Array<{ type?: string, summary: string, era: string }>,
 *   generatedAt?: number,
 * }} LocationArchiveEntry
 */

export const DEFAULT_MAP_COORDS = { x: 0, y: 0 }

const EVENT_BASE_RADIUS = {
  war: 5,
  disaster: 3,
  discovery: 2,
  curse: 4,
  founding: 2,
  other: 3,
}

const WORLD_MEMORY_TYPES = ['global-events', 'local-events', 'locations']

/** @param {number} slotIndex 1-based @param {string} type */
function getKey(slotIndex, type) {
  return `sandbox-slot-${slotIndex}-world-memory-${type}`
}

/** @param {number} slotIndex 1-based */
export function clearWorldMemory(slotIndex) {
  for (const type of WORLD_MEMORY_TYPES) {
    try {
      localStorage.removeItem(getKey(slotIndex, type))
    } catch {
      /* */
    }
  }
}

/** @param {number} slotIndex 1-based @returns {GlobalWorldEvent[]} */
export function loadGlobalEvents(slotIndex) {
  try {
    const raw = localStorage.getItem(getKey(slotIndex, 'global-events'))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** @param {number} slotIndex 1-based @param {GlobalWorldEvent[]} events */
export function saveGlobalEvents(slotIndex, events) {
  localStorage.setItem(getKey(slotIndex, 'global-events'), JSON.stringify(events))
}

/** @param {number} slotIndex 1-based @returns {LocalWorldEvent[]} */
export function loadLocalEvents(slotIndex) {
  try {
    const raw = localStorage.getItem(getKey(slotIndex, 'local-events'))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** @param {number} slotIndex 1-based @param {LocalWorldEvent[]} events */
export function saveLocalEvents(slotIndex, events) {
  localStorage.setItem(getKey(slotIndex, 'local-events'), JSON.stringify(events))
}

/**
 * @param {number} slotIndex 1-based
 * @param {{
 *   name: string,
 *   era: string,
 *   type: WorldEventType,
 *   location: string,
 *   coords: { x: number, y: number },
 *   summary: string,
 *   radiusModifier?: number,
 * }} event
 * @returns {LocalWorldEvent}
 */
export function addLocalEvent(slotIndex, event) {
  const events = loadLocalEvents(slotIndex)
  const baseRadius = EVENT_BASE_RADIUS[event.type] || 3
  const modifier = event.radiusModifier || 0
  const newEvent = {
    id: `event_loc_${Date.now()}`,
    name: event.name,
    era: event.era,
    type: event.type,
    location: event.location,
    coords: event.coords,
    baseRadius,
    radiusModifier: modifier,
    radius: baseRadius + modifier,
    scale: 1,
    summary: event.summary,
    affectedLocations: [event.location],
  }
  events.push(newEvent)
  saveLocalEvents(slotIndex, events)
  return newEvent
}

/**
 * @param {number} slotIndex 1-based
 * @param {number} x
 * @param {number} y
 */
export function getEventsNearCoords(slotIndex, x, y) {
  const events = loadLocalEvents(slotIndex)
  return events.filter((e) => {
    const dx = Math.abs(e.coords.x - x)
    const dy = Math.abs(e.coords.y - y)
    return Math.max(dx, dy) <= e.radius
  })
}

/**
 * @param {number} slotIndex 1-based
 * @param {string} eventId
 * @param {string} locationName
 */
export function incrementEventScale(slotIndex, eventId, locationName) {
  const localEvents = loadLocalEvents(slotIndex)
  const idx = localEvents.findIndex((e) => e.id === eventId)
  if (idx === -1) return

  const event = localEvents[idx]
  if (!event.affectedLocations.includes(locationName)) {
    event.affectedLocations.push(locationName)
    event.scale += 1
  }

  if (event.scale >= 3) {
    const globalEvents = loadGlobalEvents(slotIndex)
    globalEvents.push({
      id: event.id,
      name: event.name,
      era: event.era,
      type: event.type,
      summary: event.summary,
      affectedRaces: [],
      affectedLocations: [...event.affectedLocations],
      promotedFrom: 'local',
    })
    saveGlobalEvents(slotIndex, globalEvents)
    localEvents.splice(idx, 1)
  } else {
    localEvents[idx] = event
  }
  saveLocalEvents(slotIndex, localEvents)
}

/** @param {number} slotIndex 1-based @returns {Record<string, LocationArchiveEntry>} */
export function loadLocationArchive(slotIndex) {
  try {
    const raw = localStorage.getItem(getKey(slotIndex, 'locations'))
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * @param {number} slotIndex 1-based
 * @param {string} locationId
 * @param {LocationArchiveEntry} data
 */
export function saveLocationToArchive(slotIndex, locationId, data) {
  const archive = loadLocationArchive(slotIndex)
  archive[locationId] = data
  localStorage.setItem(getKey(slotIndex, 'locations'), JSON.stringify(archive))
}

/**
 * @param {number} slotIndex 1-based
 * @param {string} locationId
 * @returns {LocationArchiveEntry | null}
 */
export function getLocationById(slotIndex, locationId) {
  const archive = loadLocationArchive(slotIndex)
  return archive[locationId] || null
}

/**
 * @param {number} slotIndex 1-based
 * @param {{ x: number, y: number }} currentCoords
 * @returns {string}
 */
export function buildWorldMemoryContext(slotIndex, currentCoords) {
  const globalEvents = loadGlobalEvents(slotIndex)
  const nearbyEvents = getEventsNearCoords(slotIndex, currentCoords.x, currentCoords.y)
  const currentLocation = getLocationById(slotIndex, `${currentCoords.x}-${currentCoords.y}`)

  let context = ''

  if (globalEvents.length > 0) {
    context += '【世界大事件】\n'
    globalEvents.forEach((e) => {
      context += `- ${e.name}（${e.era}）：${e.summary}\n`
    })
    context += '\n'
  }

  if (nearbyEvents.length > 0) {
    context += '【周边历史事件】\n'
    nearbyEvents.forEach((e) => {
      context += `- ${e.name}（${e.era}，${e.location}）：${e.summary}\n`
    })
    context += '\n'
  }

  if (currentLocation) {
    context += '【当前地点档案】\n'
    context += `名称：${currentLocation.name}\n`
    if (currentLocation.race) context += `种族：${currentLocation.race}\n`
    if (currentLocation.currentState) context += `现状：${currentLocation.currentState}\n`
    if (currentLocation.notable) context += `特色：${currentLocation.notable}\n`
    if (currentLocation.history?.length) {
      context += '历史：\n'
      currentLocation.history.forEach((h) => {
        context += `  - ${h.summary}（${h.era}）\n`
      })
    }
  }

  return context.trim()
}
