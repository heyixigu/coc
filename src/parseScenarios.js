/**
 * @typedef {{ title: string, summary: string, tags: string[], opening: string }} ScenarioOption
 */

/** @param {string} raw */
function extractJsonArray(raw) {
  const t = (raw || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fence ? fence[1].trim() : t
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) throw new Error('未找到 JSON 数组')
  return body.slice(start, end + 1)
}

/** @param {unknown} item */
function normalizeScenario(item) {
  if (!item || typeof item !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (item)
  const title = String(o.title ?? '').trim().slice(0, 24)
  const summary = String(o.summary ?? '').trim().slice(0, 120)
  const opening = String(o.opening ?? '').trim().slice(0, 2000)
  if (!title || !summary || !opening) return null
  const tagsRaw = Array.isArray(o.tags) ? o.tags : []
  const tags = tagsRaw
    .map((t) => String(t).trim().slice(0, 12))
    .filter(Boolean)
    .slice(0, 4)
  if (tags.length < 1) tags.push('悬疑')
  return { title, summary, tags, opening }
}

/**
 * @param {string} raw
 * @returns {ScenarioOption[]}
 */
export function parseScenariosJson(raw) {
  const jsonText = extractJsonArray(raw)
  const data = JSON.parse(jsonText)
  if (!Array.isArray(data)) throw new Error('剧本列表须为数组')
  const out = []
  for (const item of data) {
    const n = normalizeScenario(item)
    if (n) out.push(n)
  }
  if (out.length < 1) throw new Error('未解析到有效剧本')
  return out.slice(0, 3)
}
