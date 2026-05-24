/**
 * @typedef {import('../deepseek.js').ChatMsg} ChatMsg
 */

// 本地 ChatMsg 使用 gm 表示会发送给 API 的 assistant 消息。
const ARCHIVE_ACK = { role: 'gm', content: '好的，我已了解历史档案。' }
const SNAPSHOT_ACK = { role: 'gm', content: '好的，我已读取当前状态，继续游戏。' }

/**
 * 构建传给 GM API 的消息链（不含 system prompt）。
 *
 * @param {ChatMsg[]} historyMessages 已持久化对话（含本轮玩家消息）
 * @param {ChatMsg[]} [preSystemMessages] 本轮骰子结果等 system 消息
 * @param {{ role: 'user', content: string } | null} [archivedEventsMsg] 封档摘要消息
 * @param {{ role: 'user', content: string } | null} [stateSnapshotMsg] 当前状态快照消息
 */
export function buildSandboxGmApiChain(
  historyMessages,
  preSystemMessages = [],
  archivedEventsMsg = null,
  stateSnapshotMsg = null,
) {
  const prefix = []
  if (archivedEventsMsg) {
    prefix.push(archivedEventsMsg, ARCHIVE_ACK)
  }
  if (stateSnapshotMsg) {
    prefix.push(stateSnapshotMsg, SNAPSHOT_ACK)
  }
  return [...prefix, ...historyMessages, ...preSystemMessages]
}
