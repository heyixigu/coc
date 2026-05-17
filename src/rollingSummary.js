import { buildRollingSummarySystemPrompt } from './config/summary_prompt.js'
import { postChatNonStream } from './deepseek.js'

/**
 * @typedef {import('./storage.js').ChatMessage} ChatMessage
 * @typedef {{ startIdx: number, endIdx: number, startId: string, endId: string }} TurnRange
 */

/**
 * @param {ChatMessage[]} messages
 * @param {number} n 1-based 起始玩家轮
 * @param {number} m 1-based 结束玩家轮
 * @returns {TurnRange | null}
 */
export function getTurnMessageRange(messages, n, m) {
  if (n < 1 || m < n || !Array.isArray(messages)) return null

  const playerIndices = []
  for (let i = 0; i < messages.length; i += 1) {
    if (messages[i].role === 'player') playerIndices.push(i)
  }

  if (playerIndices.length < m) return null

  const startIdx = playerIndices[n - 1]
  const endIdx =
    m < playerIndices.length ? playerIndices[m] - 1 : messages.length - 1

  if (startIdx > endIdx) return null

  return {
    startIdx,
    endIdx,
    startId: messages[startIdx].id,
    endId: messages[endIdx].id,
  }
}

/**
 * @param {ChatMessage[]} messages
 * @param {TurnRange} range
 */
export function fingerprintTurnRange(messages, range) {
  return messages
    .slice(range.startIdx, range.endIdx + 1)
    .map((m) => m.id)
    .join('|')
}

/**
 * @param {ChatMessage[]} messages
 * @param {number} n
 * @param {number} m
 */
export function buildSummaryApiMessages(messages, n, m) {
  const out = [{ role: 'system', content: buildRollingSummarySystemPrompt(n, m) }]
  for (const msg of messages) {
    if (msg.role === 'gm') out.push({ role: 'assistant', content: msg.content })
    else out.push({ role: 'user', content: msg.content })
  }
  return out
}

/**
 * @param {string} raw
 * @param {number} n
 * @param {number} m
 */
export function normalizeSummaryContent(raw, n, m) {
  const header = `【第${n}-${m}轮摘要】`
  const trimmed = (raw || '').trim()
  if (!trimmed) return header
  if (/^【第\d+-\d+轮摘要】/.test(trimmed)) return trimmed
  return `${header}\n${trimmed}`
}

/**
 * @param {ChatMessage[]} messages
 * @param {TurnRange} range
 * @param {string} content
 */
export function applySummaryReplacement(messages, range, content) {
  const summaryMsg = {
    id: `summary-${range.startId}-${range.endId}-${Date.now()}`,
    role: 'system',
    content,
    ts: Date.now(),
    isSummary: true,
  }
  return [...messages.slice(0, range.startIdx), summaryMsg, ...messages.slice(range.endIdx + 1)]
}

/**
 * 静默生成滚动摘要并压缩对应轮次的消息（失败则忽略）。
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {number} opts.n
 * @param {number} opts.m
 * @param {() => ChatMessage[]} opts.getMessages
 * @param {React.Dispatch<React.SetStateAction<ChatMessage[]>>} opts.setMessages
 */
export async function runRollingSummary({ apiKey, n, m, getMessages, setMessages }) {
  const key = (apiKey || '').trim()
  if (!key) return

  const messages = getMessages()
  const range = getTurnMessageRange(messages, n, m)
  if (!range) return

  const expectedFp = fingerprintTurnRange(messages, range)

  try {
    const raw = await postChatNonStream({
      apiKey: key,
      messages: buildSummaryApiMessages(messages, n, m),
    })
    const content = normalizeSummaryContent(raw, n, m)

    setMessages((prev) => {
      const r = getTurnMessageRange(prev, n, m)
      if (!r) return prev
      if (fingerprintTurnRange(prev, r) !== expectedFp) return prev
      return applySummaryReplacement(prev, r, content)
    })
  } catch {
    /* 静默忽略 */
  }
}
