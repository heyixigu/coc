import './Screens.css'

/**
 * @param {{ onBack: () => void }} props
 */
export default function SandboxPlaceholderScreen({ onBack }) {
  return (
    <div className="screen-root">
      <div className="screen-sandbox-inner">
        <h1 className="screen-sandbox-title">沙盒模式</h1>
        <p className="screen-sandbox-hint">敬请期待</p>
        <button type="button" className="screen-sandbox-back" onClick={onBack}>
          返回模式选择
        </button>
      </div>
    </div>
  )
}
