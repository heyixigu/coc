import { JUDGE_SYSTEM_PROMPT } from './config/judge_prompt.js'
import { GM_PRE_ROLL_NARRATIVE_ADDENDUM, GM_SYSTEM_PROMPT } from './config/system_prompt.js'
import { postChatNonStream } from './deepseek.js'
import { buildPreRollSystemContent, resolveSkillChecks } from './resolveTurnRolls.js'
import { buildEphemeralItemMessages } from './itemInject.js'
import { applyPlayerSkillValues, buildEphemeralSkillReferenceMessages } from './playerSkills.js'
import { parseJudgeSkillsJson } from './skillJudge.js'

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * @typedef {import('./deepseek.js').ChatMsg} ChatMsg
 * @typedef {(opts: {
 *   apiKey: string,
 *   systemText: string,
 *   chain: ChatMsg[],
 *   gmId: string,
 *   gmTs: number,
 *   signal?: AbortSignal,
 * }) => Promise<boolean>} PresentGmFn
 */

/**
 * 玩家回合：裁判 → 客户端投骰 → 非流式 GM + 打字机呈现
 * @param {object} o
 * @param {string} o.apiKey
 * @param {ChatMsg[]} o.snap
 * @param {ChatMsg} o.userMsg
 * @param {string} o.gmId
 * @param {number} o.gmTs
 * @param {React.Dispatch<React.SetStateAction<any[]>>} o.setMessages
 * @param {React.Dispatch<React.SetStateAction<any[]>>} o.setDiceLog
 * @param {React.Dispatch<React.SetStateAction<import('./skillJudge.js').SkillCheck[]>>} o.setPendingChecks
 * @param {PresentGmFn} o.presentGm
 * @param {() => { playerItems: string[], partnerItems: string[], sceneItems: string[] }} o.getInventory
 * @param {number} o.fallbackSkill
 * @returns {Promise<boolean>}
 */
export async function runPlayerTurn({
  apiKey,
  snap,
  userMsg,
  gmId,
  gmTs,
  setMessages,
  setDiceLog,
  setPendingChecks,
  presentGm,
  getInventory,
  fallbackSkill = 50,
}) {
  void fallbackSkill
  const key = apiKey.trim()
  const actionText = userMsg.content

  const judgeRaw = await postChatNonStream({
    apiKey: key,
    messages: [
      { role: 'system', content: JUDGE_SYSTEM_PROMPT },
      { role: 'user', content: actionText },
    ],
  })

  const skills = applyPlayerSkillValues(parseJudgeSkillsJson(judgeRaw))
  const preSystemMessages = []
  const inv = typeof getInventory === 'function' ? getInventory() : { playerItems: [], partnerItems: [], sceneItems: [] }
  const ephemeralItemMessages = buildEphemeralItemMessages(inv)
  const ephemeralSkillMessages = buildEphemeralSkillReferenceMessages(skills.map((s) => s.skill))

  if (skills.length > 0) {
    setPendingChecks(skills)
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })

    const { lines, outcomes } = resolveSkillChecks(skills)
    const sysTs = Date.now()
    const sysContent = buildPreRollSystemContent(lines)
    preSystemMessages.push({
      id: uid(),
      role: 'system',
      content: sysContent,
      ts: sysTs,
    })

    setDiceLog((prev) => {
      const entries = outcomes.map((o) => ({
        id: uid(),
        skillName: o.skillName,
        value: o.value,
        dice: '1d100',
        outcome: o.outcome,
        judgeText: o.judgeText,
        ts: sysTs,
      }))
      return [...entries, ...prev].slice(0, 5)
    })

    setPendingChecks([])
  } else {
    setPendingChecks([])
  }

  setMessages((prev) => {
    const out = [...prev]
    if (preSystemMessages.length) out.push(...preSystemMessages)
    return out
  })

  const systemText = `${GM_SYSTEM_PROMPT}\n\n${GM_PRE_ROLL_NARRATIVE_ADDENDUM}`
  const chain = [
    ...snap,
    userMsg,
    ...ephemeralItemMessages,
    ...ephemeralSkillMessages,
    ...preSystemMessages,
  ]

  return presentGm({
    apiKey: key,
    systemText,
    chain,
    gmId,
    gmTs,
  })
}
