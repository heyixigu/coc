import { buildActOneUserMessage } from './config/act_one_prompt.js'
import { GM_SYSTEM_PROMPT } from './config/system_prompt.js'
import { buildEphemeralItemMessages } from './itemInject.js'

/**
 * @typedef {{ title: string, summary: string, tags?: string[], opening: string }} ScenarioOption
 * @typedef {import('./playerTurn.js').PresentGmFn} PresentGmFn
 */

/**
 * 第一幕：虚拟 user 仅进 API 链，不写入 messages；GM 非流式 + 打字机呈现。
 * @param {object} o
 * @param {string} o.apiKey
 * @param {ScenarioOption} o.scenario
 * @param {string} o.gmId
 * @param {number} o.gmTs
 * @param {PresentGmFn} o.presentGm
 * @param {() => { playerItems: string[], partnerItems: string[], sceneItems: string[] }} [o.getInventory]
 * @param {AbortSignal} [o.signal]
 * @returns {Promise<boolean>}
 */
export async function runActOneStream({
  apiKey,
  scenario,
  gmId,
  gmTs,
  presentGm,
  getInventory,
  signal,
}) {
  const userMsg = {
    id: '__act-one-user__',
    role: 'player',
    content: buildActOneUserMessage(scenario),
    ts: gmTs,
  }

  const inv =
    typeof getInventory === 'function'
      ? getInventory()
      : { playerItems: [], partnerItems: [], sceneItems: [] }

  const chain = [userMsg, ...buildEphemeralItemMessages(inv)]

  return presentGm({
    apiKey: apiKey.trim(),
    systemText: GM_SYSTEM_PROMPT,
    chain,
    gmId,
    gmTs,
    signal,
  })
}
