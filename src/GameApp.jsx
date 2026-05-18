import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { INIT_USER_MESSAGE } from './config/characters.js'
import { buildGmSystemPrompt } from './config/system_prompt.js'
import { runArchiveEvent } from './archiveEvent.js'
import { parseCharacterInitJson } from './characterInit.js'
import { postChatNonStream } from './deepseek.js'
import { runPlayerTurn } from './playerTurn.js'
import { runActOneStream } from './startActOne.js'
import { mergeRosterFromGmText } from './syncRosterFromGm.js'
import { mergeInventoryFromGmText } from './syncInventoryFromGm.js'
import CharacterPhotoFrame from './components/CharacterPhotoFrame.jsx'
import MobileDrawer from './components/MobileDrawer.jsx'
import PartnerAvatarButton from './components/PartnerAvatarButton.jsx'
import PartnerMiniCard from './components/PartnerMiniCard.jsx'
import { useIsMobile } from './hooks/useIsMobile.js'
import { useMobileGestures } from './hooks/useMobileGestures.js'
import { useSpriteState } from './hooks/useSpriteState.js'
import { useVisualViewportOffset } from './hooks/useVisualViewportOffset.js'
import { GM_LOADING_PHRASES } from './config/gmLoadingPhrases.js'
import { fetchValidatedGmReply } from './gmTurn.js'
import { runRollingSummary } from './rollingSummary.js'
import { runTurnSummary } from './turnSummary.js'
import { defaultCocGameState, loadSlot, saveSlot } from './storage.js'
import { runTypewriter } from './typewriter.js'
import './App.css'

const STAT_FLASH_MS = 1000

const FALLBACK_ROLL_SKILL = 50

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

/**
 * @param {{ slotIndex: number, apiKey: string, setApiKey: (k: string) => void, bootKey?: number, onNavigateBack?: () => void, onReplayPrologue?: () => void, onResetStory?: () => void, onWipeAll?: () => void }} props
 */
export default function GameApp({
  slotIndex,
  apiKey,
  setApiKey,
  bootKey = 0,
  onNavigateBack,
  onReplayPrologue,
  onResetStory,
  onWipeAll,
}) {
  const initial = useMemo(() => loadSlot(slotIndex), [bootKey, slotIndex])
  const [player, setPlayer] = useState(() => initial.player)
  const [partner, setPartner] = useState(() => initial.partner)
  const [messages, setMessages] = useState(() => initial.messages)
  const [diceLog, setDiceLog] = useState(() => initial.diceLog ?? [])
  const [pendingChecks, setPendingChecks] = useState(/** @type {import('./skillJudge.js').SkillCheck[]} */ ([]))
  const [playerTurnCount, setPlayerTurnCount] = useState(() => initial.playerTurnCount ?? 0)
  const [playerItems, setPlayerItems] = useState(() => initial.playerItems ?? [])
  const [partnerItems, setPartnerItems] = useState(() => initial.partnerItems ?? [])
  const [sceneItems, setSceneItems] = useState(() => initial.sceneItems ?? [])
  const [itemDisplay, setItemDisplay] = useState(() => ({
    player: initial.playerItems ?? [],
    partner: initial.partnerItems ?? [],
    scene: initial.sceneItems ?? [],
  }))
  const [itemFlash, setItemFlash] = useState(/** @type {{ player: Record<string, 'up'|'down'>, partner: Record<string, 'up'|'down'>, scene: Record<string, 'up'|'down'> }} */ ({
    player: {},
    partner: {},
    scene: {},
  }))
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gmUiPhase, setGmUiPhase] = useState(/** @type {null | 'loading' | 'typing'} */ (null))
  const [gmLoadingPhrase, setGmLoadingPhrase] = useState(GM_LOADING_PHRASES[0])
  const [gmFormatWarning, setGmFormatWarning] = useState(false)
  const actOnePending =
    !!initial.player &&
    !!initial.partner &&
    (initial.messages?.length ?? 0) === 0 &&
    !!initial.selectedScenario

  const [bootstrapPhase, setBootstrapPhase] = useState(() =>
    initial.messages?.length > 0 ? 'ready' : actOnePending ? 'idle' : 'idle',
  )
  const [inputLocked, setInputLocked] = useState(() => initial.messages?.length === 0)
  const [selectedScenario, setSelectedScenario] = useState(() => initial.selectedScenario)
  const [bootstrapFatal, setBootstrapFatal] = useState(false)
  const [judgingTurn, setJudgingTurn] = useState(false)
  const [statFlash, setStatFlash] = useState(/** @type {{ player: Record<string, 'up'|'down'>, partner: Record<string, 'up'|'down'> }} */ ({
    player: {},
    partner: {},
  }))
  const [scenarioTitle] = useState(() => initial.scenarioTitle || null)
  const [turnSummaries, setTurnSummaries] = useState(() => initial.turnSummaries ?? [])
  const [archivedEvents, setArchivedEvents] = useState(() => initial.archivedEvents ?? [])
  const [eventIndex, setEventIndex] = useState(() => initial.eventIndex ?? 1)
  const [archiving, setArchiving] = useState(false)
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false)
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)
  const [partnerCardOpen, setPartnerCardOpen] = useState(false)
  const isMobile = useIsMobile()
  const partnerCardRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  useVisualViewportOffset()

  const chatEndRef = useRef(null)
  const bootingRef = useRef(false)
  const flashClearRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const itemFlashClearRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const summaryQueueRef = useRef(/** @type {Promise<void>} */ (Promise.resolve()))
  const bootstrapAbortRef = useRef(/** @type {AbortController | null} */ (null))
  const latestRef = useRef({
    apiKey,
    player,
    partner,
    messages,
    diceLog,
    selectedScenario,
    scenarioTitle,
    playerTurnCount,
    playerItems,
    partnerItems,
    sceneItems,
    turnSummaries,
    archivedEvents,
    eventIndex,
  })
  latestRef.current = {
    apiKey,
    player,
    partner,
    messages,
    diceLog,
    selectedScenario,
    scenarioTitle,
    playerTurnCount,
    playerItems,
    partnerItems,
    sceneItems,
    turnSummaries,
    archivedEvents,
    eventIndex,
  }

  const persistGameToSlot = useCallback(
    (/** @type {{ gmId?: string, gmText?: string } | undefined} */ patch) => {
      const s = latestRef.current
      const messagesOut =
        patch?.gmId && patch.gmText != null
          ? s.messages.map((m) =>
              m.id === patch.gmId ? { ...m, content: patch.gmText } : m,
            )
          : s.messages
      saveSlot(slotIndex, {
        player: s.player,
        partner: s.partner,
        messages: messagesOut,
        diceLog: s.diceLog,
        prologueComplete: true,
        selectedScenario: s.selectedScenario,
        scenarioTitle: s.scenarioTitle,
        playerTurnCount: s.playerTurnCount,
        playerItems: s.playerItems,
        partnerItems: s.partnerItems,
        sceneItems: s.sceneItems,
        turnSummaries: s.turnSummaries,
        archivedEvents: s.archivedEvents,
        eventIndex: s.eventIndex,
      })
    },
    [slotIndex],
  )

  const handleNavigateBack = useCallback(() => {
    persistGameToSlot()
    onNavigateBack?.()
  }, [persistGameToSlot, onNavigateBack])

  const getInventory = useCallback(
    () => ({
      playerItems: latestRef.current.playerItems,
      partnerItems: latestRef.current.partnerItems,
      sceneItems: latestRef.current.sceneItems,
    }),
    [],
  )

  const enqueueRollingSummary = useCallback((n, m) => {
    summaryQueueRef.current = summaryQueueRef.current.then(() =>
      runRollingSummary({
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
    async ({ apiKey: key, snap, userMsg, gmId, gmTs }) => {
      setArchiving(true)
      try {
        const ok = await runArchiveEvent({
          apiKey: key,
          eventIndex: latestRef.current.eventIndex,
          messages: [...snap, userMsg],
          archivedEvents: latestRef.current.archivedEvents,
          userMsg,
          gmId,
          gmTs,
          setMessages,
          onArchiveComplete: (patch) => {
            setArchivedEvents(patch.archivedEvents)
            setTurnSummaries(patch.turnSummaries)
            setEventIndex(patch.eventIndex)
            persistGameToSlot()
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
    [persistGameToSlot],
  )

  const applyRosterFromGmText = useCallback((gmText) => {
    const merged = mergeRosterFromGmText(gmText, latestRef.current.player, latestRef.current.partner)
    if (merged) {
      setPlayer(merged.player)
      setPartner(merged.partner)
      const hasStatFlash =
        Object.keys(merged.flash.player).length > 0 || Object.keys(merged.flash.partner).length > 0
      if (hasStatFlash) {
        if (flashClearRef.current) clearTimeout(flashClearRef.current)
        setStatFlash(merged.flash)
        flashClearRef.current = setTimeout(() => {
          setStatFlash({ player: {}, partner: {} })
          flashClearRef.current = null
        }, STAT_FLASH_MS)
      }
    }

    const invMerged = mergeInventoryFromGmText(
      gmText,
      latestRef.current.playerItems,
      latestRef.current.partnerItems,
      latestRef.current.sceneItems,
    )
    if (!invMerged) return

    setPlayerItems(invMerged.playerItems)
    setPartnerItems(invMerged.partnerItems)
    setSceneItems(invMerged.sceneItems)
    setItemDisplay({
      player: invMerged.playerView.display,
      partner: invMerged.partnerView.display,
      scene: invMerged.sceneView.display,
    })

    const hasItemFlash =
      Object.keys(invMerged.playerView.flash).length > 0 ||
      Object.keys(invMerged.partnerView.flash).length > 0 ||
      Object.keys(invMerged.sceneView.flash).length > 0

    if (hasItemFlash) {
      if (itemFlashClearRef.current) clearTimeout(itemFlashClearRef.current)
      setItemFlash({
        player: invMerged.playerView.flash,
        partner: invMerged.partnerView.flash,
        scene: invMerged.sceneView.flash,
      })
      itemFlashClearRef.current = setTimeout(() => {
        setItemFlash({ player: {}, partner: {}, scene: {} })
        setItemDisplay({
          player: invMerged.playerItems,
          partner: invMerged.partnerItems,
          scene: invMerged.sceneItems,
        })
        itemFlashClearRef.current = null
      }, STAT_FLASH_MS)
    } else {
      setItemDisplay({
        player: invMerged.playerItems,
        partner: invMerged.partnerItems,
        scene: invMerged.sceneItems,
      })
    }
  }, [])

  const presentGm = useCallback(
    async ({ apiKey, systemText, chain, gmId, gmTs, signal }) => {
      setGmFormatWarning(false)
      setGmUiPhase('loading')

      const result = await fetchValidatedGmReply({
        apiKey,
        systemText,
        chain,
        signal,
      })

      if (!result.ok) {
        setGmUiPhase(null)
        setGmFormatWarning(true)
        return false
      }

      applyRosterFromGmText(result.text)
      setGmUiPhase('typing')
      setMessages((prev) => {
        const rest = prev.filter((m) => m.id !== gmId)
        return [...rest, { id: gmId, role: 'gm', content: '', ts: gmTs }]
      })

      try {
        await runTypewriter({
          text: result.text,
          signal,
          onUpdate: (partial) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === gmId ? { ...m, content: partial } : m)),
            )
          },
        })
      } catch (e) {
        if (e?.name === 'AbortError') throw e
        setGmUiPhase(null)
        return false
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === gmId ? { ...m, content: result.text } : m)),
      )
      setGmUiPhase(null)
      persistGameToSlot({ gmId, gmText: result.text })
      return true
    },
    [applyRosterFromGmText, persistGameToSlot],
  )

  useEffect(() => {
    if (gmUiPhase !== 'loading') return undefined
    let idx = 0
    setGmLoadingPhrase(GM_LOADING_PHRASES[0])
    const t = setInterval(() => {
      idx = (idx + 1) % GM_LOADING_PHRASES.length
      setGmLoadingPhrase(GM_LOADING_PHRASES[idx])
    }, 2000)
    return () => clearInterval(t)
  }, [gmUiPhase])

  useEffect(() => {
    return () => {
      if (flashClearRef.current) clearTimeout(flashClearRef.current)
      if (itemFlashClearRef.current) clearTimeout(itemFlashClearRef.current)
    }
  }, [])

  const rosterReady = !!(player && partner)

  useEffect(() => {
    const isMobileViewport = window.matchMedia('(max-width: 768px)').matches
    const scroll = document.querySelector(
      isMobileViewport ? '.mobile-main .chat-scroll' : '.layout-desktop.panel-center .chat-scroll',
    )
    if (scroll) scroll.scrollTop = scroll.scrollHeight
    else chatEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages, loading, gmUiPhase])

  const resetStory = useCallback(() => {
    if (
      !window.confirm(
        '确定要重置故事吗？对话、骰子记录与角色数值将被清除；将回到模式选择，并保留 API Key 与所选模式。',
      )
    ) {
      return
    }
    if (onResetStory) {
      onResetStory()
      return
    }
    const d = defaultCocGameState()
    setMessages(d.messages)
    setDiceLog(d.diceLog)
    setPendingChecks([])
    setPlayerTurnCount(0)
    setPlayerItems(d.playerItems)
    setPartnerItems(d.partnerItems)
    setSceneItems(d.sceneItems)
    setItemDisplay({ player: [], partner: [], scene: [] })
    setItemFlash({ player: {}, partner: {}, scene: {} })
    setPlayer(d.player)
    setPartner(d.partner)
    setInput('')
    setError('')
    setGmUiPhase(null)
    setGmFormatWarning(false)
    setBootstrapPhase('idle')
    setInputLocked(true)
    setBootstrapFatal(false)
    setStatFlash({ player: {}, partner: {} })
    setSelectedScenario(null)
    setLeftDrawerOpen(false)
    setRightDrawerOpen(false)
    setPartnerCardOpen(false)
  }, [onResetStory])

  const updatePlayerStat = useCallback((key, raw) => {
    const n = Number.parseInt(String(raw), 10)
    const val = Number.isFinite(n) ? Math.max(0, n) : 0
    setPlayer((p) => (p ? { ...p, [key]: val } : p))
  }, [])

  const updatePartnerStat = useCallback((key, raw) => {
    const n = Number.parseInt(String(raw), 10)
    const val = Number.isFinite(n) ? Math.max(0, n) : 0
    setPartner((q) => (q ? { ...q, [key]: val } : q))
  }, [])

  useEffect(() => {
    const { player: p0, partner: q0, messages: m0, selectedScenario: sc0 } = latestRef.current
    if (p0 && q0 && m0.length > 0) {
      setBootstrapPhase('ready')
      setInputLocked(false)
      return undefined
    }

    const key = apiKey.trim()
    if (!key || bootstrapFatal) {
      if (!key) setBootstrapPhase('idle')
      return undefined
    }

    const ac = new AbortController()
    bootstrapAbortRef.current = ac
    const t = setTimeout(() => {
      void (async () => {
        if (ac.signal.aborted || bootingRef.current) return
        const snap = latestRef.current
        if (snap.player && snap.partner && snap.messages.length > 0) {
          setBootstrapPhase('ready')
          setInputLocked(false)
          return
        }
        if (!latestRef.current.apiKey.trim()) return

        bootingRef.current = true
        setLoading(true)
        setInputLocked(true)
        setError('')

        let pChar = snap.player
        let qChar = snap.partner
        let scenario = snap.selectedScenario

        try {
          if (!pChar || !qChar) {
            setBootstrapPhase('init')
            const raw = await postChatNonStream({
              apiKey: key,
              messages: [
                { role: 'system', content: buildGmSystemPrompt(latestRef.current.archivedEvents) },
                { role: 'user', content: INIT_USER_MESSAGE },
              ],
              signal: ac.signal,
            })
            const pair = parseCharacterInitJson(raw)
            pChar = pair.player
            qChar = pair.partner
            setPlayer(pChar)
            setPartner(qChar)
          }

          if (latestRef.current.messages.length > 0) {
            setBootstrapPhase('ready')
            setInputLocked(false)
            return
          }

          if (!scenario) {
            setBootstrapPhase('ready')
            setInputLocked(false)
            return
          }

          setBootstrapPhase('opening')
          const gmId = uid()
          const gmTs = Date.now()

          const actOk = await runActOneStream({
            apiKey: key,
            scenario,
            gmId,
            gmTs,
            presentGm,
            getInventory,
            archivedEvents: latestRef.current.archivedEvents,
            signal: ac.signal,
          })

          setSelectedScenario(null)
          setBootstrapPhase('ready')
          if (actOk) setInputLocked(false)
        } catch (e) {
          if (e?.name === 'AbortError') return
          setError(e instanceof Error ? e.message : String(e))
          setBootstrapFatal(true)
          setBootstrapPhase('error')
          setMessages([])
          setInputLocked(true)
        } finally {
          setGmUiPhase(null)
          setLoading(false)
          bootingRef.current = false
          bootstrapAbortRef.current = null
        }
      })()
    }, 480)

    return () => {
      ac.abort()
      clearTimeout(t)
      bootstrapAbortRef.current = null
    }
  }, [apiKey, bootstrapFatal, presentGm, getInventory])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed) return
    if (inputLocked) return
    if (!apiKey.trim()) {
      setError('请先在左侧填写 DeepSeek API Key。')
      return
    }

    if (!rosterReady) {
      setError('角色数据尚未就绪，请稍候初始化或刷新页面。')
      return
    }

    const snap = [...messages]

    setLoading(true)
    setError('')
    setGmFormatWarning(false)

    try {
      setInput('')
      const userMsg = { id: uid(), role: 'player', content: trimmed, ts: Date.now() }
      const gmId = uid()
      const gmTs = Date.now()

      setMessages([...snap, userMsg])
      setJudgingTurn(true)
      setPendingChecks([])

      const isArchiveCmd = trimmed === '事件结束，封档'
      const completedTurn = playerTurnCount + 1

      const turnOk = await runPlayerTurn({
        apiKey: apiKey.trim(),
        snap,
        userMsg,
        gmId,
        gmTs,
        setMessages,
        setDiceLog,
        setPendingChecks,
        presentGm,
        getInventory,
        fallbackSkill: FALLBACK_ROLL_SKILL,
        archivedEvents,
        onArchiveEvent,
      })

      if (turnOk) {
        if (!isArchiveCmd) {
          setPlayerTurnCount((prev) => {
            const next = prev + 1
            if (next > 0 && next % 10 === 0) {
              enqueueRollingSummary(next - 9, next)
            }
            return next
          })
          queueMicrotask(() => {
            void runTurnSummary({
              apiKey: apiKey.trim(),
              turn: completedTurn,
              messages: latestRef.current.messages,
              getTurnSummaries: () => latestRef.current.turnSummaries,
              setTurnSummaries,
              onPersist: () => persistGameToSlot(),
            })
          })
        } else {
          persistGameToSlot()
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setJudgingTurn(false)
      setPendingChecks([])
      setGmUiPhase(null)
      setLoading(false)
    }
  }

  const playerLabel = player?.name || '何以惜顾'
  const showInitWait = loading && bootstrapPhase === 'init'
  const showJudgeWait = loading && judgingTurn && gmUiPhase == null && !archiving
  const showGmLoading = gmUiPhase === 'loading'
  const showArchiving = archiving
  const inputDisabled =
    loading ||
    inputLocked ||
    archiving ||
    gmUiPhase === 'loading' ||
    gmUiPhase === 'typing'
  const headerTitle = scenarioTitle || '秘仪残卷'
  const openLeftDrawer = useCallback(() => {
    setRightDrawerOpen(false)
    setPartnerCardOpen(false)
    setLeftDrawerOpen(true)
  }, [])

  const openRightDrawer = useCallback(() => {
    setLeftDrawerOpen(false)
    setPartnerCardOpen(false)
    setRightDrawerOpen(true)
  }, [])

  useMobileGestures({
    enabled: isMobile,
    leftOpen: leftDrawerOpen,
    rightOpen: rightDrawerOpen,
    miniCardOpen: partnerCardOpen,
    onOpenLeft: openLeftDrawer,
    onOpenRight: openRightDrawer,
    onCloseMiniCard: () => setPartnerCardOpen(false),
    miniCardRef: partnerCardRef,
  })

  const inputPlaceholder = archiving
    ? '正在封档……'
    : inputLocked
      ? '等待开场白完成后再输入行动……'
      : '以调查员身份输入行动、对白或检定说明……'

  const chatBlock = (
    <>
      <div className="chat-scroll">
        {messages.length === 0 && !showGmLoading && (
          <p className="chat-empty">
            发送行动后，守密人将根据检定结果与当前状态生成四段式回复，并以打字机效果呈现。
          </p>
        )}
        {messages
          .filter((m) => !m.isSummary)
          .map((m) => (
          <article
            key={m.id}
            className={`bubble bubble-${m.role}${m.isArchive ? ' bubble-archive' : ''}`}
          >
            <div className="bubble-meta">
              {m.role === 'gm' ? '守密人' : m.role === 'system' ? '[系统]' : playerLabel}
              <time dateTime={new Date(m.ts).toISOString()}>{new Date(m.ts).toLocaleString()}</time>
            </div>
            <div className="bubble-body">{m.content}</div>
          </article>
        ))}
        {showInitWait && (
          <div className="bubble bubble-gm pending">
            <div className="bubble-meta">守密人</div>
            <div className="bubble-body dim">正在确认角色与规则（JSON）……</div>
          </div>
        )}
        {showJudgeWait && (
          <div className="bubble bubble-gm pending">
            <div className="bubble-meta">守密人</div>
            <div className="bubble-body dim">正在判定检定并掷骰……</div>
          </div>
        )}
        {showArchiving && (
          <div className="bubble bubble-gm pending">
            <div className="bubble-meta">守密人</div>
            <div className="bubble-body dim">正在封档……</div>
          </div>
        )}
        {showGmLoading && (
          <div className="bubble bubble-gm pending">
            <div className="bubble-meta">守密人</div>
            <div className="bubble-body dim">{gmLoadingPhrase}</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      {gmFormatWarning ? (
        <div className="inline-error gm-format-warning">⚠️ 守密人回复格式异常，请重新发送</div>
      ) : null}
      {error ? <div className="inline-error">{error}</div> : null}
    </>
  )

  const rosterBlock = !rosterReady ? (
    <p className="muted small roster-hint">
      正在生成第一幕；若长时间无响应请检查 API Key 或点击「重置故事」。
    </p>
  ) : (
    <>
      {player ? <PlayerCard player={player} flash={statFlash.player} onChange={updatePlayerStat} /> : null}
      {partner ? <PartnerCard partner={partner} flash={statFlash.partner} onChange={updatePartnerStat} /> : null}
      <InventoryPanel itemDisplay={itemDisplay} itemFlash={itemFlash} />
    </>
  )

  const diceBlock = (
    <>
      {pendingChecks.length > 0 ? (
        <ul className="dice-pending-list">
          {pendingChecks.map((c) => (
            <li key={`${c.skill}-${c.value}`} className="dice-pending-item">
              待检定：[{c.skill}] {c.value}%
            </li>
          ))}
        </ul>
      ) : null}
      {diceLog.length === 0 ? (
        <p className="muted small dice-log-empty">暂无记录。裁判判定后将自动掷骰并在此显示。</p>
      ) : (
        <ul className="dice-log-list">
          {diceLog.map((e) => (
            <li key={e.id} className="dice-log-item">
              <span className="dice-log-skill">[{e.skillName}]</span>
              <span className="dice-log-roll"> 投出：{e.value}</span>
              {e.outcome != null && e.judgeText ? (
                <span className={`dice-log-outcome ${judgeClassName(e.outcome)}`}> → {e.judgeText}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  )

  const spriteState = useSpriteState({
    inputLocked,
    gmUiPhase,
    loading,
    judgingTurn,
    statFlash,
  })

  const rightPanelBody = (
    <>
      <div className="panel-right-scroll">
        <h2 className="panel-heading">骰子记录</h2>
        {diceBlock}
      </div>
      <CharacterPhotoFrame spriteState={spriteState} />
    </>
  )

  const mobileDicePanel = (
    <>
      <h2 className="panel-heading">骰子记录</h2>
      {diceBlock}
    </>
  )

  const settingsBlock = (
    <>
      <label className="field">
        <span>API Key</span>
        <input
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value)
            setBootstrapFatal(false)
          }}
          placeholder="sk-…"
        />
      </label>
      {bootstrapFatal ? (
        <p className="muted small">初始化失败后，请检查 Key 或网络，修改 Key 后将自动重试。</p>
      ) : null}
    </>
  )

  const mobileLeftDrawer = (
    <>
      <h2 className="panel-heading">连接</h2>
      {settingsBlock}
      <h2 className="panel-heading">角色状态</h2>
      {rosterBlock}
      <div className="mobile-drawer-actions">
        {onReplayPrologue ? (
          <button type="button" className="btn-header-secondary btn-touch" onClick={onReplayPrologue}>
            重新序幕
          </button>
        ) : null}
        <button type="button" className="btn-reset btn-touch" onClick={resetStory}>
          重置故事
        </button>
        {onWipeAll ? (
          <button type="button" className="btn-header-ghost btn-touch" onClick={onWipeAll}>
            清除存档
          </button>
        ) : null}
      </div>
    </>
  )

  const renderInputBar = (/** @type {'desktop'|'mobile'} */ variant) =>
    variant === 'mobile' ? (
      <>
        <PartnerAvatarButton
          spriteState={spriteState}
          onClick={() => {
            setLeftDrawerOpen(false)
            setRightDrawerOpen(false)
            setPartnerCardOpen(true)
          }}
        />
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
          发送
        </button>
      </>
    ) : (
      <>
        <textarea
          className="main-input"
          rows={2}
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
          className="send-btn"
          onClick={() => void handleSend()}
          disabled={inputDisabled}
        >
          发送
        </button>
      </>
    )

  return (
    <div className="app-root">
      <header className="app-header layout-desktop">
        <div className="app-header-row">
          <div className="app-header-titles">
            <h1 className="app-title">秘仪残卷 · CoC 模拟台</h1>
            <p className="app-sub">本地存档 · DeepSeek · 非流式 · 打字机呈现</p>
          </div>
          <div className="app-header-actions">
            {onReplayPrologue ? (
              <button type="button" className="btn-header-secondary" onClick={onReplayPrologue}>
                重新序幕
              </button>
            ) : null}
            <button type="button" className="btn-reset" onClick={resetStory}>
              重置故事
            </button>
            {onWipeAll ? (
              <button type="button" className="btn-header-ghost" onClick={onWipeAll}>
                清除存档
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="app-main layout-desktop">
        <div className="app-grid">
          <aside className="panel panel-left">
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
            <h2 className="panel-heading">连接</h2>
            {settingsBlock}
            <h2 className="panel-heading">角色状态</h2>
            {rosterBlock}
          </aside>

          <main className="panel panel-center">{chatBlock}</main>

          <aside className="panel panel-right panel-right--with-portraits">{rightPanelBody}</aside>
        </div>
      </div>

      <footer className="input-bar layout-desktop">{renderInputBar('desktop')}</footer>

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
          aria-label="角色与物品"
          aria-expanded={leftDrawerOpen}
          onClick={() => (leftDrawerOpen ? setLeftDrawerOpen(false) : openLeftDrawer())}
        >
          <span className="mobile-drawer-trigger__glyph" aria-hidden>
            ≡
          </span>
        </button>
        <h1 className="mobile-top-title">{headerTitle}</h1>
        <button
          type="button"
          className="mobile-drawer-trigger btn-touch"
          aria-label="骰子记录"
          aria-expanded={rightDrawerOpen}
          onClick={() => (rightDrawerOpen ? setRightDrawerOpen(false) : openRightDrawer())}
        >
          <span className="mobile-drawer-trigger__glyph" aria-hidden>
            ⚄
          </span>
        </button>
      </header>

      <div className="mobile-shell layout-mobile">
        <main className="mobile-main panel-center">{chatBlock}</main>
        <div className="mobile-input-wrap layout-mobile">{renderInputBar('mobile')}</div>
      </div>

      <MobileDrawer side="left" open={leftDrawerOpen} onClose={() => setLeftDrawerOpen(false)}>
        {mobileLeftDrawer}
      </MobileDrawer>

      <MobileDrawer side="right" open={rightDrawerOpen} onClose={() => setRightDrawerOpen(false)}>
        {mobileDicePanel}
      </MobileDrawer>

      <PartnerMiniCard
        open={partnerCardOpen}
        onClose={() => setPartnerCardOpen(false)}
        spriteState={spriteState}
        partner={partner}
        cardRef={partnerCardRef}
      />

    </div>
  )
}

/** @param {'up'|'down'|undefined} dir */
function statFlashClass(dir) {
  if (dir === 'down') return 'stat-flash-down'
  if (dir === 'up') return 'stat-flash-up'
  return ''
}

/** @param {{ partner: { name: string, hp: number, mp: number, san: number }, flash?: Record<string, 'up'|'down'>, onChange: (k: string, v: string) => void }} props */
function PartnerCard({ partner, flash = {}, onChange }) {
  return (
    <section className="char-card">
      <h3>{partner.name}</h3>
      <div className="stat-row">
        <label>
          HP
          <input
            type="number"
            min={0}
            className={statFlashClass(flash.hp)}
            value={partner.hp}
            onChange={(e) => onChange('hp', e.target.value)}
          />
        </label>
        <label>
          MP
          <input
            type="number"
            min={0}
            className={statFlashClass(flash.mp)}
            value={partner.mp}
            onChange={(e) => onChange('mp', e.target.value)}
          />
        </label>
      </div>
      <div className="stat-row">
        <label className="stat-full">
          SAN
          <input
            type="number"
            min={0}
            className={statFlashClass(flash.san)}
            value={partner.san}
            onChange={(e) => onChange('san', e.target.value)}
          />
        </label>
      </div>
    </section>
  )
}

/** @param {{ player: { name: string, hp: number, mp: number, san: number, talisman: number }, flash?: Record<string, 'up'|'down'>, onChange: (k: string, v: string) => void }} props */
function PlayerCard({ player, flash = {}, onChange }) {
  return (
    <section className="char-card">
      <h3>{player.name}</h3>
      <div className="stat-row">
        <label>
          HP
          <input
            type="number"
            min={0}
            className={statFlashClass(flash.hp)}
            value={player.hp}
            onChange={(e) => onChange('hp', e.target.value)}
          />
        </label>
        <label>
          MP
          <input
            type="number"
            min={0}
            className={statFlashClass(flash.mp)}
            value={player.mp}
            onChange={(e) => onChange('mp', e.target.value)}
          />
        </label>
      </div>
      <div className="stat-row">
        <label>
          SAN
          <input
            type="number"
            min={0}
            className={statFlashClass(flash.san)}
            value={player.san}
            onChange={(e) => onChange('san', e.target.value)}
          />
        </label>
        <label>
          符纸
          <input
            type="number"
            min={0}
            className={statFlashClass(flash.talisman)}
            value={player.talisman}
            onChange={(e) => onChange('talisman', e.target.value)}
          />
        </label>
      </div>
    </section>
  )
}

/** @param {'up'|'down'|undefined} dir */
function itemFlashClass(dir) {
  if (dir === 'down') return 'item-flash-down'
  if (dir === 'up') return 'item-flash-up'
  return ''
}

/** @param {{ itemDisplay: { player: string[], partner: string[], scene: string[] }, itemFlash: { player: Record<string, 'up'|'down'>, partner: Record<string, 'up'|'down'>, scene: Record<string, 'up'|'down'> } }} props */
function InventoryPanel({ itemDisplay, itemFlash }) {
  return (
    <section className="inventory-panel">
      <h3 className="inventory-heading">物品</h3>
      <ItemList title="何以惜顾" items={itemDisplay.player} flashMap={itemFlash.player} />
      <ItemList title="林知渺" items={itemDisplay.partner} flashMap={itemFlash.partner} />
      <ItemList title="探索物品" items={itemDisplay.scene} flashMap={itemFlash.scene} />
    </section>
  )
}

/** @param {{ title: string, items: string[], flashMap: Record<string, 'up'|'down'> }} props */
function ItemList({ title, items, flashMap }) {
  return (
    <div className="item-block char-card">
      <h4 className="item-block-title">{title}</h4>
      {items.length === 0 ? (
        <p className="muted small item-empty">暂无</p>
      ) : (
        <ul className="item-list">
          {items.map((name) => (
            <li key={name} className={`item-row ${itemFlashClass(flashMap[name])}`}>
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
