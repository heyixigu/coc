import { buildActOneUserMessage } from './config/act_one_prompt.js'
import { GM_SYSTEM_PROMPT } from './config/system_prompt.js'
import { runGmStreamWithRolls } from './gmRollLoop.js'

/**
 * @typedef {{ title: string, summary: string, tags?: string[], opening: string }} ScenarioOption
 */

/**
 * 第一幕：虚拟 user 仅进 API 链，不写入 messages；GM 回复流式写入对话区。
 * @param {object} o
 * @param {string} o.apiKey
 * @param {ScenarioOption} o.scenario
 * @param {string} o.gmId
 * @param {number} o.gmTs
 * @param {React.Dispatch<React.SetStateAction<any[]>>} o.setMessages
 * @param {React.Dispatch<React.SetStateAction<any[]>>} o.setDiceLog
 * @param {(id: string | null) => void} o.setActiveStreamGmId
 * @param {(gmText: string) => void} [o.onGmRoundComplete]
 * @param {number} [o.fallbackSkill]
 */
export async function runActOneStream({
  apiKey,
  scenario,
  gmId,
  gmTs,
  setMessages,
  setDiceLog,
  setActiveStreamGmId,
  onGmRoundComplete,
  fallbackSkill = 50,
}) {
  const userMsg = {
    id: '__act-one-user__',
    role: 'player',
    content: buildActOneUserMessage(scenario),
    ts: gmTs,
  }

  setActiveStreamGmId(gmId)

  await runGmStreamWithRolls({
    apiKey: apiKey.trim(),
    systemText: GM_SYSTEM_PROMPT,
    snap: [],
    userMsg,
    gmId,
    gmTs,
    setMessages,
    setDiceLog,
    onGmRoundComplete,
    fallbackSkill,
  })
}
