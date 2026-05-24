import { SANDBOX_SKILL_NAMES } from './config/sandbox_judge_prompt.js'

/**
 * @param {import('./sandboxStorage.js').SandboxInventoryItem[]} items
 * @returns {string}
 */
function formatInventoryItems(items) {
  if (!items?.length) return '无'
  return items
    .map((i) => (i.quantity && i.quantity > 1 ? `${i.name}x${i.quantity}` : i.name))
    .join('、')
}

/**
 * @param {import('./sandboxStorage.js').SandboxPlayerInventory | null | undefined} playerInventory
 * @param {import('./sandboxStorage.js').SandboxCharacter} character
 * @returns {{ equipped: import('./sandboxStorage.js').SandboxInventoryItem[], carried: import('./sandboxStorage.js').SandboxInventoryItem[] }}
 */
function resolveContextInventory(playerInventory, character) {
  const inv = playerInventory ?? { equipped: [], carried: [] }
  const hasInv = inv.equipped.length > 0 || inv.carried.length > 0
  if (hasInv) {
    return { equipped: inv.equipped, carried: inv.carried }
  }
  const legacy = Array.isArray(character?.items) ? character.items : []
  return {
    equipped: [],
    carried: legacy.map((name) => ({ name: String(name), description: '', quantity: 1 })),
  }
}

/**
 * @deprecated 使用 buildSandboxStateSnapshotMessage 构造动态状态快照。
 * @param {import('./sandboxStorage.js').SandboxCharacter} character
 * @param {import('./sandboxStorage.js').SandboxCompanion[]} [companions]
 * @param {import('./sandboxStorage.js').SandboxPlayerInventory} [playerInventory]
 */
export function buildSandboxContextMessage(character, companions = [], playerInventory) {
  const skillLines = SANDBOX_SKILL_NAMES.map(
    (n) => `${n}${character.skills[n] ?? 5}`,
  ).join(' ')
  const { equipped, carried } = resolveContextInventory(playerInventory, character)
  const equippedText = formatInventoryItems(equipped)
  const carriedText = formatInventoryItems(carried)
  const active = companions.filter((c) => c.status === 'active')
  const companionPart =
    active.length > 0
      ? ` 伙伴:${active.map((c) => `${c.name}HP${c.hp}/${c.maxHp}`).join(' ')}`
      : ''
  return `[当前角色] ${character.name} HP${character.hp}/${character.maxHp} MP${character.mp}/${character.maxMp} 技能:${skillLines} 装备:${equippedText} 携带:${carriedText}${companionPart}`
}
