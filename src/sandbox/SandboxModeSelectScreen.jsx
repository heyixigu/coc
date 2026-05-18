import ScreenBackButton from '../screens/ScreenBackButton.jsx'
import '../screens/Screens.css'
import './SandboxModeSelectScreen.css'

/**
 * @param {{ onSelectCoc: () => void, onSelectSandbox: () => void, onNavigateBack?: () => void }} props
 */
export default function SandboxModeSelectScreen({ onSelectCoc, onSelectSandbox, onNavigateBack }) {
  return (
    <section className="screen-root screen-root--scroll">
      {onNavigateBack ? <ScreenBackButton onBack={onNavigateBack} /> : null}
      <div className="screen-mode-inner">
        <h2 className="screen-mode-heading">请选择游戏模式</h2>
        <div className="screen-mode-cards">
          <button
            type="button"
            className="screen-mode-card screen-mode-card--coc"
            onClick={onSelectCoc}
          >
            <h3 className="screen-mode-card-title">克苏鲁的呼唤</h3>
            <p className="screen-mode-card-sub">CoC 经典跑团</p>
            <p className="screen-mode-card-desc">扮演调查员，探索未知的恐惧</p>
          </button>
          <button
            type="button"
            className="screen-mode-card screen-mode-card--sandbox-active"
            onClick={onSelectSandbox}
          >
            <h3 className="screen-mode-card-title">沙盒模式</h3>
            <p className="screen-mode-card-sub">自由探索</p>
            <p className="screen-mode-card-desc">构建属于你的故事世界</p>
          </button>
        </div>
      </div>
    </section>
  )
}
