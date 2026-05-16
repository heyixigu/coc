/** @param {number} min @param {number} max inclusive */
function intInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * CoC 向规则：百分骰越低越易成功；有利方向为降低点数。
 * 1. 先掷 1–100
 * 2. 若落在 96–100（大失败区），有 50% 概率重掷为 1–95，使大失败概率减半
 * 3. 再减去随机 8–12 的偏移，并限制在 1–100
 * 展示给玩家的是处理后的数值。
 */
export function rollBiasedD100() {
  let working = intInclusive(1, 100)
  if (working >= 96 && working <= 100 && Math.random() < 0.5) {
    working = intInclusive(1, 95)
  }
  const tilt = intInclusive(8, 12)
  const processed = Math.min(100, Math.max(1, working - tilt))
  return processed
}

/** @param {number} sides */
export function rollDie(sides) {
  return intInclusive(1, sides)
}

/** @param {'1d100'|'1d6'|'1d8'|'1d3'|'1d10'} label */
export function rollByLabel(label) {
  switch (label) {
    case '1d100':
      return rollBiasedD100()
    case '1d6':
      return rollDie(6)
    case '1d8':
      return rollDie(8)
    case '1d3':
      return rollDie(3)
    case '1d10':
      return rollDie(10)
    default:
      return rollDie(6)
  }
}
