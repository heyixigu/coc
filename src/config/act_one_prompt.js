/**
 * @typedef {{ title: string, summary: string, opening: string }} ScenarioRef
 */

/**
 * @param {ScenarioRef} scenario
 */
export function buildActOneUserMessage(scenario) {
  const title = (scenario.title || '').trim()
  const summary = (scenario.summary || '').trim()
  const opening = (scenario.opening || '').trim()

  return `游戏正式开始。当前剧本：${title}
剧本简介：${summary}
请以此为基础，输出第一幕内容。
必须严格按照格式：
【场景】
【林知渺】
【当前状态】
【你可以：】

以下为剧本开场参考（勿逐字照抄，须改写为上述四段格式）：
${opening}`
}
