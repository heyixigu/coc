export const PROLOGUE_MEETING_PROMPT = `用200字左右描写何以惜顾和林知渺第一次相遇的场景。
两人都不是主动的人，相遇带有偶然性。
场景发生在某个与民俗或影像有关的地方。
语言风格：克制、有留白、带一点荒诞的平静。
结尾两人决定暂时搭伴行动，但都没有说得太明白。
只输出场景描写，不要任何标题或格式标记。`

export const PROLOGUE_SCENARIOS_PROMPT = `请生成三个风格各异的COC短篇剧本选项。
每个剧本用JSON格式返回：
{
  "title": string,
  "summary": string,
  "tags": string[],
  "opening": string
}
返回格式：JSON数组，包含三个剧本对象。
只返回JSON，不要任何其他文字。
三个剧本风格要明显不同：
一个都市调查向，一个荒野/乡村向，一个密室/建筑向。`
