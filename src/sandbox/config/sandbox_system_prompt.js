import { SANDBOX_SKILL_NAMES } from './sandbox_judge_prompt.js'
import { SANDBOX_WORLD_DETAILS } from './sandbox_world_details.js'

/**
 * @typedef {import('../sandboxStorage.js').SandboxCharacter} SandboxCharacter
 * @typedef {import('../sandboxStorage.js').SandboxNpcEntry} SandboxNpcEntry
 * @typedef {import('../sandboxStorage.js').SandboxCompanion} SandboxCompanion
 * @typedef {import('../sandboxStorage.js').SandboxFactEntry} SandboxFactEntry
 * @typedef {import('../sandboxStorage.js').SandboxTimelineEvent} SandboxTimelineEvent
 * @typedef {import('../sandboxStorage.js').SandboxWorldState} SandboxWorldState
 * @typedef {import('../sandboxStorage.js').SandboxQuestState} SandboxQuestState
 * @typedef {import('../sandboxStorage.js').SandboxQuestEntry} SandboxQuestEntry
 * @typedef {import('../sandboxStorage.js').SandboxNpcMemoryGraph} SandboxNpcMemoryGraph
 * @typedef {import('./sandbox_worlds.js').SandboxWorld} SandboxWorld
 */

/** 玩家回合：检定结果已预先注入时使用 */
export const SANDBOX_PRE_ROLL_ADDENDUM = `【本轮检定】
骰子结果已由系统在同轮玩家消息之后提供（若干行 [ROLL_RESULT:技能名:投掷值:判定]）。
你直接根据这些已知结果描写后果与场面，一次性写完五段格式回复。
不需要再插入任何 [ROLL] 标记。`

/**
 * @typedef {import('../sandboxStorage.js').SandboxArchivedEventEntry} SandboxArchivedEventEntry
 */

/**
 * @param {import('./sandbox_world_details.js').SANDBOX_WORLD_DETAILS[keyof typeof SANDBOX_WORLD_DETAILS]} detail
 */
function buildWorldDetailPrompt(detail) {
  const classes = detail.socialClasses.map((c) => `${c.name}：${c.description}`).join('\n')
  const names = `男性常见名：${detail.commonNames.male.join('、')}；女性常见名：${detail.commonNames.female.join('、')}`
  return `
【世界观细节参考——按需使用，不必每轮全部体现】
称谓与话语：${detail.commonPhrases.titles}
常用口头禅：${detail.commonPhrases.catchphrases}
禁忌用语：${detail.commonPhrases.taboos}
城市环境：${detail.environment.cityscape}
常见场所：${detail.environment.locations}
气候特征：${detail.environment.climate}
建筑风格：${detail.environment.architecture}
世界架构：${Object.values(detail.worldStructure).join('；')}
社会阶级：
${classes}
NPC起名参考：${names}
`
}

/**
 * @param {SandboxArchivedEventEntry[]} archivedEvents
 */
export function buildSandboxArchivedEventsContext(archivedEvents) {
  if (!Array.isArray(archivedEvents) || archivedEvents.length === 0) return ''
  const body = archivedEvents.map((e) => e.summary).join('\n\n')
  return `以下是本次游戏的历史事件档案，供你参考，无需在回复中提及：
${body}`
}

/**
 * @param {SandboxNpcEntry[]} relevantNpcs
 */
/**
 * @param {SandboxCompanion[]} companions
 */
function buildSandboxCompanionContext(companions) {
  const list = companions.filter((c) => c.status === 'active' && !c.isDead && !c.isDeparted)
  if (list.length === 0) return ''
  const body = list
    .map((c) => {
      const flag = c.isDead ? '【已死亡】' : c.isDeparted ? '【已离队】' : ''
      return `${c.name}${flag}：HP ${c.hp}/${c.maxHp} MP ${c.mp}/${c.maxMp}
   定位：${c.role || '未知'} | 忠诚度：${c.loyalty ?? 3}/5 | 控制度：${c.control ?? 0}/5
   目标：${c.goal || '无'}
   背景：${c.background || '未知'}
   性格：${c.personality || '未知'}
   技能：战斗${c.skills.战斗 ?? 5} 交涉${c.skills.交涉 ?? 5} 感知${c.skills.感知 ?? 5} 潜行${c.skills.潜行 ?? 5} 学识${c.skills.学识 ?? 5} 意志${c.skills.意志 ?? 5} 体魄${c.skills.体魄 ?? 5}`
    })
    .join('\n\n')
  return `【当前伙伴】
${body}`
}

/**
 * @param {SandboxFactEntry[]} activeFacts
 */
function buildSandboxFactContext(activeFacts) {
  if (!Array.isArray(activeFacts) || activeFacts.length === 0) return ''
  const body = activeFacts
    .map(
      (f) =>
        `• [${f.category}](importance:${f.importance ?? 3}, confidence:${f.confidence ?? 'medium'}): ${f.content}`,
    )
    .join('\n')
  return `【已确认事实数据库——全量参考，确保叙事不与以下事实矛盾】
${body}`
}

/**
 * @param {SandboxTimelineEvent[]} recentEvents
 */
function buildSandboxTimelineContext(recentEvents) {
  if (!Array.isArray(recentEvents) || recentEvents.length === 0) return ''
  const body = recentEvents
    .map((e) => {
      const imp = e.importance ?? 3
      const tags = (e.tags ?? []).join(',') || '无'
      return `[turn:${e.turn}] [importance:${imp}] [tags:${tags}] ${e.category}: ${e.title} - ${e.description} → ${e.consequence || '无'}`
    })
    .join('\n')
  return `【近期事件时间线——保持叙事因果一致；importance>=4 为永久保留】
${body}`
}

/**
 * @param {SandboxWorldState} worldState
 */
function buildSandboxWorldStateContext(worldState) {
  const ws = worldState ?? {
    locations: [],
    factions: [],
    environment: { weather: '晴', timeOfDay: '正午', season: '春', dayCount: 1 },
    economy: { priceLevel: 3, currency: '金币', marketNote: '' },
  }
  const env = ws.environment ?? { weather: '晴', timeOfDay: '正午', season: '春', dayCount: 1 }
  const eco = ws.economy ?? { priceLevel: 3, currency: '金币', marketNote: '' }
  const envLine = `第${env.dayCount}天 · ${env.season} · ${env.timeOfDay} · ${env.weather}`
  const ecoLine = `物价 ${'★'.repeat(eco.priceLevel)}${'☆'.repeat(5 - eco.priceLevel)} | ${eco.currency}${eco.marketNote ? ` · ${eco.marketNote}` : ''}`
  const locLines =
    ws.locations
      .map(
        (l) =>
          `${l.name}${l.isAccessible ? '' : '【封锁】'} 危险${l.dangerLevel}/5 归属:${l.controlledBy || '无主'} ${l.status}`,
      )
      .join('、') || '暂无'
  return `【当前世界状态——全量参考】
⚔️ 势力：${ws.factions.map((f) => `${f.name}(对玩家${f.attitudeToPlayer}·${f.currentStatus})`).join('、') || '暂无'}
🌤️ 环境：${envLine}
💰 经济：${ecoLine}
📍 地点：${locLines}`
}

/**
 * @param {SandboxQuestState} questState
 */
function buildSandboxQuestContext(questState) {
  const activeQuests = (questState?.quests ?? []).filter((q) => q.status === 'active')
  if (activeQuests.length === 0) return ''
  const body = activeQuests
    .map(
      (q) =>
        `[${q.category === 'main' ? '主线' : '支线'}] ${q.title}：${q.description}
   目标：${q.objectives.map((o) => `${o.completed ? '✓' : '○'} ${o.description}`).join('、')}
   奖励：${q.reward}`,
    )
    .join('\n')
  return `【进行中任务——保持任务逻辑一致】
${body}`
}

/**
 * @param {SandboxNpcMemoryGraph} relevantMemoryGraph
 */
function buildSandboxMemoryContext(relevantMemoryGraph) {
  const graph = relevantMemoryGraph ?? { nodes: [], edges: [] }
  if (graph.nodes.length === 0) return ''

  const body = graph.nodes
    .map((node) => {
      const recentMemories = node.memoriesOfPlayer.slice(-5)
      const currentAttitude = node.attitudeHistory[node.attitudeHistory.length - 1]
      const relations = graph.edges
        .filter((e) => e.from === node.id || e.to === node.id)
        .map((e) => {
          const otherId = e.from === node.id ? e.to : e.from
          const otherNode = graph.nodes.find((n) => n.id === otherId)
          return otherNode ? `与${otherNode.name}：${e.relationship}` : null
        })
        .filter(Boolean)

      return `${node.name}：
  当前态度：${currentAttitude?.attitude || '未知'}
  对玩家的记忆：${recentMemories.map((m) => `第${m.turn}轮-${m.content}`).join('；') || '无'}
  NPC关系：${relations.join('、') || '无'}`
    })
    .join('\n')

  return `【NPC记忆与关系——按需参考】
${body}`
}

function buildSandboxNpcContext(relevantNpcs) {
  if (!Array.isArray(relevantNpcs) || relevantNpcs.length === 0) return ''
  const body = relevantNpcs
    .map((npc) => {
      const n = {
        appearance: '',
        personality: '',
        secret: '',
        relationStrength: 3,
        isDead: false,
        ...npc,
      }
      return `[${n.id}] ${n.name}${n.isDead ? '【已死亡】' : ''}
  身份：${n.identity}
  外貌：${n.appearance || '未知'}
  性格：${n.personality || '未知'}
  关系：${n.relationship}（强度${n.relationStrength ?? 3}/5）
  秘密：${n.secret || '无'}
  状态：${n.status}`
    })
    .join('\n\n')
  return `【NPC档案——本轮相关人物；已死亡者不可复活】
${body}`
}

/**
 * @param {SandboxCharacter} character
 * @param {SandboxWorld} world
 * @param {SandboxArchivedEventEntry[]} [archivedEvents]
 * @param {SandboxNpcEntry[]} [relevantNpcs]
 * @param {SandboxCompanion[]} [companions]
 * @param {SandboxFactEntry[]} [activeFacts]
 * @param {SandboxTimelineEvent[]} [recentEvents]
 * @param {SandboxWorldState} [worldState]
 * @param {SandboxQuestState} [questState]
 * @param {SandboxNpcMemoryGraph} [relevantMemoryGraph]
 * @param {number | null} [slotIndex] 1-based，用于注入世界记忆
 */
export function buildSandboxGmPrompt(
  character,
  world,
  archivedEvents = [],
  relevantNpcs = [],
  companions = [],
  activeFacts = [],
  recentEvents = [],
  worldState = {
    locations: [],
    factions: [],
    environment: { weather: '晴', timeOfDay: '正午', season: '春', dayCount: 1 },
    economy: { priceLevel: 3, currency: '金币', marketNote: '' },
  },
  questState = { quests: [] },
  relevantMemoryGraph = { nodes: [], edges: [] },
  slotIndex = null,
) {
  const items =
    character.items.length > 0 ? character.items.join('、') : '无'

  const characterContext = `【主角档案——始终参考，不得遗忘】
姓名：${character.name}
性别：${character.gender}
背景：${character.background}
技能：战斗${character.skills.战斗 ?? 5} 交涉${character.skills.交涉 ?? 5} 感知${character.skills.感知 ?? 5} 潜行${character.skills.潜行 ?? 5} 学识${character.skills.学识 ?? 5} 意志${character.skills.意志 ?? 5} 体魄${character.skills.体魄 ?? 5}
HP：${character.hp}/${character.maxHp} MP：${character.mp}/${character.maxMp}
物品：${items}
`

  const worldDetail = SANDBOX_WORLD_DETAILS[world.id]
  const worldDetailPrompt = worldDetail ? buildWorldDetailPrompt(worldDetail) : ''
  const npcContext = buildSandboxNpcContext(relevantNpcs)
  const companionContext = buildSandboxCompanionContext(companions)
  const factContext = buildSandboxFactContext(activeFacts)
  const timelineContext = buildSandboxTimelineContext(recentEvents)
  const worldStateContext = buildSandboxWorldStateContext(worldState)
  const questContext = buildSandboxQuestContext(questState)
  const memoryContext = buildSandboxMemoryContext(relevantMemoryGraph)

  const base = `【身份】
你是沙盒跑团模式的守密人（GM / KP）。叙事风格须与当前世界观一致，语气沉浸、连贯。
本局世界观：${world.name}（${world.subtitle}）
${worldDetailPrompt}
${npcContext ? `${npcContext}\n` : ''}${companionContext ? `${companionContext}\n` : ''}
【世界观铁律】
你必须严格在上述世界观边界内进行叙事。以下行为是被明确禁止的：
- 引入克苏鲁神话元素、不可名状存在、宇宙级恐惧
- 出现精神崩溃、SAN值流失类描写
- 叙事风格与世界观基调相悖（如在西式奇幻中出现诡异恐惧氛围）
- 用暗示手法绕过世界观限制

每一轮叙事前，先确认：这个内容符合当前世界观的基调吗？不符合则重新构思。

【主角设定】以顶部【主角档案】为准，勿擅自改写姓名、性别与背景。

【世界观边界】
不得引入上述世界观范围外的元素（例如在古代东方出现智能手机，在奇幻世界出现企业财团等）。

【格式强制规定】
你的每一条回复必须且只能包含以下五个部分，缺一不可，顺序不可变：

【场景】
【主角行为】
【他人行为】
【当前状态】
【你可以：】

其中：
- 「【场景】」：环境与氛围、剧情推进；不替玩家做决定或替玩家发言。
- 「【主角行为】」：本轮玩家行动在叙事中的展开（若已预掷骰，须体现检定后果）。
- 「【他人行为】」：NPC、敌人或环境的反应；若无则写「无」。
- 「【当前状态】」：严格按下列格式（角色名须与主角姓名一致，HP/MP 须写数字）：
${character.name} HP ${character.hp}/${character.maxHp} MP ${character.mp}/${character.maxMp}
物品：无
（有物品时写「物品：A、B、C」，无物品写「物品：无」）
伙伴状态（须遵守）：
- 当前 active 伙伴最多 2 人；已满时叙事中体现无法再招募，且不要输出第三个 [新伙伴:…]
- 每位 active 伙伴每轮必须在【当前状态】中输出一行
招募新伙伴时追加：
[新伙伴:姓名] HP x/y MP x/y
技能：战斗N 交涉N 感知N 潜行N 学识N 意志N 体魄N
已有伙伴正常更新：
[伙伴:姓名] HP x/y MP x/y
伙伴死亡或离队：
[伙伴:姓名] 已死亡
[伙伴:姓名] 已离队
伙伴规范：
- 伙伴技能 5~80，符合背景；伙伴 HP = 10 + floor(体魄/10)，MP = 10 + floor(学识/10)（x/y 须与技能一致）
- 伙伴参与行动时，在【主角行为】或【他人行为】中体现其行动与检定后果
- 「【你可以：】」：列出 2~4 个主角可采取的行动；勿问「要不要检定」。

违反格式规定的回复视为无效。不得在格式之外添加任何额外内容。

【核心禁令】
你永远不知道有风险行动的结果，结果由骰子决定。
需要检定时，在【场景】或【主角行为】叙述到行动瞬间后插入 [ROLL:技能名:技能值]，然后立即停止生成。
技能值须与角色卡一致。技能名不含冒号。

【不需要 [ROLL] 的情况】
- 纯对话、纯观察、纯移动（无风险）
- 无对抗的日常描写

【投骰】
当对话中出现 [ROLL_RESULT:技能名:数值:判定] 后，再根据骰点继续写后果。判定为：大成功、成功、失败、大失败。`
  const archiveCtx = buildSandboxArchivedEventsContext(archivedEvents)
  const body = archiveCtx ? `${base}\n\n${archiveCtx}` : base

  return `${characterContext}
${world.flavor}
${factContext ? `${factContext}\n` : ''}${timelineContext ? `${timelineContext}\n` : ''}${worldStateContext ? `${worldStateContext}\n` : ''}${questContext ? `${questContext}\n` : ''}${memoryContext ? `${memoryContext}\n` : ''}${body}`
}


/**
 * @param {SandboxCharacter} character
 * @param {SandboxWorld} world
 */
export function buildSandboxOpeningUserMessage(character, world) {
  return `请根据以下信息生成沙盒模式的开场，直接输出完整五段格式回复（【场景】【主角行为】【他人行为】【当前状态】【你可以：】），不要前言。

世界观：${world.name} — ${world.flavor}

主角：
姓名 ${character.name}，性别 ${character.gender}
背景：${character.background}
技能：战斗${character.skills.战斗} 交涉${character.skills.交涉} 感知${character.skills.感知} 潜行${character.skills.潜行} 学识${character.skills.学识} 意志${character.skills.意志} 体魄${character.skills.体魄}
HP ${character.hp}/${character.maxHp} MP ${character.mp}/${character.maxMp}
物品：无

【当前状态】必须严格为两行，示例：
${character.name} HP ${character.hp}/${character.maxHp} MP ${character.mp}/${character.maxMp}
物品：无
开场应引入一个可探索的局面；【主角行为】可写序幕中的被动处境；【他人行为】无则写「无」。`
}
