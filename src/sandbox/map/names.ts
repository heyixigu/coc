import type { CellType } from './types';

export type WorldId = 'ancient_east' | 'fantasy' | 'cyberpunk' | 'wasteland';

const NAME_POOLS: Record<WorldId, Record<CellType, string[]>> = {
  ancient_east: {
    town: ['青云城', '幽州镇', '望月集', '渡口坊', '铁马关', '桃源村', '长亭驿', '烟雨楼', '归雁渡', '落霞坊'],
    wild: ['幽冥谷', '苍龙岭', '碧落原', '霜天岭', '九曲林', '枯骨滩', '望仙台', '断魂涧', '迷雾泽', '云隐山'],
    dungeon: ['地煞窟', '阴司道', '万骨冢', '镇魔塔', '幽冥殿', '血祭坛', '封妖井', '古战场', '炼魂炉', '黄泉路'],
    road: ['官道', '山间小径', '古栈道', '驿道', '渡口', '悬崖栈道', '石板路', '荒野小路', '密林通道', '河岸小道'],
  },
  fantasy: {
    town: ['铁炉镇', '银月港', '格雷文', '斯通桥', '橡木堡', '晨曦村', '烬火城', '碎石镇', '白鹿集', '暮光港'],
    wild: ['银月森林', '龙脊山', '迷雾沼泽', '巨人平原', '灰烬荒野', '幽暗密林', '永冻苔原', '血色草原', '风啸峡谷', '古树林地'],
    dungeon: ['龙穴遗迹', '黑铁地牢', '失落神殿', '死亡迷宫', '古魔法塔', '骸骨地窟', '封印祭坛', '暗精灵巢穴', '巨魔要塞', '沉没遗址'],
    road: ['皇家大道', '商旅小径', '林间小路', '山地石道', '矮人隧道', '精灵栈桥', '渡船码头', '边境哨路', '荒野兽径', '古代石板路'],
  },
  cyberpunk: {
    town: ['第七区', '钢铁港', '霓虹集市', '地下城零', '影子街区', '数据港', '铁锈区', '暗网节点', '自由市场', '灰区基地'],
    wild: ['废弃工业区', '辐射禁区', '数据荒漠', '电磁风暴区', '污染河道', '机械墓场', '信号盲区', '腐蚀地带', '无人机禁飞区', '暗物质区'],
    dungeon: ['黑客巢穴', '地下实验室', '废弃服务器群', '军火地窖', '改造人工厂', '数据黑市', '地下赌场', '秘密研究所', '废弃地铁站', '生化实验舱'],
    road: ['高架公路', '地下管道', '数据高速路', '货运轨道', '空中走廊', '暗道入口', '污水渠道', '废弃隧道', '无人机航线', '黑市通道'],
  },
  wasteland: {
    town: ['残骸营地', '幸存者基地', '铁皮镇', '废土集市', '避难所出口', '补给站', '旧城遗民区', '流浪者营地', '荒原哨站', '末日避风港'],
    wild: ['辐射荒原', '焦土平原', '毒雾沼泽', '骨头沙漠', '废弃农场', '核爆中心', '变异丛林', '盐碱荒地', '风蚀峡谷', '灰烬平原'],
    dungeon: ['旧城废墟', '地下掩体', '废弃核站', '变异兽巢穴', '旧军事基地', '地下水库', '废弃矿井', '辐射地窖', '旧政府设施', '末日教派圣地'],
    road: ['裂缝公路', '废弃铁轨', '沙土小径', '地下通道', '变异区边缘', '废弃桥梁', '干涸河床', '荒野兽径', '辐射区绕道', '幸存者小路'],
  },
};

/** sandbox_worlds.js 的 id → 地图 WorldId */
const SANDBOX_WORLD_ID_MAP: Record<string, WorldId> = {
  east: 'ancient_east',
  ancient_east: 'ancient_east',
  fantasy: 'fantasy',
  cyberpunk: 'cyberpunk',
  wasteland: 'wasteland',
};

const CELL_TYPES: CellType[] = ['town', 'wild', 'dungeon', 'road'];

// 已使用名字记录，按世界观+类型隔离
const usedNames: Record<string, Set<string>> = {};

function getPoolKey(worldId: WorldId, type: CellType): string {
  return `${worldId}_${type}`;
}

/** @param {string | null | undefined} sandboxWorldId */
export function toMapWorldId(sandboxWorldId?: string | null): WorldId {
  if (sandboxWorldId && sandboxWorldId in SANDBOX_WORLD_ID_MAP) {
    return SANDBOX_WORLD_ID_MAP[sandboxWorldId];
  }
  return 'fantasy';
}

export function resetUsedNames(worldId?: WorldId): void {
  if (worldId) {
    for (const type of CELL_TYPES) {
      const key = getPoolKey(worldId, type);
      usedNames[key] = new Set();
    }
  } else {
    for (const k of Object.keys(usedNames)) {
      usedNames[k] = new Set();
    }
  }
}

export function getRandomName(type: CellType, worldId: WorldId = 'fantasy'): string {
  const key = getPoolKey(worldId, type);
  if (!usedNames[key]) usedNames[key] = new Set();

  const pool = NAME_POOLS[worldId]?.[type] || NAME_POOLS.fantasy[type];
  const available = pool.filter((n) => !usedNames[key].has(n));

  if (available.length === 0) {
    usedNames[key] = new Set();
    const reset = pool[Math.floor(Math.random() * pool.length)];
    usedNames[key].add(reset);
    return reset;
  }

  const name = available[Math.floor(Math.random() * available.length)];
  usedNames[key].add(name);
  return name;
}
