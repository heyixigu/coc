import { chainToOpenAiMessages, postChatNonStream } from '../deepseek.js'
import { validateSandboxGmReply } from './sandboxValidateGmReply.js'

/**
 * @typedef {import('../deepseek.js').ChatMsg} ChatMsg
 * @typedef {{ ok: true, text: string } | { ok: false, code: string, message?: string, raw?: string }} SandboxGmResult
 */

/**
 * @param {'like' | 'dislike' | null} feedback
 * @returns {string}
 */
export function buildSandboxFeedbackInstruction(feedback) {
  if (feedback === 'like') {
    return '\n\n【玩家反馈】玩家对上一段叙事满意，请保持当前叙事节奏和风格。'
  }
  if (feedback === 'dislike') {
    return '\n\n【玩家反馈】玩家对上一段叙事不满意，请调整叙事节奏，可以更紧凑或更丰富。'
  }
  return ''
}

/**
 * 将反馈附到链上最后一条玩家消息末尾（不改 system prompt）。
 * @param {ChatMsg[]} chain
 * @param {'like' | 'dislike' | null} [feedback]
 * @returns {ChatMsg[]}
 */
export function applyFeedbackToChain(chain, feedback = null) {
  const extra = buildSandboxFeedbackInstruction(feedback)
  if (!extra) return chain

  let lastPlayerIdx = -1
  for (let i = chain.length - 1; i >= 0; i--) {
    if (chain[i].role === 'player') {
      lastPlayerIdx = i
      break
    }
  }
  if (lastPlayerIdx < 0) return chain

  return chain.map((m, i) =>
    i === lastPlayerIdx ? { ...m, content: `${m.content}${extra}` } : m,
  )
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.systemText
 * @param {ChatMsg[]} opts.chain
 * @param {string} [opts.characterName]
 * @param {'like' | 'dislike' | null} [opts.feedback]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<SandboxGmResult>}
 */
export async function fetchValidatedSandboxGmReply({
  apiKey,
  systemText,
  chain,
  characterName = '',
  feedback = null,
  signal,
}) {
  const key = (apiKey || '').trim()
  if (!key) {
    return { ok: false, code: 'NO_API_KEY', message: '未填写 API Key' }
  }

  const chainWithFeedback = applyFeedbackToChain(chain, feedback)
  const openAiMessages = chainToOpenAiMessages(systemText, chainWithFeedback)

  const attempt = async () => {
    const raw = await postChatNonStream({
      apiKey: key,
      messages: openAiMessages,
      signal,
    })
    const text = (raw || '').trim()
    const v = validateSandboxGmReply(text, characterName)
    if (!v.valid) return { text: null, reason: v.reason || 'validation', raw: text }
    return { text, reason: null, raw: text }
  }

  try {
    let first = await attempt()
    let text = first.text
    let lastReason = first.reason
    let lastRaw = first.raw || ''

    if (!text) {
      const second = await attempt()
      text = second.text
      lastReason = second.reason || lastReason
      lastRaw = second.raw || lastRaw
    }

    if (!text) {
      return {
        ok: false,
        code: 'VALIDATION',
        message: lastReason || 'validation',
        raw: lastRaw,
      }
    }
    return { ok: true, text }
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    return {
      ok: false,
      code: 'API_ERROR',
      message: e instanceof Error ? e.message : String(e),
    }
  }
}
