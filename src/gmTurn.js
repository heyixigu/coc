import { chainToOpenAiMessages, postChatNonStream } from './deepseek.js'
import { validateGmReply } from './validateGmReply.js'

/**
 * @typedef {import('./deepseek.js').ChatMsg} ChatMsg
 */

/**
 * 非流式获取 GM 回复并校验；失败静默重试一次。
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.systemText
 * @param {ChatMsg[]} opts.chain
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ ok: true, text: string } | { ok: false }>}
 */
export async function fetchValidatedGmReply({ apiKey, systemText, chain, signal }) {
  const key = (apiKey || '').trim()
  if (!key) return { ok: false }

  const openAiMessages = chainToOpenAiMessages(systemText, chain)

  const attempt = async () => {
    const raw = await postChatNonStream({
      apiKey: key,
      messages: openAiMessages,
      signal,
    })
    const text = (raw || '').trim()
    if (!validateGmReply(text)) return null
    return text
  }

  try {
    let text = await attempt()
    if (!text) text = await attempt()
    if (!text) return { ok: false }
    return { ok: true, text }
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    return { ok: false }
  }
}
