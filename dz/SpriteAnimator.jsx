import { useCallback, useEffect, useRef, useState } from "react";

const panelBtn = {
  background: "#3a3a3a",
  border: "none",
  padding: "10px 22px",
  borderRadius: 40,
  fontSize: 16,
  fontWeight: 500,
  color: "#f0ede6",
  cursor: "pointer",
  letterSpacing: 0.3,
  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
};

/** @returns {{ sx: number, sy: number, sw: number, sh: number }} */
function resolveFrameRect(cfg, frameIndex, sheet, frameWidth, frameHeight) {
  const rowDef = sheet?.rows?.[cfg.row];
  const frameCount = cfg.frames ?? rowDef?.cols?.length ?? sheet?.cols?.length ?? 1;
  if (rowDef?.cols?.length) {
    const col = rowDef.cols[frameIndex % frameCount];
    if (!col) return null;
    return { sx: col.sx, sy: rowDef.sy, sw: col.sw, sh: rowDef.sh };
  }
  if (sheet?.cols?.length && sheet?.rows?.length) {
    const col = sheet.cols[frameIndex % frameCount];
    const row = sheet.rows[cfg.row];
    if (!col || !row) return null;
    return { sx: col.sx, sy: row.sy, sw: col.sw, sh: row.sh };
  }
  if (frameWidth > 0 && frameHeight > 0) {
    return {
      sx: frameIndex * frameWidth,
      sy: cfg.row * frameHeight,
      sw: frameWidth,
      sh: frameHeight,
    };
  }
  return null;
}

/**
 * 精灵动画：支持均匀网格，或 sheet.cols + sheet.rows 非均匀裁切。
 */
export default function SpriteAnimator({
  imagePath,
  actions,
  initialAction = "walk",
  canvasSize = 300,
  frameWidth = 0,
  frameHeight = 0,
  sheet = null,
  title = null,
  speedScale: speedScaleProp,
  onSpeedScaleChange,
  showSpeedSlider = true,
}) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const frameIndexRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animIdRef = useRef(null);

  const [currentAction, setCurrentAction] = useState(initialAction);
  const [displayFrame, setDisplayFrame] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [speedScaleInner, setSpeedScaleInner] = useState(0.55);
  const speedControlled = speedScaleProp != null;
  const speedScale = speedControlled ? speedScaleProp : speedScaleInner;
  const setSpeedScale = speedControlled
    ? (v) => onSpeedScaleChange?.(typeof v === "function" ? v(speedScaleProp) : v)
    : setSpeedScaleInner;

  const actionKeys = Object.keys(actions);
  const actionCfg = actions[currentAction];

  useEffect(() => {
    const img = new Image();
    img.src = imagePath;
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
      setLoadError(false);
      frameIndexRef.current = 0;
      setDisplayFrame(0);
      lastTimeRef.current = 0;
    };
    img.onerror = () => {
      imgRef.current = null;
      setImageLoaded(false);
      setLoadError(true);
    };
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imagePath]);

  useEffect(() => {
    frameIndexRef.current = 0;
    setDisplayFrame(0);
    lastTimeRef.current = 0;
  }, [currentAction]);

  const drawFrame = useCallback(
    (timestamp) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const cfg = actions[currentAction];

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#b8b4ac";
      ctx.fillRect(0, 0, w, h);
      // 透明像素棋盘格提示
      const t = 8;
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      for (let y = 0; y < h; y += t * 2) {
        for (let x = 0; x < w; x += t * 2) {
          ctx.fillRect(x, y, t, t);
          ctx.fillRect(x + t, y + t, t, t);
        }
      }

      if (!cfg) {
        ctx.fillStyle = "#555";
        ctx.font = "16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`未知动作: ${currentAction}`, w / 2, h / 2);
        animIdRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      if (!imageLoaded || loadError || !imgRef.current) {
        ctx.fillStyle = "#a09b92";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#3a3732";
        ctx.font = "bold 15px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("精灵图未加载", w / 2, h / 2 - 14);
        ctx.font = "12px system-ui, sans-serif";
        ctx.fillStyle = "#5e5a52";
        ctx.fillText(cfg.label, w / 2, h / 2 + 12);
        animIdRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      const rowDef = sheet?.rows?.[cfg.row];
      const frameCount =
        cfg.frames ?? rowDef?.cols?.length ?? sheet?.cols?.length ?? 1;

      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;
      const frameMs = cfg.speed / Math.max(0.1, speedScale);
      if (elapsed >= frameMs) {
        const next = (frameIndexRef.current + 1) % frameCount;
        frameIndexRef.current = next;
        setDisplayFrame(next);
        lastTimeRef.current = timestamp;
      }

      const rect = resolveFrameRect(
        cfg,
        frameIndexRef.current,
        sheet,
        frameWidth,
        frameHeight,
      );

      if (!rect) {
        ctx.fillStyle = "#555";
        ctx.font = "14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("缺少 sheet 或 frameWidth/Height 配置", w / 2, h / 2);
        animIdRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      const { sx, sy, sw, sh } = rect;
      const fit = Math.min(w / sw, h / sh) * 0.88;
      // 源帧远大于画布时必须用小数缩放；仅放大时用整数倍保像素清晰
      const scale = fit >= 1 ? Math.max(1, Math.floor(fit)) : fit;
      const drawW = sw * scale;
      const drawH = sh * scale;
      const dx = (w - drawW) / 2;
      const dy = (h - drawH) / 2;

      ctx.drawImage(
        imgRef.current,
        sx,
        sy,
        sw,
        sh,
        dx,
        dy,
        drawW,
        drawH,
      );

      animIdRef.current = requestAnimationFrame(drawFrame);
    },
    [
      actions,
      currentAction,
      frameHeight,
      frameWidth,
      imageLoaded,
      loadError,
      sheet,
      speedScale,
      onSpeedScaleChange,
    ],
  );

  useEffect(() => {
    animIdRef.current = requestAnimationFrame(drawFrame);
    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [drawFrame]);

  const rowDef = sheet?.rows?.[actionCfg?.row ?? 0];
  const frameTotal =
    actionCfg?.frames ?? rowDef?.cols?.length ?? sheet?.cols?.length ?? 1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        flex: 1,
        minWidth: 0,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#2d2a24",
            letterSpacing: 0.5,
          }}
        >
          {title}
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        style={{
          display: "block",
          width: canvasSize,
          height: canvasSize,
          imageRendering: "pixelated",
          borderRadius: 16,
          background: "#c4bfb5",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
        }}
      />
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {actionKeys.map((key) => {
          const active = key === currentAction;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCurrentAction(key)}
              style={{
                ...panelBtn,
                background: active ? "#c97d60" : panelBtn.background,
                boxShadow: active
                  ? "0 0 0 2px #f0ede6, 0 4px 12px rgba(0,0,0,0.3)"
                  : panelBtn.boxShadow,
              }}
            >
              {actions[key].label}
            </button>
          );
        })}
      </div>
      {showSpeedSlider && (
        <div
          style={{
            width: "100%",
            maxWidth: 280,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: "#2d2a24",
              fontWeight: 500,
            }}
          >
            <span>播放速度</span>
            <span style={{ opacity: 0.75 }}>{speedScale.toFixed(2)}×</span>
          </label>
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.05}
            value={speedScale}
            onChange={(e) => setSpeedScale(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c97d60", cursor: "pointer" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#5e5a52",
            }}
          >
            <span>慢</span>
            <span>原速 1.0×</span>
            <span>快</span>
          </div>
        </div>
      )}
      {actionCfg && (
        <div
          style={{
            fontSize: 14,
            color: "#2d2a24",
            background: "#ece8de",
            padding: "6px 18px",
            borderRadius: 40,
            fontWeight: 500,
            opacity: 0.85,
          }}
        >
          {actionCfg.label} · 帧 {displayFrame + 1}/{frameTotal}
        </div>
      )}
    </div>
  );
}
