/**
 * @param {number} n 本段起始玩家轮次（含）
 * @param {number} m 本段结束玩家轮次（含）
 */
export function buildRollingSummarySystemPrompt(n, m) {
  return `你是一个剧情记录员。请根据以上对话，用中文简洁总结：当前剧情进展、重要线索与发现、何以惜顾和林知渺的状态变化、尚未解决的悬念。如涉及两人关系的细节或情感变化，请一并记录在摘要中，保持关系张力的连贯性。控制在300字以内。请在第一行注明【第${n}-${m}轮摘要】，N为本段起始轮次，M为结束轮次。请在摘要末尾列出当前三个物品栏的完整内容（何以惜顾物品、林知渺物品、探索物品）。`
}

/**
 * @param {number} n
 * @param {number} m
 */
export function buildRollingSummaryFromTurnSummariesPrompt(n, m) {
  return `你是一个剧情记录员。以下是最近${m - n + 1}轮的逐轮摘要。请基于以上内容生成一段完整的阶段性总结，供后续AI叙事参考。控制在300字以内。请在第一行注明【第${n}-${m}轮摘要】。请在摘要末尾列出当前三个物品栏的完整内容（何以惜顾物品、林知渺物品、探索物品）。`
}
