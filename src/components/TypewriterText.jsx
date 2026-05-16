import { useEffect, useRef, useState } from 'react'

/**
 * @param {{ text: string, charMs?: number, onComplete?: () => void, className?: string }} props
 */
export default function TypewriterText({ text, charMs = 42, onComplete, className = '' }) {
  const [visible, setVisible] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    setVisible(0)
    doneRef.current = false
  }, [text])

  useEffect(() => {
    if (!text) {
      onComplete?.()
      return undefined
    }
    if (visible >= text.length) {
      if (!doneRef.current) {
        doneRef.current = true
        onComplete?.()
      }
      return undefined
    }
    const t = setTimeout(() => setVisible((v) => v + 1), charMs)
    return () => clearTimeout(t)
  }, [text, visible, charMs, onComplete])

  const shown = text.slice(0, visible)

  return (
    <p className={`prologue-paragraph ${className}`.trim()}>
      {shown.split('').map((ch, i) => (
        <span key={`${i}-${ch}`} className="prologue-char">
          {ch === '\n' ? <br /> : ch}
        </span>
      ))}
    </p>
  )
}
