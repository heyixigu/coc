import { classifyRollStream, d100OutcomeLabel } from './cocJudge.js'
import { rollByLabel } from './dice.js'
import { chainToOpenAiMessages, streamAssistantUntilRollOrEnd } from './deepseek.js'

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * 流式生成守密人回复，处理 [ROLL] 链式续写。
 * snap / userMsg 为内部消息格式：role 为 gm | player | system。
 */
export async function runGmStreamWithRolls({
  apiKey,
  systemText,
  snap,
  userMsg,
  preSystemMessages = [],
  gmId,
  gmTs,
  setMessages,
  setDiceLog,
  onGmRoundComplete,
  fallbackSkill = 50,
}) {
  let prefixGm = ''
  let chainForOpenAi = [...snap, userMsg, ...preSystemMessages]
  const rollResultsInTurn = []

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
    const skillUse = Number.isFinite(roll.skillValue) ? roll.skillValue : fallbackSkill
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
      ...preSystemMessages,
      { id: gmId, role: 'gm', content: prefixGm, ts: gmTs },
      ...rollResultsInTurn,
    ]
  }
}
