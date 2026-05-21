import { FANTASY_REGIONS, FANTASY_RACE_OPTIONS } from './sandbox_fantasy_regions.js'

/** @typedef {'east' | 'fantasy' | 'cyberpunk' | 'wasteland' | 'custom'} SandboxWorldId */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   subtitle: string,
 *   description: string,
 *   rulingFaction: string,
 *   openingScene: string,
 *   advantage: string,
 *   raceAttitudes: Record<string, string>,
 * }} SandboxRegion
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   description: string,
 *   npcBaseAttitude: string,
 * }} SandboxRace
 */

/**
 * @typedef {{
 *   id: SandboxWorldId,
 *   name: string,
 *   subtitle: string,
 *   description: string,
 *   flavor: string,
 *   races: string[],
 *   regions?: SandboxRegion[],
 *   raceOptions?: SandboxRace[],
 * }} SandboxWorld
 */

/** @type {SandboxWorld[]} */
export const SANDBOX_WORLDS = [
  {
    id: 'east',
    name: '架空古代东方',
    subtitle: '侠骨柔情，志怪山河',
    description:
      '门派林立的江湖、庙堂深沉的权谋、山野横行的妖魔，修炼者以气御剑、以符镇邪。侠义与人心的故事，在仙凡交错的山河之间徐徐展开。',
    flavor:
      '这是一个仙凡交错的古代东方世界。江湖门派林立，庙堂权谋深沉，山野之间妖魔横行，修炼者以气御剑、以符镇邪。故事的基调是侠义与人性，危机来自人心的贪欲、门派的倾轧、妖怪的袭扰，而非宇宙级别的恐惧。叙事风格参考古典武侠与志怪小说：笔墨写实，偶有奇幻，情感厚重。禁止出现克苏鲁元素、宇宙恐惧、精神崩溃、不可名状之物。NPC有血有肉，动机清晰，善恶不绝对。',
    races: ['人族', '妖族', '仙族', '鬼族'],
  },
  {
    id: 'fantasy',
    name: '西式奇幻 · 艾瑟兰德',
    subtitle: '剑与魔法，纪元之交',
    description:
      '新辉纪元472年，艾瑟兰德大陆风云涌动。莱恩王朝铁骑扩张，奥术联邦魔导鼎盛，圣辉教廷维护秩序，北境部族蠢蠢欲动。七大种族角力，三大商会博弈，古代遗迹封印松动，以太失衡的预言悄然流传。在这个史诗与阴谋并存的世界，你将以何种身份书写自己的传说？',
    flavor:
      '这是一个剑与魔法并存的西式奇幻世界。王国、帝国、自由城邦在大陆上争雄，冒险者公会接受委托，古老遗迹埋藏秘密，龙与精灵真实存在。故事基调是史诗冒险与道德抉择：危机来自政治阴谋、怪物袭击、古老诅咒、派系冲突，而非宇宙级别的恐惧与精神侵蚀。叙事风格参考经典奇幻文学：宏大而有烟火气，战斗激烈，人物鲜明。禁止出现克苏鲁元素、不可名状存在、宇宙虚无感、精神崩溃机制。魔法有规则，世界有逻辑，奇幻而不诡异。',
    races: ['人类', '精灵', '矮人', '兽人', '暗精灵'],
    regions: FANTASY_REGIONS,
    raceOptions: FANTASY_RACE_OPTIONS,
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    subtitle: '霓虹之下，人心最暗',
    description:
      '六大财团瓜分天空，贫民窟在摩天楼阴影里求生。义体改造让身体成为商品，黑客在赛博空间里窃取秘密，街头帮派用鲜血划定领地。高科技的光鲜背后是低生活的泥泞，活下去才是最奢侈的目标。',
    flavor:
      '这是一个高科技低生活的近未来都市世界。巨型企业控制一切，贫民窟与摩天楼并存，义体改造普及，黑客在数据海中穿行，街头帮派划分势力。故事基调是noir风格的街头生存与反抗：危机来自企业追杀、黑市交易、信息战争、身份背叛，人物在权力与生存之间挣扎。叙事风格冷峻、快节奏、带黑色幽默。禁止出现超自然元素、魔法、克苏鲁恐惧。科技是万能的表象，人心才是真正的变量。AI存在但有迹可循，不得出现不可解释的诡异现象。',
    races: ['人类', '改造人', '克隆体', 'AI意识体'],
  },
  {
    id: 'wasteland',
    name: '废土末世',
    subtitle: '文明已死，人性未灭',
    description:
      '旧世界在核火与灾变中化为灰烬，幸存者在废墟、荒漠与破败城市里重建秩序。瓶盖换食物，子弹换命，变异体出没于无人区，旧时代的遗迹既是宝藏也是死亡陷阱。在这片土地上，道德是奢侈品，但人性从未彻底消亡。',
    flavor:
      '这是一个文明崩塌后的废土世界。核战、瘟疫或未知灾难摧毁了旧世界，幸存者在废墟、荒漠、破败城市中挣扎求生。派系割据，资源稀缺，道德底线在生存压力下不断被试探。故事基调是硬核生存与人性考验：危机来自资源匮乏、派系冲突、变异生物、旧世界遗留的危险设施。叙事风格写实粗粝，有希望也有绝望。禁止出现克苏鲁元素和超自然恐惧。变异生物有生物逻辑可循，旧世界科技可以被利用，人与人之间的博弈才是核心张力。',
    races: ['普通人', '变异体', '机械人', '辐射族'],
  },
  {
    id: 'custom',
    name: '自定义世界',
    subtitle: '由你执笔，从零构建',
    description:
      '一片空白的世界，没有预设的势力、种族与规则。通过世界书写下你的设定，守密人将完全遵照你的世界运转。适合有完整世界观构想的创作者。',
    flavor: '这是一个由你书写的世界，一切皆有可能。请通过世界书添加关键词与设定条目，守密人将在叙事中参考这些规则。',
    races: [],
  },
]

/** @param {SandboxWorldId} id */
export function getWorldById(id) {
  return SANDBOX_WORLDS.find((w) => w.id === id) ?? null
}
