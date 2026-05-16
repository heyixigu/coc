/** 完整 [ROLL:技能名:技能值]；技能名内不含冒号 */
const ROLL_FULL = /\[ROLL:([^:]+):(\d+)\]/

/**
 * 若 buffer 中已出现完整 ROLL 标记，返回截断位置与解析结果；否则 null。
 * @param {string} buffer
 */
export function matchFirstRollMarker(buffer) {
  const m = buffer.match(ROLL_FULL)
  if (!m || m.index === undefined) return null
  const skillName = m[1].trim()
  const rawV = Number.parseInt(m[2], 10)
  if (!skillName || !Number.isFinite(rawV)) return null
  const skillValue = Math.min(100, Math.max(1, Math.trunc(rawV)))
  return {
    textThroughRoll: buffer.slice(0, m.index + m[0].length),
    skillName,
    skillValue,
  }
}
