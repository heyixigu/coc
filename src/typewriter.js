const SECTION_MARKERS = ['【场景】', '【林知渺】', '【当前状态】', '【你可以：】']
const PUNCT_RE = /[。！？]/

const CHAR_MS = 30
const PUNCT_PAUSE_MS = 120
const SECTION_PAUSE_MS = 200
const ELLIPSIS = '……'

/**
 * @param {number} ms
 * @param {AbortSignal} [signal]
 */
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

/**
 * @param {string} text
 * @param {number} index
 */
function startsSectionAt(text, index) {
  return SECTION_MARKERS.some((marker) => text.startsWith(marker, index))
}

/**
 * @param {string} text
 * @param {number} index 已输出到的下标（exclusive）
 */
function delayAfterIndex(text, index) {
  if (index <= 0) return CHAR_MS
  if (text.slice(index - 2, index) === ELLIPSIS) return CHAR_MS + PUNCT_PAUSE_MS
  const ch = text[index - 1]
  if (PUNCT_RE.test(ch)) return CHAR_MS + PUNCT_PAUSE_MS
  return CHAR_MS
}

/**
 * @param {object} opts
 * @param {string} opts.text
 * @param {(partial: string) => void} opts.onUpdate
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<void>}
 */
export async function runTypewriter({ text, onUpdate, signal }) {
  if (!text) {
    onUpdate('')
    return
  }

  let index = 0
  onUpdate('')

  while (index < text.length) {
    if (startsSectionAt(text, index)) {
      await sleep(SECTION_PAUSE_MS, signal)
    }

    index += 1
    onUpdate(text.slice(0, index))

    if (index < text.length) {
      await sleep(delayAfterIndex(text, index), signal)
    }
  }

  onUpdate(text)
}
