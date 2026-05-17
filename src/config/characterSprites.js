/**
 * 林知渺立绘：裁切与动作以 dz/spriteConfigs.js 为准。
 */
import { PHOTOGRAPHER_CONFIG } from '../../dz/spriteConfigs.js'

/** @typedef {'idle' | 'thinking' | 'damaged'} SpriteState */

/** @param {Record<string, { row: number, frames?: number, speed: number, label?: string }>} raw */
function pickActions(raw) {
  /** @type {Record<string, { row: number, frames?: number, speed: number }>} */
  const out = {}
  for (const [key, val] of Object.entries(raw)) {
    out[key] = { row: val.row, frames: val.frames, speed: val.speed }
  }
  return out
}

export const LINZHIMIAO_SPRITE = {
  imagePath: PHOTOGRAPHER_CONFIG.imagePath,
  sheet: PHOTOGRAPHER_CONFIG.sheet,
  actions: pickActions(PHOTOGRAPHER_CONFIG.actions),
  idleCycle: ['breath', 'blink'],
  /** @param {SpriteState} state */
  actionForState(state) {
    if (state === 'thinking') return 'blink'
    return 'breath'
  },
}

export function getSpriteConfig() {
  return LINZHIMIAO_SPRITE
}
