import { useEffect, useRef } from 'react'

const EDGE_PX = 28
const OPEN_SWIPE_PX = 50
const CLOSE_CARD_SWIPE_PX = 80

/**
 * @param {object} opts
 * @param {boolean} opts.enabled
 * @param {boolean} opts.leftOpen
 * @param {boolean} opts.rightOpen
 * @param {boolean} opts.miniCardOpen
 * @param {() => void} [opts.onOpenLeft]
 * @param {() => void} [opts.onOpenRight]
 * @param {() => void} [opts.onCloseMiniCard]
 * @param {import('react').RefObject<HTMLElement | null>} [opts.miniCardRef]
 */
export function useMobileGestures({
  enabled,
  leftOpen,
  rightOpen,
  miniCardOpen,
  onOpenLeft,
  onOpenRight,
  onCloseMiniCard,
  miniCardRef,
}) {
  const touchRef = useRef(/** @type {{ x: number, y: number, edge: 'left' | 'right' | null, onCard: boolean }} */ ({
    x: 0,
    y: 0,
    edge: null,
    onCard: false,
  }))

  useEffect(() => {
    if (!enabled) return undefined

    const onStart = (/** @type {TouchEvent} */ e) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      const w = window.innerWidth
      const onCard = !!(
        miniCardRef?.current &&
        e.target instanceof Node &&
        miniCardRef.current.contains(e.target)
      )
      let edge = null
      if (!leftOpen && !rightOpen && !miniCardOpen && t.clientX < EDGE_PX) edge = 'left'
      else if (!leftOpen && !rightOpen && !miniCardOpen && t.clientX > w - EDGE_PX) edge = 'right'

      touchRef.current = { x: t.clientX, y: t.clientY, edge, onCard }
    }

    const onEnd = (/** @type {TouchEvent} */ e) => {
      if (e.changedTouches.length !== 1) return
      const t = e.changedTouches[0]
      const dx = t.clientX - touchRef.current.x
      const dy = t.clientY - touchRef.current.y
      const { edge, onCard } = touchRef.current

      if (miniCardOpen && onCard && dy > CLOSE_CARD_SWIPE_PX && Math.abs(dy) > Math.abs(dx)) {
        onCloseMiniCard?.()
        return
      }

      if (leftOpen || rightOpen || miniCardOpen) return

      if (edge === 'left' && dx > OPEN_SWIPE_PX) onOpenLeft?.()
      if (edge === 'right' && dx < -OPEN_SWIPE_PX) onOpenRight?.()
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchend', onEnd)
    }
  }, [
    enabled,
    leftOpen,
    rightOpen,
    miniCardOpen,
    onOpenLeft,
    onOpenRight,
    onCloseMiniCard,
    miniCardRef,
  ])
}
