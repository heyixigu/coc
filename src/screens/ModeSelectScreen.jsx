import './Screens.css'

/**
 * @param {{ onSelectCoc: () => void }} props
 */
export default function ModeSelectScreen({ onSelectCoc }) {
  return (
    <div className="screen-root">
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
          <div className="screen-mode-card screen-mode-card--sandbox" aria-disabled="true">
            <span className="screen-mode-badge">敬请期待</span>
            <h3 className="screen-mode-card-title">沙盒模式</h3>
            <p className="screen-mode-card-sub">自由探索</p>
            <p className="screen-mode-card-desc">构建属于你的故事世界</p>
          </div>
        </div>
      </div>
    </div>
  )
}
