import './Prologue.css'

/**
 * @param {{ apiKey: string, onApiKeyChange: (key: string) => void, onWipeAll?: () => void }} props
 */
export default function ApiKeyScreen({ apiKey, onApiKeyChange, onWipeAll }) {
  return (
    <div className="prologue-root prologue-fade-in">
      <div className="prologue-inner prologue-api-key-screen">
        <h1 className="prologue-api-title">秘仪残卷</h1>
        <p className="prologue-api-sub">填入密钥，方可揭开序幕</p>
        <label className="prologue-api-field">
          <span>DeepSeek API Key</span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="sk-…"
          />
        </label>
        <p className="prologue-api-hint">密钥仅保存在本机浏览器，不会上传至其他服务器。</p>
        {onWipeAll ? (
          <button type="button" className="prologue-btn prologue-btn-ghost" onClick={onWipeAll}>
            清除本地存档
          </button>
        ) : null}
      </div>
    </div>
  )
}
