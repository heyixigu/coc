/**
 * @typedef {{ playerItems?: string[], partnerItems?: string[], sceneItems?: string[] }} ParsedItems
 */

/**
 * @param {string} gmText
 * @returns {string}
 */
export function extractGmStatusBlock(gmText) {
  if (!gmText || typeof gmText !== 'string') return ''
  const multi = gmText.match(/【当前状态】([\s\S]*?)(?=【你可以：】)/)
  if (multi) return `【当前状态】${multi[1]}`
  const single = gmText.match(/【当前状态】[^\n\r]*/)
  return single ? single[0] : ''
}

/**
 * @param {string} raw
 * @returns {string[] | null} null = 未匹配到该行
 */
export function splitItemList(raw) {
  if (raw == null) return null
  const t = String(raw).trim()
  if (!t) return null
  if (t === '无' || t === '暂无' || t === '（无）') return []
  return t
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter((s) => s && s !== '无' && s !== '暂无')
}

/**
 * @param {string} block
 * @param {string} label
 * @returns {string[] | null}
 */
function parseItemLine(block, label) {
  const re = new RegExp(`${label}[：:]\\s*([^\\n\\r]+)`)
  const m = block.match(re)
  if (!m) return null
  return splitItemList(m[1])
}

/**
 * 从 GM 全文【当前状态】段解析三个物品栏；全部未匹配时返回 null。
 * @param {string} gmText
 * @returns {ParsedItems | null}
 */
export function parseGmCurrentItems(gmText) {
  const block = extractGmStatusBlock(gmText)
  if (!block) return null

  const playerItems = parseItemLine(block, '何以惜顾物品')
  const partnerItems = parseItemLine(block, '林知渺物品')
  const sceneItems = parseItemLine(block, '探索物品')

  if (playerItems === null && partnerItems === null && sceneItems === null) return null

  /** @type {ParsedItems} */
  const out = {}
  if (playerItems !== null) out.playerItems = playerItems
  if (partnerItems !== null) out.partnerItems = partnerItems
  if (sceneItems !== null) out.sceneItems = sceneItems
  return out
}
