import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = join(dirname(fileURLToPath(import.meta.url)), '../src/sandbox/SandboxGameApp.jsx')

const T = {
  incomplete: '\u6c99\u76d2\u5b58\u6863\u6570\u636e\u4e0d\u5b8c\u6574\uff0c\u8bf7\u8fd4\u56de\u6a21\u5f0f\u9009\u62e9\u91cd\u65b0\u5f00\u59cb\u3002',
  sandbox: '\u6c99\u76d2',
  resetStory: '\u91cd\u7f6e\u6545\u4e8b',
  replayPrologue: '\u91cd\u65b0\u5e8f\u5e55',
  wipeAll: '\u6e05\u9664\u5b58\u6863',
  rolePanel: '\u89d2\u8272',
  otherGender: '\u5176\u4ed6',
  items: '\u7269\u54c1',
  none: '\u65e0',
  narrative: '\u53d9\u4e8b',
  keeper: '\u5b88\u5bc6\u4eba',
  system: '[\u7cfb\u7edf]',
  judging: '\u6b63\u5728\u5224\u5b9a\u68c0\u5b9a\u5e76\u6295\u9ab0\u2026\u2026',
  formatWarn: '\u5b88\u5bc6\u4eba\u56de\u590d\u683c\u5f0f\u5f02\u5e38\uff0c\u8bf7\u91cd\u65b0\u53d1\u9001',
  placeholder: '\u8f93\u5165\u4f60\u7684\u884c\u52a8\u2026\u2026',
  send: '\u53d1\u9001',
  diceLog: '\u6295\u9ab0\u8bb0\u5f55',
  empty: '\u6682\u65e0',
  skillFallback: '\u6280\u80fd',
  rolled: '\u6295\u51fa\uff1a',
  arrow: '\u2192',
  dot: '\u00b7',
}

writeFileSync(
  out,
  `import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getWorldById } from './config/sandbox_worlds.js'
import { SANDBOX_LOADING_PHRASES } from './config/sandbox_loading_phrases.js'
import { SANDBOX_SKILL_NAMES } from './config/sandbox_judge_prompt.js'
import { fetchValidatedSandboxGmReply } from './sandboxGmTurn.js'
import { mergeCharacterFromGmText } from './sandboxParseGmStatus.js'
import { runSandboxPlayerTurn } from './sandboxPlayerTurn.js'
import { runSandboxRollingSummary } from './sandboxRollingSummary.js'
import { runSandboxTypewriter } from './sandboxTypewriter.js'
import { loadSandboxState, saveSandboxState } from './sandboxStorage.js'
import './SandboxGameApp.css'

const STAT_FLASH_MS = 1000
const T = ${JSON.stringify(T)}

function uid() {
  return \`\${Date.now()}-\${Math.random().toString(16).slice(2)}\`
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

function safeItems(character) {
  return Array.isArray(character?.items) ? character.items : []
}

function safeSkillValue(character, skillName) {
  const v = character?.skills?.[skillName]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

export default function SandboxGameApp({
  apiKey,
  bootKey = 0,
  onResetStory,
  onReplayPrologue,
  onWipeAll,
}) {
  const initial = useMemo(() => loadSandboxState(), [bootKey])
  const worldFull = useMemo(
    () => (initial.world ? getWorldById(initial.world.id) : null),
    [initial.world],
  )

  const [character, setCharacter] = useState(() => initial.character)
  const [messages, setMessages] = useState(() => initial.messages ?? [])
  const [diceLog, setDiceLog] = useState(() => initial.diceLog ?? [])
  const [playerTurnCount, setPlayerTurnCount] = useState(() => initial.playerTurnCount ?? 0)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gmUiPhase, setGmUiPhase] = useState(null)
  const [gmLoadingPhrase, setGmLoadingPhrase] = useState(SANDBOX_LOADING_PHRASES[0])
  const [gmFormatWarning, setGmFormatWarning] = useState(false)
  const [judgingTurn, setJudgingTurn] = useState(false)
  const [statFlash, setStatFlash] = useState({})

  const chatEndRef = useRef(null)
  const summaryQueueRef = useRef(Promise.resolve())
  const flashClearRef = useRef(null)
  const latestRef = useRef({ apiKey, character, messages, playerTurnCount })

  latestRef.current = { apiKey, character, messages, playerTurnCount }

  const worldDisplayName = worldFull?.name ?? initial.world?.name ?? ''
  const worldSubtitle = worldFull?.subtitle ?? ''

  const inputLocked = gmUiPhase === 'loading' || gmUiPhase === 'typing'
  const inputDisabled = loading || inputLocked

  useEffect(() => {
    if (!character || !worldFull) return
    saveSandboxState({
      character: {
        ...character,
        items: safeItems(character),
        skills: character.skills ?? {},
      },
      world: { id: worldFull.id, name: worldFull.name, flavor: worldFull.flavor },
      messages,
      diceLog,
      playerTurnCount,
      prologueComplete: true,
    })
  }, [character, worldFull, messages, diceLog, playerTurnCount])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, gmUiPhase])

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
    const merged = mergeCharacterFromGmText(gmText, prev)
    if (!merged) return
    const flash = {}
    if (merged.hp !== prev.hp) flash.hp = merged.hp > prev.hp ? 'up' : 'down'
    if (merged.mp !== prev.mp) flash.mp = merged.mp > prev.mp ? 'up' : 'down'
    setCharacter({
      ...merged,
      items: safeItems(merged),
      skills: merged.skills ?? {},
    })
    if (flash.hp || flash.mp) {
      setStatFlash(flash)
      if (flashClearRef.current) clearTimeout(flashClearRef.current)
      flashClearRef.current = setTimeout(() => setStatFlash({}), STAT_FLASH_MS)
    }
  }, [])

  const presentGm = useCallback(
    async ({ apiKey: key, systemText, chain, gmId, gmTs, characterName, signal }) => {
      setGmFormatWarning(false)
      setGmUiPhase('loading')
      const result = await fetchValidatedSandboxGmReply({
        apiKey: key,
        systemText,
        chain,
        characterName,
        signal,
      })
      if (!result.ok) {
        setGmUiPhase(null)
        setGmFormatWarning(true)
        return false
      }
      applyCharacterFromGm(result.text)
      setGmUiPhase('typing')
      setMessages((prev) => {
        const rest = prev.filter((m) => m.id !== gmId)
        return [...rest, { id: gmId, role: 'gm', content: '', ts: gmTs }]
      })
      try {
        await runSandboxTypewriter({
          text: result.text,
          signal,
          onUpdate: (partial) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === gmId ? { ...m, content: partial } : m)),
            )
          },
        })
        setMessages((prev) =>
          prev.map((m) => (m.id === gmId ? { ...m, content: result.text } : m)),
        )
      } catch (e) {
        if (e?.name === 'AbortError') throw e
        setGmUiPhase(null)
        return false
      }
      setGmUiPhase(null)
      return true
    },
    [applyCharacterFromGm],
  )

  const enqueueRollingSummary = useCallback((n, m) => {
    summaryQueueRef.current = summaryQueueRef.current.then(() =>
      runSandboxRollingSummary({
        apiKey: latestRef.current.apiKey,
        n,
        m,
        getMessages: () => latestRef.current.messages,
        setMessages,
      }),
    )
  }, [])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || inputDisabled || !character || !worldFull) return
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
      const turnOk = await runSandboxPlayerTurn({
        apiKey: apiKey.trim(),
        snap,
        userMsg,
        character: { ...character, items: safeItems(character), skills: character.skills ?? {} },
        world: worldFull,
        gmId,
        gmTs,
        setMessages,
        setDiceLog,
        presentGm,
      })
      if (turnOk) {
        setPlayerTurnCount((prev) => {
          const next = prev + 1
          if (next > 0 && next % 10 === 0) enqueueRollingSummary(next - 9, next)
          return next
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setJudgingTurn(false)
      setGmUiPhase(null)
      setLoading(false)
    }
  }

  if (!character || !worldFull) {
    return (
      <div className="sandbox-app-root">
        <p className="muted" style={{ padding: '2rem' }}>
          {T.incomplete}
        </p>
      </div>
    )
  }

  const items = safeItems(character)
  const hp = Number.isFinite(character.hp) ? character.hp : 0
  const maxHp = Number.isFinite(character.maxHp) ? character.maxHp : hp
  const mp = Number.isFinite(character.mp) ? character.mp : 0
  const maxMp = Number.isFinite(character.maxMp) ? character.maxMp : mp

  const showJudgeWait = loading && judgingTurn && gmUiPhase == null
  const showGmLoading = gmUiPhase === 'loading'

  return (
    <motion className="sandbox-app-root">
      <header className="sandbox-header">
        <div className="sandbox-header-row">
          <div>
            <h1 className="sandbox-header-title">{T.sandbox} {T.dot} {worldDisplayName}</h1>
            <p className="sandbox-header-sub">{character.name}</p>
          </div>
          <div className="app-header-actions">
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

      <div className="sandbox-layout">
        <aside className="sandbox-panel sandbox-panel-left">
          <div className="sandbox-panel-head">{T.rolePanel}</div>
          <div className="sandbox-panel-body">
            <h2 className="sandbox-char-name">{character.name}</h2>
            <p className="sandbox-char-world muted small">
              {worldDisplayName}
              {worldSubtitle ? \` \${T.dot} \${worldSubtitle}\` : ''}
            </p>
            <p className="muted small">{character.gender || T.otherGender}</p>
            <div className="sandbox-stat-grid">
              <div className={\`sandbox-stat-box\${statFlash.hp ? \` flash-\${statFlash.hp}\` : ''}\`}>
                HP {hp}/{maxHp}
              </div>
              <div className={\`sandbox-stat-box\${statFlash.mp ? \` flash-\${statFlash.mp}\` : ''}\`}>
                MP {mp}/{maxMp}
              </div>
            </div>
            <ul className="sandbox-skill-readonly">
              {SANDBOX_SKILL_NAMES.map((n) => (
                <li key={n}>
                  <span>{n}</span>
                  <span>{safeSkillValue(character, n)}</span>
                </li>
              ))}
            </ul>
            <div className="sandbox-items-list">
              <span className="sandbox-items-label">{T.items}</span>
              {items.length > 0 ? (
                <ul>
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">{T.none}</p>
              )}
            </div>
          </div>
        </aside>

        <main className="sandbox-panel sandbox-panel-center">
          <div className="sandbox-panel-head">{T.narrative}</div>
          <div
            className="chat-scroll"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.75rem' }}
          >
            {messages
              .filter((m) => !m.isSummary)
              .map((m) => (
                <article key={m.id} className={\`bubble bubble-\${m.role}\`}>
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
                </article>
              ))}
            {showJudgeWait ? (
              <motion className="bubble bubble-gm pending">
                <div className="bubble-meta">{T.keeper}</div>
                <motion className="bubble-body dim">{T.judging}</div>
              </div>
            ) : null}
            {showGmLoading ? (
              <div className="bubble bubble-gm pending">
                <div className="bubble-meta">{T.keeper}</div>
                <div className="bubble-body dim">{gmLoadingPhrase}</div>
              </div>
            ) : null}
            <div ref={chatEndRef} />
          </div>
          {gmFormatWarning ? (
            <div className="inline-error gm-format-warning">{T.formatWarn}</motion>
          ) : null}
          {error ? <div className="inline-error">{error}</div> : null}
          <div className="sandbox-footer">
            <input
              type="text"
              value={input}
              disabled={inputDisabled}
              placeholder={T.placeholder}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
            />
            <button type="button" disabled={inputDisabled} onClick={() => void handleSend()}>
              {T.send}
            </button>
          </div>
        </main>

        <aside className="sandbox-panel sandbox-panel-right">
          <div className="sandbox-panel-head">{T.diceLog}</div>
          <div className="sandbox-panel-body">
            {diceLog.length === 0 ? (
              <p className="muted small dice-log-empty">{T.empty}</p>
            ) : (
              <ul className="dice-log-list">
                {diceLog.map((e) => (
                  <li key={e.id} className="dice-log-item">
                    <span className="dice-log-skill">[{e.skillName || T.skillFallback}]</span>
                    <span className="dice-log-roll"> {T.rolled}{e.value}</span>
                    {e.outcome != null && e.judgeText ? (
                      <span className={\`dice-log-outcome \${judgeClassName(e.outcome)}\`}>
                        {' '}
                        {T.arrow} {e.judgeText}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
`.replace(/<\/?motion\b[^>]*>/g, (tag) => {
    if (tag.startsWith('</')) return '</div>'
    const cls = tag.match(/className="([^"]+)"/)
    return cls ? `<motion className="${cls[1]}">`.replace('<motion', '<div') : '<div>'
  })
  .replace(/<\/motion>/g, '</div>'),
  'utf8',
)

console.log('Wrote', out)
