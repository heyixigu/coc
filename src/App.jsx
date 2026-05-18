import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const [prologueComplete, setPrologueComplete] = useState(false)
  const [gameKey, setGameKey] = useState(0)
  const [slotsRefresh, setSlotsRefresh] = useState(0)

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

  const handleExitToMain = useCallback(() => {
    setScreen('main')
  }, [])

  const handleSelectCoc = useCallback(() => {
    setSelectedMode('coc')
    persistPatch({ selectedMode: 'coc' })
    setSlotsRefresh((n) => n + 1)
    setScreen('slotSelect')
  }, [persistPatch])

  const handleSelectSandbox = useCallback(() => {
    setSelectedMode('sandbox')
    persistPatch({ selectedMode: 'sandbox' })
    setSlotsRefresh((n) => n + 1)
    setScreen('slotSelect')
  }, [persistPatch])

  const handleSelectSlot = useCallback(
    (slotIndex, isEmpty) => {
      setSelectedSlot(slotIndex)
      persistPatch({ selectedSlot: slotIndex })
      const mode = selectedMode || 'coc'

      if (mode === 'sandbox') {
        if (isEmpty) {
          setScreen('sandboxPrologue')
        } else {
          const sb = loadSandboxSlot(slotIndex)
          if (sb.prologueComplete && sb.character && sb.world) {
            setScreen('sandboxGame')
          } else {
            setScreen('sandboxPrologue')
          }
        }
      } else if (isEmpty) {
        setPrologueComplete(false)
        setScreen('prologue')
      } else {
        setPrologueComplete(true)
        setScreen('game')
      }
      setGameKey((k) => k + 1)
    },
    [persistPatch, selectedMode],
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
    setScreen('game')
    setGameKey((k) => k + 1)
  }, [])

  const handleSandboxPrologueComplete = useCallback(() => {
    setScreen('sandboxGame')
    setGameKey((k) => k + 1)
  }, [])

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
      else resetSandboxState()
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
    resetForPrologueReplay(key, 'coc', slot ?? undefined)
    setPrologueComplete(false)
    setScreen('prologue')
    setGameKey((k) => k + 1)
  }, [apiKey, selectedMode, selectedSlot])

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
      else resetSandboxStory()
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
    resetStoryKeepMode(key, 'coc', slot ?? undefined)
    setSelectedMode('coc')
    setPrologueComplete(false)
    setScreen('slotSelect')
    setSlotsRefresh((n) => n + 1)
    setGameKey((k) => k + 1)
  }, [apiKey, selectedMode, selectedSlot])

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

  if (screen === 'slotSelect') {
    const mode = selectedMode === 'sandbox' ? 'sandbox' : 'coc'
    return (
      <SlotSelectScreen
        mode={mode}
        slots={mode === 'sandbox' ? sandboxSlots : cocSlots}
        onSelectSlot={handleSelectSlot}
        onDeleteSlot={handleDeleteSlot}
      />
    )
  }

  if (screen === 'sandboxPrologue') {
    return (
      <SandboxPrologue apiKey={apiKey.trim()} onComplete={handleSandboxPrologueComplete} />
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
        onExitToMain={handleExitToMain}
        onResetStory={handleResetStory}
        onReplayPrologue={handleReplayPrologue}
        onWipeAll={handleWipeAll}
      />
    )
  }

  if (screen === 'prologue') {
    return <Prologue apiKey={apiKey.trim()} onComplete={handlePrologueComplete} />
  }

  if (screen === 'game' && selectedSlot) {
    return (
      <GameApp
        key={gameKey}
        slotIndex={selectedSlot}
        apiKey={apiKey}
        setApiKey={handleApiKeyChange}
        bootKey={gameKey}
        onExitToMain={handleExitToMain}
        onReplayPrologue={handleReplayPrologue}
        onResetStory={handleResetStory}
        onWipeAll={handleWipeAll}
      />
    )
  }

  return <MainScreen onStart={handleStartFromMain} />
}
