import {
  defaultPlayerInventory,
  inventoryToLegacyItemNames,
  normalizeCompanionSkills,
  normalizeInventoryItems,
  normalizePlayerInventory,
  computeHpMpFromSkills,
} from './sandboxStorage.js'

/**
 * @typedef {import('./sandboxStorage.js').SandboxCompanion} SandboxCompanion
 * @typedef {import('./sandboxStorage.js').SandboxPlayerInventory} SandboxPlayerInventory
 * @typedef {import('./sandboxStorage.js').SandboxInventoryItem} SandboxInventoryItem
 */

/**
 * @typedef {{
 *   name: string,
 *   description: string,
 *   quantity?: number,
 * }} InventoryItemExtract
 */

/**
 * @typedef {{
 *   equipped?: InventoryItemExtract[],
 *   carried?: InventoryItemExtract[],
 * }} PlayerInventoryExtract
 */

/**
 * @typedef {{
 *   name: string,
 *   role?: string,
 *   hp?: number,
 *   maxHp?: number,
 *   mp?: number,
 *   maxMp?: number,
 *   skills?: Record<string, number>,
 *   equipped?: InventoryItemExtract[],
 *   carried?: InventoryItemExtract[],
 *   status?: string,
 * }} CompanionInventoryExtract
 */

/**
 * @param {unknown} raw
 * @returns {PlayerInventoryExtract | null}
 */
export function normalizePlayerInventoryExtract(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (raw)
  const out = {}
  if (Array.isArray(o.equipped)) out.equipped = normalizeInventoryItems(o.equipped)
  if (Array.isArray(o.carried)) out.carried = normalizeInventoryItems(o.carried)
  if (!out.equipped && !out.carried) return null
  return out
}

/**
 * @param {unknown} raw
 * @returns {CompanionInventoryExtract[]}
 */
export function normalizeCompanionInventoryExtracts(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue
    const o = /** @type {Record<string, unknown>} */ (e)
    const name = typeof o.name === 'string' ? o.name.trim().slice(0, 32) : ''
    if (!name) continue
    const skills = {}
    if (o.skills && typeof o.skills === 'object') {
      const sk = /** @type {Record<string, unknown>} */ (o.skills)
      for (const [k, v] of Object.entries(sk)) {
        const n = Number(v)
        if (Number.isFinite(n)) skills[k] = n
      }
    }
    out.push({
      name,
      role: typeof o.role === 'string' ? o.role.trim().slice(0, 120) : undefined,
      hp: Number.isFinite(Number(o.hp)) ? Number(o.hp) : undefined,
      maxHp: Number.isFinite(Number(o.maxHp)) ? Number(o.maxHp) : undefined,
      mp: Number.isFinite(Number(o.mp)) ? Number(o.mp) : undefined,
      maxMp: Number.isFinite(Number(o.maxMp)) ? Number(o.maxMp) : undefined,
      skills: Object.keys(skills).length ? skills : undefined,
      equipped: Array.isArray(o.equipped) ? normalizeInventoryItems(o.equipped) : undefined,
      carried: Array.isArray(o.carried) ? normalizeInventoryItems(o.carried) : undefined,
      status: typeof o.status === 'string' ? o.status.trim() : undefined,
    })
  }
  return out.slice(0, 32)
}

/**
 * @param {PlayerInventoryExtract} extract
 * @returns {SandboxPlayerInventory}
 */
export function playerInventoryFromExtract(extract) {
  return normalizePlayerInventory({
    equipped: extract.equipped ?? [],
    carried: extract.carried ?? [],
  })
}

/**
 * @param {SandboxCompanion[]} companions
 * @param {CompanionInventoryExtract[]} updates
 * @returns {SandboxCompanion[]}
 */
export function mergeCompanionInventoryExtract(companions, updates) {
  const list = companions.map((c) => ({
    ...c,
    skills: { ...c.skills },
    equipped: [...(c.equipped ?? [])],
    carried: [...(c.carried ?? [])],
  }))

  for (const u of updates) {
    const statusRaw = u.status === 'departed' ? 'left' : u.status
    const status =
      statusRaw === 'dead' || statusRaw === 'left' || statusRaw === 'active'
        ? statusRaw
        : undefined
    const idx = list.findIndex((c) => c.name === u.name)

    if (idx >= 0) {
      const cur = list[idx]
      const skills = u.skills ? normalizeCompanionSkills(u.skills) : cur.skills
      const computed = computeHpMpFromSkills(skills)
      list[idx] = {
        ...cur,
        role: u.role ?? cur.role,
        skills,
        hp: u.hp ?? cur.hp,
        maxHp: u.maxHp ?? cur.maxHp ?? computed.maxHp,
        mp: u.mp ?? cur.mp,
        maxMp: u.maxMp ?? cur.maxMp ?? computed.maxMp,
        status: status ?? cur.status,
        equipped: u.equipped ?? cur.equipped,
        carried: u.carried ?? cur.carried,
      }
    } else if (!status || status === 'active') {
      const skills = normalizeCompanionSkills(u.skills)
      const computed = computeHpMpFromSkills(skills)
      list.push({
        id: `companion_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name: u.name,
        role: u.role ?? '',
        background: '',
        personality: '',
        appearance: '',
        skills,
        hp: u.hp ?? computed.hp,
        maxHp: u.maxHp ?? computed.maxHp,
        mp: u.mp ?? computed.mp,
        maxMp: u.maxMp ?? computed.maxMp,
        loyalty: 3,
        control: 0,
        goal: '',
        status: 'active',
        isDead: false,
        isDeparted: false,
        equipped: u.equipped ?? [],
        carried: u.carried ?? [],
      })
    }
  }

  return list
}

/**
 * @param {import('./sandboxStorage.js').SandboxState} slotState
 * @param {PlayerInventoryExtract | null} playerInv
 * @param {CompanionInventoryExtract[]} companionUpdates
 * @returns {import('./sandboxStorage.js').SandboxState | null}
 */
export function applyInventoryExtractToSlotState(slotState, playerInv, companionUpdates) {
  let changed = false
  const next = { ...slotState }

  if (playerInv) {
    next.playerInventory = playerInventoryFromExtract(playerInv)
    if (next.character) {
      next.character = {
        ...next.character,
        items: inventoryToLegacyItemNames(next.playerInventory),
      }
    }
    changed = true
  }

  if (companionUpdates.length > 0) {
    next.companions = mergeCompanionInventoryExtract(next.companions ?? [], companionUpdates)
    changed = true
  }

  return changed ? next : null
}

/** @param {SandboxPlayerInventory} inv */
export function formatPlayerInventoryForExtractPrompt(inv) {
  const equipped =
    inv.equipped.map((i) => `${i.name}${i.description ? `(${i.description})` : ''}`).join('、') ||
    '无'
  const carried =
    inv.carried
      .map((i) => {
        const qty = i.quantity && i.quantity > 1 ? `x${i.quantity}` : ''
        return `${i.name}${qty}${i.description ? `(${i.description})` : ''}`
      })
      .join('、') || '无'
  return `装备：${equipped}\n携带：${carried}`
}

/** @param {SandboxCompanion} c */
export function formatCompanionInventoryForExtractPrompt(c) {
  const equipped =
    c.equipped.map((i) => `${i.name}${i.description ? `(${i.description})` : ''}`).join('、') ||
    '无'
  const carried =
    c.carried
      .map((i) => {
        const qty = i.quantity && i.quantity > 1 ? `x${i.quantity}` : ''
        return `${i.name}${qty}${i.description ? `(${i.description})` : ''}`
      })
      .join('、') || '无'
  return `[${c.name}] ${c.role || '伙伴'} HP${c.hp}/${c.maxHp} MP${c.mp}/${c.maxMp} 装备：${equipped} 携带：${carried}`
}
