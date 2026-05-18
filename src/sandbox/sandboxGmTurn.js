import { chainToOpenAiMessages, postChatNonStream } from '../deepseek.js'
import { validateSandboxGmReply } from './sandboxValidateGmReply.js'

/**
 * @typedef {import('../deepseek.js').ChatMsg} ChatMsg
 * @typedef {{ ok: true, text: string } | { ok: false, code: string, message?: string, raw?: string }} SandboxGmResult
 */

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.systemText
 * @param {ChatMsg[]} opts.chain
 * @param {string} [opts.characterName]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<SandboxGmResult>}
 */
export async function fetchValidatedSandboxGmReply({
  apiKey,
  systemText,
  chain,
  characterName = '',
  signal,
}) {
  const key = (apiKey || '').trim()
  if (!key) {
    return { ok: false, code: 'NO_API_KEY', message: '未填写 API Key' }
  }

  const openAiMessages = chainToOpenAiMessages(systemText, chain)

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
