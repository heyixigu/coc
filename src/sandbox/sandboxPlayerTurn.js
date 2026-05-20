import { postChatNonStream } from '../deepseek.js'
import { buildPreRollSystemContent } from '../resolveTurnRolls.js'
import { SANDBOX_JUDGE_SYSTEM_PROMPT } from './config/sandbox_judge_prompt.js'
import { SANDBOX_ARCHIVE_CMD } from './sandboxArchiveEvent.js'
import {
  buildSandboxGmPrompt,
  SANDBOX_PRE_ROLL_ADDENDUM,
} from './config/sandbox_system_prompt.js'
import { buildSandboxContextMessage } from './sandboxContextInject.js'
import { resolveSandboxSkillChecks } from './sandboxDice.js'
import { buildSandboxGmApiChain } from './sandboxMessageChain.js'
import { extractAllStateUpdates } from './sandboxFactExtractor.js'
import { filterRelevantMemoryGraph, matchRelevantNpcs } from './sandboxNpcMatcher.js'
import {
  getActiveFacts,
  loadEventTimeline,
  loadNpcArchive,
  loadNpcMemoryGraph,
  loadQuestState,
  loadWorldState,
} from './sandboxStorage.js'
import { parseSandboxJudgeSkillsJson } from './sandboxSkillJudge.js'

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * @typedef {import('../deepseek.js').ChatMsg} ChatMsg
 * @typedef {import('./sandboxStorage.js').SandboxCharacter} SandboxCharacter
 * @typedef {import('./sandboxStorage.js').SandboxCompanion} SandboxCompanion
 * @typedef {import('./config/sandbox_worlds.js').SandboxWorld} SandboxWorld
 * @typedef {import('./sandboxSkillJudge.js').SandboxSkillCheck} SandboxSkillCheck
 */

/**
 * @param {SandboxSkillCheck[]} checks
 * @param {SandboxCharacter} character
 * @param {SandboxCompanion[]} companions
 */
export function resolveSandboxCheckValues(checks, character, companions) {
  const active = companions.filter((c) => c.status === 'active')
  return checks.map((check) => {
    const companion = active.find((c) => c.name === check.character)
    const isCompanion =
      companion && check.character && check.character !== character.name

    if (isCompanion) {
      const diceLabel = `伙伴:${companion.name}-${check.skill}`
      return {
        skill: check.skill,
        value: companion.skills[check.skill] ?? check.value,
        rollLabel: diceLabel,
        diceLogLabel: diceLabel,
      }
    }

    return {
      skill: check.skill,
      value: character.skills[check.skill] ?? check.value,
      rollLabel: check.skill,
      diceLogLabel: check.skill,
    }
  })
}

/**
 * @param {object} o
 * @param {string} o.apiKey
 * @param {ChatMsg[]} o.historyMessages 含本轮玩家消息的完整本地历史（勿读异步滞后的 state）
 * @param {ChatMsg} o.userMsg
 * @param {SandboxCharacter} o.character
 * @param {SandboxWorld} o.world
 * @param {SandboxCompanion[]} [o.companions]
 * @param {string} o.gmId
 * @param {number} o.gmTs
 * @param {React.Dispatch<React.SetStateAction<ChatMsg[]>>} o.setMessages
 * @param {React.Dispatch<React.SetStateAction<any[]>>} o.setDiceLog
 * @param {(opts: object & { baseMessages: ChatMsg[], onGmComplete?: (gmReply: string) => void }) => Promise<boolean>} o.presentGm
 * @param {number} [o.consecutiveFails]
 * @param {(n: number) => void} [o.onConsecutiveFailsChange]
 * @param {'like' | 'dislike' | null} [o.feedback]
 * @param {import('./sandboxStorage.js').SandboxArchivedEventEntry[]} [o.archivedEvents]
 * @param {(opts: object) => Promise<boolean>} [o.onArchiveEvent]
 * @param {number} [o.slotIndex] 1-based，用于 NPC 档案读写
 * @param {number} [o.factTurn] 写入事实库时的轮次（通常为 playerTurnCount+1）
 * @param {() => void} [o.onExtractComplete] 事实/时间线提取成功后回调
 * @param {boolean} [o.regenerate] 重新生成：提取前先回滚本轮后台状态
 */
export async function runSandboxPlayerTurn({
  apiKey,
  historyMessages,
  userMsg,
  character,
  world,
  companions = [],
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
  slotIndex,
  factTurn = 0,
  onExtractComplete,
  regenerate = false,
}) {
  const key = apiKey.trim()
  const actionText = userMsg.content

  if (actionText.trim() === SANDBOX_ARCHIVE_CMD) {
    if (typeof onArchiveEvent === 'function') {
      return onArchiveEvent({ apiKey: key, historyMessages, userMsg, gmId, gmTs })
    }
    return false
  }

  const activeCompanionNames = companions
    .filter((c) => c.status === 'active')
    .map((c) => c.name)
    .join('、')

  const judgeUser = [
    `玩家：${character.name}`,
    activeCompanionNames ? `当前同行伙伴：${activeCompanionNames}` : '当前无同行伙伴',
    `行动：${actionText}`,
  ].join('\n')

  const judgeRaw = await postChatNonStream({
    apiKey: key,
    messages: [
      { role: 'system', content: SANDBOX_JUDGE_SYSTEM_PROMPT },
      { role: 'user', content: judgeUser },
    ],
  })

  let judgeChecks = []
  try {
    judgeChecks = parseSandboxJudgeSkillsJson(judgeRaw)
  } catch {
    judgeChecks = []
  }

  const rollChecks = resolveSandboxCheckValues(judgeChecks, character, companions)
  const preSystemMessages = []
  const contextMsg = {
    id: uid(),
    role: 'system',
    content: buildSandboxContextMessage(character, companions),
    ts: Date.now(),
  }

  if (rollChecks.length > 0) {
    const rollResult = resolveSandboxSkillChecks(rollChecks, consecutiveFails)
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

  const messagesForGm = [...historyMessages, ...preSystemMessages]
  setMessages(messagesForGm)

  let relevantNpcs = []
  let relevantMemoryGraph = { nodes: [], edges: [] }
  if (slotIndex != null && Number.isFinite(slotIndex)) {
    const npcArchive = loadNpcArchive(slotIndex)
    const recentMessages = historyMessages.slice(-5)
    relevantNpcs = matchRelevantNpcs(actionText, recentMessages, npcArchive)
    const memoryGraph = loadNpcMemoryGraph(slotIndex)
    const relevantNpcIds = relevantNpcs.map((n) => n.id)
    relevantMemoryGraph = filterRelevantMemoryGraph(memoryGraph, relevantNpcIds)
  }

  const activeCompanions = companions.filter((c) => c.status === 'active')
  const activeFacts =
    slotIndex != null && Number.isFinite(slotIndex) ? getActiveFacts(slotIndex) : []
  const recentEvents =
    slotIndex != null && Number.isFinite(slotIndex)
      ? loadEventTimeline(slotIndex).events.slice(-10)
      : []
  const worldState =
    slotIndex != null && Number.isFinite(slotIndex)
      ? loadWorldState(slotIndex)
      : { locations: [], factions: [], environment: [], keyItems: [] }
  const questState =
    slotIndex != null && Number.isFinite(slotIndex)
      ? loadQuestState(slotIndex)
      : { quests: [] }
  const systemText = `${buildSandboxGmPrompt(
    character,
    world,
    archivedEvents,
    relevantNpcs,
    activeCompanions,
    activeFacts,
    recentEvents,
    worldState,
    questState,
    relevantMemoryGraph,
    slotIndex ?? null,
  )}\n\n${SANDBOX_PRE_ROLL_ADDENDUM}`
  const chain = buildSandboxGmApiChain(historyMessages, preSystemMessages, contextMsg)

  const onGmComplete =
    slotIndex != null && Number.isFinite(slotIndex)
      ? (gmReply) => {
          extractAllStateUpdates({
            apiKey: key,
            gmReply,
            currentTurn: factTurn,
            slotIndex,
            onComplete: onExtractComplete,
            rollbackBeforeExtract: regenerate,
          }).catch(() => {})
        }
      : undefined

  return presentGm({
    apiKey: key,
    systemText,
    chain,
    baseMessages: messagesForGm,
    gmId,
    gmTs,
    characterName: character.name,
    feedback,
    onGmComplete,
  })
}
