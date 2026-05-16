import { classifyRollStream, d100OutcomeLabel } from './cocJudge.js'
import { rollByLabel } from './dice.js'

/**
 * @typedef {{ skill: string, value: number }} SkillCheck
 * @typedef {{ skillName: string, value: number, outcome: import('./cocJudge.js').D100Outcome | null, judgeText: string }} RollOutcome
 */

/**
 * @param {SkillCheck[]} skills
 * @returns {{ lines: string[], outcomes: RollOutcome[] }}
 */
export function resolveSkillChecks(skills) {
  const lines = []
  const outcomes = []

  for (const { skill, value } of skills) {
    const roll = rollByLabel('1d100')
    const outcome = classifyRollStream(roll, value)
    const judgeText = outcome ? d100OutcomeLabel(outcome) : '失败'
    lines.push(`[ROLL_RESULT:${skill}:${roll}:${judgeText}]`)
    outcomes.push({ skillName: skill, value: roll, outcome, judgeText })
  }

  return { lines, outcomes }
}

/**
 * @param {string[]} lines
 */
export function buildPreRollSystemContent(lines) {
  if (!lines.length) return ''
  return `${lines.join('\n')}\n请根据以上检定结果完成本轮叙述。`
}
