import { useCallback, useEffect, useRef, useState } from 'react'

const SPEED_SCALE = 0.55

/** @returns {{ sx: number, sy: number, sw: number, sh: number } | null} */
function resolveFrameRect(cfg, frameIndex, sheet, frameWidth, frameHeight) {
  const rowDef = sheet?.rows?.[cfg.row]
  const frameCount = cfg.frames ?? rowDef?.cols?.length ?? sheet?.cols?.length ?? 1
  if (rowDef?.cols?.length) {
    const col = rowDef.cols[frameIndex % frameCount]
    if (!col) return null
    return { sx: col.sx, sy: rowDef.sy, sw: col.sw, sh: rowDef.sh }
  }
  if (sheet?.cols?.length && sheet?.rows?.length) {
    const col = sheet.cols[frameIndex % frameCount]
    const row = sheet.rows[cfg.row]
    if (!col || !row) return null
    return { sx: col.sx, sy: row.sy, sw: col.sw, sh: row.sh }
  }
  if (frameWidth > 0 && frameHeight > 0) {
    return {
      sx: frameIndex * frameWidth,
      sy: cfg.row * frameHeight,
      sw: frameWidth,
      sh: frameHeight,
    }
  }
  return null
}

/**
 * @param {object} props
 * @param {string} props.imagePath
 * @param {Record<string, { row: number, frames?: number, speed: number }>} props.actions
 * @param {string} props.action
 * @param {object | null} [props.sheet]
 * @param {number} [props.frameWidth]
 * @param {number} [props.frameHeight]
 * @param {number} [props.speedScale]
 */
export default function SpriteAnimator({
  imagePath,
  actions,
  action,
  sheet = null,
  frameWidth = 0,
  frameHeight = 0,
  speedScale = SPEED_SCALE,
}) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const imgRef = useRef(/** @type {HTMLImageElement | null} */ (null))
  const frameIndexRef = useRef(0)
  const lastTimeRef = useRef(0)
  const animIdRef = useRef(/** @type {number | null} */ (null))
  const [displaySize, setDisplaySize] = useState({ w: 100, h: 140 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const actionCfg = actions[action]

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => {
      const w = Math.max(48, Math.floor(el.clientWidth))
      setDisplaySize((prev) => (prev.w === w ? prev : { w, h: prev.h }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const img = new Image()
    img.src = imagePath
    img.onload = () => {
      imgRef.current = img
      setImageLoaded(true)
      setLoadError(false)
      frameIndexRef.current = 0
      lastTimeRef.current = 0
    }
    img.onerror = () => {
      imgRef.current = null
      setImageLoaded(false)
      setLoadError(true)
    }
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [imagePath])

  useEffect(() => {
    frameIndexRef.current = 0
    lastTimeRef.current = 0
  }, [action])

  const drawFrame = useCallback(
    (timestamp) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      const w = canvas.width
      const h = canvas.height
      const cfg = actions[action]

      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, w, h)

      if (!cfg || !imageLoaded || loadError || !imgRef.current) {
        animIdRef.current = requestAnimationFrame(drawFrame)
        return
      }

      const rowDef = sheet?.rows?.[cfg.row]
      const frameCount = cfg.frames ?? rowDef?.cols?.length ?? sheet?.cols?.length ?? 1

      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const elapsed = timestamp - lastTimeRef.current
      const frameMs = cfg.speed / Math.max(0.1, speedScale)
      if (elapsed >= frameMs) {
        frameIndexRef.current = (frameIndexRef.current + 1) % frameCount
        lastTimeRef.current = timestamp
      }

      const rect = resolveFrameRect(cfg, frameIndexRef.current, sheet, frameWidth, frameHeight)
      if (!rect) {
        animIdRef.current = requestAnimationFrame(drawFrame)
        return
      }

      const { sx, sy, sw, sh } = rect
      const fit = Math.min(w / sw, h / sh) * 0.88
      const scale = fit >= 1 ? Math.max(1, Math.floor(fit)) : fit
      const drawW = sw * scale
      const drawH = sh * scale
      const dx = (w - drawW) / 2
      const dy = (h - drawH) / 2

      ctx.drawImage(imgRef.current, sx, sy, sw, sh, dx, dy, drawW, drawH)
      animIdRef.current = requestAnimationFrame(drawFrame)
    },
    [action, actions, frameHeight, frameWidth, imageLoaded, loadError, sheet, speedScale],
  )

  useEffect(() => {
    animIdRef.current = requestAnimationFrame(drawFrame)
    return () => {
      if (animIdRef.current != null) cancelAnimationFrame(animIdRef.current)
    }
  }, [drawFrame])

  useEffect(() => {
    if (!actionCfg || !sheet?.rows?.[actionCfg.row]) return
    const row = sheet.rows[actionCfg.row]
    const col = row.cols?.[0]
    if (!col) return
    const aspect = col.sw / row.sh
    setDisplaySize((prev) => ({
      w: prev.w,
      h: Math.max(48, Math.round(prev.w / aspect)),
    }))
  }, [action, actionCfg, sheet])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(displaySize.w * dpr)
    canvas.height = Math.round(displaySize.h * dpr)
    canvas.style.width = `${displaySize.w}px`
    canvas.style.height = `${displaySize.h}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [displaySize])

  return (
    <div ref={wrapRef} className="sprite-animator-wrap">
      <canvas ref={canvasRef} className="sprite-animator-canvas" aria-hidden />
    </div>
  )
}
