import { useEffect, useMemo, useState } from 'react'
import { getSpriteConfig } from '../config/characterSprites.js'
import SpriteAnimator from './SpriteAnimator.jsx'

/** @typedef {import('../config/characterSprites.js').SpriteState} SpriteState */

const IDLE_BLINK_MS = 4200

/**
 * @param {object} props
 * @param {SpriteState} props.state
 */
export default function CharacterSprite({ state }) {
  const config = useMemo(() => getSpriteConfig(), [])
  const [idleAction, setIdleAction] = useState(config.idleCycle?.[0] ?? config.actionForState('idle'))

  useEffect(() => {
    if (state !== 'idle' || !config.idleCycle?.length) {
      setIdleAction(config.actionForState('idle'))
      return undefined
    }
    let idx = 0
    setIdleAction(config.idleCycle[0])
    const t = setInterval(() => {
      idx = (idx + 1) % config.idleCycle.length
      setIdleAction(config.idleCycle[idx])
    }, IDLE_BLINK_MS)
    return () => clearInterval(t)
  }, [state, config])

  const action =
    state === 'idle' && config.idleCycle?.length
      ? idleAction
      : config.actionForState(state === 'damaged' ? 'idle' : state)

  const showDamaged = state === 'damaged'
  const showThinking = state === 'thinking'

  return (
    <div
      className={`character-sprite character-sprite--linzhimiao${showDamaged ? ' character-sprite--damaged' : ''}${showThinking ? ' character-sprite--thinking' : ''}`}
      data-state={state}
      role="img"
      aria-label="林知渺"
    >
      <SpriteAnimator
        imagePath={config.imagePath}
        sheet={config.sheet}
        actions={config.actions}
        action={action}
        speedScale={state === 'thinking' ? 0.45 : 0.55}
      />
    </div>
  )
}
