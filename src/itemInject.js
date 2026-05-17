/**
 * @param {string[]} items
 */
function formatItemList(items) {
  if (!items?.length) return '无'
  return items.join('，')
}

/**
 * @param {{ playerItems: string[], partnerItems: string[], sceneItems: string[] }} inv
 * @returns {string | null}
 */
export function buildCurrentItemsContent(inv) {
  if (!inv) return null
  return [
    '【当前物品】',
    `何以惜顾：${formatItemList(inv.playerItems)}`,
    `林知渺：${formatItemList(inv.partnerItems)}`,
    `探索物品：${formatItemList(inv.sceneItems)}`,
  ].join('\n')
}

/**
 * @param {{ playerItems: string[], partnerItems: string[], sceneItems: string[] }} inv
 * @returns {{ id: string, role: 'system', content: string, ts: number }[]}
 */
export function buildEphemeralItemMessages(inv) {
  const content = buildCurrentItemsContent(inv)
  if (!content) return []
  return [
    {
      id: `__ephemeral-items-${Date.now()}`,
      role: 'system',
      content,
      ts: Date.now(),
    },
  ]
}
