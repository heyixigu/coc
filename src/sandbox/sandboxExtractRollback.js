import {
  loadEventTimeline,
  loadFactDatabase,
  loadNpcMemoryGraph,
  loadQuestState,
  loadWorldState,
  saveEventTimeline,
  saveFactDatabase,
  saveNpcMemoryGraph,
  saveQuestState,
  saveWorldState,
} from './sandboxStorage.js'

/**
 * 重新生成 GM 回复前，回滚该轮次写入的后台提取数据（事实/时间线/世界/任务/记忆图谱）。
 * NPC 档案本轮合并无法按轮次精确回滚，依赖新一轮提取覆盖。
 * @param {number} slotIndex 1-based
 * @param {number} turn
 */
export function rollbackSandboxExtractForTurn(slotIndex, turn) {
  if (!slotIndex || !Number.isFinite(turn)) return
  const t = Math.max(0, Math.trunc(turn))

  rollbackFactDatabase(slotIndex, t)
  rollbackEventTimeline(slotIndex, t)
  rollbackWorldState(slotIndex, t)
  rollbackQuestState(slotIndex, t)
  rollbackNpcMemoryGraph(slotIndex, t)
}

/** @param {number} slotIndex @param {number} turn */
function rollbackFactDatabase(slotIndex, turn) {
  const db = loadFactDatabase(slotIndex)
  const removedIds = new Set(
    db.facts.filter((f) => f.createdAt === turn).map((f) => f.id),
  )
  const facts = db.facts
    .filter((f) => f.createdAt !== turn)
    .map((f) =>
      f.supersededBy && removedIds.has(f.supersededBy)
        ? { ...f, supersededBy: null }
        : f,
    )
  saveFactDatabase(slotIndex, { facts })
}

/** @param {number} slotIndex @param {number} turn */
function rollbackEventTimeline(slotIndex, turn) {
  const tl = loadEventTimeline(slotIndex)
  saveEventTimeline(slotIndex, {
    events: tl.events.filter((e) => e.turn !== turn),
  })
}

/**
 * 尽力回滚：移除该轮次最后更新的条目（无法恢复被覆盖的旧值）。
 * @param {number} slotIndex @param {number} turn
 */
function rollbackWorldState(slotIndex, turn) {
  const ws = loadWorldState(slotIndex)
  const drop = (/** @type {{ updatedAt: number }[]} */ arr) =>
    arr.filter((x) => x.updatedAt !== turn)
  saveWorldState(slotIndex, {
    locations: drop(ws.locations),
    factions: drop(ws.factions),
    environment: ws.environment,
    economy: ws.economy,
  })
}

/** @param {number} slotIndex @param {number} turn */
function rollbackQuestState(slotIndex, turn) {
  const qs = loadQuestState(slotIndex)
  saveQuestState(slotIndex, {
    quests: qs.quests.filter((q) => q.createdAt !== turn),
  })
}

/** @param {number} slotIndex @param {number} turn */
function rollbackNpcMemoryGraph(slotIndex, turn) {
  const g = loadNpcMemoryGraph(slotIndex)
  const nodes = g.nodes.map((n) => ({
    ...n,
    memoriesOfPlayer: n.memoriesOfPlayer.filter((m) => m.turn !== turn),
    attitudeHistory: n.attitudeHistory.filter((a) => a.turn !== turn),
  }))
  const edges = g.edges.filter((e) => e.updatedAt !== turn)
  saveNpcMemoryGraph(slotIndex, { nodes, edges })
}
