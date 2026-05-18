import { useCallback, useMemo, useState } from 'react'
import { SANDBOX_WORLDS, getWorldById } from '../config/sandbox_worlds.js'
import {
  buildSandboxGmPrompt,
  buildSandboxOpeningUserMessage,
} from '../config/sandbox_system_prompt.js'
import { fetchValidatedSandboxGmReply } from '../sandboxGmTurn.js'
import { runSandboxTypewriter } from '../sandboxTypewriter.js'
import {
  computeHpMpFromSkills,
  loadSandboxState,
} from '../sandboxStorage.js'
import { SANDBOX_SKILL_NAMES } from '../config/sandbox_judge_prompt.js'
import ScreenBackButton from '../../screens/ScreenBackButton.jsx'
import { finishSandboxPrologue } from './finishSandboxPrologue.js'
import './SandboxPrologue.css'

const SKILL_TOTAL = 350
const SKILL_MIN = 5
const SKILL_MAX = 80

/**
 * @typedef {import('../sandboxStorage.js').SandboxGender} SandboxGender
 */

function defaultSkills() {
  return Object.fromEntries(SANDBOX_SKILL_NAMES.map((n) => [n, 50]))
}

/**
 * @param {{ apiKey: string, onComplete: () => void, onNavigateBack?: () => void }} props
 */
export default function SandboxPrologue({ apiKey, onComplete, onNavigateBack }) {
  const saved = useMemo(() => loadSandboxState(), [])

  const [step, setStep] = useState(/** @type {1 | 2 | 3} */ (1))
  const [worldId, setWorldId] = useState(() => saved.world?.id ?? SANDBOX_WORLDS[0].id)
  const [name, setName] = useState(() => saved.character?.name ?? '')
  const [gender, setGender] = useState(
    /** @type {SandboxGender} */ (saved.character?.gender ?? '\u5176\u4ed6'),
  )
  const [background, setBackground] = useState(() => saved.character?.background ?? '')
  const [skills, setSkills] = useState(() =>
    saved.character?.skills ? { ...saved.character.skills } : defaultSkills(),
  )

  const [openingText, setOpeningText] = useState('')
  const [openingLoading, setOpeningLoading] = useState(false)
  const [openingReady, setOpeningReady] = useState(false)
  const [entering, setEntering] = useState(false)
  const [error, setError] = useState('')

  const skillSum = useMemo(
    () => SANDBOX_SKILL_NAMES.reduce((s, n) => s + (skills[n] ?? 0), 0),
    [skills],
  )
  const remaining = SKILL_TOTAL - skillSum
  const hpMp = useMemo(() => computeHpMpFromSkills(skills), [skills])

  const selectedWorld = getWorldById(worldId)

  const adjustSkill = useCallback((skillName, delta) => {
    setSkills((prev) => {
      const cur = prev[skillName] ?? SKILL_MIN
      const next = Math.min(SKILL_MAX, Math.max(SKILL_MIN, cur + delta))
      if (next === cur) return prev
      return { ...prev, [skillName]: next }
    })
  }, [])

  const buildCharacter = useCallback(() => {
    const { maxHp, maxMp, hp, mp } = hpMp
    return {
      name: name.trim(),
      gender,
      background: background.trim(),
      skills: { ...skills },
      hp,
      maxHp,
      mp,
      maxMp,
      items: saved.character?.items?.length ? [...saved.character.items] : [],
    }
  }, [name, gender, background, skills, hpMp, saved.character?.items])

  const canStep2 = !!selectedWorld
  const canStep3 = name.trim().length > 0 && skillSum === SKILL_TOTAL && !!selectedWorld

  const generateOpening = useCallback(async () => {
    if (!selectedWorld || !canStep3) return

    const key = (apiKey || '').trim()
    if (!key) {
      setError('???????? DeepSeek API Key????????????????????')
      setOpeningLoading(false)
      setOpeningReady(false)
      return
    }

    setOpeningLoading(true)
    setOpeningReady(false)
    setOpeningText('')
    setError('')

    const character = buildCharacter()
    const systemText = buildSandboxGmPrompt(character, selectedWorld)
    const userContent = buildSandboxOpeningUserMessage(character, selectedWorld)

    try {
      const result = await fetchValidatedSandboxGmReply({
        apiKey: key,
        systemText,
        chain: [{ id: '__opening__', role: 'player', content: userContent, ts: 0 }],
        characterName: character.name,
      })

      if (!result.ok) {
        if (result.code === 'NO_API_KEY') {
          setError('???? API Key??????????????')
        } else if (result.code === 'API_ERROR') {
          setError(`API ?????${result.message || '????'}`)
        } else if (result.code === 'VALIDATION') {
          setError(
            `??????????????${result.message || ''}??????????????`,
          )
        } else {
          setError('?????????? API Key ??????')
        }
        return
      }

      setOpeningText(result.text)
      setOpeningReady(false)
      await runSandboxTypewriter({
        text: result.text,
        onUpdate: setOpeningText,
      })
      setOpeningReady(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOpeningLoading(false)
    }
  }, [apiKey, buildCharacter, canStep3, selectedWorld])

  const goStep3 = useCallback(() => {
    if (!canStep3) return
    setStep(3)
    setError('')
    void generateOpening()
  }, [canStep3, generateOpening])

  const handleEnterGame = useCallback(() => {
    if (!selectedWorld || !openingText.trim() || !openingReady) return
    setEntering(true)
    try {
      finishSandboxPrologue({
        character: buildCharacter(),
        world: {
          id: selectedWorld.id,
          name: selectedWorld.name,
          flavor: selectedWorld.flavor,
        },
        opening: openingText.trim(),
      })
      onComplete()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setEntering(false)
    }
  }, [buildCharacter, onComplete, openingReady, openingText, selectedWorld])

  return (
    <section className="prologue-root sandbox-prologue-root prologue-fade-in">
      {onNavigateBack ? <ScreenBackButton onBack={onNavigateBack} /> : null}
      <section className="prologue-inner sandbox-prologue-inner">
        {step === 1 ? (
          <>
            <h2 className="sandbox-step-title">{'\u9009\u62e9\u4e16\u754c\u89c2'}</h2>
            <section className="sandbox-prologue-worlds">
              {SANDBOX_WORLDS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={`sandbox-world-card${worldId === w.id ? ' selected' : ''}`}
                  onClick={() => setWorldId(w.id)}
                >
                  <h3 className="sandbox-world-card-title">{w.name}</h3>
                  <p className="sandbox-world-card-sub">{w.subtitle}</p>
                  <p className="sandbox-world-card-desc">{w.description}</p>
                </button>
              ))}
            </section>
            <section className="prologue-footer">
              <button
                type="button"
                className="prologue-btn prologue-btn-primary"
                disabled={!canStep2}
                onClick={() => setStep(2)}
              >
                {'\u4e0b\u4e00\u6b65'}
              </button>
            </section>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="sandbox-step-title">{'\u521b\u5efa\u89d2\u8272'}</h2>
            <section className="sandbox-char-form">
              <label className="sandbox-char-field">
                <span>{'\u59d3\u540d'}</span>
                <input
                  type="text"
                  value={name}
                  maxLength={32}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={'\u8f93\u5165\u89d2\u8272\u59d3\u540d'}
                />
              </label>
              <label className="sandbox-char-field">
                <span>{'\u6027\u522b'}</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(/** @type {SandboxGender} */ (e.target.value))}
                >
                  <option value={'\u7537'}>{'\u7537'}</option>
                  <option value={'\u5973'}>{'\u5973'}</option>
                  <option value={'\u5176\u4ed6'}>{'\u5176\u4ed6'}</option>
                </select>
              </label>
              <label className="sandbox-char-field">
                <span>{'\u7b80\u5355\u80cc\u666f\uff082~3 \u53e5\uff09'}</span>
                <textarea
                  value={background}
                  maxLength={500}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder={'\u63cf\u8ff0\u4f60\u7684\u89d2\u8272\u6765\u5386\u4e0e\u52a8\u673a\u2026\u2026'}
                />
              </label>
              <section className="skill-allocation-section">
              <section className="sandbox-skill-header">
                <span>{'\u6280\u80fd\u5206\u914d'}</span>
                <span
                  className={`sandbox-skill-remaining${remaining === 0 ? '' : remaining < 0 ? ' error' : ' warn'}`}
                >
                  {'\u5269\u4f59'} {remaining} {'\u70b9'}
                </span>
              </section>
              <section className="sandbox-skill-list">
                {SANDBOX_SKILL_NAMES.map((skillName) => (
                  <section key={skillName} className="sandbox-skill-row">
                    <span className="sandbox-skill-name">{skillName}</span>
                    <section className="sandbox-skill-controls">
                      <button
                        type="button"
                        className="sandbox-skill-btn"
                        disabled={(skills[skillName] ?? 0) <= SKILL_MIN}
                        onClick={() => adjustSkill(skillName, -1)}
                      >
                        -
                      </button>
                      <span className="sandbox-skill-value">{skills[skillName]}</span>
                      <button
                        type="button"
                        className="sandbox-skill-btn"
                        disabled={
                          (skills[skillName] ?? 0) >= SKILL_MAX || remaining <= 0
                        }
                        onClick={() => adjustSkill(skillName, 1)}
                      >
                        +
                      </button>
                    </section>
                  </section>
                ))}
              </section>
              <p className="sandbox-hpmp-preview">
                HP {hpMp.hp}/{hpMp.maxHp} ({'\u4f53\u9b44'} /10)  MP {hpMp.mp}/{hpMp.maxMp} (
                {'\u5b66\u8bc6'} /10)
              </p>
              </section>
            </section>
            <section className="prologue-footer">
              <button type="button" className="prologue-btn" onClick={() => setStep(1)}>
                {'\u4e0a\u4e00\u6b65'}
              </button>
              <button
                type="button"
                className="prologue-btn prologue-btn-primary"
                disabled={!canStep3}
                onClick={goStep3}
              >
                {'\u4e0b\u4e00\u6b65'}
              </button>
            </section>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2 className="sandbox-step-title">{'\u5f00\u573a'}</h2>
            {!apiKey.trim() ? (
              <p className="sandbox-prologue-error">
                ???? API Key????????? DeepSeek ?????????
              </p>
            ) : null}
            <section className="prologue-scroll sandbox-opening-scroll">
              {openingLoading && !openingText ? (
                <p className="muted">{'\u6b63\u5728\u751f\u6210\u5f00\u573a\u2026\u2026'}</p>
              ) : (
                openingText || '\u2026\u2026'
              )}
            </section>
            {error ? <p className="sandbox-prologue-error">{error}</p> : null}
            <section className="prologue-footer">
              <button
                type="button"
                className="prologue-btn"
                disabled={openingLoading}
                onClick={() => {
                  setStep(2)
                  setOpeningReady(false)
                }}
              >
                {'\u4e0a\u4e00\u6b65'}
              </button>
              {!openingReady ? (
                <button
                  type="button"
                  className="prologue-btn"
                  disabled={openingLoading}
                  onClick={() => void generateOpening()}
                >
                  {'\u91cd\u65b0\u751f\u6210'}
                </button>
              ) : null}
              <button
                type="button"
                className="prologue-btn prologue-btn-primary"
                disabled={!openingReady || entering}
                onClick={handleEnterGame}
              >
                {'\u8fdb\u5165\u6e38\u620f'}
              </button>
            </section>
          </>
        ) : null}
      </section>
    </section>
  )
}
