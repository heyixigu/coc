import { postChatNonStream } from '../deepseek.js'
import { buildPreRollSystemContent } from '../resolveTurnRolls.js'
import { parseJudgeSkillsJson } from '../skillJudge.js'
import { SANDBOX_JUDGE_SYSTEM_PROMPT } from './config/sandbox_judge_prompt.js'
import { SANDBOX_ARCHIVE_CMD } from './sandboxArchiveEvent.js'
import {
  buildSandboxGmPrompt,
  SANDBOX_PRE_ROLL_ADDENDUM,
} from './config/sandbox_system_prompt.js'
import { buildSandboxContextMessage } from './sandboxContextInject.js'
import { resolveSandboxSkillChecks } from './sandboxDice.js'

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * @typedef {import('../deepseek.js').ChatMsg} ChatMsg
 * @typedef {import('./sandboxStorage.js').SandboxCharacter} SandboxCharacter
 * @typedef {import('./config/sandbox_worlds.js').SandboxWorld} SandboxWorld
 */

/**
 * @param {import('../skillJudge.js').SkillCheck[]} skills
 * @param {SandboxCharacter['skills']} skillMap
 */
export function applySandboxSkillValues(skills, skillMap) {
  return skills.map(({ skill, value }) => ({
    skill,
    value: skillMap[skill] ?? value,
  }))
}

/**
 * @param {object} o
 * @param {string} o.apiKey
 * @param {ChatMsg[]} o.snap
 * @param {ChatMsg} o.userMsg
 * @param {SandboxCharacter} o.character
 * @param {SandboxWorld} o.world
 * @param {string} o.gmId
 * @param {number} o.gmTs
 * @param {React.Dispatch<React.SetStateAction<ChatMsg[]>>} o.setMessages
 * @param {React.Dispatch<React.SetStateAction<any[]>>} o.setDiceLog
 * @param {(opts: object) => Promise<boolean>} o.presentGm
 * @param {number} [o.consecutiveFails]
 * @param {(n: number) => void} [o.onConsecutiveFailsChange]
 * @param {'like' | 'dislike' | null} [o.feedback]
 * @param {import('./sandboxStorage.js').SandboxArchivedEventEntry[]} [o.archivedEvents]
 * @param {(opts: object) => Promise<boolean>} [o.onArchiveEvent]
 */
export async function runSandboxPlayerTurn({
  apiKey,
  snap,
  userMsg,
  character,
  world,
  gmId,
  gmTs,
  setMessages,
  setDiceLog,
  presentGm,
  consecutiveFails = 0,
  onConsecutiveFailsChange,
  feedback = null,
  archivedEvents = [],
  onArchiveEvent,
}) {
  const key = apiKey.trim()
  const actionText = userMsg.content

  if (actionText.trim() === SANDBOX_ARCHIVE_CMD) {
    if (typeof onArchiveEvent === 'function') {
      return onArchiveEvent({ apiKey: key, snap, userMsg, gmId, gmTs })
    }
    return false
  }

  const judgeRaw = await postChatNonStream({
    apiKey: key,
    messages: [
      { role: 'system', content: SANDBOX_JUDGE_SYSTEM_PROMPT },
      { role: 'user', content: actionText },
    ],
  })

  const skills = applySandboxSkillValues(parseJudgeSkillsJson(judgeRaw), character.skills)
  const preSystemMessages = []
  const contextMsg = {
    id: uid(),
    role: 'system',
    content: buildSandboxContextMessage(character),
    ts: Date.now(),
  }

  if (skills.length > 0) {
    const rollResult = resolveSandboxSkillChecks(skills, consecutiveFails)
    if (typeof onConsecutiveFailsChange === 'function') {
      onConsecutiveFailsChange(rollResult.consecutiveFails)
    }

    const sysTs = Date.now()
    preSystemMessages.push({
      id: uid(),
      role: 'system',
      content: buildPreRollSystemContent(rollResult.lines),
      ts: sysTs,
    })

    setDiceLog((prev) => {
      const entries = rollResult.outcomes.map((o) => ({
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
    return out
  })

  const systemText = `${buildSandboxGmPrompt(character, world, archivedEvents)}\n\n${SANDBOX_PRE_ROLL_ADDENDUM}`
  const chain = [contextMsg, ...snap, userMsg, ...preSystemMessages]

  return presentGm({
    apiKey: key,
    systemText,
    chain,
    gmId,
    gmTs,
    characterName: character.name,
    feedback,
  })
}
