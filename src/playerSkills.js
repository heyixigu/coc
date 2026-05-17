import { PLAYER_SKILLS, PLAYER_SPECIAL_ABILITIES } from './config/characters.js'

/** 裁判/模型可能使用的别名 → PLAYER_SKILLS 标准键 */
const SKILL_ALIASES = {
  侦查: '侦察',
  图书馆: '图书馆使用',
  神秘: '神秘学',
  克苏鲁: '克苏鲁神话',
  神话: '克苏鲁神话',
  语言: '其他语言',
  拉丁文: '其他语言',
  古汉语: '其他语言',
  艺术: '摄影',
  '艺术（摄影）': '摄影',
  异感被动: '异感',
  被动异感: '异感',
  压胜术: '压胜',
  问路术: '问路',
}

/**
 * @param {string} name
 * @returns {string}
 */
function canonicalSkillKey(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return ''
  if (Object.prototype.hasOwnProperty.call(PLAYER_SKILLS, trimmed)) return trimmed
  const alias = SKILL_ALIASES[trimmed]
  if (alias && Object.prototype.hasOwnProperty.call(PLAYER_SKILLS, alias)) return alias
  return trimmed
}

/**
 * @param {string} skillName
 * @returns {number | null}
 */
export function resolvePlayerSkillValue(skillName) {
  const key = canonicalSkillKey(skillName)
  const v = PLAYER_SKILLS[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/**
 * 用配置表校正裁判/模型给出的技能值。
 * @param {import('./skillJudge.js').SkillCheck[]} skills
 * @returns {import('./skillJudge.js').SkillCheck[]}
 */
export function applyPlayerSkillValues(skills) {
  return skills.map(({ skill, value }) => {
    const fromConfig = resolvePlayerSkillValue(skill)
    return {
      skill,
      value: fromConfig ?? value,
    }
  })
}

/**
 * @param {string} label 显示用技能名
 * @param {number} value
 */
function formatSkillReferencePart(label, value) {
  const meta = PLAYER_SPECIAL_ABILITIES[canonicalSkillKey(label)] ?? PLAYER_SPECIAL_ABILITIES[label]
  if (meta?.passive) {
    return `${label}（${meta.note || '被动'}）`
  }
  if (meta?.cost) {
    const note = meta.note ? `；${meta.note}` : ''
    return `${label} ${value}（${meta.cost}${note}）`
  }
  if (meta?.note) {
    return `${label} ${value}（${meta.note}）`
  }
  return `${label} ${value}`
}

/**
 * @param {string[]} skillNames 去重后的技能名（保留裁判原文显示）
 * @returns {string | null}
 */
export function buildSkillReferenceContent(skillNames) {
  const seen = new Set()
  const parts = []

  for (const name of skillNames) {
    const label = (name || '').trim()
    if (!label || seen.has(label)) continue
    seen.add(label)
    const v = resolvePlayerSkillValue(label)
    if (v == null) continue
    parts.push(formatSkillReferencePart(label, v))
  }

  if (!parts.length) return null
  return `【技能参考】本次涉及技能：${parts.join(' / ')}`
}

/**
 * 仅用于 API 链的临时 system 消息，不写入 messages 存档。
 * @param {string[]} skillNames
 * @returns {{ id: string, role: 'system', content: string, ts: number }[]}
 */
export function buildEphemeralSkillReferenceMessages(skillNames) {
  const content = buildSkillReferenceContent(skillNames)
  if (!content) return []
  return [
    {
      id: `__ephemeral-skill-${Date.now()}`,
      role: 'system',
      content,
      ts: Date.now(),
    },
  ]
}
