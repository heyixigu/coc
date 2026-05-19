/**
 * @typedef {import('../deepseek.js').ChatMsg} ChatMsg
 */

/**
 * 构建传给 GM API 的消息链（不含 system prompt）。
 * - gm → assistant；player / system → user（由 chainToOpenAiMessages 映射）
 * - contextMsg 仅进 API，不写入存档
 *
 * @param {ChatMsg[]} historyMessages 已持久化对话（含本轮玩家消息）
 * @param {ChatMsg[]} [preSystemMessages] 本轮骰子结果等 system 消息
 * @param {ChatMsg | null} [contextMsg] 当轮角色快照（可选，不落盘）
 */
export function buildSandboxGmApiChain(historyMessages, preSystemMessages = [], contextMsg = null) {
  const prefix = contextMsg ? [contextMsg] : []
  return [...prefix, ...historyMessages, ...preSystemMessages]
}
