/**
 * @typedef {{ hp: number, mp: number, san: number, talisman: number }} ParsedPlayerStats
 * @typedef {{ hp: number, mp: number | null, san: number }} ParsedPartnerStats
 * @typedef {{ player: ParsedPlayerStats, partner: ParsedPartnerStats }} ParsedRoster
 */

function parseIntSafe(m) {
  if (!m) return null
  const n = Number.parseInt(m[1], 10)
  return Number.isFinite(n) ? Math.min(999, Math.max(0, n)) : null
}

/**
 * 从 GM 全文提取【当前状态】行并解析数值；失败返回 null（不抛错）。
 * @param {string} gmText
 * @returns {ParsedRoster | null}
 */
export function parseGmCurrentStatus(gmText) {
  if (!gmText || typeof gmText !== 'string') return null

  const lineMatch = gmText.match(/【当前状态】[^\n\r]*/)
  if (!lineMatch) return null

  const line = lineMatch[0]
  const slashIdx = line.indexOf('/')
  if (slashIdx === -1) return null

  const playerSeg = line.slice(0, slashIdx)
  const partnerSeg = line.slice(slashIdx + 1)

  const hp = parseIntSafe(playerSeg.match(/何以惜顾\s*HP[：:]\s*(\d+)/i))
  const mp = parseIntSafe(playerSeg.match(/MP[：:]\s*(\d+)/i))
  const san = parseIntSafe(playerSeg.match(/SAN[：:]\s*(\d+)/i))
  const talisman = parseIntSafe(playerSeg.match(/符纸[：:]\s*(\d+)\s*张/i))

  const partnerHp = parseIntSafe(partnerSeg.match(/林知渺\s*HP[：:]\s*(\d+)/i))
  const partnerMp = parseIntSafe(partnerSeg.match(/MP[：:]\s*(\d+)/i))
  const partnerSan =
    parseIntSafe(partnerSeg.match(/林知渺[\s\S]*?SAN[：:]\s*(\d+)/i)) ??
    parseIntSafe(partnerSeg.match(/SAN[：:]\s*(\d+)/i))

  if (hp == null || mp == null || san == null || talisman == null) return null
  if (partnerHp == null || partnerSan == null) return null

  return {
    player: { hp, mp, san, talisman },
    partner: { hp: partnerHp, mp: partnerMp, san: partnerSan },
  }
}
