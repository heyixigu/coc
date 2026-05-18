import { classifyRollStream, d100OutcomeLabel } from '../cocJudge.js'

const PITY_FAIL_THRESHOLD = 2
const PITY_TAG = '命运眷顾'

/**
 * 沙盒 1d100：两次取较高值，整体偏向成功。
 * @returns {number}
 */
export function rollSandboxD100() {
  const a = Math.floor(Math.random() * 100) + 1
  const b = Math.floor(Math.random() * 100) + 1
  return Math.max(a, b)
}

/**
 * @typedef {{ skill: string, value: number }} SkillCheck
 * @typedef {{ skillName: string, value: number, outcome: import('../cocJudge.js').D100Outcome | null, judgeText: string, pity?: boolean }} RollOutcome
 */

/**
 * @param {SkillCheck[]} skills
 * @param {number} consecutiveFails
 * @returns {{ lines: string[], outcomes: RollOutcome[], consecutiveFails: number }}
 */
export function resolveSandboxSkillChecks(skills, consecutiveFails = 0) {
  const lines = []
  const outcomes = []
  let fails = Math.max(0, Number(consecutiveFails) || 0)

  for (const { skill, value } of skills) {
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
    lines.push(`[ROLL_RESULT:${skill}:${roll}:${judgeText}]`)
    outcomes.push({ skillName: skill, value: roll, outcome, judgeText, pity })
  }

  return { lines, outcomes, consecutiveFails: fails }
}
