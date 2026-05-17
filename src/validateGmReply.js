import { extractGmStatusBlock } from './parseGmItems.js'

const REQUIRED_SECTIONS = ['【场景】', '【林知渺】', '【当前状态】', '【你可以：】']

/**
 * @param {string} text
 * @returns {boolean}
 */
export function validateGmReply(text) {
  if (!text || typeof text !== 'string') return false
  const t = text.trim()
  if (!t) return false

  for (const section of REQUIRED_SECTIONS) {
    if (!t.includes(section)) return false
  }

  const block = extractGmStatusBlock(t)
  if (!block) return false

  if (!/何以惜顾[\s\S]*?HP[：:]\s*\d+/i.test(block)) return false
  if (!/MP[：:]\s*\d+/i.test(block)) return false
  if (!/SAN[：:]\s*\d+/i.test(block)) return false
  if (!/何以惜顾物品[：:]/.test(block)) return false
  if (!/林知渺物品[：:]/.test(block)) return false
  if (!/探索物品[：:]/.test(block)) return false

  return true
}
