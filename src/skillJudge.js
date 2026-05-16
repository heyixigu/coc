/**
 * @typedef {{ skill: string, value: number }} SkillCheck
 */

/** @param {string} raw */
function extractJsonArray(raw) {
  const t = (raw || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fence ? fence[1].trim() : t
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) {
    if (body.trim() === '[]') return '[]'
    throw new Error('未找到 JSON 数组')
  }
  return body.slice(start, end + 1)
}

/**
 * @param {unknown} item
 * @returns {SkillCheck | null}
 */
function normalizeEntry(item) {
  if (!item || typeof item !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (item)
  const skill = String(o.skill ?? o.name ?? '').trim().slice(0, 32)
  const rawV = Number.parseInt(String(o.value ?? o.skillValue ?? 0), 10)
  if (!skill || !Number.isFinite(rawV)) return null
  return {
    skill,
    value: Math.min(100, Math.max(1, Math.trunc(rawV))),
  }
}

const MAX_CHECKS_PER_TURN = 8

/**
 * @param {string} raw
 * @returns {SkillCheck[]}
 */
export function parseJudgeSkillsJson(raw) {
  const jsonText = extractJsonArray(raw)
  const data = JSON.parse(jsonText)
  if (!Array.isArray(data)) throw new Error('裁判返回须为 JSON 数组')
  const out = []
  for (const item of data) {
    const n = normalizeEntry(item)
    if (n) out.push(n)
    if (out.length >= MAX_CHECKS_PER_TURN) break
  }
  return out
}
