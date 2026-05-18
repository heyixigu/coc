import { INIT_USER_MESSAGE } from '../config/characters.js'
import { GM_SYSTEM_PROMPT } from '../config/system_prompt.js'
import { parseCharacterInitJson } from '../characterInit.js'
import { postChatNonStream } from '../deepseek.js'
import { loadState, saveSlot, saveState } from '../storage.js'

/**
 * @typedef {{ title: string, summary: string, tags: string[], opening: string }} ScenarioOption
 * @param {{ apiKey: string, scenario: ScenarioOption, signal?: AbortSignal }} opts
 */
export async function finishPrologueAndSave({ apiKey, scenario, signal }) {
  const key = apiKey.trim()
  const raw = await postChatNonStream({
    apiKey: key,
    messages: [
      { role: 'system', content: GM_SYSTEM_PROMPT },
      { role: 'user', content: INIT_USER_MESSAGE },
    ],
    signal,
  })
  const pair = parseCharacterInitJson(raw)

  const prev = loadState()
  const gameState = {
    player: pair.player,
    partner: pair.partner,
    messages: [],
    diceLog: [],
    prologueComplete: true,
    selectedScenario: {
      title: scenario.title.trim(),
      summary: scenario.summary.trim(),
      tags: scenario.tags,
      opening: scenario.opening.trim(),
    },
    scenarioTitle: scenario.title.trim(),
    playerTurnCount: 0,
    playerItems: [],
    partnerItems: [],
    sceneItems: [],
    turnSummaries: [],
    archivedEvents: [],
    eventIndex: 1,
  }
  const slot = prev.selectedSlot
  if (slot) {
    saveSlot(slot, gameState)
    saveState({
      apiKey: key,
      selectedMode: prev.selectedMode === 'sandbox' ? 'sandbox' : 'coc',
      selectedSlot: slot,
    })
  } else {
    saveState({
      apiKey: key,
      selectedMode: prev.selectedMode === 'sandbox' ? 'sandbox' : 'coc',
      selectedSlot: prev.selectedSlot,
      ...gameState,
    })
  }
  return { apiKey: key, selectedMode: prev.selectedMode, ...gameState }
}
