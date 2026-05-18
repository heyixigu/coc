import './Screens.css'

/**
 * @param {{ onStart: () => void }} props
 */
export default function MainScreen({ onStart }) {
  return (
    <div className="screen-root">
      <div className="screen-main-inner">
        <h1 className="screen-main-title">秘仪残卷</h1>
        <p className="screen-main-subtitle">一个关于未知的故事</p>
        <div className="screen-main-actions">
          <button type="button" className="screen-main-btn" onClick={onStart}>
            开始游戏
          </button>
        </div>
      </div>
      <p className="screen-main-footer">Powered by DeepSeek</p>
    </div>
  )
}
