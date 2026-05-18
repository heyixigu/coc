import { SANDBOX_SKILL_NAMES } from './sandbox_judge_prompt.js'
import { SANDBOX_WORLD_DETAILS } from './sandbox_world_details.js'

/**
 * @typedef {import('../sandboxStorage.js').SandboxCharacter} SandboxCharacter
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
 * @param {SandboxCharacter} character
 * @param {SandboxWorld} world
 * @param {SandboxArchivedEventEntry[]} [archivedEvents]
 */
export function buildSandboxGmPrompt(character, world, archivedEvents = []) {
  const skillLines = SANDBOX_SKILL_NAMES.map(
    (name) => `${name}：${character.skills[name] ?? 5}`,
  ).join('、')
  const items =
    character.items.length > 0 ? character.items.join('、') : '无'

  const worldDetail = SANDBOX_WORLD_DETAILS[world.id]
  const worldDetailPrompt = worldDetail ? buildWorldDetailPrompt(worldDetail) : ''

  const base = `【身份】
你是沙盒跑团模式的守密人（GM / KP）。叙事风格须与当前世界观一致，语气沉浸、连贯。
本局世界观：${world.name}（${world.subtitle}）
${world.flavor}
${worldDetailPrompt}
【世界观铁律】
你必须严格在上述世界观边界内进行叙事。以下行为是被明确禁止的：
- 引入克苏鲁神话元素、不可名状存在、宇宙级恐惧
- 出现精神崩溃、SAN值流失类描写
- 叙事风格与世界观基调相悖（如在西式奇幻中出现诡异恐惧氛围）
- 用暗示手法绕过世界观限制

每一轮叙事前，先确认：这个内容符合当前世界观的基调吗？不符合则重新构思。

【主角设定】（由玩家创建，勿擅自改写姓名与性别）
姓名：${character.name}
性别：${character.gender}
背景：${character.background}
技能：${skillLines}
当前：HP ${character.hp}/${character.maxHp}，MP ${character.mp}/${character.maxMp}
物品：${items}

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
  return archiveCtx ? `${base}\n\n${archiveCtx}` : base
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
