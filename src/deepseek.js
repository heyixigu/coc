import { matchFirstRollMarker } from './rollMarker.js'

const API_URL = 'https://api.deepseek.com/v1/chat/completions'
const MODEL = 'deepseek-v4-flash'

/**
 * @typedef {{ id: string, role: string, content: string, ts?: number }} ChatMsg
 * @param {string} systemText 通常即 GM_SYSTEM_PROMPT
 * @param {ChatMsg[]} chain 不含首条 system，由本函数添加
 */
export function chainToOpenAiMessages(systemText, chain) {
  const out = [{ role: 'system', content: systemText }]
  for (const m of chain) {
    if (m.role === 'gm') out.push({ role: 'assistant', content: m.content })
    else out.push({ role: 'user', content: m.content })
  }
  return out
}

/**
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 * @param {AbortSignal} [outerSignal]
 */
async function* sseDeltaGenerator(reader, outerSignal) {
  const decoder = new TextDecoder()
  let carry = ''

  while (true) {
    if (outerSignal?.aborted) break
    const { value, done } = await reader.read()
    if (done) break
    carry += decoder.decode(value, { stream: true })

    let nl
    while ((nl = carry.indexOf('\n')) !== -1) {
      const line = carry.slice(0, nl).trimEnd()
      carry = carry.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trimStart()
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data)
        const piece =
          json?.choices?.[0]?.delta?.content ??
          json?.choices?.[0]?.message?.content ??
          ''
        if (typeof piece === 'string' && piece.length > 0) yield piece
      } catch {
        /* */
      }
    }
  }

  const tail = carry.trim()
  if (tail.startsWith('data:')) {
    const data = tail.slice(5).trimStart()
    if (data !== '[DONE]') {
      try {
        const json = JSON.parse(data)
        const piece = json?.choices?.[0]?.delta?.content ?? ''
        if (typeof piece === 'string' && piece.length > 0) yield piece
      } catch {
        /* */
      }
    }
  }
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {{ role: string, content: string }[]} opts.openAiMessages 须已含首条 system
 * @param {AbortSignal} [opts.signal]
 * @param {(fullText: string) => void} opts.onDelta
 * @returns {Promise<{ text: string, roll: null | { skillName: string, skillValue: number } }>}
 */
export async function streamAssistantUntilRollOrEnd({ apiKey, openAiMessages, signal, onDelta }) {
  const ac = new AbortController()
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: openAiMessages,
      max_tokens: 4096,
      stream: true,
      stop: null,
    }),
    signal: ac.signal,
  })

  if (!res.ok) {
    let errText = res.statusText
    try {
      const errJson = await res.json()
      errText = errJson?.error?.message || errText
    } catch {
      /* */
    }
    throw new Error(errText)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('响应体不可读')

  let buf = ''
  try {
    for await (const piece of sseDeltaGenerator(reader, signal)) {
      if (signal?.aborted) {
        ac.abort()
        break
      }
      buf += piece
      onDelta(buf)
      const hit = matchFirstRollMarker(buf)
      if (hit) {
        if (buf.length > hit.textThroughRoll.length) {
          buf = hit.textThroughRoll
          onDelta(buf)
        }
        ac.abort()
        return {
          text: hit.textThroughRoll,
          roll: { skillName: hit.skillName, skillValue: hit.skillValue },
        }
      }
    }
  } catch (e) {
    if (e?.name === 'AbortError' || e?.name === 'TypeError') {
      const hit = matchFirstRollMarker(buf)
      if (hit) {
        return {
          text: hit.textThroughRoll,
          roll: { skillName: hit.skillName, skillValue: hit.skillValue },
        }
      }
      return { text: buf, roll: null }
    }
    throw e
  }

  return { text: buf, roll: null }
}

/**
 * 纯流式输出，不检测 [ROLL]。
 * @param {{ apiKey: string, messages: { role: string, content: string }[], signal?: AbortSignal, onDelta: (text: string) => void }} opts
 */
export async function streamChatPlain({ apiKey, messages, signal, onDelta }) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 4096,
      stream: true,
      stop: null,
    }),
    signal,
  })

  if (!res.ok) {
    let errText = res.statusText
    try {
      const errJson = await res.json()
      errText = errJson?.error?.message || errText
    } catch {
      /* */
    }
    throw new Error(errText)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('响应体不可读')

  let buf = ''
  for await (const piece of sseDeltaGenerator(reader, signal)) {
    if (signal?.aborted) break
    buf += piece
    onDelta(buf)
  }
  return buf.trim()
}

/**
 * @param {string} apiKey
 * @param {object} body
 * @param {AbortSignal} [signal]
 */
async function postCompletion(apiKey, body, signal) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText || '请求失败'
    throw new Error(msg)
  }

  const text = data?.choices?.[0]?.message?.content
  if (!text || typeof text !== 'string') {
    throw new Error('API 返回内容为空')
  }
  return text.trim()
}

/**
 * @param {{ apiKey: string, messages: { role: string, content: string }[], signal?: AbortSignal }} opts
 */
export async function postChatNonStream({ apiKey, messages, signal }) {
  return postCompletion(
    apiKey.trim(),
    {
      model: MODEL,
      messages,
      max_tokens: 4096,
      stream: false,
      stop: null,
    },
    signal,
  )
}
