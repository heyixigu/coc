import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { INIT_USER_MESSAGE } from './config/characters.js'
import { GM_SYSTEM_PROMPT } from './config/system_prompt.js'
import { parseCharacterInitJson } from './characterInit.js'
import { postChatNonStream } from './deepseek.js'
import { runPlayerTurn } from './playerTurn.js'
import { runActOneStream } from './startActOne.js'
import { mergeRosterFromGmText } from './syncRosterFromGm.js'
import { IconDice, IconMenu, IconRoster, IconSettings, IconStory } from './components/MobileIcons.jsx'
import { useVisualViewportOffset } from './hooks/useVisualViewportOffset.js'
import { defaultState, loadState, saveState } from './storage.js'
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
 * @param {{ apiKey: string, setApiKey: (k: string) => void, bootKey?: number, onReplayPrologue?: () => void, onWipeAll?: () => void }} props
 */
export default function GameApp({ apiKey, setApiKey, bootKey = 0, onReplayPrologue, onWipeAll }) {
  const initial = useMemo(() => loadState(), [bootKey])
  const [player, setPlayer] = useState(() => initial.player)
  const [partner, setPartner] = useState(() => initial.partner)
  const [messages, setMessages] = useState(() => initial.messages)
  const [diceLog, setDiceLog] = useState(() => initial.diceLog ?? [])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeStreamGmId, setActiveStreamGmId] = useState(null)
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
  const [mobileTab, setMobileTab] = useState(/** @type {'story'|'roster'|'dice'|'settings'} */ ('story'))
  const [menuOpen, setMenuOpen] = useState(false)

  useVisualViewportOffset()

  const chatEndRef = useRef(null)
  const bootingRef = useRef(false)
  const flashClearRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const latestRef = useRef({ apiKey, player, partner, messages, selectedScenario })
  latestRef.current = { apiKey, player, partner, messages, selectedScenario }

  const applyRosterFromGmText = useCallback((gmText) => {
    const merged = mergeRosterFromGmText(gmText, latestRef.current.player, latestRef.current.partner)
    if (!merged) return

    setPlayer(merged.player)
    setPartner(merged.partner)

    const hasFlash =
      Object.keys(merged.flash.player).length > 0 || Object.keys(merged.flash.partner).length > 0
    if (!hasFlash) return

    if (flashClearRef.current) clearTimeout(flashClearRef.current)
    setStatFlash(merged.flash)
    flashClearRef.current = setTimeout(() => {
      setStatFlash({ player: {}, partner: {} })
      flashClearRef.current = null
    }, STAT_FLASH_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (flashClearRef.current) clearTimeout(flashClearRef.current)
    }
  }, [])

  const rosterReady = !!(player && partner)

  useEffect(() => {
    saveState({
      apiKey,
      player,
      partner,
      messages,
      diceLog,
      prologueComplete: true,
      selectedScenario,
      scenarioTitle,
    })
  }, [apiKey, player, partner, messages, diceLog, selectedScenario, scenarioTitle])

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    const scroll = document.querySelector(
      isMobile ? '.mobile-main .chat-scroll' : '.layout-desktop.panel-center .chat-scroll',
    )
    if (scroll) scroll.scrollTop = scroll.scrollHeight
    else chatEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages, loading, activeStreamGmId])

  const resetStory = useCallback(() => {
    if (
      !window.confirm(
        '确定要重置故事吗？对话、骰子记录与角色数值将被清除；仅保留已填写的 API Key。',
      )
    ) {
      return
    }
    const d = defaultState()
    setMessages(d.messages)
    setDiceLog(d.diceLog)
    setPlayer(d.player)
    setPartner(d.partner)
    setInput('')
    setError('')
    setActiveStreamGmId(null)
    setBootstrapPhase('idle')
    setInputLocked(true)
    setBootstrapFatal(false)
    setStatFlash({ player: {}, partner: {} })
    setSelectedScenario(null)
    setMobileTab('story')
    setMenuOpen(false)
  }, [])

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
                { role: 'system', content: GM_SYSTEM_PROMPT },
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
          setMessages([{ id: gmId, role: 'gm', content: '', ts: gmTs }])

          await runActOneStream({
            apiKey: key,
            scenario,
            gmId,
            gmTs,
            setMessages,
            setDiceLog,
            setActiveStreamGmId,
            onGmRoundComplete: applyRosterFromGmText,
            fallbackSkill: FALLBACK_ROLL_SKILL,
          })

          setSelectedScenario(null)
          setBootstrapPhase('ready')
          setInputLocked(false)
        } catch (e) {
          if (e?.name === 'AbortError') return
          setError(e instanceof Error ? e.message : String(e))
          setBootstrapFatal(true)
          setBootstrapPhase('error')
          setMessages([])
          setInputLocked(true)
        } finally {
          setActiveStreamGmId(null)
          setLoading(false)
          bootingRef.current = false
        }
      })()
    }, 480)

    return () => {
      ac.abort()
      clearTimeout(t)
    }
  }, [apiKey, bootstrapFatal, applyRosterFromGmText])

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

    try {
      setInput('')
      const userMsg = { id: uid(), role: 'player', content: trimmed, ts: Date.now() }
      const gmId = uid()
      const gmTs = Date.now()

      setMessages([...snap, userMsg])
      setJudgingTurn(true)

      await runPlayerTurn({
        apiKey: apiKey.trim(),
        snap,
        userMsg,
        gmId,
        gmTs,
        setMessages,
        setDiceLog,
        setActiveStreamGmId,
        onGmRoundComplete: applyRosterFromGmText,
        fallbackSkill: FALLBACK_ROLL_SKILL,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setJudgingTurn(false)
      setLoading(false)
      setActiveStreamGmId(null)
    }
  }

  const playerLabel = player?.name || '何以惜顾'
  const showInitWait = loading && bootstrapPhase === 'init'
  const showOpeningWait = loading && bootstrapPhase === 'opening' && !activeStreamGmId
  const showJudgeWait = loading && judgingTurn && !activeStreamGmId
  const inputDisabled = loading || inputLocked
  const headerTitle = scenarioTitle || '秘仪残卷'
  const mobileSheetOpen = mobileTab !== 'story'
  const closeMobileSheet = () => setMobileTab('story')
  const selectMobileTab = (/** @type {'story'|'roster'|'dice'|'settings'} */ tab) => {
    setMobileTab(tab)
    setMenuOpen(false)
  }

  const inputPlaceholder = inputLocked
    ? '等待开场白完成后再输入行动……'
    : '以调查员身份输入行动、对白或检定说明……'

  const chatBlock = (
    <>
      <div className="chat-scroll">
        {messages.length === 0 && (
          <p className="chat-empty">
            守密人叙述中若出现
            <code className="inline-code">[ROLL:技能名:技能值]</code>
            ，将自动暂停流式输出、掷 1d100、写入
            <code className="inline-code">[ROLL_RESULT:…]</code>
            后继续生成。
          </p>
        )}
        {messages.map((m) => (
          <article
            key={m.id}
            className={`bubble bubble-${m.role}${m.id === activeStreamGmId && loading ? ' bubble-streaming' : ''}`}
          >
            <div className="bubble-meta">
              {m.role === 'gm' ? '守密人' : m.role === 'system' ? '[系统]' : playerLabel}
              <time dateTime={new Date(m.ts).toISOString()}>{new Date(m.ts).toLocaleString()}</time>
            </div>
            <div className="bubble-body">{m.content}</div>
          </article>
        ))}
        {loading && !activeStreamGmId && (showInitWait || showOpeningWait || showJudgeWait) && (
          <div className="bubble bubble-gm pending">
            <div className="bubble-meta">守密人</div>
            <div className="bubble-body dim">
              {showInitWait
                ? '正在确认角色与规则（JSON）……'
                : showJudgeWait
                  ? '正在判定检定并掷骰……'
                  : '正在生成开场场景……'}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
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
    </>
  )

  const diceBlock =
    diceLog.length === 0 ? (
      <p className="muted small dice-log-empty">暂无记录。流式输出中检测到 [ROLL:…] 后将自动掷骰并在此显示。</p>
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

  const renderInputBar = (/** @type {'desktop'|'mobile'} */ variant) => (
    <>
      <textarea
        className={variant === 'mobile' ? 'main-input main-input-mobile' : 'main-input'}
        rows={variant === 'mobile' ? 1 : 2}
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
        className={variant === 'mobile' ? 'send-btn btn-touch' : 'send-btn'}
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
            <p className="app-sub">本地存档 · DeepSeek · 流式输出 · [ROLL] 检定</p>
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
            <h2 className="panel-heading">连接</h2>
            {settingsBlock}
            <h2 className="panel-heading">角色状态</h2>
            {rosterBlock}
          </aside>

          <main className="panel panel-center">{chatBlock}</main>

          <aside className="panel panel-right">
            <h2 className="panel-heading">骰子记录</h2>
            {diceBlock}
          </aside>
        </div>
      </div>

      <footer className="input-bar layout-desktop">{renderInputBar('desktop')}</footer>

      <header className="mobile-top-bar layout-mobile">
        <h1 className="mobile-top-title">{headerTitle}</h1>
        <button
          type="button"
          className="mobile-icon-btn btn-touch"
          aria-label="菜单"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <IconMenu />
        </button>
        {menuOpen ? (
          <>
            <button type="button" className="mobile-menu-backdrop" aria-label="关闭菜单" onClick={() => setMenuOpen(false)} />
            <div className="mobile-menu-dropdown">
              {onReplayPrologue ? (
                <button type="button" className="mobile-menu-item btn-touch" onClick={onReplayPrologue}>
                  重新序幕
                </button>
              ) : null}
              <button type="button" className="mobile-menu-item btn-touch" onClick={resetStory}>
                重置故事
              </button>
              {onWipeAll ? (
                <button type="button" className="mobile-menu-item btn-touch" onClick={onWipeAll}>
                  清除存档
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </header>

      <div className="mobile-shell layout-mobile">
        <main className="mobile-main panel-center">{chatBlock}</main>
        <div className="mobile-input-wrap">{renderInputBar('mobile')}</div>
      </div>

      <nav className="mobile-tab-bar layout-mobile" aria-label="主导航">
        <button
          type="button"
          className={`mobile-tab btn-touch${mobileTab === 'story' ? ' mobile-tab-active' : ''}`}
          onClick={() => selectMobileTab('story')}
        >
          <IconStory />
          <span>剧情</span>
        </button>
        <button
          type="button"
          className={`mobile-tab btn-touch${mobileTab === 'roster' ? ' mobile-tab-active' : ''}`}
          onClick={() => selectMobileTab('roster')}
        >
          <IconRoster />
          <span>角色</span>
        </button>
        <button
          type="button"
          className={`mobile-tab btn-touch${mobileTab === 'dice' ? ' mobile-tab-active' : ''}`}
          onClick={() => selectMobileTab('dice')}
        >
          <IconDice />
          <span>骰子</span>
        </button>
        <button
          type="button"
          className={`mobile-tab btn-touch${mobileTab === 'settings' ? ' mobile-tab-active' : ''}`}
          onClick={() => selectMobileTab('settings')}
        >
          <IconSettings />
          <span>设置</span>
        </button>
      </nav>

      {mobileSheetOpen ? (
        <>
          <button type="button" className="mobile-sheet-backdrop layout-mobile" aria-label="关闭面板" onClick={closeMobileSheet} />
          <div className="mobile-sheet layout-mobile" role="dialog" aria-modal="true">
            <button type="button" className="mobile-sheet-handle" aria-label="关闭" onClick={closeMobileSheet} />
            <div className="mobile-sheet-scroll">
              {mobileTab === 'roster' ? (
                <>
                  <h2 className="panel-heading">角色状态</h2>
                  {rosterBlock}
                </>
              ) : null}
              {mobileTab === 'dice' ? (
                <>
                  <h2 className="panel-heading">骰子记录</h2>
                  {diceBlock}
                </>
              ) : null}
              {mobileTab === 'settings' ? (
                <>
                  <h2 className="panel-heading">设置</h2>
                  {settingsBlock}
                  <div className="mobile-settings-actions">
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
              ) : null}
            </div>
          </div>
        </>
      ) : null}
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
