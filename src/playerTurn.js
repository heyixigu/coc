import { JUDGE_SYSTEM_PROMPT } from './config/judge_prompt.js'
import { GM_PRE_ROLL_NARRATIVE_ADDENDUM, GM_SYSTEM_PROMPT } from './config/system_prompt.js'
import { postChatNonStream } from './deepseek.js'
import { runGmStreamWithRolls } from './gmRollLoop.js'
import { buildPreRollSystemContent, resolveSkillChecks } from './resolveTurnRolls.js'
import { parseJudgeSkillsJson } from './skillJudge.js'

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * 玩家回合：裁判 → 客户端投骰 → 带结果流式叙述（[ROLL] 仅作流式备用）
 * @param {object} o
 * @param {string} o.apiKey
 * @param {import('./deepseek.js').ChatMsg[]} o.snap
 * @param {import('./deepseek.js').ChatMsg} o.userMsg
 * @param {string} o.gmId
 * @param {number} o.gmTs
 * @param {React.Dispatch<React.SetStateAction<any[]>>} o.setMessages
 * @param {React.Dispatch<React.SetStateAction<any[]>>} o.setDiceLog
 * @param {(id: string | null) => void} o.setActiveStreamGmId
 * @param {(gmText: string) => void} [o.onGmRoundComplete]
 * @param {number} o.fallbackSkill
 */
export async function runPlayerTurn({
  apiKey,
  snap,
  userMsg,
  gmId,
  gmTs,
  setMessages,
  setDiceLog,
  setActiveStreamGmId,
  onGmRoundComplete,
  fallbackSkill = 50,
}) {
  const key = apiKey.trim()
  const actionText = userMsg.content

  const judgeRaw = await postChatNonStream({
    apiKey: key,
    messages: [
      { role: 'system', content: JUDGE_SYSTEM_PROMPT },
      { role: 'user', content: actionText },
    ],
  })

  const skills = parseJudgeSkillsJson(judgeRaw)
  const preSystemMessages = []

  if (skills.length > 0) {
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

  }

  setMessages((prev) => {
    const out = [...prev]
    if (preSystemMessages.length) out.push(...preSystemMessages)
    out.push({ id: gmId, role: 'gm', content: '', ts: gmTs })
    return out
  })
  setActiveStreamGmId(gmId)

  const systemText = `${GM_SYSTEM_PROMPT}\n\n${GM_PRE_ROLL_NARRATIVE_ADDENDUM}`

  await runGmStreamWithRolls({
    apiKey: key,
    systemText,
    snap,
    userMsg,
    preSystemMessages,
    gmId,
    gmTs,
    setMessages,
    setDiceLog,
    onGmRoundComplete,
    fallbackSkill,
  })
}
