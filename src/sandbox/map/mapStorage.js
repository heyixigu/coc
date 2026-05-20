import { generateGrid } from './generateMap'
import { resetUsedNames, toMapWorldId } from './names'
import { createInitialMapState } from './useGameState'

/** @param {number} slotIndex 1-based */
export function getMapStateKey(slotIndex) {
  return `sandbox-slot-${slotIndex}-map-state`
}

/**
 * @param {number} slotIndex 1-based
 * @returns {import('./types').GameState | null}
 */
export function loadMapState(slotIndex) {
  try {
    const raw = localStorage.getItem(getMapStateKey(slotIndex))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (!Array.isArray(parsed.continentGrid) || !Array.isArray(parsed.localGrid)) return null
    return /** @type {import('./types').GameState} */ (parsed)
  } catch {
    return null
  }
}

/**
 * @param {number} slotIndex 1-based
 * @param {import('./types').GameState} state
 */
export function saveMapState(slotIndex, state) {
  try {
    localStorage.setItem(getMapStateKey(slotIndex), JSON.stringify(state))
  } catch {
    /* quota */
  }
}

/**
 * @param {number} slotIndex 1-based
 * @returns {import('./types').GameState}
 */
export function loadOrCreateMapState(slotIndex) {
  return loadMapState(slotIndex) ?? createInitialMapState()
}

/** @param {number} slotIndex 1-based */
export function clearMapState(slotIndex) {
  try {
    localStorage.removeItem(getMapStateKey(slotIndex))
  } catch {
    /* */
  }
  resetUsedNames()
}

/**
 * @param {import('./types').GameState | null | undefined} state
 * @returns {{ x: number, y: number }}
 */
export function continentCoordsFromMapState(state) {
  if (state?.continentPos) {
    return { x: state.continentPos.x, y: state.continentPos.y }
  }
  if (state?.currentCoords && typeof state.currentCoords.x === 'number') {
    return { x: state.currentCoords.x, y: state.currentCoords.y }
  }
  return { x: 4, y: 4 }
}

/**
 * @param {number} slotIndex 1-based
 * @param {string} [sandboxWorldId] sandbox_worlds.js 的 id（如 east / fantasy）
 * @returns {import('./types').Grid}
 */
export function loadInitialContinentGrid(slotIndex, sandboxWorldId) {
  const state = loadMapState(slotIndex)
  if (state?.continentGrid?.length) return state.continentGrid
  const mapWorldId = toMapWorldId(sandboxWorldId)
  return generateGrid(8, 8, 4, 4, false, mapWorldId)
}

/**
 * @param {number} slotIndex 1-based
 * @param {import('./types').Grid} continentGrid
 * @param {{ x: number, y: number }} continentPos
 */
export function saveContinentProgress(slotIndex, continentGrid, continentPos) {
  const prev = loadMapState(slotIndex) ?? createInitialMapState()
  saveMapState(slotIndex, {
    ...prev,
    continentGrid,
    continentPos,
    layer: 'continent',
  })
}
