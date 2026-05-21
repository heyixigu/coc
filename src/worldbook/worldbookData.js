/**
 * @typedef {{
 *   id: string,
 *   keywords: string[],
 *   content: string,
 *   priority: number,
 *   worldId: string,
 *   isCustom: boolean,
 * }} WorldbookEntry
 */

/** @type {WorldbookEntry[]} */
export const BUILTIN_WORLDBOOK = [
  {
    id: 'wb_fantasy_001',
    keywords: ['奥术联邦', '奥术', '魔导师', '学院'],
    content:
      '奥术联邦：十二城邦联盟，魔导科技与学院教育的中心，重视知识与规则，法术证据在此合法有效。',
    priority: 4,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_002',
    keywords: ['莱恩王朝', '莱恩', '王朝', '国王'],
    content:
      '莱恩王朝：军事强盛的人类帝国，有成文法典，杀人偿命，魔法犯罪移交奥术联邦处理。',
    priority: 4,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_003',
    keywords: ['塔恩', '克罗', '金狮', '货币', '钱'],
    content:
      '货币体系：塔恩（铜）为日常货币，普通餐食2~5塔恩，旅馆10~20塔恩/晚，200塔恩=1克罗，20克罗=1金狮。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_004',
    keywords: ['复活', '死亡', '复生', '神圣复苏'],
    content:
      '复活代价极高：圣职教廷掌握神圣复苏术，需死后6小时内施术，代价是永久失去部分记忆和法力上限。黑市血契复生需献祭等量生命，风险极大。',
    priority: 5,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_005',
    keywords: ['精灵', '矮人', '兽人', '龙裔', '半兽人', '种族'],
    content:
      '种族关系：精灵轻视人类、敌视兽人；矮人与兽人世代为敌；龙裔傲慢，各族敬畏；半兽人在人类社会受歧视，在兽人部落有归属感。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },

  {
    id: 'wb_fantasy_faction_001',
    keywords: ['莱恩王朝', '莱恩', '王朝', '莱恩军'],
    content:
      '莱恩王朝：军事强盛的人类帝国，信奉秩序与扩张，不断对外征战。有成文法典，杀人偿命，魔法犯罪移交奥术联邦，目前内部王位争夺暗流涌动。',
    priority: 4,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_faction_002',
    keywords: ['奥术联邦', '奥术', '魔导师', '十二城邦', '学院'],
    content:
      '奥术联邦：十二城邦松散联盟，魔导科技与学院教育中心。重视知识与规则，法术证据合法有效，可用读心术审讯，伪造记忆是死罪。',
    priority: 4,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_faction_003',
    keywords: ['圣辉教廷', '教廷', '圣职者', '神官', '教会'],
    content:
      '圣辉教廷：侍奉秩序神，信奉文明与秩序，维护大陆道德与法律。掌握神圣复苏术，但仅对重大贡献者施术，与奥术联邦长期存在知识与信仰的冲突。',
    priority: 4,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_faction_004',
    keywords: ['黄金海岸', '海岸同盟', '商盟', '海运', '港口'],
    content:
      '黄金海岸同盟：掌控海运与贸易，财富和海上影响力最大。商业法优先，欠债不还可被合法卖为奴隶，三大商会在此势力最强。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_faction_005',
    keywords: ['北境部族', '北境', '兽人部落', '部落联盟'],
    content:
      '北境部族：兽人为主的部落联盟，古代遗迹与危险地带遍布。部落法为准，以决斗解决争端，外族犯罪直接驱逐或处决，正在被称为"吞噬者"的势力逐步统一。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_faction_006',
    keywords: ['精灵诸城', '精灵城', '高塔', '精灵领地'],
    content:
      '精灵诸城：精灵建立的古老城邦，高度自治，遁世避战。掌握最古老的魔法传承，对外族态度冷漠甚至敌视，内部正因守旧与革新产生分裂。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_faction_007',
    keywords: ['矮人王国', '矮人山城', '锻造', '地下城'],
    content:
      '矮人王国：地下堡垒文明，工业与锻造技术冠绝大陆。对外贸易为主，逐步崛起，与兽人世代为敌，擅长工程、机械与商贸。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },

  {
    id: 'wb_fantasy_race_001',
    keywords: ['人类', '人族'],
    content:
      '人类：适应力强、职业多样，国家与文明的核心。对精灵敬畏、对兽人警惕、对龙裔恐惧或崇拜、对半兽人歧视。扩张中，内部防争不断。',
    priority: 2,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_race_002',
    keywords: ['精灵', '精灵族', '高精灵', '暗精灵'],
    content:
      '精灵：寿命长、亲近自然与魔法，自创魔法。轻视人类、冷淡矮人、敌视兽人与半兽人、尊重龙裔。避世倾向强，势力衰落中。',
    priority: 2,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_race_003',
    keywords: ['矮人', '矮人族'],
    content:
      '矮人：坚韧务实、擅长重工艺和机械。对人类中立、对精灵冷淡、对兽人敌视、对龙裔中立。地下强盛，逐步崛起，重视荣誉与承诺。',
    priority: 2,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_race_004',
    keywords: ['兽人', '兽人族', '半兽人'],
    content:
      '兽人：强悍好战，需要荣耀与群体归属感维持生存。对人类警惕、对精灵矮人敌视、对龙裔畏惧、对半兽人接纳。半兽人夹在两种文化间，多为边缘人。',
    priority: 2,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_race_005',
    keywords: ['龙裔', '龙族', '龙血'],
    content:
      '龙裔：血脉稀少，天生强大，多被簇拥成领袖。对各族傲慢，对精灵平等视之，对人类轻视但利用。极其稀少，出现往往引发局势变动。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },

  {
    id: 'wb_fantasy_class_001',
    keywords: ['法师', '魔法师', '法术', '魔法', '法力', 'Mana'],
    content:
      '法师体系九阶：学徒→法师→正式法师→高级法师→大法师→督导法师→贤者→圣域法师→传说法师。法力为基础资源，高阶施法消耗身体与精神，材料与组织合作不可缺。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_class_002',
    keywords: ['战士', '骑士', '游侠', '刺客', '牧师', '召唤师', '炼金师', '圣骑士'],
    content:
      '主要职业：战士（近战核心）、骑士（防御领袖）、游侠（远程追踪）、刺客（潜行暗杀）、牧师（治疗神术）、召唤师（战略操控）、炼金师（道具支援）、圣骑士（战场救援）。',
    priority: 2,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_class_003',
    keywords: ['术士', '血魔法', '黑魔法', '禁术'],
    content:
      '术士与禁术：通过血契、约定、黑暗力量施法，爆发强但极度危险。神术：通过祈祷神明赐予，无法无限复制，无法调用同伴意志施法。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },

  {
    id: 'wb_fantasy_military_001',
    keywords: ['军队', '军团', '步兵', '弓兵', '骑士团', '工程兵', '法师团', '神官团'],
    content:
      '军队编制：步兵（主力）、弓兵（远程）、骑士（冲锋）、工程兵（攻城）为基础兵种；法师团（战略级）、神官团（治疗净化）、斥候（侦察）为支援兵种。小队1~3人，万人军团10~30名法师随行。',
    priority: 2,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_military_002',
    keywords: ['医疗兵', '神官', '战场治疗', '炼金医师'],
    content:
      '战场医疗：医疗兵负责包扎止血，神官施展神术治愈，炼金医师提供药剂急救。神术有限制：无法无限复制，无法调用同伴意志，无法复生已死亡者，只能加速愈合与净化。',
    priority: 2,
    worldId: 'fantasy',
    isCustom: false,
  },

  {
    id: 'wb_fantasy_economy_001',
    keywords: ['塔恩', '克罗', '金狮', '晶辉冠', '货币', '钱', '价格', '物价'],
    content:
      '货币体系：塔恩（铜）日常用，普通餐食2~5塔恩，旅馆10~20塔恩/晚，短剑80~150塔恩。200塔恩=1克罗（银），20克罗=1金狮（金），1金狮=200克罗=晶辉冠（魔晶，战略结算用）。',
    priority: 4,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_economy_002',
    keywords: ['金海联合商会', '黑铁财团', '白薇薔薇贸易联盟', '商会', '商人'],
    content:
      '三大商会：金海联合商会（黄金海岸，海运贸易为核心，拥有私人舰队）；黑铁财团（矮人主导，军火工业，控制矿产武器机械）；白薇薔薇贸易联盟（贵族资本，金融奢侈品地产，部分灰色贸易）。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },

  {
    id: 'wb_fantasy_blackmarket_001',
    keywords: ['黑市', '灰市', '血港', '违禁', '地下'],
    content:
      '黑市分层：下层黑市（最常见）交易禁药、违禁魔法、假身份；灰色市场（危险）交易情报、古代遗物、雇佣杀手；血港（顶层黑市）交易奴隶、禁术、魔物器官，无人知晓入口。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },

  {
    id: 'wb_fantasy_language_001',
    keywords: ['通用语', '龙语', '精灵语', '圣言文', '语言'],
    content:
      '语言体系：通用语（Common）最普及，适合交流；龙语（Drasonic）古老强力，高阶魔法咏唱用；精灵语（Sylvan）优美，用于文学自然魔法；圣言文（Liamen）仅神职专用。学习难度：通用语易→龙语/圣言文难→深渊语极危险。',
    priority: 2,
    worldId: 'fantasy',
    isCustom: false,
  },

  {
    id: 'wb_fantasy_history_001',
    keywords: ['神代纪元', '旧日支配者', '龙族统治', '文字体系', '上古'],
    content:
      '神代纪元（约3000年前）：龙族统治大陆，掌握以太力量，创造最初文字体系，龙族语言成为魔法基础。神代战争导致龙族沉寂，龙裔遗族散落各地。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_history_002',
    keywords: ['大崩塌', '魔力失控', '浮空城', '文明灭绝'],
    content:
      '大崩塌（第一纪元末）：超古代魔导文明一大陆，浮空城坠落，传送网络崩溃，魔导机械到到精髓，过度魔法导致大崩塌。浮空城坠毁，大部分文明毁灭，世界陷入混沌。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_history_003',
    keywords: ['新辉纪元', '当前', '现在', '472年', '战乱'],
    content:
      '新辉纪元472年（当前）：迈向鼎盛期，矛盾激化：教廷vs奥术联邦的秩序与知识冲突，王国争霸，北境战乱，古代遗迹复苏。以太失衡——世界可能再次毁灭。',
    priority: 4,
    worldId: 'fantasy',
    isCustom: false,
  },

  {
    id: 'wb_fantasy_grey_001',
    keywords: ['渡鸦会', '情报', '信使', '渡鸦'],
    content:
      '渡鸦会：情报人员联盟，本质是情报买卖中立组织。业务：同谋、暗杀、mail、地图、情报等。特点：绝对中立，只认钱，可以托付给任何人。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_grey_002',
    keywords: ['灰烬兄弟会', '兄弟会', '非法通道', '走私'],
    content:
      '灰烬兄弟会：非法通道组织。理念："第一纪元的知识不属于任何人"。活动：探索禁地、研究禁忌科技，走私古代遗物。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_grey_003',
    keywords: ['血契会', '术士组织', '血契', '黑魔法组织'],
    content:
      '血契会：术士秘密组织。成员：被驱逐的魔法师、法师、巫师。活动：探索黑魔法与禁术边界。态度：被各大公会公开谴责，秘密公会视其为异端。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },
  {
    id: 'wb_fantasy_grey_004',
    keywords: ['夜幕银行', '地下金融', '洗钱', '战争债务'],
    content:
      '夜幕银行：地下金融机构。业务：洗钱、战争债务、黑色结算，黑市结算中心。目标：追求力量与禁忌。态度：被各国政府视为头号打击对象，实际上各国都欠它钱。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },

  {
    id: 'wb_fantasy_gods_001',
    keywords: ['神明', '主神', '秩序神', '自然神', '战争神', '知识神', '死亡神', '混沌神', '神使'],
    content:
      '六主神：秩序神（教廷信奉）、自然神、战争神、知识神（奥术联邦信奉）、死亡神（掌管亡者，反对随意复活）、混沌神（信徒被列为异端，灰色势力中有秘密崇拜者）。神明不直接干预凡间，通过神使和奇迹施加影响。',
    priority: 4,
    worldId: 'fantasy',
    isCustom: false,
  },

  {
    id: 'wb_fantasy_death_001',
    keywords: ['复活', '死亡', '复生', '神圣复苏', '血契复生', '意识转移'],
    content:
      '死亡规则：普通人死亡永久。圣辉教廷神圣复苏术：需死后6小时内，仅对教廷重大贡献者，代价是永久失去部分记忆和法力上限-10%。奥术联邦意识转移：成功率60%，失败变行尸。黑市血契复生：献祭等量生命，来源不明，风险极大。',
    priority: 5,
    worldId: 'fantasy',
    isCustom: false,
  },

  {
    id: 'wb_fantasy_guild_001',
    keywords: ['冒险者', '自由探索者协会', '委托', '冒险者等级', 'D级', 'C级', 'B级', 'A级', 'S级'],
    content:
      '自由探索者协会：中立组织，连接国家、商会与野署，管理与规范冒险者行业。等级D~S：D级悬赏10~50金，C级3~25金，B级5~50金，A级50~200金+，S级200金以上大型公会任务。发布委托、身份认证、情报交换、遗迹探索、纠纷仲裁均可委托协会。',
    priority: 3,
    worldId: 'fantasy',
    isCustom: false,
  },

  {
    id: 'wb_ancient_001',
    keywords: ['灵石', '灵气', '修炼', '境界'],
    content:
      '修炼体系：凡人通过吸纳天地灵气提升境界，分为炼气、筑基、金丹、元婴、化神五大境，每境突破需机缘与资源。',
    priority: 4,
    worldId: 'east',
    isCustom: false,
  },
  {
    id: 'wb_ancient_002',
    keywords: ['妖族', '妖怪', '妖'],
    content:
      '妖族：修炼成精的异类，与人族关系复杂，有善有恶，部分妖族在人间隐居，官府设有专门的捉妖机构。',
    priority: 3,
    worldId: 'east',
    isCustom: false,
  },
  {
    id: 'wb_ancient_003',
    keywords: ['仙门', '宗门', '门派'],
    content:
      '仙门宗派：掌握修炼资源的强大组织，收徒严格，宗门间明争暗斗，普通人难以进入，弟子享有极高地位。',
    priority: 3,
    worldId: 'east',
    isCustom: false,
  },
  {
    id: 'wb_ancient_004',
    keywords: ['符箓', '法器', '法宝'],
    content:
      '法器体系：修士使用符箓施法，法宝分为凡品、灵品、仙品三级，品阶越高越稀有，普通符箓市面可购，高级法宝价值连城。',
    priority: 3,
    worldId: 'east',
    isCustom: false,
  },
  {
    id: 'wb_ancient_005',
    keywords: ['鬼族', '阴间', '冥界', '鬼差'],
    content:
      '鬼族：死后未能轮回的魂魄，冥界有专职鬼差管理，强大的鬼修可在阳间活动，与阴阳师存在合作或对立关系。',
    priority: 3,
    worldId: 'east',
    isCustom: false,
  },

  {
    id: 'wb_cyber_001',
    keywords: ['义体', '改造', '赛博', '植入'],
    content:
      '义体改造：用机械替换人体部位以增强能力，改造率超过60%会引发"人性流失"风险，黑市义体无安全保障，正规诊所价格高昂。',
    priority: 4,
    worldId: 'cyberpunk',
    isCustom: false,
  },
  {
    id: 'wb_cyber_002',
    keywords: ['网络', '黑客', '潜入', '赛博空间'],
    content:
      '赛博空间：数字化虚拟世界，黑客在此窃取数据、破解系统，被防火墙击中会造成真实神经损伤，顶级黑客称为"数据幽灵"。',
    priority: 4,
    worldId: 'cyberpunk',
    isCustom: false,
  },
  {
    id: 'wb_cyber_003',
    keywords: ['公司', '财团', '企业'],
    content:
      '财团统治：六大跨国财团实际控制城市，拥有私人军队和法庭，在财团领地内公司法优先于国家法，员工生死由公司决定。',
    priority: 4,
    worldId: 'cyberpunk',
    isCustom: false,
  },
  {
    id: 'wb_cyber_004',
    keywords: ['欧元', '信用点', '货币', '钱'],
    content:
      '货币体系：信用点为主流数字货币，由财团联合监控，匿名交易使用实体硬币"碎片"，黑市只认碎片不认信用点。',
    priority: 3,
    worldId: 'cyberpunk',
    isCustom: false,
  },
  {
    id: 'wb_cyber_005',
    keywords: ['克隆', '克隆体', 'AI', '人工智能', '意识体'],
    content:
      'AI意识体：觉醒的人工智能，法律上不被承认为人，是财团最廉价的劳动力，少数逃脱管控的AI潜伏在底层区寻求自由。',
    priority: 3,
    worldId: 'cyberpunk',
    isCustom: false,
  },

  {
    id: 'wb_waste_001',
    keywords: ['辐射', '变异', '变异体'],
    content:
      '辐射变异：核战后辐射导致生物变异，轻度变异者保留人形但获得特殊能力，重度变异者失去理智成为威胁，变异体在普通人聚落中受歧视。',
    priority: 4,
    worldId: 'wasteland',
    isCustom: false,
  },
  {
    id: 'wb_waste_002',
    keywords: ['瓶盖', '物资', '货币', '钱', '交易'],
    content:
      '废土货币：瓶盖为通用货币，干净的饮用水和药品价值极高，武器弹药可直接以物易物，各聚落汇率不同。',
    priority: 3,
    worldId: 'wasteland',
    isCustom: false,
  },
  {
    id: 'wb_waste_003',
    keywords: ['聚落', '避难所', '庇护所'],
    content:
      '聚落体系：幸存者聚集的据点，大型聚落有自治政府和民兵，小聚落依附强者保护，聚落间贸易是主要经济活动，劫匪是最大威胁。',
    priority: 3,
    worldId: 'wasteland',
    isCustom: false,
  },
  {
    id: 'wb_waste_004',
    keywords: ['机械人', '机器人', '旧时代'],
    content:
      '旧时代遗产：战前留下的机械人和科技设备，功能完好的极为珍贵，废土工匠以修复旧时代科技为生，部分机械人仍在执行战前指令。',
    priority: 3,
    worldId: 'wasteland',
    isCustom: false,
  },
  {
    id: 'wb_waste_005',
    keywords: ['辐射族', '突变帮', '变异人'],
    content:
      '辐射族：高度变异的人类群体，拥有超强体魄但外貌骇人，被普通人视为怪物，内部有严密的部落组织，对侵入领地者极为凶残。',
    priority: 3,
    worldId: 'wasteland',
    isCustom: false,
  },

  {
    id: 'wb_coc_001',
    keywords: ['克苏鲁', '旧日支配者', '神话'],
    content:
      '旧日支配者：远古存在，宇宙尺度的恐怖实体，人类理智无法承受其真实形态，仅是了解其存在就足以动摇心智。',
    priority: 5,
    worldId: 'coc',
    isCustom: false,
  },
  {
    id: 'wb_coc_002',
    keywords: ['民国', '上海', '租界'],
    content:
      '民国上海：1920年代列强林立，租界内西方法律有效，华界由军阀控制，帮派势力渗透各处，现代与传统剧烈碰撞。',
    priority: 4,
    worldId: 'coc',
    isCustom: false,
  },
  {
    id: 'wb_coc_003',
    keywords: ['理智', 'SAN', '疯狂', '恐惧'],
    content:
      '理智侵蚀：接触神话存在会永久损耗理智，理智归零将陷入永久疯狂，轻微损耗可通过休息恢复，目睹旧日支配者真身是毁灭性的。',
    priority: 5,
    worldId: 'coc',
    isCustom: false,
  },
  {
    id: 'wb_coc_004',
    keywords: ['符纸', '道术', '茅山', '法术'],
    content:
      '民间道术：符纸、阵法等东方秘术对神话生物有一定效果，来源于古老传承，修习者寥寥，何以惜顾掌握部分道术知识。',
    priority: 4,
    worldId: 'coc',
    isCustom: false,
  },
  {
    id: 'wb_coc_005',
    keywords: ['深潜者', '食尸鬼', '米-戈', '邪教'],
    content:
      '神话生物：深潜者栖息于海底，食尸鬼出没墓地地下，米-戈是来自外星的真菌生物，各类邪教秘密崇拜旧日支配者寻求庇护。',
    priority: 4,
    worldId: 'coc',
    isCustom: false,
  },
]
