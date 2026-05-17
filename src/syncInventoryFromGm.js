import { parseGmCurrentItems } from './parseGmItems.js'

/** @typedef {'up' | 'down'} FlashDir */

/**
 * @param {string[]} prev
 * @param {string[]} next
 * @returns {{ display: string[], flash: Record<string, FlashDir> }}
 */
export function computeItemDisplayAndFlash(prev, next) {
  const prevList = prev ?? []
  const nextList = next ?? []
  /** @type {Record<string, FlashDir>} */
  const flash = {}
  const display = [...nextList]

  for (const item of nextList) {
    if (!prevList.includes(item)) flash[item] = 'up'
  }
  for (const item of prevList) {
    if (!nextList.includes(item)) {
      flash[item] = 'down'
      if (!display.includes(item)) display.push(item)
    }
  }

  return { display, flash }
}

/**
 * @param {string} gmText
 * @param {string[]} playerItems
 * @param {string[]} partnerItems
 * @param {string[]} sceneItems
 */
export function mergeInventoryFromGmText(gmText, playerItems, partnerItems, sceneItems) {
  const parsed = parseGmCurrentItems(gmText)
  if (!parsed) return null

  const nextPlayer = parsed.playerItems !== undefined ? parsed.playerItems : playerItems
  const nextPartner = parsed.partnerItems !== undefined ? parsed.partnerItems : partnerItems
  const nextScene = parsed.sceneItems !== undefined ? parsed.sceneItems : sceneItems

  return {
    playerItems: nextPlayer,
    partnerItems: nextPartner,
    sceneItems: nextScene,
    playerView: computeItemDisplayAndFlash(playerItems, nextPlayer),
    partnerView: computeItemDisplayAndFlash(partnerItems, nextPartner),
    sceneView: computeItemDisplayAndFlash(sceneItems, nextScene),
  }
}
