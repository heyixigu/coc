/**
 * @typedef {{ name: string, hp: number, mp: number, san: number, talisman: number }} PlayerChar
 * @typedef {{ name: string, hp: number, mp: number, san: number }} PartnerChar
 */

function clampInt(v, min = 0, max = 999) {
  const n = Number.parseInt(String(v), 10)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

/** @param {string} raw */
function extractJsonObject(raw) {
  const t = (raw || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fence ? fence[1].trim() : t
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('未找到 JSON 对象')
  return body.slice(start, end + 1)
}

/**
 * @param {string} raw
 * @returns {{ player: PlayerChar, partner: PartnerChar }}
 */
export function parseCharacterInitJson(raw) {
  const jsonText = extractJsonObject(raw)
  const data = JSON.parse(jsonText)
  if (!data || typeof data !== 'object') throw new Error('JSON 无效')

  const p = /** @type {Record<string, unknown>} */ (data.player || {})
  const q = /** @type {Record<string, unknown>} */ (data.partner || {})

  const player = {
    name: String(p.name ?? '何以惜顾').trim().slice(0, 32) || '何以惜顾',
    hp: clampInt(p.hp),
    mp: clampInt(p.mp),
    san: clampInt(p.san),
    talisman: clampInt(p.talisman ?? p.papers ?? 0),
  }
  const partner = {
    name: String(q.name ?? '林知渺').trim().slice(0, 32) || '林知渺',
    hp: clampInt(q.hp),
    mp: clampInt(q.mp),
    san: clampInt(q.san),
  }

  return { player, partner }
}
