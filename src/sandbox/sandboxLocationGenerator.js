// 玩家进入新地点时，AI 生成该地点的完整档案

import { postChatNonStream } from '../deepseek.js'
import {
  getEventsNearCoords,
  loadGlobalEvents,
  saveLocationToArchive,
} from './sandboxWorldMemory.js'

/**
 * @param {string} worldName
 * @param {string} locationType
 * @param {string} locationName
 * @param {import('./sandboxWorldMemory.js').GlobalWorldEvent[]} globalEvents
 * @param {import('./sandboxWorldMemory.js').LocalWorldEvent[]} nearbyEvents
 * @param {string[]} races
 */
function buildLocationGenPrompt(
  worldName,
  locationType,
  locationName,
  globalEvents,
  nearbyEvents,
  races,
) {
  return `你是一个世界构建者。为以下地点生成完整档案。

世界观：${worldName}
地点名：${locationName}
地点类型：${locationType}
该世界的种族：${races.length > 0 ? races.join('、') : '未知'}

世界大事件（需要体现在历史中）：
${
  globalEvents.length > 0
    ? globalEvents.map((e) => `- ${e.name}（${e.era}）：${e.summary}`).join('\n')
    : '无'
}

周边历史事件（可选择性引用）：
${
  nearbyEvents.length > 0
    ? nearbyEvents.map((e) => `- ${e.name}（${e.era}，${e.location}）：${e.summary}`).join('\n')
    : '无'
}

返回JSON：
{
  "race": "主要种族",
  "population": "繁荣|普通|荒废|废弃",
  "currentState": "现状一句话，不超过20字",
  "notable": "特色建筑或人物或物品，一句话",
  "history": [
    { "type": "war|disaster|discovery|curse|founding", "summary": "一句话，不超过25字", "era": "远古|百年前|近代" }
  ]
}

历史条目1-3条，至少引用一个世界大事件（如果有）。只返回JSON。`
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {number} opts.slotIndex 1-based
 * @param {string} opts.worldName
 * @param {string} opts.locationId
 * @param {string} opts.locationName
 * @param {string} opts.locationType
 * @param {{ x: number, y: number }} opts.coords
 * @param {string[]} [opts.races]
 */
export async function generateLocationProfile({
  apiKey,
  slotIndex,
  worldName,
  locationId,
  locationName,
  locationType,
  coords,
  races = [],
}) {
  const key = (apiKey || '').trim()
  if (!key) return null

  const globalEvents = loadGlobalEvents(slotIndex)
  const nearbyEvents = getEventsNearCoords(slotIndex, coords.x, coords.y)

  try {
    const raw = await postChatNonStream({
      apiKey: key,
      messages: [
        { role: 'system', content: '你只输出 JSON 对象，不添加任何其他文字。' },
        {
          role: 'user',
          content: buildLocationGenPrompt(
            worldName,
            locationType,
            locationName,
            globalEvents,
            nearbyEvents,
            races,
          ),
        },
      ],
    })

    const clean = (raw || '').replace(/```json|```/g, '').trim()
    const profile = JSON.parse(clean || '{}')

    const locationData = {
      id: locationId,
      name: locationName,
      type: locationType,
      coords,
      ...profile,
      generatedAt: Date.now(),
    }

    saveLocationToArchive(slotIndex, locationId, locationData)
    return locationData
  } catch (e) {
    console.warn('地点档案生成失败', e)
    return null
  }
}
