import { INIT_USER_MESSAGE } from '../config/characters.js'
import { GM_SYSTEM_PROMPT } from '../config/system_prompt.js'
import { parseCharacterInitJson } from '../characterInit.js'
import { postChatNonStream } from '../deepseek.js'
import { saveState } from '../storage.js'

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

  const state = {
    apiKey: key,
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
  }
  saveState(state)
  return state
}
