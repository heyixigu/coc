import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MobileDrawer from '../components/MobileDrawer.jsx'
import { IconDice, IconMenu } from '../components/MobileIcons.jsx'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { useMobileGestures } from '../hooks/useMobileGestures.js'
import { useVisualViewportOffset } from '../hooks/useVisualViewportOffset.js'
import { getWorldById } from './config/sandbox_worlds.js'
import { SANDBOX_LOADING_PHRASES } from './config/sandbox_loading_phrases.js'
import { SANDBOX_SKILL_NAMES } from './config/sandbox_judge_prompt.js'
import { fetchValidatedSandboxGmReply } from './sandboxGmTurn.js'
import { mergeSandboxFromGmText } from './sandboxParseGmStatus.js'
import { runSandboxPlayerTurn } from './sandboxPlayerTurn.js'
import { runSandboxArchiveEvent } from './sandboxArchiveEvent.js'
import { rollbackSandboxExtractForTurn } from './sandboxExtractRollback.js'
import { runSandboxRollingSummary } from './sandboxRollingSummary.js'
import { runSandboxTurnSummary } from './sandboxTurnSummary.js'
import { runSandboxTypewriter } from './sandboxTypewriter.js'
import TimelineOverlay from './components/TimelineOverlay.jsx'
import { SandboxLeftPanelTabs, SandboxRightPanelTabs } from './components/SandboxSidePanels.jsx'
import {
  defaultPlayerInventory,
  inventoryToLegacyItemNames,
  loadEventTimeline,
  loadQuestState,
  loadSandboxSlot,
  loadWorldState,
  saveSandboxSlot,
} from './sandboxStorage.js'
import './SandboxGameApp.css'

const STAT_FLASH_MS = 1000
const T = {
  incomplete: '\u6c99\u76d2\u5b58\u6863\u6570\u636e\u4e0d\u5b8c\u6574\uff0c\u8bf7\u8fd4\u56de\u6a21\u5f0f\u9009\u62e9\u91cd\u65b0\u5f00\u59cb\u3002',
  sandbox: '\u6c99\u76d2',
  resetStory: '\u91cd\u7f6e\u6545\u4e8b',
  replayPrologue: '\u91cd\u65b0\u5e8f\u5e55',
  wipeAll: '\u6e05\u9664\u5b58\u6863',
  rolePanel: '\u89d2\u8272',
  connection: '\u8fde\u63a5',
  characterStatus: '\u89d2\u8272\u72b6\u6001',
  skills: '\u6280\u80fd',
  companions: '\u4f19\u4f34',
  otherGender: '\u5176\u4ed6',
  items: '\u7269\u54c1',
  none: '\u65e0',
  narrative: '\u53d9\u4e8b',
  timeline: '\u4e8b\u4ef6\u65f6\u95f4\u7ebf',
  keeper: '\u5b88\u5bc6\u4eba',
  system: '[\u7cfb\u7edf]',
  judging: '\u6b63\u5728\u5224\u5b9a\u68c0\u5b9a\u5e76\u6295\u9ab0\u2026\u2026',
  archiving: '\u6b63\u5728\u5c01\u6863\u2026\u2026',
  formatWarn: '\u5b88\u5bc6\u4eba\u56de\u590d\u683c\u5f0f\u5f02\u5e38\uff0c\u8bf7\u91cd\u65b0\u53d1\u9001',
  placeholder: '\u8f93\u5165\u4f60\u7684\u884c\u52a8\u2026\u2026',
  gmResponding: '\u5b88\u5bc6\u4eba\u6b63\u5728\u56de\u5e94\u2026\u2026',
  send: '\u53d1\u9001',
  diceLog: '\u6295\u9ab0\u8bb0\u5f55',
  rightPanel: '\u5192\u9669\u72b6\u6001',
  worldState: '\u4e16\u754c\u72b6\u6001',
  worldStateEmpty:
    '\u5192\u9669\u5f00\u59cb\u540e\u5c06\u81ea\u52a8\u8ffd\u8e2a\u4e16\u754c\u72b6\u6001',
  quests: '\u4efb\u52a1',
  questEmpty: '\u6682\u65e0\u4efb\u52a1',
  questMain: '\u4e3b\u7ebf',
  questSide: '\u652f\u7ebf',
  questCompleted: '\u5df2\u5b8c\u6210',
  questFailed: '\u5df2\u5931\u8d25',
  playerTab: '\u4e3b\u89d2',
  companionsTab: '\u89d2\u8272',
  basics: '\u57fa\u7840\u4fe1\u606f',
  equipped: '\u88c5\u5907\u680f',
  carried: '\u7269\u54c1\u680f',
  noEquipped: '\u6682\u65e0\u88c5\u5907',
  emptyBag: '\u80cc\u5305\u7a7a\u7a7a',
  worldTab: '\u4e16\u754c',
  questTab: '\u4efb\u52a1',
  diceTab: '\u9ab0\u5b50',
  factions: '\u52bf\u529b',
  locations: '\u5730\u70b9',
  environment: '\u73af\u5883',
  noFactions: '\u5c1a\u672a\u53d1\u73b0\u52bf\u529b',
  noLocations: '\u5c1a\u672a\u8bb0\u5f55\u5730\u70b9',
  noMainQuest: '\u6682\u65e0\u4e3b\u7ebf\u4efb\u52a1',
  noSideQuest: '\u6682\u65e0\u652f\u7ebf\u4efb\u52a1',
  questHistory: '\u5df2\u7ed3\u675f\u4efb\u52a1',
  empty: '\u6682\u65e0',
  diceEmptyLong:
    '\u6682\u65e0\u8bb0\u5f55\u3002\u88c1\u5224\u5224\u5b9a\u540e\u5c06\u81ea\u52a8\u6295\u9ab0\u5e76\u5728\u6b64\u663e\u793a\u3002',
  skillFallback: '\u6280\u80fd',
  rolled: '\u6295\u51fa\uff1a',
  arrow: '\u2192',
  dot: '\u00b7',
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function judgeClassName(o) {
  switch (o) {
    case 'extreme':
      return 'judge-extreme'
    case 'success':
      return 'judge-success'
    case 'fail':
      return 'judge-fail'
    case 'fumble':
      return 'judge-fumble'
    default:
      return ''
  }
}

/** @param {'up'|'down'|undefined} dir */
function statFlashClass(dir) {
  if (dir === 'down') return 'stat-flash-down'
  if (dir === 'up') return 'stat-flash-up'
  return ''
}

function safeItems(character) {
  return Array.isArray(character?.items) ? character.items : []
}

function safeSkillValue(character, skillName) {
  const v = character?.skills?.[skillName]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/**
 * @param {{
 *   slotIndex: number,
 *   apiKey: string,
 *   setApiKey?: (k: string) => void,
 *   bootKey?: number,
 *   onNavigateBack?: () => void,
 *   onResetStory?: () => void,
 *   onReplayPrologue?: () => void,
 *   onWipeAll?: () => void,
 * }} props
 */
export default function SandboxGameApp({
  slotIndex,
  apiKey,
  setApiKey,
  bootKey = 0,
  onNavigateBack,
  onResetStory,
  onReplayPrologue,
  onWipeAll,
}) {
  const initial = useMemo(() => loadSandboxSlot(slotIndex), [bootKey, slotIndex])
  const worldFull = useMemo(
    () => (initial.world ? getWorldById(initial.world.id) : null),
    [initial.world],
  )

  const [character, setCharacter] = useState(() => initial.character)
  const [companions, setCompanions] = useState(() => initial.companions ?? [])
  const [playerInventory, setPlayerInventory] = useState(
    () => initial.playerInventory ?? defaultPlayerInventory(),
  )
  const [leftTab, setLeftTab] = useState('player')
  const [rightTab, setRightTab] = useState('world')

  useEffect(() => {
    const hasActive = companions.some((c) => c.status === 'active')
    if (!hasActive && leftTab === 'companions') setLeftTab('player')
  }, [companions, leftTab])
  const [messages, setMessages] = useState(() => initial.messages ?? [])
  const [diceLog, setDiceLog] = useState(() => initial.diceLog ?? [])
  const [playerTurnCount, setPlayerTurnCount] = useState(() => initial.playerTurnCount ?? 0)
  const [consecutiveFails, setConsecutiveFails] = useState(() => initial.consecutiveFails ?? 0)
  const [lastFeedback, setLastFeedback] = useState(/** @type {null | 'like' | 'dislike'} */ (null))
  const [feedbackMsgId, setFeedbackMsgId] = useState(/** @type {string | null} */ (null))
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gmUiPhase, setGmUiPhase] = useState(null)
  const [gmLoadingPhrase, setGmLoadingPhrase] = useState(SANDBOX_LOADING_PHRASES[0])
  const [gmFormatWarning, setGmFormatWarning] = useState(false)
  const [judgingTurn, setJudgingTurn] = useState(false)
  const [statFlash, setStatFlash] = useState({})
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false)
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)
  const [turnSummaries, setTurnSummaries] = useState(() => initial.turnSummaries ?? [])
  const [archivedEvents, setArchivedEvents] = useState(() => initial.archivedEvents ?? [])
  const [eventIndex, setEventIndex] = useState(() => initial.eventIndex ?? 1)
  const [archiving, setArchiving] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [timelineEvents, setTimelineEvents] = useState(
    () => loadEventTimeline(slotIndex).events,
  )
  const [worldState, setWorldState] = useState(() => loadWorldState(slotIndex))
  const [questState, setQuestState] = useState(() => loadQuestState(slotIndex))
  const [expandedQuestIds, setExpandedQuestIds] = useState(() => new Set())

  const isMobile = useIsMobile()
  const summaryQueueRef = useRef(Promise.resolve())
  const flashClearRef = useRef(null)
  const latestRef = useRef({
    apiKey,
    character,
    companions,
    playerInventory,
    world: initial.world,
    messages,
    diceLog,
    playerTurnCount,
    consecutiveFails,
    turnSummaries,
    archivedEvents,
    eventIndex,
  })

  useVisualViewportOffset()

  latestRef.current = {
    apiKey,
    character,
    companions,
    playerInventory,
    world: worldFull
      ? { id: worldFull.id, name: worldFull.name, flavor: worldFull.flavor }
      : initial.world,
    messages,
    diceLog,
    playerTurnCount,
    consecutiveFails,
    turnSummaries,
    archivedEvents,
    eventIndex,
  }

  const persistSandboxToSlot = useCallback(
    (/** @type {{ gmId?: string, gmText?: string, messages?: typeof messages } | undefined} */ patch) => {
      const s = latestRef.current
      if (!s.character || !s.world) return
      const messagesOut =
        patch?.messages ??
        (patch?.gmId && patch.gmText != null
          ? s.messages.map((m) =>
              m.id === patch.gmId ? { ...m, content: patch.gmText } : m,
            )
          : s.messages)
      saveSandboxSlot(slotIndex, {
        character: {
          ...s.character,
          items: inventoryToLegacyItemNames(s.playerInventory ?? defaultPlayerInventory()),
          skills: s.character.skills ?? {},
        },
        world: s.world,
        messages: messagesOut,
        diceLog: s.diceLog,
        playerTurnCount: s.playerTurnCount,
        consecutiveFails: s.consecutiveFails,
        prologueComplete: true,
        turnSummaries: s.turnSummaries,
        archivedEvents: s.archivedEvents,
        eventIndex: s.eventIndex,
        companions: s.companions ?? [],
        playerInventory: s.playerInventory ?? defaultPlayerInventory(),
      })
    },
    [slotIndex],
  )

  const refreshExtractedState = useCallback(() => {
    setTimelineEvents(loadEventTimeline(slotIndex).events)
    setWorldState(loadWorldState(slotIndex))
    setQuestState(loadQuestState(slotIndex))
    const slot = loadSandboxSlot(slotIndex)
    setPlayerInventory(slot.playerInventory ?? defaultPlayerInventory())
    setCompanions(slot.companions ?? [])
    if (slot.character) {
      setCharacter({
        ...slot.character,
        items: safeItems(slot.character),
        skills: slot.character.skills ?? {},
      })
    }
  }, [slotIndex])

  const toggleQuestExpanded = useCallback((questId) => {
    setExpandedQuestIds((prev) => {
      const next = new Set(prev)
      if (next.has(questId)) next.delete(questId)
      else next.add(questId)
      return next
    })
  }, [])

  useEffect(() => {
    refreshExtractedState()
  }, [bootKey, slotIndex, refreshExtractedState])

  const handleNavigateBack = useCallback(() => {
    persistSandboxToSlot()
    onNavigateBack?.()
  }, [persistSandboxToSlot, onNavigateBack])

  const worldDisplayName = worldFull?.name ?? initial.world?.name ?? ''
  const worldSubtitle = worldFull?.subtitle ?? ''

  const inputLocked = gmUiPhase === 'loading' || gmUiPhase === 'typing'
  const inputDisabled = loading || inputLocked || archiving
  const inputPlaceholder = inputDisabled ? T.gmResponding : T.placeholder
  const mobileTopTitle = `${worldDisplayName} ${T.dot} ${character?.name ?? ''}`

  const openLeftDrawer = useCallback(() => {
    setRightDrawerOpen(false)
    setLeftDrawerOpen(true)
  }, [])

  const openRightDrawer = useCallback(() => {
    setLeftDrawerOpen(false)
    refreshExtractedState()
    setRightDrawerOpen(true)
  }, [refreshExtractedState])

  useMobileGestures({
    enabled: isMobile,
    leftOpen: leftDrawerOpen,
    rightOpen: rightDrawerOpen,
    miniCardOpen: false,
    onOpenLeft: openLeftDrawer,
    onOpenRight: openRightDrawer,
  })

  const updateCharacterStat = useCallback((key, raw) => {
    const n = Number.parseInt(String(raw), 10)
    const val = Number.isFinite(n) ? Math.max(0, n) : 0
    setCharacter((c) => (c ? { ...c, [key]: val } : c))
  }, [])

  useEffect(() => {
    if (gmUiPhase !== 'loading') return undefined
    let idx = 0
    setGmLoadingPhrase(SANDBOX_LOADING_PHRASES[0])
    const t = setInterval(() => {
      idx = (idx + 1) % SANDBOX_LOADING_PHRASES.length
      setGmLoadingPhrase(SANDBOX_LOADING_PHRASES[idx])
    }, 2000)
    return () => clearInterval(t)
  }, [gmUiPhase])

  useEffect(
    () => () => {
      if (flashClearRef.current) clearTimeout(flashClearRef.current)
    },
    [],
  )

  const applyCharacterFromGm = useCallback((gmText) => {
    const prev = latestRef.current.character
    if (!prev) return
    const prevCompanions = latestRef.current.companions ?? []
    const merged = mergeSandboxFromGmText(gmText, prev, prevCompanions)
    if (!merged) return
    const { character: nextChar, companions: nextCompanions } = merged
    const flash = {}
    if (nextChar.hp !== prev.hp) flash.hp = nextChar.hp > prev.hp ? 'up' : 'down'
    if (nextChar.mp !== prev.mp) flash.mp = nextChar.mp > prev.mp ? 'up' : 'down'
    setCharacter({
      ...nextChar,
      items: safeItems(nextChar),
      skills: nextChar.skills ?? {},
    })
    setCompanions(nextCompanions)
    setPlayerInventory((prev) => ({
      equipped: prev.equipped,
      carried: safeItems(nextChar).map((name) => ({
        name,
        description: '',
        quantity: 1,
      })),
    }))
    if (flash.hp || flash.mp) {
      setStatFlash(flash)
      if (flashClearRef.current) clearTimeout(flashClearRef.current)
      flashClearRef.current = setTimeout(() => setStatFlash({}), STAT_FLASH_MS)
    }
  }, [])

  const presentGm = useCallback(
    async ({
      apiKey: key,
      systemText,
      chain,
      baseMessages,
      gmId,
      gmTs,
      characterName,
      signal,
      feedback = null,
      onGmComplete,
    }) => {
      setGmFormatWarning(false)
      setGmUiPhase('loading')
      const result = await fetchValidatedSandboxGmReply({
        apiKey: key,
        systemText,
        chain,
        characterName,
        feedback,
        signal,
      })
      if (!result.ok) {
        setGmUiPhase(null)
        setGmFormatWarning(true)
        return false
      }
      applyCharacterFromGm(result.text)
      setGmUiPhase('typing')

      const gmPlaceholder = { id: gmId, role: 'gm', content: '', ts: gmTs }
      const withGmPlaceholder = [...baseMessages, gmPlaceholder]
      setMessages(withGmPlaceholder)

      try {
        await runSandboxTypewriter({
          text: result.text,
          signal,
          onUpdate: (partial) => {
            setMessages(
              withGmPlaceholder.map((m) =>
                m.id === gmId ? { ...m, content: partial } : m,
              ),
            )
          },
        })
      } catch (e) {
        if (e?.name === 'AbortError') throw e
        setGmUiPhase(null)
        return false
      }

      const finalMessages = withGmPlaceholder.map((m) =>
        m.id === gmId ? { ...m, content: result.text } : m,
      )
      setMessages(finalMessages)
      setGmUiPhase(null)
      persistSandboxToSlot({ messages: finalMessages })
      if (typeof onGmComplete === 'function') {
        onGmComplete(result.text)
      }
      return true
    },
    [applyCharacterFromGm, persistSandboxToSlot],
  )

  const enqueueRollingSummary = useCallback((n, m) => {
    summaryQueueRef.current = summaryQueueRef.current.then(() =>
      runSandboxRollingSummary({
        apiKey: latestRef.current.apiKey,
        n,
        m,
        getMessages: () => latestRef.current.messages,
        setMessages,
        getTurnSummaries: () => latestRef.current.turnSummaries,
        setTurnSummaries,
      }),
    )
  }, [])

  const onArchiveEvent = useCallback(
    async ({ apiKey: key, historyMessages, userMsg, gmId, gmTs }) => {
      setArchiving(true)
      try {
        const ok = await runSandboxArchiveEvent({
          apiKey: key,
          eventIndex: latestRef.current.eventIndex,
          messages: historyMessages,
          archivedEvents: latestRef.current.archivedEvents,
          userMsg,
          gmId,
          gmTs,
          setMessages,
          slotIndex,
          onArchiveComplete: (patch) => {
            setArchivedEvents(patch.archivedEvents)
            setTurnSummaries(patch.turnSummaries)
            setEventIndex(patch.eventIndex)
            setTimelineEvents([])
            persistSandboxToSlot()
          },
        })
        if (!ok) setError('封档生成失败，请稍后重试。')
        return !!ok
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return false
      } finally {
        setArchiving(false)
      }
    },
    [persistSandboxToSlot, slotIndex],
  )

  const runSandboxTurn = useCallback(
    async ({
      historyMessages,
      userMsg,
      gmId,
      gmTs,
      feedback = null,
      incrementTurnCount = true,
      regenerate = false,
    }) => {
      if (!character || !worldFull) return false
      setJudgingTurn(true)
      const factTurn = incrementTurnCount ? playerTurnCount + 1 : playerTurnCount
      const turnOk = await runSandboxPlayerTurn({
        apiKey: apiKey.trim(),
        historyMessages,
        userMsg,
        character: { ...character, items: safeItems(character), skills: character.skills ?? {} },
        world: worldFull,
        companions,
        gmId,
        gmTs,
        setMessages,
        setDiceLog,
        presentGm,
        consecutiveFails,
        onConsecutiveFailsChange: setConsecutiveFails,
        feedback,
        archivedEvents,
        onArchiveEvent,
        slotIndex,
        factTurn,
        onExtractComplete: refreshExtractedState,
        regenerate,
      })
      if (turnOk && incrementTurnCount) {
        setPlayerTurnCount((prev) => {
          const next = prev + 1
          if (next > 0 && next % 10 === 0) enqueueRollingSummary(next - 9, next)
          queueMicrotask(() => {
            void runSandboxTurnSummary({
              apiKey: apiKey.trim(),
              turn: next,
              messages: latestRef.current.messages,
              getTurnSummaries: () => latestRef.current.turnSummaries,
              setTurnSummaries,
              onPersist: () => persistSandboxToSlot(),
            })
          })
          return next
        })
        setFeedbackMsgId(gmId)
      } else if (turnOk && !incrementTurnCount) {
        persistSandboxToSlot()
      }
      return turnOk
    },
    [
      apiKey,
      character,
      worldFull,
      companions,
      presentGm,
      consecutiveFails,
      enqueueRollingSummary,
      archivedEvents,
      onArchiveEvent,
      persistSandboxToSlot,
      slotIndex,
      playerTurnCount,
      refreshExtractedState,
    ],
  )

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || inputDisabled || !character || !worldFull) return
    const feedback = lastFeedback
    setLoading(true)
    setError('')
    setGmFormatWarning(false)
    setLastFeedback(null)
    try {
      setInput('')
      const userMsg = { id: uid(), role: 'player', content: trimmed, ts: Date.now() }
      const gmId = uid()
      const gmTs = Date.now()
      const messagesWithPlayer = [...messages, userMsg]
      setMessages(messagesWithPlayer)
      const isArchiveCmd = trimmed === '事件结束，封档'
      await runSandboxTurn({
        historyMessages: messagesWithPlayer,
        userMsg,
        gmId,
        gmTs,
        feedback,
        incrementTurnCount: !isArchiveCmd,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setJudgingTurn(false)
      setGmUiPhase(null)
      setLoading(false)
    }
  }

  const handleFeedback = useCallback(
    (msgId, kind) => {
      if (loading || gmUiPhase) return
      if (lastFeedback === kind && feedbackMsgId === msgId) {
        setLastFeedback(null)
        setFeedbackMsgId(null)
      } else {
        setLastFeedback(kind)
        setFeedbackMsgId(msgId)
      }
    },
    [loading, gmUiPhase, lastFeedback, feedbackMsgId],
  )

  const handleRegenerate = useCallback(async () => {
    if (inputDisabled || !character || !worldFull) return

    let lastGmIndex = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'gm' && !messages[i].isSummary) {
        lastGmIndex = i
        break
      }
    }
    if (lastGmIndex < 0) return

    let lastPlayerIndex = -1
    for (let i = lastGmIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'player') {
        lastPlayerIndex = i
        break
      }
    }
    if (lastPlayerIndex < 0) return

    const playerMsg = messages[lastPlayerIndex]
    const historyMessages = messages.slice(0, lastPlayerIndex + 1)
    const cleanedDiceLog = diceLog.filter((d) => d.ts < playerMsg.ts)

    setLoading(true)
    setError('')
    setGmFormatWarning(false)
    setLastFeedback(null)
    setFeedbackMsgId(null)
    setMessages(historyMessages)
    setDiceLog(cleanedDiceLog)

    const rollbackTurn = playerTurnCount
    if (slotIndex != null && Number.isFinite(slotIndex)) {
      try {
        rollbackSandboxExtractForTurn(slotIndex, rollbackTurn)
        refreshExtractedState()
      } catch {
        /* */
      }
    }

    try {
      const gmId = uid()
      const gmTs = Date.now()
      await runSandboxTurn({
        historyMessages,
        userMsg: playerMsg,
        gmId,
        gmTs,
        feedback: null,
        incrementTurnCount: false,
        regenerate: true,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setJudgingTurn(false)
      setGmUiPhase(null)
      setLoading(false)
    }
  }, [
    inputDisabled,
    character,
    worldFull,
    messages,
    diceLog,
    runSandboxTurn,
    slotIndex,
    playerTurnCount,
    refreshExtractedState,
  ])

  if (!character || !worldFull) {
    return (
      <div className="app-root sandbox-app-root">
        <p className="muted" style={{ padding: '2rem' }}>
          {T.incomplete}
        </p>
      </div>
    )
  }

  const showJudgeWait = loading && judgingTurn && gmUiPhase == null && !archiving
  const showArchiving = archiving
  const showGmLoading = gmUiPhase === 'loading'
  const feedbackBusy = Boolean(loading || judgingTurn || gmUiPhase)

  const latestGmId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (!m.isSummary && m.role === 'gm') return m.id
    }
    return null
  }, [messages])

  const settingsBlock = (
    <label className="field">
      <span>API Key</span>
      <input
        type="password"
        autoComplete="off"
        value={apiKey}
        onChange={(e) => setApiKey?.(e.target.value)}
        placeholder={'sk-\u2026'}
        disabled={!setApiKey}
      />
    </label>
  )

  const statCard = (
    <SandboxStatCard character={character} flash={statFlash} onChange={updateCharacterStat} />
  )

  const panelLabels = {
    playerTab: T.playerTab,
    companionsTab: T.companionsTab,
    basics: T.basics,
    skills: T.skills,
    equipped: T.equipped,
    carried: T.carried,
    noEquipped: T.noEquipped,
    emptyBag: T.emptyBag,
    otherGender: T.otherGender,
    worldTab: T.worldTab,
    questTab: T.questTab,
    diceTab: T.diceTab,
    factions: T.factions,
    locations: T.locations,
    environment: T.environment,
    noFactions: T.noFactions,
    noLocations: T.noLocations,
    noMainQuest: T.noMainQuest,
    noSideQuest: T.noSideQuest,
    questHistory: T.questHistory,
    questMain: T.questMain,
    questSide: T.questSide,
    questCompleted: T.questCompleted,
    questFailed: T.questFailed,
  }

  const leftPanelTabs = (
    <SandboxLeftPanelTabs
      leftTab={leftTab}
      onLeftTabChange={setLeftTab}
      character={character}
      playerInventory={playerInventory}
      companions={companions}
      statCard={statCard}
      labels={panelLabels}
      safeSkillValue={safeSkillValue}
    />
  )

  const diceBlock = (
    <>
      {diceLog.length === 0 ? (
        <p className="muted small dice-log-empty">{T.diceEmptyLong}</p>
      ) : (
        <ul className="dice-log-list">
          {diceLog.map((e) => (
            <li key={e.id} className="dice-log-item">
              <span className="dice-log-skill">[{e.skillName || T.skillFallback}]</span>
              <span className="dice-log-roll">
                {' '}
                {T.rolled}
                {e.value}
              </span>
              {e.outcome != null && e.judgeText ? (
                <span className={`dice-log-outcome ${judgeClassName(e.outcome)}`}>
                  {' '}
                  {T.arrow} {e.judgeText}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  )

  const rightPanelBlock = (
    <SandboxRightPanelTabs
      rightTab={rightTab}
      onRightTabChange={setRightTab}
      worldState={worldState}
      questState={questState}
      expandedQuestIds={expandedQuestIds}
      onToggleQuest={toggleQuestExpanded}
      diceBlock={diceBlock}
      labels={panelLabels}
    />
  )

  const chatBlock = (
    <>
      <div className="chat-scroll">
        {messages
          .filter((m) => !m.isSummary)
          .map((m) => (
            <article
              key={m.id}
              className={`bubble bubble-${m.role}${m.isArchive ? ' bubble-archive' : ''}`}
            >
              <div className="bubble-meta">
                {m.role === 'gm'
                  ? T.keeper
                  : m.role === 'system'
                    ? T.system
                    : character.name}
                <time dateTime={new Date(m.ts).toISOString()}>
                  {new Date(m.ts).toLocaleString()}
                </time>
              </div>
              <div className="bubble-body">{m.content}</div>
              {m.role === 'gm' ? (
                <div className="gm-feedback-bar">
                  <button
                    type="button"
                    className={`gm-feedback-btn${lastFeedback === 'like' && feedbackMsgId === m.id ? ' is-active' : ''}`}
                    aria-label="点赞"
                    disabled={feedbackBusy}
                    onClick={() => handleFeedback(m.id, 'like')}
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    className={`gm-feedback-btn${lastFeedback === 'dislike' && feedbackMsgId === m.id ? ' is-active' : ''}`}
                    aria-label="点踩"
                    disabled={feedbackBusy}
                    onClick={() => handleFeedback(m.id, 'dislike')}
                  >
                    👎
                  </button>
                  {m.id === latestGmId ? (
                    <button
                      type="button"
                      className="gm-feedback-btn gm-feedback-btn--regen"
                      aria-label="重新生成"
                      disabled={feedbackBusy}
                      onClick={() => void handleRegenerate()}
                    >
                      🔄
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        {showJudgeWait ? (
          <div className="bubble bubble-gm pending">
            <div className="bubble-meta">{T.keeper}</div>
            <div className="bubble-body dim">{T.judging}</div>
          </div>
        ) : null}
        {showArchiving ? (
          <div className="bubble bubble-gm pending">
            <div className="bubble-meta">{T.keeper}</div>
            <div className="bubble-body dim">{T.archiving}</div>
          </div>
        ) : null}
        {showGmLoading ? (
          <div className="bubble bubble-gm pending">
            <div className="bubble-meta">{T.keeper}</div>
            <div className="bubble-body dim">{gmLoadingPhrase}</div>
          </div>
        ) : null}
      </div>
      {gmFormatWarning ? (
        <div className="inline-error gm-format-warning">{T.formatWarn}</div>
      ) : null}
      {error ? <div className="inline-error">{error}</div> : null}
    </>
  )

  const mobileLeftDrawer = (
    <>
      <h2 className="panel-heading">{T.connection}</h2>
      {settingsBlock}
      <p className="sandbox-char-world muted small">
        {worldDisplayName}
        {worldSubtitle ? ` ${T.dot} ${worldSubtitle}` : ''}
      </p>
      {leftPanelTabs}
    </>
  )

  const renderInputBar = (/** @type {'desktop'|'mobile'} */ variant) =>
    variant === 'mobile' ? (
      <>
        <textarea
          className="main-input main-input-mobile"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (!inputDisabled) void handleSend()
            }
          }}
          placeholder={inputPlaceholder}
          disabled={inputDisabled}
        />
        <button
          type="button"
          className="send-btn btn-touch"
          onClick={() => void handleSend()}
          disabled={inputDisabled}
        >
          {T.send}
        </button>
      </>
    ) : (
      <>
        <input
          type="text"
          className="main-input"
          value={input}
          disabled={inputDisabled}
          placeholder={inputPlaceholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
        />
        <button type="button" className="send-btn" disabled={inputDisabled} onClick={() => void handleSend()}>
          {T.send}
        </button>
      </>
    )

  return (
    <div className="app-root sandbox-app-root">
      <header className="sandbox-header layout-desktop">
        <div className="sandbox-header-row">
          <div>
            <h1 className="sandbox-header-title">
              {T.sandbox} {T.dot} {worldDisplayName}
            </h1>
            <p className="sandbox-header-sub">{character.name}</p>
          </div>
          <div className="app-header-actions">
            <button
              type="button"
              className="btn-header-secondary btn-touch sandbox-timeline-btn"
              aria-label={T.timeline}
              title={T.timeline}
              onClick={() => {
                refreshExtractedState()
                setShowTimeline(true)
              }}
            >
              📜
            </button>
            {onResetStory ? (
              <button type="button" className="btn-reset btn-touch" onClick={onResetStory}>
                {T.resetStory}
              </button>
            ) : null}
            {onReplayPrologue ? (
              <button
                type="button"
                className="btn-header-secondary btn-touch"
                onClick={onReplayPrologue}
              >
                {T.replayPrologue}
              </button>
            ) : null}
            {onWipeAll ? (
              <button type="button" className="btn-header-ghost btn-touch" onClick={onWipeAll}>
                {T.wipeAll}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="sandbox-layout layout-desktop">
        <aside className="sandbox-panel sandbox-panel-left">
          {onNavigateBack ? (
            <button
              type="button"
              className="btn-exit-main"
              aria-label="返回主界面"
              onClick={handleNavigateBack}
            >
              ←
            </button>
          ) : null}
          <div className="sandbox-panel-head">{T.rolePanel}</div>
          <div className="sandbox-panel-body sandbox-panel-body--tabs">
            <p className="sandbox-char-world muted small">
              {worldDisplayName}
              {worldSubtitle ? ` ${T.dot} ${worldSubtitle}` : ''}
            </p>
            {leftPanelTabs}
          </div>
        </aside>

        <main className="sandbox-panel sandbox-panel-center">
          <div className="sandbox-panel-head">{T.narrative}</div>
          {chatBlock}
          <div className="sandbox-footer layout-desktop">{renderInputBar('desktop')}</div>
        </main>

        <aside className="sandbox-panel sandbox-panel-right">
          <div className="sandbox-panel-body sandbox-panel-body--split">{rightPanelBlock}</div>
        </aside>
      </div>

      <header className="mobile-top-bar layout-mobile">
        {onNavigateBack ? (
          <button
            type="button"
            className="btn-exit-main btn-touch mobile-exit-trigger"
            aria-label="返回主界面"
            onClick={handleNavigateBack}
          >
            ←
          </button>
        ) : null}
        <button
          type="button"
          className="mobile-drawer-trigger btn-touch"
          aria-label={T.rolePanel}
          aria-expanded={leftDrawerOpen}
          onClick={() => (leftDrawerOpen ? setLeftDrawerOpen(false) : openLeftDrawer())}
        >
          <IconMenu className="mobile-drawer-trigger__glyph" />
        </button>
        <h1 className="mobile-top-title">{mobileTopTitle}</h1>
        <button
          type="button"
          className="mobile-drawer-trigger btn-touch"
          aria-label={T.timeline}
          title={T.timeline}
          onClick={() => {
            refreshExtractedState()
            setShowTimeline(true)
          }}
        >
          📜
        </button>
        <button
          type="button"
          className="mobile-drawer-trigger btn-touch"
          aria-label={T.rightPanel}
          title={T.rightPanel}
          aria-expanded={rightDrawerOpen}
          onClick={() => (rightDrawerOpen ? setRightDrawerOpen(false) : openRightDrawer())}
        >
          <IconDice className="mobile-drawer-trigger__glyph" />
        </button>
      </header>

      <div className="mobile-shell layout-mobile">
        <main className="mobile-main panel-center">{chatBlock}</main>
      </div>

      <footer className="mobile-input-wrap layout-mobile sandbox-mobile-input">
        {renderInputBar('mobile')}
      </footer>

      <MobileDrawer side="left" open={leftDrawerOpen} onClose={() => setLeftDrawerOpen(false)}>
        {mobileLeftDrawer}
      </MobileDrawer>

      <MobileDrawer side="right" open={rightDrawerOpen} onClose={() => setRightDrawerOpen(false)}>
        <div className="sandbox-mobile-right-drawer">
          <h2 className="panel-heading">{T.rightPanel}</h2>
          {rightPanelBlock}
        </div>
      </MobileDrawer>

      {showTimeline ? (
        <TimelineOverlay events={timelineEvents} onClose={() => setShowTimeline(false)} />
      ) : null}
    </div>
  )
}
