import { useCallback, useEffect, useMemo, useState } from 'react'
import GameApp from './GameApp.jsx'
import ApiKeyScreen from './prologue/ApiKeyScreen.jsx'
import Prologue from './prologue/Prologue.jsx'
import MainScreen from './screens/MainScreen.jsx'
import SandboxGameApp from './sandbox/SandboxGameApp.jsx'
import SandboxModeSelectScreen from './sandbox/SandboxModeSelectScreen.jsx'
import SandboxPrologue from './sandbox/prologue/SandboxPrologue.jsx'
import {
  loadSandboxState,
  resetSandboxState,
  resetSandboxStory,
  wipeSandboxStorage,
} from './sandbox/sandboxStorage.js'
import {
  loadState,
  resetForPrologueReplay,
  resetStoryKeepMode,
  resolveSelectedMode,
  saveState,
  wipeAllIncludingApiKey,
} from './storage.js'

/** @typedef {'main' | 'apiKey' | 'modeSelect' | 'prologue' | 'game' | 'sandboxPrologue' | 'sandboxGame'} AppScreen */

export default function App() {
  const initial = useMemo(() => loadState(), [])
  const initialMode = useMemo(() => resolveSelectedMode(initial), [initial])

  const [apiKey, setApiKey] = useState(initial.apiKey || '')
  const [selectedMode, setSelectedMode] = useState(initialMode)
  const [screen, setScreen] = useState(/** @type {AppScreen} */ ('main'))
  const [prologueComplete, setPrologueComplete] = useState(!!initial.prologueComplete)
  const [gameKey, setGameKey] = useState(0)

  const persistPatch = useCallback((patch) => {
    const prev = loadState()
    saveState({ ...prev, ...patch })
  }, [])

  const handleApiKeyChange = useCallback(
    (key) => {
      setApiKey(key)
      persistPatch({ apiKey: key })
    },
    [persistPatch],
  )

  useEffect(() => {
    if (screen === 'apiKey' && apiKey.trim()) {
      setScreen('modeSelect')
    }
  }, [screen, apiKey])

  const handleStartFromMain = useCallback(() => {
    if (apiKey.trim()) {
      setScreen('modeSelect')
    } else {
      setScreen('apiKey')
    }
  }, [apiKey])

  const handleSelectCoc = useCallback(() => {
    const saved = loadState()
    const resumeGame = saved.prologueComplete === true
    const resumePrologue =
      !resumeGame &&
      (!!saved.selectedScenario || (!!saved.player && !!saved.partner))

    setSelectedMode('coc')
    persistPatch({ selectedMode: 'coc' })

    if (resumeGame) {
      setPrologueComplete(true)
      setScreen('game')
    } else if (resumePrologue) {
      setPrologueComplete(false)
      setScreen('prologue')
    } else {
      setPrologueComplete(false)
      persistPatch({ prologueComplete: false })
      setScreen('prologue')
    }
    setGameKey((k) => k + 1)
  }, [persistPatch])

  const handleSelectSandbox = useCallback(() => {
    setSelectedMode('sandbox')
    persistPatch({ selectedMode: 'sandbox' })
    const sb = loadSandboxState()
    if (sb.prologueComplete && sb.character && sb.world) {
      setScreen('sandboxGame')
    } else {
      setScreen('sandboxPrologue')
    }
    setGameKey((k) => k + 1)
  }, [persistPatch])

  const handlePrologueComplete = useCallback(() => {
    setPrologueComplete(true)
    persistPatch({ prologueComplete: true })
    setScreen('game')
    setGameKey((k) => k + 1)
  }, [persistPatch])

  const handleSandboxPrologueComplete = useCallback(() => {
    setScreen('sandboxGame')
    setGameKey((k) => k + 1)
  }, [])

  const handleReplayPrologue = useCallback(() => {
    const mode = selectedMode || resolveSelectedMode(loadState()) || 'coc'
    if (mode === 'sandbox') {
      if (
        !window.confirm(
          '将清空沙盒角色与剧情进度，并重新播放沙盒序幕。\n\n已填写的 API Key 会保留。',
        )
      ) {
        return
      }
      resetSandboxState()
      setScreen('sandboxPrologue')
      setGameKey((k) => k + 1)
      return
    }

    if (
      !window.confirm(
        '将清空当前对话、角色数值与剧本进度，并重新播放开场序幕。\n\n已填写的 API Key 与所选模式会保留。',
      )
    ) {
      return
    }
    const key = apiKey.trim()
    resetForPrologueReplay(key, 'coc')
    setPrologueComplete(false)
    setScreen('prologue')
    setGameKey((k) => k + 1)
  }, [apiKey, selectedMode])

  const handleResetStory = useCallback(() => {
    const mode = selectedMode || resolveSelectedMode(loadState()) || 'coc'
    if (mode === 'sandbox') {
      if (
        !window.confirm(
          '确定要重置故事吗？对话与掷骰记录将被清除；将回到沙盒序幕，并保留角色、世界观与 API Key。',
        )
      ) {
        return
      }
      resetSandboxStory()
      setScreen('sandboxPrologue')
      setGameKey((k) => k + 1)
      return
    }

    if (
      !window.confirm(
        '确定要重置故事吗？对话、骰子记录与角色数值将被清除；将回到模式选择，并保留 API Key 与所选模式。',
      )
    ) {
      return
    }
    const key = apiKey.trim()
    resetStoryKeepMode(key, 'coc')
    setSelectedMode('coc')
    setPrologueComplete(false)
    setScreen('modeSelect')
    setGameKey((k) => k + 1)
  }, [apiKey, selectedMode])

  const handleWipeAll = useCallback(() => {
    if (!window.confirm('将清除 API Key、模式选择与全部存档，回到主界面。确定吗？')) {
      return
    }
    wipeAllIncludingApiKey()
    wipeSandboxStorage()
    setApiKey('')
    setSelectedMode(null)
    setPrologueComplete(false)
    setScreen('main')
    setGameKey((k) => k + 1)
  }, [])

  if (screen === 'main') {
    return <MainScreen onStart={handleStartFromMain} />
  }

  if (screen === 'apiKey') {
    return (
      <ApiKeyScreen
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        onWipeAll={handleWipeAll}
      />
    )
  }

  if (screen === 'modeSelect') {
    return (
      <SandboxModeSelectScreen
        onSelectCoc={handleSelectCoc}
        onSelectSandbox={handleSelectSandbox}
      />
    )
  }

  if (screen === 'sandboxPrologue') {
    return (
      <SandboxPrologue apiKey={apiKey.trim()} onComplete={handleSandboxPrologueComplete} />
    )
  }

  if (screen === 'sandboxGame') {
    return (
      <SandboxGameApp
        key={gameKey}
        apiKey={apiKey}
        setApiKey={handleApiKeyChange}
        bootKey={gameKey}
        onResetStory={handleResetStory}
        onReplayPrologue={handleReplayPrologue}
        onWipeAll={handleWipeAll}
      />
    )
  }

  if (screen === 'prologue') {
    return <Prologue apiKey={apiKey.trim()} onComplete={handlePrologueComplete} />
  }

  return (
    <GameApp
      key={gameKey}
      apiKey={apiKey}
      setApiKey={handleApiKeyChange}
      bootKey={gameKey}
      onReplayPrologue={handleReplayPrologue}
      onResetStory={handleResetStory}
      onWipeAll={handleWipeAll}
    />
  )
}
