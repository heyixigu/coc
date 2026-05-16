import { useCallback, useEffect, useRef, useState } from 'react'
import TypewriterText from '../components/TypewriterText.jsx'
import { PROLOGUE_MEETING_PROMPT, PROLOGUE_SCENARIOS_PROMPT } from '../config/prologue_prompt.js'
import { PROLOGUE_SEGMENT_LIN, PROLOGUE_SEGMENT_XIGU } from '../config/prologue_texts.js'
import { postChatNonStream, streamChatPlain } from '../deepseek.js'
import { parseScenariosJson } from '../parseScenarios.js'
import { finishPrologueAndSave } from './finishPrologue.js'
import './Prologue.css'

const SEGMENT_GAP_MS = 1500

/**
 * @typedef {{ title: string, summary: string, tags: string[], opening: string }} ScenarioOption
 * @typedef {'xigu' | 'lin' | 'meeting' | 'done'} NarrativeStep
 */

/**
 * @param {{ apiKey: string, onComplete: () => void }} props
 */
export default function Prologue({ apiKey, onComplete }) {
  const [phase, setPhase] = useState(/** @type {1 | 2} */ (1))
  const [fadeClass, setFadeClass] = useState('prologue-fade-in')

  const [narrativeStep, setNarrativeStep] = useState(/** @type {NarrativeStep} */ ('xigu'))
  const [frozenXigu, setFrozenXigu] = useState(false)
  const [frozenLin, setFrozenLin] = useState(false)
  const [meetingText, setMeetingText] = useState('')
  const [meetingLoading, setMeetingLoading] = useState(false)
  const [phase1Ready, setPhase1Ready] = useState(false)

  const [scenarios, setScenarios] = useState(/** @type {ScenarioOption[]} */ ([]))
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [scenariosLoading, setScenariosLoading] = useState(false)
  const [scenariosError, setScenariosError] = useState('')
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const meetingStarted = useRef(false)
  const acRef = useRef(/** @type {AbortController | null} */ (null))

  const runMeetingStream = useCallback(async () => {
    if (meetingStarted.current) return
    meetingStarted.current = true
    setMeetingLoading(true)
    setMeetingText('')
    try {
      const ac = new AbortController()
      acRef.current = ac
      await streamChatPlain({
        apiKey,
        messages: [{ role: 'user', content: PROLOGUE_MEETING_PROMPT }],
        signal: ac.signal,
        onDelta: setMeetingText,
      })
      setNarrativeStep('done')
      setPhase1Ready(true)
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setMeetingLoading(false)
    }
  }, [apiKey])

  const onXiguDone = useCallback(() => {
    setFrozenXigu(true)
    setTimeout(() => setNarrativeStep('lin'), SEGMENT_GAP_MS)
  }, [])

  const onLinDone = useCallback(() => {
    setFrozenLin(true)
    setTimeout(() => {
      setNarrativeStep('meeting')
      void runMeetingStream()
    }, SEGMENT_GAP_MS)
  }, [runMeetingStream])

  const loadScenarios = useCallback(async () => {
    setScenariosLoading(true)
    setScenariosError('')
    try {
      const ac = new AbortController()
      acRef.current = ac
      const raw = await postChatNonStream({
        apiKey,
        messages: [{ role: 'user', content: PROLOGUE_SCENARIOS_PROMPT }],
        signal: ac.signal,
      })
      setScenarios(parseScenariosJson(raw))
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setScenariosError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setScenariosLoading(false)
    }
  }, [apiKey])

  useEffect(() => {
    if (phase !== 2) return undefined
    void loadScenarios()
  }, [phase, loadScenarios])

  useEffect(() => {
    return () => {
      acRef.current?.abort()
    }
  }, [])

  const goPhase2 = () => {
    setFadeClass('prologue-fade-out')
    setTimeout(() => {
      setPhase(2)
      setFadeClass('prologue-fade-in')
    }, 650)
  }

  const handleStart = async () => {
    const scenario = scenarios[selectedIdx]
    if (!scenario) return
    setStarting(true)
    setError('')
    try {
      acRef.current?.abort()
      await finishPrologueAndSave({ apiKey, scenario })
      setFadeClass('prologue-fade-out')
      setTimeout(() => onComplete(), 700)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStarting(false)
    }
  }

  return (
    <div className={`prologue-root ${fadeClass}`}>
      <div className="prologue-inner">
        {error ? <div className="prologue-error">{error}</div> : null}

        {phase === 1 ? (
          <>
            <div className="prologue-scroll">
              {frozenXigu ? (
                <p className="prologue-paragraph prologue-paragraph-frozen">{PROLOGUE_SEGMENT_XIGU}</p>
              ) : narrativeStep === 'xigu' ? (
                <TypewriterText text={PROLOGUE_SEGMENT_XIGU} onComplete={onXiguDone} />
              ) : null}

              {(narrativeStep === 'lin' ||
                narrativeStep === 'meeting' ||
                narrativeStep === 'done' ||
                frozenLin) &&
                (frozenLin ? (
                  <p className="prologue-paragraph prologue-paragraph-frozen">{PROLOGUE_SEGMENT_LIN}</p>
                ) : (
                  <TypewriterText text={PROLOGUE_SEGMENT_LIN} onComplete={onLinDone} />
                ))}

              {narrativeStep === 'meeting' || narrativeStep === 'done' ? (
                <p className="prologue-stream">
                  {meetingText}
                  {meetingLoading ? <span className="prologue-stream-cursor" /> : null}
                </p>
              ) : null}
            </div>
            <div className="prologue-footer">
              {phase1Ready ? (
                <button type="button" className="prologue-btn prologue-btn-primary" onClick={goPhase2}>
                  继续
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <h2 className="prologue-phase2-title">择一卷宗</h2>
            <p className="prologue-phase2-sub">今夜，你将踏入哪一种黑暗</p>
            <div className="prologue-scroll">
              {scenariosError ? (
                <>
                  <div className="prologue-error">{scenariosError}</div>
                  <div className="prologue-footer" style={{ paddingTop: 0 }}>
                    <button
                      type="button"
                      className="prologue-btn"
                      onClick={() => void loadScenarios()}
                      disabled={scenariosLoading}
                    >
                      重新生成
                    </button>
                  </div>
                </>
              ) : scenariosLoading ? (
                <p className="prologue-loading">正在编织三篇异闻……</p>
              ) : (
                <div className="prologue-cards">
                  {scenarios.map((s, i) => (
                    <button
                      key={s.title}
                      type="button"
                      className={`prologue-card${selectedIdx === i ? ' prologue-card-selected' : ''}`}
                      onClick={() => setSelectedIdx(i)}
                    >
                      <h3 className="prologue-card-title">{s.title}</h3>
                      <p className="prologue-card-summary">{s.summary}</p>
                      <div className="prologue-card-tags">
                        {s.tags.map((tag) => (
                          <span key={tag} className="prologue-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="prologue-footer">
              <button
                type="button"
                className="prologue-btn prologue-btn-primary"
                disabled={selectedIdx < 0 || starting || scenariosLoading}
                onClick={() => void handleStart()}
              >
                {starting ? '正在入局……' : '开始调查'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
