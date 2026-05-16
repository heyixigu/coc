import { useCallback, useMemo, useState } from 'react'
import GameApp from './GameApp.jsx'
import ApiKeyScreen from './prologue/ApiKeyScreen.jsx'
import Prologue from './prologue/Prologue.jsx'
import { loadState, resetForPrologueReplay, saveState, wipeAllIncludingApiKey } from './storage.js'

export default function App() {
  const initial = useMemo(() => loadState(), [])
  const [apiKey, setApiKey] = useState(initial.apiKey || '')
  const [prologueComplete, setPrologueComplete] = useState(!!initial.prologueComplete)
  const [gameKey, setGameKey] = useState(0)

  const handleApiKeyChange = useCallback((key) => {
    setApiKey(key)
    const prev = loadState()
    saveState({
      ...prev,
      apiKey: key,
    })
  }, [])

  const handlePrologueComplete = useCallback(() => {
    setPrologueComplete(true)
    setGameKey((k) => k + 1)
  }, [])

  const handleReplayPrologue = useCallback(() => {
    if (
      !window.confirm(
        '将清空当前对话、角色数值与剧本进度，并重新播放开场序幕。\n\n已填写的 API Key 会保留。',
      )
    ) {
      return
    }
    const key = apiKey.trim()
    resetForPrologueReplay(key)
    setPrologueComplete(false)
    setGameKey((k) => k + 1)
  }, [apiKey])

  const handleWipeAll = useCallback(() => {
    if (!window.confirm('将清除 API Key 与全部存档，回到最初空白状态。确定吗？')) {
      return
    }
    wipeAllIncludingApiKey()
    setApiKey('')
    setPrologueComplete(false)
    setGameKey((k) => k + 1)
  }, [])

  if (!apiKey.trim()) {
    return (
      <ApiKeyScreen
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        onWipeAll={handleWipeAll}
      />
    )
  }

  if (!prologueComplete) {
    return <Prologue apiKey={apiKey.trim()} onComplete={handlePrologueComplete} />
  }

  return (
    <GameApp
      key={gameKey}
      apiKey={apiKey}
      setApiKey={handleApiKeyChange}
      bootKey={gameKey}
      onReplayPrologue={handleReplayPrologue}
      onWipeAll={handleWipeAll}
    />
  )
}
