import { useEffect } from 'react'

/** iOS 软键盘抬起时，为底部固定栏提供偏移量（px） */
export function useVisualViewportOffset() {
  useEffect(() => {
    const root = document.documentElement
    const vv = window.visualViewport

    const apply = () => {
      if (!vv) {
        root.style.setProperty('--keyboard-offset', '0px')
        return
      }
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      root.style.setProperty('--keyboard-offset', `${offset}px`)
    }

    apply()
    if (!vv) return undefined

    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)

    return () => {
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      root.style.setProperty('--keyboard-offset', '0px')
    }
  }, [])
}
