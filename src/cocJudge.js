/** @typedef {'extreme' | 'success' | 'fail' | 'fumble'} D100Outcome */

/**
 * 流式检定用判定（与 [ROLL] 配套）：
 * - 投掷值 96–100 → 大失败（伪随机已由掷骰函数处理）
 * - 投掷值 ≤ 技能值/5 → 大成功
 * - 投掷值 ≤ 技能值 → 成功
 * - 投掷值 > 技能值 且 ≤ 95 → 失败
 * @param {number} roll 1–100
 * @param {number} skill 技能值 1–100
 * @returns {D100Outcome | null}
 */
export function classifyRollStream(roll, skill) {
  if (!Number.isFinite(skill)) return null
  const s = Math.min(100, Math.max(1, Math.trunc(skill)))
  if (!Number.isFinite(roll) || roll < 1 || roll > 100) return null

  if (roll >= 96) return 'fumble'

  const fifth = Math.max(1, Math.floor(s / 5))
  if (roll <= fifth) return 'extreme'
  if (roll <= s) return 'success'
  return 'fail'
}

/** @param {D100Outcome} o */
export function d100OutcomeLabel(o) {
  switch (o) {
    case 'extreme':
      return '大成功'
    case 'success':
      return '成功'
    case 'fail':
      return '失败'
    case 'fumble':
      return '大失败'
    default:
      return ''
  }
}
