import { postChatNonStream } from './deepseek.js'
import { getTurnMessageRange } from './rollingSummary.js'

/**
 * @typedef {import('./storage.js').ChatMessage} ChatMessage
 * @typedef {import('./storage.js').TurnSummaryEntry} TurnSummaryEntry
 */

/**
 * @param {ChatMessage[]} messages
 * @param {number} turn 1-based
 */
export function extractTurnExchange(messages, turn) {
  const range = getTurnMessageRange(messages, turn, turn)
  if (!range) return ''
  const slice = messages.slice(range.startIdx, range.endIdx + 1)
  return slice
    .map((m) => {
      const label = m.role === 'player' ? '玩家' : m.role === 'gm' ? '守密人' : '系统'
      return `${label}：${m.content}`
    })
    .join('\n\n')
}

/**
 * @param {string} exchangeText
 */
export function buildTurnSummaryUserPrompt(exchangeText) {
  return `以下是本轮跑团内容，请用2~3句话概括本轮发生的关键事件，简洁客观，不加评论：

${exchangeText}`
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {number} opts.turn
 * @param {ChatMessage[]} opts.messages
 * @param {() => TurnSummaryEntry[]} opts.getTurnSummaries
 * @param {(updater: (prev: TurnSummaryEntry[]) => TurnSummaryEntry[]) => void} opts.setTurnSummaries
 * @param {() => void} [opts.onPersist]
 */
export async function runTurnSummary({
  apiKey,
  turn,
  messages,
  getTurnSummaries,
  setTurnSummaries,
  onPersist,
}) {
  const key = (apiKey || '').trim()
  if (!key || turn < 1) return

  const exchangeText = extractTurnExchange(messages, turn)
  if (!exchangeText.trim()) return

  try {
    const raw = await postChatNonStream({
      apiKey: key,
      messages: [
        {
          role: 'system',
          content: '你是跑团记录员。请用中文简洁客观地概括玩家与守密人本轮的关键事件，2~3句话，不加评论。',
        },
        { role: 'user', content: buildTurnSummaryUserPrompt(exchangeText) },
      ],
    })
    const summary = (raw || '').trim().slice(0, 2000)
    if (!summary) return

    setTurnSummaries((prev) => {
      const rest = prev.filter((e) => e.turn !== turn)
      return [...rest, { turn, summary }]
    })
    if (typeof onPersist === 'function') onPersist()
  } catch {
    /* 静默跳过 */
  }
}
