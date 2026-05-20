// 序幕 Step 2.5：AI 生成世界骨架大事件

import { postChatNonStream } from '../deepseek.js'

/** @typedef {import('./sandboxWorldMemory.js').GlobalWorldEvent} GlobalWorldEvent */

const ALLOWED_TYPES = new Set(['war', 'disaster', 'discovery', 'curse', 'founding'])
const ALLOWED_ERAS = new Set(['远古', '百年前', '近代'])
const FALLBACK_TYPES = ['war', 'disaster', 'discovery', 'curse', 'founding']

/**
 * @param {string} worldName
 * @param {string} worldFlavor
 * @param {string[]} races
 */
function buildGlobalEventsPrompt(worldName, worldFlavor, races) {
  return `你是一个世界构建者。为以下世界观生成3个改变历史走向的全局大事件。

世界观：${worldName}
世界描述：${worldFlavor}
该世界的种族：${races.length > 0 ? races.join('、') : '未知'}

要求：
- 3个事件类型各不相同，从以下选择：war/disaster/discovery/curse/founding
- 时代分布合理：至少一个远古，一个百年前，一个近代
- 事件之间有因果或关联感，构成世界历史脉络
- summary每条不超过30字，简洁有力

只返回JSON，格式：
{
  "events": [
    {
      "id": "event_global_0",
      "name": "事件名称",
      "era": "远古|百年前|近代",
      "type": "war|disaster|discovery|curse|founding",
      "summary": "一句话简述",
      "affectedRaces": ["种族名"],
      "affectedLocations": [],
      "promotedFrom": "ai_generated"
    }
  ]
}`
}

/**
 * @param {unknown} raw
 * @returns {GlobalWorldEvent[]}
 */
function normalizeGlobalEvents(raw) {
  const list = Array.isArray(raw) ? raw : []
  return list.slice(0, 3).map((item, i) => {
    const e = /** @type {Record<string, unknown>} */ (item && typeof item === 'object' ? item : {})
    const type = typeof e.type === 'string' && ALLOWED_TYPES.has(e.type) ? e.type : FALLBACK_TYPES[i % 5]
    const era =
      typeof e.era === 'string' && ALLOWED_ERAS.has(e.era)
        ? e.era
        : ['远古', '百年前', '近代'][i % 3]
    const summary = String(e.summary ?? '').trim().slice(0, 30)
    const name = String(e.name ?? '').trim() || `历史事件 ${i + 1}`
    return {
      id: typeof e.id === 'string' && e.id ? e.id : `event_global_${i}`,
      name,
      era,
      type: /** @type {GlobalWorldEvent['type']} */ (type),
      summary: summary || name,
      affectedRaces: Array.isArray(e.affectedRaces)
        ? e.affectedRaces.map((r) => String(r)).filter(Boolean)
        : [],
      affectedLocations: [],
      promotedFrom: 'ai_generated',
    }
  })
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.worldName
 * @param {string} opts.worldFlavor
 * @param {string[]} [opts.races]
 * @returns {Promise<GlobalWorldEvent[]>}
 */
export async function generateGlobalEvents({
  apiKey,
  worldName,
  worldFlavor,
  races = [],
}) {
  const key = (apiKey || '').trim()
  if (!key) return []

  try {
    const raw = await postChatNonStream({
      apiKey: key,
      messages: [
        { role: 'system', content: '你只输出 JSON 对象，不添加任何其他文字。' },
        {
          role: 'user',
          content: buildGlobalEventsPrompt(worldName, worldFlavor, races),
        },
      ],
    })

    const clean = (raw || '').replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean || '{"events":[]}')
    const events = parsed?.events ?? parsed
    return normalizeGlobalEvents(events)
  } catch (e) {
    console.warn('骨架事件生成失败', e)
    return []
  }
}
