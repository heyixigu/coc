import { postChatNonStream } from './deepseek.js'

/**
 * @typedef {import('./storage.js').ChatMessage} ChatMessage
 * @typedef {import('./storage.js').ArchivedEventEntry} ArchivedEventEntry
 */

export const ARCHIVE_CMD = '事件结束，封档'

/**
 * @param {number} eventIndex
 */
export function buildArchiveSystemPrompt(eventIndex) {
  return `你是一位跑团记录者，请根据以下对话内容，生成一份结构化的事件封档总结。

严格按照以下格式输出，不得添加任何额外内容：

【事件${eventIndex}总结】
关键事件：（本次事件中发生的重要剧情节点，分条列出）
NPC变化：（新认识的NPC、关系变化、NPC状态变化，无则写"无"）
物品变化：（获得或失去的物品，无则写"无"）
状态：（角色当前HP/MP及重要状态，参考最后一次【当前状态】段）
守密人评语：（以守密人视角对本次事件的点评，100字上下，可含对玩家选择的评价）
【封档】`
}

/**
 * @param {ChatMessage[]} messages
 * @param {ArchivedEventEntry[]} archivedEvents
 */
export function getArchiveMessageSlice(messages, archivedEvents) {
  let startIdx = 0
  const last = archivedEvents[archivedEvents.length - 1]
  if (last?.endMessageId) {
    const idx = messages.findIndex((m) => m.id === last.endMessageId)
    if (idx >= 0) startIdx = idx + 1
  }
  return messages.slice(startIdx)
}

/**
 * @param {ChatMessage[]} slice
 */
export function formatArchiveDialogue(slice) {
  return slice
    .filter((m) => !m.isSummary)
    .map((m) => {
      const label = m.role === 'player' ? '玩家' : m.role === 'gm' ? '守密人' : '系统'
      return `${label}：${m.content}`
    })
    .join('\n\n')
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {number} opts.eventIndex
 * @param {ChatMessage[]} opts.messages
 * @param {ArchivedEventEntry[]} opts.archivedEvents
 * @param {import('./storage.js').ChatMessage} opts.userMsg
 * @param {string} opts.gmId
 * @param {number} opts.gmTs
 * @param {React.Dispatch<React.SetStateAction<ChatMessage[]>>} opts.setMessages
 * @param {(patch: { archivedEvents: ArchivedEventEntry[], turnSummaries: [], eventIndex: number }) => void} opts.onArchiveComplete
 */
export async function runArchiveEvent({
  apiKey,
  eventIndex,
  messages,
  archivedEvents,
  userMsg,
  gmId,
  gmTs,
  setMessages,
  onArchiveComplete,
}) {
  const key = (apiKey || '').trim()
  if (!key) return false

  const slice = getArchiveMessageSlice(messages, archivedEvents)
  const dialogue = formatArchiveDialogue([...slice, userMsg])
  if (!dialogue.trim()) return false

  const raw = await postChatNonStream({
    apiKey: key,
    messages: [
      { role: 'system', content: buildArchiveSystemPrompt(eventIndex) },
      { role: 'user', content: dialogue },
    ],
  })

  const summary = (raw || '').trim().slice(0, 8000)
  if (!summary) return false

  const archivedAt = new Date().toISOString()
  const endMessageId = gmId

  setMessages((prev) => {
    const hasUser = prev.some((m) => m.id === userMsg.id)
    const base = hasUser ? prev : [...prev, userMsg]
    const hasGm = base.some((m) => m.id === gmId)
    if (hasGm) {
      return base.map((m) =>
        m.id === gmId ? { ...m, role: 'gm', content: summary, isArchive: true, ts: gmTs } : m,
      )
    }
    return [
      ...base,
      { id: gmId, role: 'gm', content: summary, ts: gmTs, isArchive: true },
    ]
  })

  const nextArchived = [
    ...archivedEvents,
    { index: eventIndex, summary, archivedAt, endMessageId },
  ]
  onArchiveComplete({
    archivedEvents: nextArchived,
    turnSummaries: [],
    eventIndex: eventIndex + 1,
  })
  return true
}
