import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GameApp from './GameApp.jsx'
import ApiKeyScreen from './prologue/ApiKeyScreen.jsx'
import Prologue from './prologue/Prologue.jsx'
import MainScreen from './screens/MainScreen.jsx'
import SlotSelectScreen from './screens/SlotSelectScreen.jsx'
import SandboxGameApp from './sandbox/SandboxGameApp.jsx'
import SandboxModeSelectScreen from './sandbox/SandboxModeSelectScreen.jsx'
import SandboxPrologue from './sandbox/prologue/SandboxPrologue.jsx'
import {
  deleteSandboxSlot,
  listSandboxSlots,
  loadSandboxSlot,
  resetSandboxState,
  resetSandboxStory,
  wipeSandboxStorage,
} from './sandbox/sandboxStorage.js'
import {
  deleteSlot,
  listSlots,
  loadState,
  resetForPrologueReplay,
  resetStoryKeepMode,
  resolveSelectedMode,
  saveState,
  wipeAllIncludingApiKey,
} from './storage.js'

/** @typedef {'main' | 'apiKey' | 'modeSelect' | 'slotSelect' | 'prologue' | 'game' | 'sandboxPrologue' | 'sandboxGame'} AppScreen */

export default function App() {
  const initial = useMemo(() => loadState(), [])
  const initialMode = useMemo(() => resolveSelectedMode(initial), [initial])

  const [apiKey, setApiKey] = useState(initial.apiKey || '')
  const [selectedMode, setSelectedMode] = useState(initialMode)
  const [selectedSlot, setSelectedSlot] = useState(initial.selectedSlot)
  const [screen, setScreen] = useState(/** @type {AppScreen} */ ('main'))
  const [pageHistory, setPageHistory] = useState(/** @type {AppScreen[]} */ ([]))
  const [prologueComplete, setPrologueComplete] = useState(false)
  const [gameKey, setGameKey] = useState(0)
  const [slotsRefresh, setSlotsRefresh] = useState(0)

  const screenRef = useRef(screen)
  screenRef.current = screen

  const persistPatch = useCallback((patch) => {
    const prev = loadState()
    saveState({ ...prev, ...patch })
  }, [])

  const navigateTo = useCallback((newPage) => {
    const current = screenRef.current
    if (current !== newPage) {
      setPageHistory((prev) => [...prev, current])
    }
    setScreen(newPage)
  }, [])

  const navigateBack = useCallback(() => {
    setPageHistory((history) => {
      if (history.length === 0) return history
      const prevPage = history[history.length - 1]
      setScreen(prevPage)
      return history.slice(0, -1)
    })
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
      navigateTo('modeSelect')
    }
  }, [screen, apiKey, navigateTo])

  const handleStartFromMain = useCallback(() => {
    if (apiKey.trim()) {
      navigateTo('modeSelect')
    } else {
      navigateTo('apiKey')
    }
  }, [apiKey, navigateTo])

  const handleSelectCoc = useCallback(() => {
    setSelectedMode('coc')
    persistPatch({ selectedMode: 'coc' })
    setSlotsRefresh((n) => n + 1)
    navigateTo('slotSelect')
  }, [persistPatch, navigateTo])

  const handleSelectSandbox = useCallback(() => {
    setSelectedMode('sandbox')
    persistPatch({ selectedMode: 'sandbox' })
    setSlotsRefresh((n) => n + 1)
    navigateTo('slotSelect')
  }, [persistPatch, navigateTo])

  const handleSelectSlot = useCallback(
    (slotIndex, isEmpty) => {
      setSelectedSlot(slotIndex)
      persistPatch({ selectedSlot: slotIndex })
      const mode = selectedMode || 'coc'

      if (mode === 'sandbox') {
        if (isEmpty) {
          navigateTo('sandboxPrologue')
        } else {
          const sb = loadSandboxSlot(slotIndex)
          if (sb.prologueComplete && sb.character && sb.world) {
            navigateTo('sandboxGame')
          } else {
            navigateTo('sandboxPrologue')
          }
        }
      } else if (isEmpty) {
        setPrologueComplete(false)
        navigateTo('prologue')
      } else {
        setPrologueComplete(true)
        navigateTo('game')
      }
      setGameKey((k) => k + 1)
    },
    [persistPatch, selectedMode, navigateTo],
  )

  const handleDeleteSlot = useCallback(
    (slotIndex) => {
      const mode = selectedMode || 'coc'
      if (mode === 'sandbox') {
        deleteSandboxSlot(slotIndex)
      } else {
        deleteSlot(slotIndex)
      }
      setSlotsRefresh((n) => n + 1)
    },
    [selectedMode],
  )

  const handlePrologueComplete = useCallback(() => {
    setPrologueComplete(true)
    navigateTo('game')
    setGameKey((k) => k + 1)
  }, [navigateTo])

  const handleSandboxPrologueComplete = useCallback(() => {
    navigateTo('sandboxGame')
    setGameKey((k) => k + 1)
  }, [navigateTo])

  const handleReplayPrologue = useCallback(() => {
    const mode = selectedMode || resolveSelectedMode(loadState()) || 'coc'
    const slot = selectedSlot ?? loadState().selectedSlot
    if (mode === 'sandbox') {
      if (
        !window.confirm(
          '将清空沙盒角色与剧情进度，并重新播放沙盒序幕。\n\n已填写的 API Key 会保留。',
        )
      ) {
        return
      }
      if (slot) resetSandboxState(slot)
      navigateTo('sandboxPrologue')
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
    resetForPrologueReplay(key, 'coc', slot ?? undefined)
    setPrologueComplete(false)
    navigateTo('prologue')
    setGameKey((k) => k + 1)
  }, [apiKey, selectedMode, selectedSlot, navigateTo])

  const handleResetStory = useCallback(() => {
    const mode = selectedMode || resolveSelectedMode(loadState()) || 'coc'
    const slot = selectedSlot ?? loadState().selectedSlot
    if (mode === 'sandbox') {
      if (
        !window.confirm(
          '确定要重置故事吗？对话与掷骰记录将被清除；将回到沙盒序幕，并保留角色、世界观与 API Key。',
        )
      ) {
        return
      }
      if (slot) resetSandboxStory(slot)
      navigateTo('sandboxPrologue')
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
    resetStoryKeepMode(key, 'coc', slot ?? undefined)
    setSelectedMode('coc')
    setPrologueComplete(false)
    navigateTo('slotSelect')
    setSlotsRefresh((n) => n + 1)
    setGameKey((k) => k + 1)
  }, [apiKey, selectedMode, selectedSlot, navigateTo])

  const handleWipeAll = useCallback(() => {
    if (!window.confirm('将清除 API Key、模式选择与全部存档，回到主界面。确定吗？')) {
      return
    }
    wipeAllIncludingApiKey()
    wipeSandboxStorage()
    setApiKey('')
    setSelectedMode(null)
    setSelectedSlot(null)
    setPrologueComplete(false)
    setPageHistory([])
    setScreen('main')
    setGameKey((k) => k + 1)
  }, [])

  const cocSlots = useMemo(() => listSlots(), [slotsRefresh, screen])
  const sandboxSlots = useMemo(() => listSandboxSlots(), [slotsRefresh, screen])

  if (screen === 'main') {
    return <MainScreen onStart={handleStartFromMain} />
  }

  if (screen === 'apiKey') {
    return (
      <ApiKeyScreen
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        onWipeAll={handleWipeAll}
        onNavigateBack={navigateBack}
      />
    )
  }

  if (screen === 'modeSelect') {
    return (
      <SandboxModeSelectScreen
        onSelectCoc={handleSelectCoc}
        onSelectSandbox={handleSelectSandbox}
        onNavigateBack={navigateBack}
      />
    )
  }

  if (screen === 'slotSelect') {
    const mode = selectedMode === 'sandbox' ? 'sandbox' : 'coc'
    return (
      <SlotSelectScreen
        mode={mode}
        slots={mode === 'sandbox' ? sandboxSlots : cocSlots}
        onSelectSlot={handleSelectSlot}
        onDeleteSlot={handleDeleteSlot}
        onNavigateBack={navigateBack}
      />
    )
  }

  if (screen === 'sandboxPrologue' && selectedSlot) {
    return (
      <SandboxPrologue
        apiKey={apiKey.trim()}
        slotIndex={selectedSlot}
        onComplete={handleSandboxPrologueComplete}
        onNavigateBack={navigateBack}
      />
    )
  }

  if (screen === 'sandboxGame' && selectedSlot) {
    return (
      <SandboxGameApp
        key={gameKey}
        slotIndex={selectedSlot}
        apiKey={apiKey}
        setApiKey={handleApiKeyChange}
        bootKey={gameKey}
        onNavigateBack={navigateBack}
        onResetStory={handleResetStory}
        onReplayPrologue={handleReplayPrologue}
        onWipeAll={handleWipeAll}
      />
    )
  }

  if (screen === 'prologue') {
    return (
      <Prologue apiKey={apiKey.trim()} onComplete={handlePrologueComplete} onNavigateBack={navigateBack} />
    )
  }

  if (screen === 'game' && selectedSlot) {
    return (
      <GameApp
        key={gameKey}
        slotIndex={selectedSlot}
        apiKey={apiKey}
        setApiKey={handleApiKeyChange}
        bootKey={gameKey}
        onNavigateBack={navigateBack}
        onReplayPrologue={handleReplayPrologue}
        onResetStory={handleResetStory}
        onWipeAll={handleWipeAll}
      />
    )
  }

  return <MainScreen onStart={handleStartFromMain} />
}
