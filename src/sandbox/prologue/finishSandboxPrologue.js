import { loadState } from '../../storage.js'
import { computeHpMpFromSkills, saveSandboxSlot } from '../sandboxStorage.js'

/**
 * @param {object} opts
 * @param {import('../sandboxStorage.js').SandboxCharacter} opts.character
 * @param {import('../sandboxStorage.js').SandboxWorldRef} opts.world
 * @param {string} opts.opening
 */
export function finishSandboxPrologue({ character, world, opening }) {
  const ts = Date.now()
  const { hp, mp, maxHp, maxMp } = computeHpMpFromSkills(character.skills ?? {})
  const characterWithHpMp = { ...character, hp, mp, maxHp, maxMp }
  const state = {
    character: characterWithHpMp,
    world,
    messages: [
      {
        id: `gm-opening-${ts}`,
        role: 'gm',
        content: opening,
        ts,
      },
    ],
    diceLog: [],
    playerTurnCount: 0,
    consecutiveFails: 0,
    prologueComplete: true,
    turnSummaries: [],
    archivedEvents: [],
    eventIndex: 1,
  }
  const slot = loadState().selectedSlot
  if (!slot) {
    throw new Error('未选择存档槽，无法保存沙盒序幕进度')
  }
  saveSandboxSlot(slot, state)
  return state
}
