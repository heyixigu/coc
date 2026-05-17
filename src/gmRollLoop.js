import { classifyRollStream, d100OutcomeLabel } from './cocJudge.js'
import { rollByLabel } from './dice.js'
import { chainToOpenAiMessages, streamAssistantUntilRollOrEnd } from './deepseek.js'
import {
  buildEphemeralSkillReferenceMessages,
  resolvePlayerSkillValue,
} from './playerSkills.js'

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * 主流程已改用非流式 + 打字机（见 gmTurn.js / GameApp presentGm）。
 * 备用流式 [ROLL] 链式续写，当前主流程不引用。
 * 流式生成守密人回复，处理 [ROLL] 链式续写。
 * snap / userMsg 为内部消息格式：role 为 gm | player | system。
 */
export async function runGmStreamWithRolls({
  apiKey,
  systemText,
  snap,
  userMsg,
  preSystemMessages = [],
  ephemeralSystemMessages = [],
  ephemeralItemMessages = [],
  gmId,
  gmTs,
  setMessages,
  setDiceLog,
  onGmRoundComplete,
  fallbackSkill = 50,
}) {
  let prefixGm = ''
  const itemEphemeral = ephemeralItemMessages.length ? ephemeralItemMessages : ephemeralSystemMessages.filter((m) => m.content?.startsWith('【当前物品】'))
  const baseSkillEphemeral = ephemeralSystemMessages.filter((m) => !m.content?.startsWith('【当前物品】'))
  let chainForOpenAi = [...snap, userMsg, ...itemEphemeral, ...baseSkillEphemeral, ...preSystemMessages]
  const rollResultsInTurn = []
  let rollSkillEphemeral = baseSkillEphemeral

  for (let round = 0; round < 12; round += 1) {
    const openAi = chainToOpenAiMessages(systemText, chainForOpenAi)

    const { text, roll } = await streamAssistantUntilRollOrEnd({
      apiKey: apiKey.trim(),
      openAiMessages: openAi,
      signal: undefined,
      onDelta: (segBuf) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === gmId ? { ...m, content: prefixGm + segBuf } : m)),
        )
      },
    })

    prefixGm += text
    setMessages((prev) => prev.map((m) => (m.id === gmId ? { ...m, content: prefixGm } : m)))

    if (typeof onGmRoundComplete === 'function') {
      onGmRoundComplete(prefixGm)
    }

    if (!roll) break

    const value = rollByLabel('1d100')
    const fromConfig = resolvePlayerSkillValue(roll.skillName)
    const skillUse =
      fromConfig ??
      (Number.isFinite(roll.skillValue) ? roll.skillValue : fallbackSkill)
    rollSkillEphemeral = [
      ...baseSkillEphemeral,
      ...buildEphemeralSkillReferenceMessages([roll.skillName]),
    ]
    const outcome = classifyRollStream(value, skillUse)
    const jud = outcome ? d100OutcomeLabel(outcome) : '失败'
    const sysLine = `[ROLL_RESULT:${roll.skillName}:${value}:${jud}]`
    const sysWithHint = `${sysLine}\n请立刻接续输出，勿重复已生成的上文。`
    const sysId = uid()
    const sysTs = Date.now()
    const sysMsg = { id: sysId, role: 'system', content: sysWithHint, ts: sysTs }

    setDiceLog((prev) =>
      [
        {
          id: uid(),
          skillName: roll.skillName,
          value,
          dice: '1d100',
          outcome,
          judgeText: jud,
          ts: sysTs,
        },
        ...prev,
      ].slice(0, 5),
    )

    setMessages((prev) => [...prev, sysMsg])
    rollResultsInTurn.push(sysMsg)
    chainForOpenAi = [
      ...snap,
      userMsg,
      ...itemEphemeral,
      ...rollSkillEphemeral,
      ...preSystemMessages,
      { id: gmId, role: 'gm', content: prefixGm, ts: gmTs },
      ...rollResultsInTurn,
    ]
  }
}
