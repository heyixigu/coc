import { postChatNonStream } from '../deepseek.js'
import { loadSandboxSlot, saveSandboxSlot } from './sandboxStorage.js'

/**
 * 为新加入的同伴异步补全档案（背景/性格/外貌/目标）。
 * 失败时静默跳过，不阻塞游戏流程。
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {number} opts.slotIndex
 * @param {string} opts.companionName
 * @param {string} opts.worldFlavor
 * @param {string} opts.gmContext - 本轮GM回复，提供背景参考
 */
export async function fillCompanionProfile({ apiKey, slotIndex, companionName, worldFlavor, gmContext }) {
  const key = (apiKey || '').trim()
  if (!key || !companionName) return

  const systemText = `你是跑团世界的角色设计师。
根据提供的世界观和GM描述，为一个新加入队伍的同伴生成档案。
只输出一个合法 JSON 对象，不要代码块、注释、解释或前后缀文字。`

  const userText = `世界观：${worldFlavor || '通用奇幻'}

GM描述（参考）：
${(gmContext || '').slice(0, 2000)}

同伴姓名：${companionName}

请输出以下 JSON，字段都用中文，内容符合世界观：
{
  "role": "身份/职业（10字以内）",
  "background": "背景故事（50字以内）",
  "personality": "性格特点（30字以内）",
  "appearance": "外貌描述（30字以内）",
  "goal": "当前目标（20字以内）"
}`

  try {
    const raw = await postChatNonStream({
      apiKey: key,
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: userText },
      ],
    })

    const text = (raw || '').trim()
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const body = fence ? fence[1].trim() : text
    const start = body.indexOf('{')
    const end = body.lastIndexOf('}')
    if (start === -1 || end === -1) return

    let profile
    try {
      profile = JSON.parse(body.slice(start, end + 1))
    } catch {
      console.warn('[sandboxCompanionProfiler] JSON parse failed', raw)
      return
    }

    const slot = loadSandboxSlot(slotIndex)
    const companion = (slot.companions ?? []).find((c) => c.name === companionName)
    if (!companion) return

    if (typeof profile.role === 'string') companion.role = profile.role.trim().slice(0, 20)
    if (typeof profile.background === 'string') companion.background = profile.background.trim().slice(0, 200)
    if (typeof profile.personality === 'string') companion.personality = profile.personality.trim().slice(0, 100)
    if (typeof profile.appearance === 'string') companion.appearance = profile.appearance.trim().slice(0, 100)
    if (typeof profile.goal === 'string') companion.goal = profile.goal.trim().slice(0, 80)

    saveSandboxSlot(slotIndex, slot)
  } catch (e) {
    console.warn('[sandboxCompanionProfiler] failed', e)
  }
}
