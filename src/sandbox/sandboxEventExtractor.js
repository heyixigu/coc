// 单独提取本轮 GM 叙述中的局部事件，与六合一提取分离

import { postChatNonStream } from '../deepseek.js'
import {
  addLocalEvent,
  incrementEventScale,
  loadLocalEvents,
} from './sandboxWorldMemory.js'

/**
 * @param {string} worldName
 * @param {string} latestDialogue
 * @param {import('./sandboxWorldMemory.js').LocalWorldEvent[]} existingLocalEvents
 */
function buildEventExtractPrompt(worldName, latestDialogue, existingLocalEvents) {
  return `你是一个事件提取器。分析以下GM叙述，判断是否出现了值得记录的历史事件或正在发生的重大事件。

世界观：${worldName}
已有局部事件（避免重复）：
${
  existingLocalEvents.length > 0
    ? existingLocalEvents.map((e) => `- ${e.name}（${e.location}）`).join('\n')
    : '无'
}

最新GM叙述：
${latestDialogue}

判断标准：
- 战争、冲突、政变 → type: war
- 自然灾害、瘟疫、事故 → type: disaster
- 重要发现、遗迹、秘密 → type: discovery
- 诅咒、魔法异变 → type: curse
- 城镇建立、势力成立 → type: founding
- 其他重大事件 → type: other

如果本轮叙述中没有值得记录的新事件，返回：{"events": []}

如果有新事件，返回JSON：
{
  "events": [
    {
      "name": "事件名称",
      "era": "远古|百年前|近代|当下",
      "type": "war|disaster|discovery|curse|founding|other",
      "location": "发生地点名",
      "summary": "一句话简述，不超过30字",
      "radiusModifier": -1或0或1,
      "referencesExisting": "引用的已有事件id或null"
    }
  ]
}

只返回JSON，不要任何多余文字。`
}

/**
 * @param {string} raw
 */
function parseEventExtractJson(raw) {
  const clean = (raw || '').replace(/```json|```/g, '').trim()
  if (!clean) return { events: [] }
  const parsed = JSON.parse(clean)
  if (!parsed || typeof parsed !== 'object') return { events: [] }
  const events = /** @type {unknown} */ (parsed).events
  return { events: Array.isArray(events) ? events : [] }
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {number} opts.slotIndex 1-based
 * @param {string} opts.worldName
 * @param {{ x: number, y: number }} opts.currentCoords
 * @param {string} opts.currentLocationName
 * @param {string} opts.latestDialogue
 */
export async function extractLocalEvents({
  apiKey,
  slotIndex,
  worldName,
  currentCoords,
  currentLocationName,
  latestDialogue,
}) {
  const key = (apiKey || '').trim()
  if (!key || !latestDialogue?.trim()) return

  const existingLocalEvents = loadLocalEvents(slotIndex)

  try {
    const raw = await postChatNonStream({
      apiKey: key,
      messages: [
        { role: 'system', content: '你只输出 JSON 对象，不添加任何其他文字。' },
        {
          role: 'user',
          content: buildEventExtractPrompt(worldName, latestDialogue, existingLocalEvents),
        },
      ],
    })

    const parsed = parseEventExtractJson(raw)
    if (!parsed.events.length) return

    for (const event of parsed.events) {
      if (!event || typeof event !== 'object') continue
      const e = /** @type {Record<string, unknown>} */ (event)
      const referencesExisting =
        typeof e.referencesExisting === 'string' && e.referencesExisting.trim()
          ? e.referencesExisting.trim()
          : null

      if (referencesExisting) {
        incrementEventScale(slotIndex, referencesExisting, currentLocationName)
        continue
      }

      const name = typeof e.name === 'string' ? e.name.trim() : ''
      if (!name) continue

      const typeRaw = typeof e.type === 'string' ? e.type : 'other'
      const type =
        typeRaw === 'war' ||
        typeRaw === 'disaster' ||
        typeRaw === 'discovery' ||
        typeRaw === 'curse' ||
        typeRaw === 'founding'
          ? typeRaw
          : 'other'

      addLocalEvent(slotIndex, {
        name,
        era: typeof e.era === 'string' ? e.era : '当下',
        type,
        location:
          (typeof e.location === 'string' && e.location.trim()) || currentLocationName || '未知',
        coords: currentCoords,
        summary: typeof e.summary === 'string' ? e.summary.trim().slice(0, 120) : name,
        radiusModifier: Number(e.radiusModifier) || 0,
      })
    }
  } catch (e) {
    console.warn('局部事件提取失败', e)
  }
}
