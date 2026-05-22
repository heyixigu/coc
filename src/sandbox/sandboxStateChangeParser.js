import {
  loadSandboxSlot,
  saveSandboxSlot,
  loadNpcArchive,
  saveNpcArchive,
  loadQuestState,
  saveQuestState,
  loadWorldState,
  saveWorldState,
} from './sandboxStorage.js'
import { extractStateChangeJson } from './sandboxValidateGmReply.js'

/**
 * 应用结构化状态变更对象。
 * @param {object | null} data
 * @param {number} slotIndex
 * @param {number} currentTurn
 * @returns {boolean} 是否有变化
 */
export function applyStateChangeData(data, slotIndex, currentTurn) {
  void currentTurn
  if (!data) return false

  let changed = false

  try {
    const slot = loadSandboxSlot(slotIndex)
    let slotDirty = false

    if (data.playerStatus && slot.character) {
      if (typeof data.playerStatus.hp === 'number') slot.character.hp = data.playerStatus.hp
      if (typeof data.playerStatus.maxHp === 'number') slot.character.maxHp = data.playerStatus.maxHp
      if (typeof data.playerStatus.mp === 'number') slot.character.mp = data.playerStatus.mp
      if (typeof data.playerStatus.maxMp === 'number') slot.character.maxMp = data.playerStatus.maxMp
      slotDirty = true
      changed = true
    }

    if (data.playerInventory) {
      slot.playerInventory = {
        equipped: Array.isArray(data.playerInventory.equipped) ? data.playerInventory.equipped : [],
        carried: Array.isArray(data.playerInventory.carried) ? data.playerInventory.carried : [],
      }
      slotDirty = true
      changed = true
    }

    if (Array.isArray(data.companionChanges) && data.companionChanges.length > 0) {
      for (const update of data.companionChanges) {
        const companion = (slot.companions ?? []).find((c) => c.name === update.name)
        if (!companion) continue
        if (typeof update.hp === 'number') companion.hp = update.hp
        if (typeof update.maxHp === 'number') companion.maxHp = update.maxHp
        if (typeof update.mp === 'number') companion.mp = update.mp
        if (typeof update.maxMp === 'number') companion.maxMp = update.maxMp
        if (update.status) companion.status = update.status
        if (update.status === 'dead') companion.isDead = true
        if (update.status === 'departed' || update.status === 'left') companion.isDeparted = true
        if (Array.isArray(update.equipped)) companion.equipped = update.equipped
        if (Array.isArray(update.carried)) companion.carried = update.carried
      }
      slotDirty = true
      changed = true
    }

    if (slotDirty) {
      saveSandboxSlot(slotIndex, slot)
    }
  } catch (e) {
    console.warn('applyStateChangeData [slot]:', e)
  }

  try {
    if (Array.isArray(data.npcChanges) && data.npcChanges.length > 0) {
      const archive = loadNpcArchive(slotIndex)
      for (const update of data.npcChanges) {
        if (!update.name) continue
        const existing = archive.npcs.find((n) => n.name === update.name)
        if (existing) {
          if (update.identity) existing.identity = update.identity
          if (update.relationship) existing.relationship = update.relationship
          if (update.status) existing.status = update.status
          existing.updatedAt = Date.now()
        } else if (update.isNew) {
          archive.npcs.push({
            id: `npc_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            name: update.name,
            identity: update.identity ?? '',
            appearance: '',
            personality: '',
            secret: '',
            relationship: update.relationship ?? '',
            relationStrength: 3,
            status: update.status ?? '',
            isDead: false,
            updatedAt: Date.now(),
          })
        }
      }
      saveNpcArchive(slotIndex, archive)
      changed = true
    }
  } catch (e) {
    console.warn('applyStateChangeData [npcChanges]:', e)
  }

  try {
    if (data.questChanges) {
      const questState = loadQuestState(slotIndex)

      if (Array.isArray(data.questChanges.newQuests)) {
        for (const q of data.questChanges.newQuests) {
          if (!q.title) continue
          questState.quests.push({
            id: `quest_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            title: q.title,
            description: q.description ?? '',
            status: 'active',
            category: q.category === 'main' ? 'main' : 'side',
            givenBy: q.givenBy ?? '',
            objectives: (q.objectives ?? []).map((desc) => ({
              id: `obj_${Date.now()}_${Math.random().toString(16).slice(2)}`,
              description: desc,
              completed: false,
            })),
            reward: q.reward ?? '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        }
      }

      if (Array.isArray(data.questChanges.updatedQuests)) {
        for (const update of data.questChanges.updatedQuests) {
          const quest = questState.quests.find((q) => q.title === update.title)
          if (!quest) continue
          if (update.status) quest.status = update.status
          if (Array.isArray(update.completedObjectives)) {
            for (const objDesc of update.completedObjectives) {
              const obj = quest.objectives.find((o) => o.description === objDesc)
              if (obj) obj.completed = true
            }
          }
          quest.updatedAt = Date.now()
        }
      }

      saveQuestState(slotIndex, questState)
      changed = true
    }
  } catch (e) {
    console.warn('applyStateChangeData [questChanges]:', e)
  }

  try {
    if (data.locationChanges?.length || data.environmentChange) {
      const worldState = loadWorldState(slotIndex)

      if (Array.isArray(data.locationChanges)) {
        for (const update of data.locationChanges) {
          if (!update.name) continue
          const existing = worldState.locations.find((l) => l.name === update.name)
          if (existing) {
            if (update.status) existing.status = update.status
            if (typeof update.dangerLevel === 'number') {
              existing.dangerLevel = Math.min(5, Math.max(1, update.dangerLevel))
            }
            if (typeof update.controlledBy === 'string') existing.controlledBy = update.controlledBy
            if (typeof update.isAccessible === 'boolean') existing.isAccessible = update.isAccessible
            if (update.accessNote) existing.accessNote = update.accessNote
            existing.updatedAt = Date.now()
          } else if (update.isNew) {
            worldState.locations.push({
              id: `loc_${Date.now()}_${Math.random().toString(16).slice(2)}`,
              name: update.name,
              status: update.status ?? '',
              dangerLevel: update.dangerLevel ?? 2,
              controlledBy: update.controlledBy ?? '',
              isAccessible: update.isAccessible ?? true,
              accessNote: update.accessNote ?? '',
              updatedAt: Date.now(),
            })
          }
        }
      }

      if (data.environmentChange) {
        const env = worldState.environment
        if (data.environmentChange.weather) env.weather = data.environmentChange.weather
        if (data.environmentChange.timeOfDay) env.timeOfDay = data.environmentChange.timeOfDay
        if (data.environmentChange.season) env.season = data.environmentChange.season
        if (data.environmentChange.dayPassed === true) env.dayCount = (env.dayCount ?? 1) + 1
      }

      saveWorldState(slotIndex, worldState)
      changed = true
    }
  } catch (e) {
    console.warn('applyStateChangeData [worldState]:', e)
  }

  return changed
}

/**
 * 从GM回复中解析并应用【状态变更】
 * @param {string} gmReply
 * @param {number} slotIndex
 * @param {number} currentTurn
 * @returns {boolean} 是否有变化
 */
export function applyStateChangeFromGmReply(gmReply, slotIndex, currentTurn) {
  return applyStateChangeData(extractStateChangeJson(gmReply), slotIndex, currentTurn)
}

/**
 * 从GM回复中剥离【状态变更】段，返回干净的展示文本
 * @param {string} reply
 * @returns {string}
 */
export function stripStateChangeSection(reply) {
  return (reply || '').replace(/【状态变更】[\s\S]*$/, '').trim()
}
