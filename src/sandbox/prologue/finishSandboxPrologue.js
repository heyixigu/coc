import { saveSandboxState } from '../sandboxStorage.js'

/**
 * @param {object} opts
 * @param {import('../sandboxStorage.js').SandboxCharacter} opts.character
 * @param {import('../sandboxStorage.js').SandboxWorldRef} opts.world
 * @param {string} opts.opening
 */
export function finishSandboxPrologue({ character, world, opening }) {
  const ts = Date.now()
  const state = {
    character,
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
    prologueComplete: true,
  }
  saveSandboxState(state)
  return state
}
