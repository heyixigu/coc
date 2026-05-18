import { postChatNonStream } from '../deepseek.js'
import {
  buildSandboxRollingSummaryFromTurnSummariesPrompt,
  buildSandboxSummaryPrompt,
} from './config/sandbox_summary_prompt.js'

/**
 * @typedef {import('./sandboxStorage.js').SandboxChatMessage} SandboxChatMessage
 * @typedef {import('./sandboxStorage.js').SandboxTurnSummaryEntry} SandboxTurnSummaryEntry
 * @typedef {{ startIdx: number, endIdx: number, startId: string, endId: string }} TurnRange
 */

/**
 * @param {SandboxChatMessage[]} messages
 * @param {number} n
 * @param {number} m
 */
export function getTurnMessageRange(messages, n, m) {
  if (n < 1 || m < n || !Array.isArray(messages)) return null
  const playerIndices = []
  for (let i = 0; i < messages.length; i += 1) {
    if (messages[i].role === 'player') playerIndices.push(i)
  }
  if (playerIndices.length < m) return null
  const startIdx = playerIndices[n - 1]
  const endIdx = m < playerIndices.length ? playerIndices[m] - 1 : messages.length - 1
  if (startIdx > endIdx) return null
  return { startIdx, endIdx, startId: messages[startIdx].id, endId: messages[endIdx].id }
}

/**
 * @param {SandboxChatMessage[]} messages
 * @param {TurnRange} range
 */
export function fingerprintTurnRange(messages, range) {
  return messages
    .slice(range.startIdx, range.endIdx + 1)
    .map((m) => m.id)
    .join('|')
}

/**
 * @param {SandboxTurnSummaryEntry[]} turnSummaries
 * @param {number} n
 * @param {number} m
 */
export function pickTurnSummariesInRange(turnSummaries, n, m) {
  return (turnSummaries || [])
    .filter((s) => s.turn >= n && s.turn <= m)
    .sort((a, b) => a.turn - b.turn)
}

/**
 * 首轮滚动摘要（第 1–10 轮）：摘要素材为 index 1~10（第 2~11 条），保留 index 0 与 11 之后。
 * @param {SandboxChatMessage[]} messages
 */
export function getFirstRollingSummarySlice(messages) {
  return { start: 1, endExclusive: 11 }
}

/**
 * @param {SandboxChatMessage[]} messages
 * @param {number} start
 * @param {number} endExclusive
 */
export function fingerprintMessageSlice(messages, start, endExclusive) {
  return messages
    .slice(start, endExclusive)
    .map((m) => m.id)
    .join('|')
}

/**
 * @param {SandboxChatMessage[]} messages
 * @param {string} content
 */
export function applyFirstRollingSummaryReplacement(messages, content) {
  if (!messages.length) return messages
  const firstMessage = messages[0]
  const remaining = messages.slice(11)
  const summaryMsg = {
    id: `summary-${Date.now()}`,
    role: 'system',
    content,
    ts: Date.now(),
    isSummary: true,
  }
  return [firstMessage, summaryMsg, ...remaining]
}

/**
 * @param {SandboxChatMessage[]} messages
 * @param {number} n
 * @param {number} m
 * @param {SandboxTurnSummaryEntry[]} [turnSummaries]
 */
export function buildSandboxSummaryApiMessages(messages, n, m, turnSummaries = []) {
  const picked = pickTurnSummariesInRange(turnSummaries, n, m)
  if (picked.length > 0) {
    const turnSummaryText = picked.map((s) => `第${s.turn}轮：${s.summary}`).join('\n')
    return [
      {
        role: 'system',
        content: buildSandboxRollingSummaryFromTurnSummariesPrompt(n, m),
      },
      {
        role: 'user',
        content: `以下是最近${m - n + 1}轮的逐轮摘要：\n${turnSummaryText}`,
      },
    ]
  }

  let source = messages
  if (n === 1 && m === 10) {
    source = messages.slice(1, 11)
  } else {
    const range = getTurnMessageRange(messages, n, m)
    if (range) source = messages.slice(range.startIdx, range.endIdx + 1)
  }

  const out = [{ role: 'system', content: buildSandboxSummaryPrompt(n, m) }]
  for (const msg of source) {
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
 * @param {SandboxChatMessage[]} messages
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
 * @param {object} opts
 */
export async function runSandboxRollingSummary({
  apiKey,
  n,
  m,
  getMessages,
  setMessages,
  getTurnSummaries,
  setTurnSummaries,
}) {
  const key = (apiKey || '').trim()
  if (!key) return

  const messages = getMessages()
  const useFirstRollingSlice = n === 1 && m === 10 && messages.length > 0
  const firstSlice = useFirstRollingSlice ? getFirstRollingSummarySlice(messages) : null
  const range = useFirstRollingSlice ? null : getTurnMessageRange(messages, n, m)
  if (!useFirstRollingSlice && !range) return
  if (useFirstRollingSlice && messages.length < 2) return

  const expectedFp = useFirstRollingSlice
    ? fingerprintMessageSlice(messages, firstSlice.start, firstSlice.endExclusive)
    : fingerprintTurnRange(messages, /** @type {TurnRange} */ (range))

  const turnSummaries =
    typeof getTurnSummaries === 'function' ? getTurnSummaries() : []

  try {
    const raw = await postChatNonStream({
      apiKey: key,
      messages: buildSandboxSummaryApiMessages(messages, n, m, turnSummaries),
    })
    const content = normalizeSummaryContent(raw, n, m)
    setMessages((prev) => {
      if (useFirstRollingSlice) {
        const slice = getFirstRollingSummarySlice(prev)
        if (fingerprintMessageSlice(prev, slice.start, slice.endExclusive) !== expectedFp) {
          return prev
        }
        return applyFirstRollingSummaryReplacement(prev, content)
      }
      const r = getTurnMessageRange(prev, n, m)
      if (!r) return prev
      if (fingerprintTurnRange(prev, r) !== expectedFp) return prev
      return applySummaryReplacement(prev, r, content)
    })
    if (typeof setTurnSummaries === 'function') {
      setTurnSummaries((prev) => prev.filter((s) => s.turn < n || s.turn > m))
    }
  } catch {
    /* 静默 */
  }
}
