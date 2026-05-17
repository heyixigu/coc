import { useEffect, useMemo, useRef, useState } from 'react'

const DAMAGE_MS = 500

/**
 * @param {object} opts
 * @param {boolean} opts.inputLocked
 * @param {null | 'loading' | 'typing'} opts.gmUiPhase
 * @param {boolean} opts.loading
 * @param {boolean} opts.judgingTurn
 * @param {{ player: Record<string, 'up'|'down'>, partner: Record<string, 'up'|'down'> }} opts.statFlash
 * @returns {import('../config/characterSprites.js').SpriteState}
 */
export function useSpriteState({ inputLocked, gmUiPhase, loading, judgingTurn, statFlash }) {
  const [damagedPulse, setDamagedPulse] = useState(false)
  const damageTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))

  useEffect(() => {
    const hurt =
      statFlash.player.hp === 'down' ||
      statFlash.player.san === 'down' ||
      statFlash.partner.hp === 'down' ||
      statFlash.partner.san === 'down'
    if (!hurt) return undefined

    setDamagedPulse(true)
    if (damageTimerRef.current) clearTimeout(damageTimerRef.current)
    damageTimerRef.current = setTimeout(() => {
      setDamagedPulse(false)
      damageTimerRef.current = null
    }, DAMAGE_MS)

    return () => {
      if (damageTimerRef.current) clearTimeout(damageTimerRef.current)
    }
  }, [statFlash])

  return useMemo(() => {
    if (damagedPulse) return 'damaged'
    if (gmUiPhase === 'typing') return 'idle'
    if (inputLocked) return 'thinking'
    if (gmUiPhase === 'loading' || (loading && judgingTurn)) return 'thinking'
    return 'idle'
  }, [damagedPulse, inputLocked, gmUiPhase, loading, judgingTurn])
}
