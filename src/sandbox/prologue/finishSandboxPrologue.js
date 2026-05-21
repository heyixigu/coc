import { loadState } from '../../storage.js'
import { parseSandboxGmStatus } from '../sandboxParseGmStatus.js'
import {
  applyStateChangeFromGmReply,
  stripStateChangeSection,
} from '../sandboxStateChangeParser.js'
import { clearCustomWorldbook } from '../../worldbook/worldbookStorage.js'
import {
  computeHpMpFromSkills,
  loadSandboxSlot,
  saveSandboxSlot,
} from '../sandboxStorage.js'

/**
 * @param {object} opts
 * @param {import('../sandboxStorage.js').SandboxCharacter} opts.character
 * @param {import('../sandboxStorage.js').SandboxWorldRef} opts.world
 * @param {string} opts.opening
 * @param {string} [opts.openingRaw] 含【状态变更】的完整 GM 回复
 */
export function finishSandboxPrologue({ character, world, opening, openingRaw }) {
  const ts = Date.now()
  const { hp, mp, maxHp, maxMp } = computeHpMpFromSkills(character.skills ?? {})
  const characterWithHpMp = { ...character, hp, mp, maxHp, maxMp }
  const slot = loadState().selectedSlot
  const displayOpening = stripStateChangeSection(opening)
  if (slot && openingRaw) {
    try {
      applyStateChangeFromGmReply(openingRaw, slot, 1)
    } catch {
      /* */
    }
  }
  let companions = []
  try {
    const parsed = parseSandboxGmStatus(displayOpening, [], characterWithHpMp.name)
    if (parsed) companions = parsed.companions
  } catch {
    companions = []
  }
  const state = {
    character: characterWithHpMp,
    world,
    messages: [
      {
        id: `gm-opening-${ts}`,
        role: 'gm',
        content: displayOpening,
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
    companions,
  }
  if (!slot) {
    throw new Error('未选择存档槽，无法保存沙盒序幕进度')
  }

  clearCustomWorldbook(slot)

  const applied = loadSandboxSlot(slot)
  if (applied.character) {
    state.character = {
      ...state.character,
      hp: applied.character.hp,
      mp: applied.character.mp,
      maxHp: applied.character.maxHp,
      maxMp: applied.character.maxMp,
    }
  }
  if (applied.playerInventory) state.playerInventory = applied.playerInventory
  if (applied.companions?.length) state.companions = applied.companions

  saveSandboxSlot(slot, state)
  return state
}
