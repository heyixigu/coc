import { useState } from "react";
import SpriteAnimator from "./SpriteAnimator.jsx";
import { PHOTOGRAPHER_CONFIG, SCHOLAR_CONFIG } from "./spriteConfigs.js";

function SpeedControl({ speedScale, onChange }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 360,
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
        <span>播放速度（两人共用）</span>
        <span style={{ opacity: 0.75 }}>{speedScale.toFixed(2)}×</span>
      </label>
      <input
        type="range"
        min={0.25}
        max={2}
        step={0.05}
        value={speedScale}
        onChange={(e) => onChange(Number(e.target.value))}
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
  );
}

function CharacterPanel({ config, speedScale }) {
  const { imagePath, sheet, actions, title, initialAction } = config;
  return (
    <SpriteAnimator
      title={title}
      imagePath={imagePath}
      sheet={sheet}
      actions={actions}
      initialAction={initialAction}
      canvasSize={300}
      speedScale={speedScale}
      showSpeedSlider={false}
    />
  );
}

export default function PixelIdleChar() {
  const [speedScale, setSpeedScale] = useState(0.55);

  return (
    <div
      style={{
        margin: 0,
        minHeight: "100vh",
        background: "#e8e6e0",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "#d4d0c8",
          padding: "28px 32px 36px",
          borderRadius: 24,
          boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          maxWidth: 720,
          width: "100%",
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "#2d2a24",
            letterSpacing: 1,
          }}
        >
          双人待机预览
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 28,
            justifyContent: "center",
            width: "100%",
          }}
        >
          <CharacterPanel config={PHOTOGRAPHER_CONFIG} speedScale={speedScale} />
          <CharacterPanel config={SCHOLAR_CONFIG} speedScale={speedScale} />
        </div>

        <SpeedControl speedScale={speedScale} onChange={setSpeedScale} />
      </div>
    </div>
  );
}
