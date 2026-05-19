import { classifyRollStream, d100OutcomeLabel } from '../cocJudge.js'

const PITY_FAIL_THRESHOLD = 2
const PITY_TAG = '命运眷顾'

/**
 * 沙盒 1d100：投三次取中间值（中位数）。
 * @returns {number}
 */
export function rollSandboxD100() {
  const rolls = [
    Math.floor(Math.random() * 100) + 1,
    Math.floor(Math.random() * 100) + 1,
    Math.floor(Math.random() * 100) + 1,
  ]
  rolls.sort((a, b) => a - b)
  return rolls[1]
}

/**
 * @typedef {{ skill: string, value: number, rollLabel?: string, diceLogLabel?: string }} SandboxRollCheck
 * @typedef {{ skillName: string, value: number, outcome: import('../cocJudge.js').D100Outcome | null, judgeText: string, pity?: boolean, actorLabel?: string }} RollOutcome
 */

/**
 * @param {SandboxRollCheck[]} skills
 * @param {number} consecutiveFails
 * @returns {{ lines: string[], outcomes: RollOutcome[], consecutiveFails: number }}
 */
export function resolveSandboxSkillChecks(skills, consecutiveFails = 0) {
  const lines = []
  const outcomes = []
  let fails = Math.max(0, Number(consecutiveFails) || 0)

  for (const { skill, value, rollLabel, diceLogLabel } of skills) {
    const skillVal = Math.min(100, Math.max(1, Math.trunc(value)))
    let roll
    let outcome
    let pity = false

    if (fails >= PITY_FAIL_THRESHOLD) {
      roll = Math.max(1, skillVal - 1)
      outcome = classifyRollStream(roll, skillVal)
      if (outcome !== 'success' && outcome !== 'extreme') {
        outcome = 'success'
      }
      pity = true
      fails = 0
    } else {
      roll = rollSandboxD100()
      outcome = classifyRollStream(roll, skillVal)
      if (outcome === 'success' || outcome === 'extreme') {
        fails = 0
      } else if (outcome === 'fail' || outcome === 'fumble') {
        fails += 1
      }
    }

    const baseLabel = outcome ? d100OutcomeLabel(outcome) : '失败'
    const judgeText = pity ? `${baseLabel}（${PITY_TAG}）` : baseLabel
    const resultKey = rollLabel || skill
    const logLabel = diceLogLabel || (rollLabel ? rollLabel : skill)
    lines.push(`[ROLL_RESULT:${resultKey}:${roll}:${judgeText}]`)
    outcomes.push({
      skillName: logLabel,
      value: roll,
      outcome,
      judgeText,
      pity,
      actorLabel: logLabel,
    })
  }

  return { lines, outcomes, consecutiveFails: fails }
}
