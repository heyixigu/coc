/** @typedef {'north' | 'south' | 'east' | 'west'} MoveDirection */

/** @type {Record<MoveDirection, { x: number, y: number }>} */
export const MOVE_DIRECTION_DELTA = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
}

const MOVE_TAG_RE = /\[MOVE:(north|south|east|west)\]\s*/gi

/**
 * @param {string} text
 * @returns {MoveDirection | null}
 */
export function parseMoveFromReply(text) {
  const match = (text || '').match(/\[MOVE:(north|south|east|west)\]/i)
  if (!match) return null
  return /** @type {MoveDirection} */ (match[1].toLowerCase())
}

/**
 * @param {string} text
 * @returns {string}
 */
export function stripMoveMarker(text) {
  return (text || '').replace(MOVE_TAG_RE, '').trim()
}

/**
 * @param {MoveDirection} direction
 * @param {{ x: number, y: number }} pos
 * @param {number} [gridSize=8]
 */
export function applyDirectionToPosition(direction, pos, gridSize = 8) {
  const delta = MOVE_DIRECTION_DELTA[direction]
  if (!delta) return pos
  const max = gridSize - 1
  return {
    x: Math.max(0, Math.min(max, pos.x + delta.x)),
    y: Math.max(0, Math.min(max, pos.y + delta.y)),
  }
}
