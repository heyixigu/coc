import { postChatNonStream } from '../deepseek.js'
import { loadNpcArchive, saveNpcArchive } from './sandboxStorage.js'

/**
 * @typedef {import('./sandboxStorage.js').SandboxNpcArchive} SandboxNpcArchive
 * @typedef {import('./sandboxStorage.js').SandboxNpcEntry} SandboxNpcEntry
 */

/**
 * @typedef {{
 *   name: string,
 *   identity: string,
 *   relationship: string,
 *   status: string,
 * }} NpcExtractItem
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
    return null
  }
  return body.slice(start, end + 1)
}

/**
 * @param {string} raw
 * @returns {NpcExtractItem[] | null}
 */
function parseNpcExtractJson(raw) {
  const jsonStr = extractJsonArray(raw)
  if (jsonStr === null) return null
  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) return null
    const out = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const o = /** @type {Record<string, unknown>} */ (item)
      const name = typeof o.name === 'string' ? o.name.trim().slice(0, 32) : ''
      if (!name) continue
      out.push({
        name,
        identity: typeof o.identity === 'string' ? o.identity.trim().slice(0, 500) : '',
        relationship: typeof o.relationship === 'string' ? o.relationship.trim().slice(0, 500) : '',
        status: typeof o.status === 'string' ? o.status.trim().slice(0, 500) : '',
      })
    }
    return out
  } catch {
    return null
  }
}

/**
 * @param {SandboxNpcArchive} archive
 * @param {NpcExtractItem[]} extracted
 * @returns {SandboxNpcArchive}
 */
export function mergeNpcArchive(archive, extracted) {
  const npcs = [...(archive.npcs ?? [])]
  const now = new Date().toISOString()

  for (const item of extracted) {
    const name = item.name.trim()
    if (!name) continue
    const idx = npcs.findIndex((n) => n.name === name)
    if (idx >= 0) {
      const existing = npcs[idx]
      npcs[idx] = {
        ...existing,
        relationship: item.relationship || existing.relationship,
        status: item.status || existing.status,
        ...(item.identity ? { identity: item.identity } : {}),
        updatedAt: now,
      }
    } else {
      npcs.push({
        id: `npc_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name,
        identity: item.identity || '',
        relationship: item.relationship || '',
        status: item.status || '',
        updatedAt: now,
      })
    }
  }

  return { npcs }
}

/**
 * @param {SandboxNpcEntry[]} existingNpcs
 * @param {string} gmReply
 */
function buildNpcExtractPrompt(existingNpcs, gmReply) {
  return `以下是本轮跑团GM回复内容，请提取其中出现的NPC信息。

要求：
1. 只提取有名字的NPC，无名路人忽略
2. 若NPC已在档案中存在，输出更新后的完整信息
3. 若是新NPC，输出完整档案
4. 若本轮没有新NPC也没有NPC状态变化，输出空数组

严格按以下JSON格式输出，不得添加任何其他内容：
[
  {
    "name": "NPC姓名",
    "identity": "身份背景（1~2句）",
    "relationship": "与玩家当前关系",
    "status": "当前状态或位置"
  }
]

当前NPC档案库：
${JSON.stringify(existingNpcs)}

本轮GM回复：
${gmReply}`
}

/**
 * GM 回复后后台提取并合并 NPC 档案；失败静默跳过。
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.gmReply
 * @param {number} opts.slotIndex 1-based
 */
export async function extractAndUpdateNpcs({ apiKey, gmReply, slotIndex }) {
  const key = (apiKey || '').trim()
  const text = (gmReply || '').trim()
  if (!key || !text || !slotIndex) return

  const archive = loadNpcArchive(slotIndex)
  const prompt = buildNpcExtractPrompt(archive.npcs, text)

  let raw
  try {
    raw = await postChatNonStream({
      apiKey: key,
      messages: [
        { role: 'system', content: '你只输出 JSON 数组，不添加任何其他文字。' },
        { role: 'user', content: prompt },
      ],
    })
  } catch {
    return
  }

  const extracted = parseNpcExtractJson(raw)
  if (extracted === null) return
  if (extracted.length === 0) return

  const merged = mergeNpcArchive(archive, extracted)
  saveNpcArchive(slotIndex, merged)
}
