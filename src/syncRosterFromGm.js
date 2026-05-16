import { parseGmCurrentStatus } from './parseGmStatus.js'

/** @typedef {'up' | 'down'} FlashDir */

/**
 * @param {number} prev
 * @param {number} next
 * @returns {FlashDir | null}
 */
function flashDir(prev, next) {
  if (prev === next) return null
  return next < prev ? 'down' : 'up'
}

/**
 * 解析 GM 文本并合并到角色状态；返回各字段闪烁方向（无变化则无该项）。
 * @param {string} gmText
 * @param {{ name: string, hp: number, mp: number, san: number, talisman: number } | null} player
 * @param {{ name: string, hp: number, mp: number, san: number } | null} partner
 * @returns {{
 *   player: import('./parseGmStatus.js').ParsedPlayerStats | null,
 *   partner: { hp: number, mp: number, san: number } | null,
 *   flash: { player: Record<string, FlashDir>, partner: Record<string, FlashDir> }
 * } | null}
 */
export function mergeRosterFromGmText(gmText, player, partner) {
  const parsed = parseGmCurrentStatus(gmText)
  if (!parsed || !player || !partner) return null

  /** @type {Record<string, FlashDir>} */
  const flashPlayer = {}
  /** @type {Record<string, FlashDir>} */
  const flashPartner = {}

  const nextPlayer = { ...player }
  for (const key of /** @type {const} */ (['hp', 'mp', 'san', 'talisman'])) {
    const v = parsed.player[key]
    const d = flashDir(player[key], v)
    if (d) flashPlayer[key] = d
    nextPlayer[key] = v
  }

  const nextPartner = { ...partner }
  nextPartner.hp = parsed.partner.hp
  nextPartner.san = parsed.partner.san
  const dHp = flashDir(partner.hp, parsed.partner.hp)
  const dSan = flashDir(partner.san, parsed.partner.san)
  if (dHp) flashPartner.hp = dHp
  if (dSan) flashPartner.san = dSan

  if (parsed.partner.mp != null) {
    const dMp = flashDir(partner.mp, parsed.partner.mp)
    if (dMp) flashPartner.mp = dMp
    nextPartner.mp = parsed.partner.mp
  }

  return {
    player: nextPlayer,
    partner: nextPartner,
    flash: { player: flashPlayer, partner: flashPartner },
  }
}
