import { postChatNonStream } from '../deepseek.js'
import {
  loadNpcArchive,
  loadQuestState,
  loadSandboxSlot,
  loadWorldState,
} from './sandboxStorage.js'
import { applyStateChangeData } from './sandboxStateChangeParser.js'
import { extractStateChangeJson } from './sandboxValidateGmReply.js'

/**
 * @param {unknown} value
 * @param {number} limit
 */
function truncate(value, limit = 1200) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  if (!text) return ''
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

/**
 * @param {number} slotIndex
 */
function buildStateSnapshot(slotIndex) {
  const slot = loadSandboxSlot(slotIndex)
  return {
    character: slot.character
      ? {
          name: slot.character.name,
          hp: slot.character.hp,
          maxHp: slot.character.maxHp,
          mp: slot.character.mp,
          maxMp: slot.character.maxMp,
          items: slot.character.items ?? [],
        }
      : null,
    companions: (slot.companions ?? []).map((c) => ({
      name: c.name,
      hp: c.hp,
      maxHp: c.maxHp,
      mp: c.mp,
      maxMp: c.maxMp,
      status: c.status,
      isDead: c.isDead,
      isDeparted: c.isDeparted,
    })),
    playerInventory: slot.playerInventory ?? null,
    npcs: loadNpcArchive(slotIndex).npcs.map((n) => ({
      name: n.name,
      identity: n.identity,
      relationship: n.relationship,
      status: n.status,
    })),
    quests: loadQuestState(slotIndex).quests.map((q) => ({
      title: q.title,
      status: q.status,
      objectives: q.objectives.map((o) => ({
        description: o.description,
        completed: o.completed,
      })),
    })),
    world: loadWorldState(slotIndex),
  }
}

/**
 * @param {string} raw
 */
function parseStateChange(raw) {
  const text = (raw || '').trim()
  return extractStateChangeJson(`【状态变更】\n${text}`)
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {number} opts.slotIndex
 * @param {number} opts.currentTurn
 * @param {string} opts.playerText
 * @param {string} opts.gmText
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<boolean>}
 */
export async function extractAndApplyStateChange({
  apiKey,
  slotIndex,
  currentTurn,
  playerText,
  gmText,
  signal,
}) {
  const key = (apiKey || '').trim()
  if (!key || !Number.isFinite(slotIndex)) return false

  const snapshot = buildStateSnapshot(slotIndex)
  const systemText = `你是沙盒跑团的状态变更提取器。
只根据本轮玩家行动与GM回复，提取需要写入程序状态的变化。
只输出一个合法 JSON 对象，不要代码块、注释、解释或前后缀文字。
无状态变化时输出 {}。
只输出本轮实际变化字段；不要输出占位用的 [] 或 null。

可用字段：
- npcChanges: [{"name":"","isNew":true,"identity":"","relationship":"","status":""}]
- questChanges: {"newQuests":[{"title":"","description":"","category":"main|side","givenBy":"","objectives":[""],"reward":""}],"updatedQuests":[{"title":"","status":"active|completed|failed","completedObjectives":[""]}]}
- locationChanges: [{"name":"","status":"","dangerLevel":1,"controlledBy":"","isAccessible":true,"accessNote":"","isNew":true}]
- environmentChange: {"weather":"","timeOfDay":"清晨|上午|正午|下午|傍晚|夜晚|深夜","season":"春|夏|秋|冬","dayPassed":false}
- playerInventory: {"equipped":[{"name":"","description":""}],"carried":[{"name":"","description":"","quantity":1}]}
- companionChanges: [{"name":"","hp":0,"maxHp":0,"mp":0,"maxMp":0,"status":"active|dead|left","equipped":[],"carried":[]}]
- playerStatus: {"hp":0,"maxHp":0,"mp":0,"maxMp":0}

规则：
- 不要改写未在本轮叙事中明确变化的状态。
- playerInventory 若输出则必须是完整快照。
- companionChanges 若输出，单个同伴必须包含完整当前 HP/MP/状态。
- dayPassed=true 只在明确过夜或进入次日时使用。`

  const userText = `【当前状态快照】
${truncate(snapshot, 5000)}

【本轮玩家行动】
${truncate(playerText, 1500)}

【本轮GM回复】
${truncate(gmText, 5000)}

请输出状态变更 JSON。`

  try {
    const raw = await postChatNonStream({
      apiKey: key,
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: userText },
      ],
      signal,
    })
    const data = parseStateChange(raw)
    if (!data) {
      console.warn('[sandboxStateChangeExtractor] invalid JSON from extractor', raw)
      return false
    }
    return applyStateChangeData(data, slotIndex, currentTurn, key, gmText)
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    console.warn('[sandboxStateChangeExtractor] extraction failed', e)
    return false
  }
}
