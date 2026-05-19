/**
 * @typedef {import('./sandboxStorage.js').SandboxNpcArchive} SandboxNpcArchive
 * @typedef {import('./sandboxStorage.js').SandboxNpcEntry} SandboxNpcEntry
 * @typedef {{ content?: string }} TextMessage
 */

/**
 * 从玩家输入与最近消息中按名字匹配相关 NPC 档案。
 * @param {string} playerInput
 * @param {TextMessage[]} recentMessages 通常取最近 5 条
 * @param {SandboxNpcArchive} npcArchive
 * @returns {SandboxNpcEntry[]}
 */
export function matchRelevantNpcs(playerInput, recentMessages, npcArchive) {
  const npcs = npcArchive?.npcs
  if (!Array.isArray(npcs) || npcs.length === 0) return []

  const parts = [typeof playerInput === 'string' ? playerInput : '']
  if (Array.isArray(recentMessages)) {
    for (const m of recentMessages) {
      if (m && typeof m.content === 'string') parts.push(m.content)
    }
  }
  const allText = parts.join(' ')
  if (!allText.trim()) return []

  return npcs.filter((npc) => npc.name && allText.includes(npc.name))
}

/**
 * @typedef {import('./sandboxStorage.js').SandboxNpcMemoryGraph} SandboxNpcMemoryGraph
 */

/**
 * 按相关 NPC id 过滤记忆图谱（注入 GM 上下文用）。
 * @param {SandboxNpcMemoryGraph} memoryGraph
 * @param {string[]} relevantNpcIds
 * @returns {SandboxNpcMemoryGraph}
 */
export function filterRelevantMemoryGraph(memoryGraph, relevantNpcIds) {
  const ids = new Set(
    (relevantNpcIds ?? []).filter((id) => typeof id === 'string' && id.trim()),
  )
  if (ids.size === 0) return { nodes: [], edges: [] }
  const nodes = (memoryGraph?.nodes ?? []).filter((n) => ids.has(n.id))
  const nodeIdSet = new Set(nodes.map((n) => n.id))
  const edges = (memoryGraph?.edges ?? []).filter(
    (e) => nodeIdSet.has(e.from) || nodeIdSet.has(e.to),
  )
  return { nodes, edges }
}
