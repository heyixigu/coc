/**
 * @param {number} n
 * @param {number} m
 */
export function buildSandboxSummaryPrompt(n, m) {
  return `你是一个剧情记录员。请根据以上对话，用中文简洁总结：当前剧情进展、重要线索与发现、主角的状态变化（HP/MP/物品）、尚未解决的悬念。控制在300字以内。请在第一行注明【第${n}-${m}轮摘要】。请在摘要末尾列出主角当前物品栏的完整内容。`
}

/**
 * @param {number} n
 * @param {number} m
 */
export function buildSandboxRollingSummaryFromTurnSummariesPrompt(n, m) {
  return `你是一个剧情记录员。以下是最近${m - n + 1}轮的逐轮摘要。请基于以上内容生成一段完整的阶段性总结，供后续AI叙事参考。控制在300字以内。请在第一行注明【第${n}-${m}轮摘要】。请在摘要末尾列出主角当前物品栏的完整内容。`
}
