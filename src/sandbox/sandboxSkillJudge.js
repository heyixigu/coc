import { SANDBOX_SKILL_NAMES } from './config/sandbox_judge_prompt.js'

/**
 * @typedef {{ skill: string, value: number, character?: string }} SandboxSkillCheck
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
 * @param {unknown} raw
 * @returns {unknown[]}
 */
function unwrapJudgePayload(raw) {
  const t = (raw || '').trim()
  if (t.startsWith('{')) {
    try {
      const obj = JSON.parse(t)
      if (obj && typeof obj === 'object' && Array.isArray(/** @type {any} */ (obj).checks)) {
        return /** @type {any} */ (obj).checks
      }
    } catch {
      /* fall through to array extract */
    }
  }
  const jsonText = extractJsonArray(raw)
  const data = JSON.parse(jsonText)
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray(/** @type {any} */ (data).checks)) {
    return /** @type {any} */ (data).checks
  }
  throw new Error('裁判返回须为 JSON 数组')
}

/**
 * @param {unknown} item
 * @returns {SandboxSkillCheck | null}
 */
function normalizeEntry(item) {
  if (!item || typeof item !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (item)
  const skill = String(o.skill ?? o.name ?? '').trim().slice(0, 32)
  const rawV = Number.parseInt(String(o.value ?? o.skillValue ?? 0), 10)
  if (!skill || !Number.isFinite(rawV)) return null
  if (!SANDBOX_SKILL_NAMES.includes(skill)) return null
  const character =
    typeof o.character === 'string' && o.character.trim()
      ? o.character.trim().slice(0, 32)
      : undefined
  return {
    skill,
    value: Math.min(100, Math.max(1, Math.trunc(rawV))),
    ...(character ? { character } : {}),
  }
}

const MAX_CHECKS_PER_TURN = 8

/**
 * @param {string} raw
 * @returns {SandboxSkillCheck[]}
 */
export function parseSandboxJudgeSkillsJson(raw) {
  const data = unwrapJudgePayload(raw)
  const out = []
  for (const item of data) {
    const n = normalizeEntry(item)
    if (n) out.push(n)
    if (out.length >= MAX_CHECKS_PER_TURN) break
  }
  return out
}
