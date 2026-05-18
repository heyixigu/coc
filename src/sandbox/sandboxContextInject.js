import { SANDBOX_SKILL_NAMES } from './config/sandbox_judge_prompt.js'

/**
 * @param {import('./sandboxStorage.js').SandboxCharacter} character
 */
export function buildSandboxContextMessage(character) {
  const skillLines = SANDBOX_SKILL_NAMES.map(
    (n) => `${n}${character.skills[n] ?? 5}`,
  ).join(' ')
  const items = character.items.length > 0 ? character.items.join('、') : '无'
  return `[当前角色] ${character.name} HP${character.hp}/${character.maxHp} MP${character.mp}/${character.maxMp} 技能:${skillLines} 物品:${items}`
}
