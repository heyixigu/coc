import { useCallback, useMemo, useState } from 'react'
import { SANDBOX_WORLDS, getWorldById } from '../config/sandbox_worlds.js'
import {
  buildSandboxGmPrompt,
  buildSandboxOpeningUserMessage,
} from '../config/sandbox_system_prompt.js'
import { fetchValidatedSandboxGmReply } from '../sandboxGmTurn.js'
import { runSandboxTypewriter } from '../sandboxTypewriter.js'
import { computeHpMpFromSkills, loadSandboxSlot } from '../sandboxStorage.js'
import { SANDBOX_SKILL_NAMES } from '../config/sandbox_judge_prompt.js'
import ScreenBackButton from '../../screens/ScreenBackButton.jsx'
import { generateGlobalEvents } from '../sandboxGlobalEventGenerator.js'
import { saveGlobalEvents } from '../sandboxWorldMemory.js'
import { finishSandboxPrologue } from './finishSandboxPrologue.js'
import './SandboxPrologue.css'

const EVENT_TYPES = [
  { value: 'war', label: '战争' },
  { value: 'disaster', label: '灾难' },
  { value: 'discovery', label: '重大发现' },
  { value: 'curse', label: '诅咒异变' },
  { value: 'founding', label: '王朝建立' },
  { value: 'other', label: '其他' },
]

const ERAS = ['远古', '百年前', '近代']

const SKILL_TOTAL = 350
const SKILL_MIN = 5
const SKILL_MAX = 80

/** @type {Record<string, { id: string, label: string, background: string, skills: Record<string, number> }[]>} */
const WORLD_PRESETS = {
  east: [
    {
      id: 'swordsman',
      label: '江湖侠客',
      background: '游历四方的剑客，以剑为生，行侠仗义，身上带着数不清的江湖恩怨。',
      skills: { 战斗: 70, 交涉: 40, 感知: 50, 潜行: 45, 学识: 30, 意志: 65, 体魄: 50 },
    },
    {
      id: 'daoist',
      label: '入世道士',
      background: '下山历练的道门弟子，通晓符箓术法，受师命寻访尘世异象。',
      skills: { 战斗: 40, 交涉: 45, 感知: 65, 潜行: 35, 学识: 70, 意志: 70, 体魄: 25 },
    },
    {
      id: 'merchant',
      label: '行商巨贾',
      background: '走南闯北的富商，长袖善舞，消息灵通，背后却藏着不为人知的秘密。',
      skills: { 战斗: 25, 交涉: 75, 感知: 55, 潜行: 50, 学识: 60, 意志: 50, 体魄: 35 },
    },
  ],
  fantasy: [
    {
      id: 'warrior',
      label: '战场老兵',
      background: '历经百战的雇佣兵，铁血冷静，为了赎罪或金币踏上新的征途。',
      skills: { 战斗: 75, 交涉: 35, 感知: 45, 潜行: 40, 学识: 25, 意志: 60, 体魄: 70 },
    },
    {
      id: 'mage',
      label: '学院法师',
      background: '魔法学院的毕业生，知识渊博却缺乏实战，带着导师遗留的未解谜题出走。',
      skills: { 战斗: 25, 交涉: 50, 感知: 60, 潜行: 30, 学识: 80, 意志: 70, 体魄: 35 },
    },
    {
      id: 'ranger',
      label: '边境游侠',
      background: '在荒野与边境城镇间穿行的独行者，善于追踪，与自然为伴。',
      skills: { 战斗: 55, 交涉: 40, 感知: 75, 潜行: 65, 学识: 35, 意志: 45, 体魄: 35 },
    },
  ],
  cyberpunk: [
    {
      id: 'hacker',
      label: '顶级黑客',
      background: '深潜赛博空间的数据幽灵，出卖信息为生，某次入侵让他陷入了更深的漩涡。',
      skills: { 战斗: 25, 交涉: 50, 感知: 65, 潜行: 60, 学识: 80, 意志: 55, 体魄: 15 },
    },
    {
      id: 'streetfighter',
      label: '街头战士',
      background: '底层区长大的改造人，靠拳头和钢铁身躯在帮派夹缝中存活至今。',
      skills: { 战斗: 80, 交涉: 30, 感知: 50, 潜行: 35, 学识: 20, 意志: 55, 体魄: 80 },
    },
    {
      id: 'agent',
      label: '企业特工',
      background: '为某大财团执行灰色任务的前特种兵，现在不确定自己究竟为谁效命。',
      skills: { 战斗: 65, 交涉: 55, 感知: 60, 潜行: 60, 学识: 35, 意志: 50, 体魄: 25 },
    },
  ],
  wasteland: [
    {
      id: 'scavenger',
      label: '老练拾荒者',
      background: '废土上摸爬滚打多年的老手，知道哪里有物资，也知道哪里不该去。',
      skills: { 战斗: 40, 交涉: 50, 感知: 75, 潜行: 65, 学识: 40, 意志: 45, 体魄: 35 },
    },
    {
      id: 'hunter',
      label: '变异猎人',
      background: '专门猎杀危险变异体为生，身上有轻微变异却仍保持人形，被两方都排斥。',
      skills: { 战斗: 75, 交涉: 25, 感知: 70, 潜行: 55, 学识: 25, 意志: 60, 体魄: 40 },
    },
    {
      id: 'soldier',
      label: '前线军人',
      background: '旧秩序军队的幸存者，部队覆灭后独自流浪，还没放下那套军人准则。',
      skills: { 战斗: 70, 交涉: 40, 感知: 55, 潜行: 45, 学识: 35, 意志: 70, 体魄: 35 },
    },
  ],
}

/**
 * @typedef {import('../sandboxStorage.js').SandboxGender} SandboxGender
 */

function defaultSkills() {
  return Object.fromEntries(SANDBOX_SKILL_NAMES.map((n) => [n, 50]))
}

/**
 * @param {{ apiKey: string, slotIndex: number, onComplete: () => void, onNavigateBack?: () => void }} props
 */
export default function SandboxPrologue({ apiKey, slotIndex, onComplete, onNavigateBack }) {
  const saved = useMemo(() => loadSandboxSlot(slotIndex), [slotIndex])

  const [step, setStep] = useState(/** @type {1 | 2 | 2.5 | 3} */ (1))
  const [worldHistoryMode, setWorldHistoryMode] = useState(/** @type {null | 'ai' | 'custom'} */ (null))
  const [isGeneratingHistory, setIsGeneratingHistory] = useState(false)
  const [historyGenText, setHistoryGenText] = useState('')
  const [customEvents, setCustomEvents] = useState([
    { name: '', type: 'war', era: '百年前', summary: '' },
  ])
  const [worldId, setWorldId] = useState(() => saved.world?.id ?? SANDBOX_WORLDS[0].id)
  const [name, setName] = useState(() => saved.character?.name ?? '')
  const [gender, setGender] = useState(
    /** @type {SandboxGender} */ (saved.character?.gender ?? '\u5176\u4ed6'),
  )
  const [background, setBackground] = useState(() => saved.character?.background ?? '')
  const [skills, setSkills] = useState(() =>
    saved.character?.skills ? { ...saved.character.skills } : defaultSkills(),
  )
  const [selectedPresetId, setSelectedPresetId] = useState(null)

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

  const applyPreset = useCallback((preset) => {
    setSelectedPresetId(preset.id)
    setBackground(preset.background)
    setSkills({ ...preset.skills })
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
    const systemText = buildSandboxGmPrompt(
      character,
      selectedWorld,
      [],
      [],
      [],
      [],
      [],
      undefined,
      undefined,
      undefined,
      slotIndex,
    )
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
  }, [apiKey, buildCharacter, canStep3, selectedWorld, slotIndex])

  const goStep3 = useCallback(() => {
    if (!canStep3) return
    setStep(3)
    setError('')
    void generateOpening()
  }, [canStep3, generateOpening])

  const handleAiWorldHistory = useCallback(async () => {
    if (!selectedWorld || isGeneratingHistory) return

    setWorldHistoryMode('ai')
    setIsGeneratingHistory(true)
    setHistoryGenText('AI正在构建世界历史...')

    try {
      const events = await generateGlobalEvents({
        apiKey,
        worldName: selectedWorld.name,
        worldFlavor: selectedWorld.flavor,
        races: selectedWorld.races ?? [],
      })

      if (events.length > 0) {
        saveGlobalEvents(slotIndex, events)
        setHistoryGenText(`已生成 ${events.length} 条世界历史`)
      } else {
        setHistoryGenText('历史构建完成')
      }

      await new Promise((r) => setTimeout(r, 800))
      goStep3()
    } catch (e) {
      console.warn('骨架事件生成失败', e)
      goStep3()
    } finally {
      setIsGeneratingHistory(false)
      setHistoryGenText('')
    }
  }, [apiKey, goStep3, isGeneratingHistory, selectedWorld, slotIndex])

  const confirmCustomHistory = useCallback(() => {
    const formatted = customEvents
      .filter((e) => e.name.trim() && e.summary.trim())
      .map((e, i) => ({
        id: `event_global_custom_${i}`,
        name: e.name.trim(),
        era: e.era,
        type: e.type,
        summary: e.summary.trim(),
        affectedRaces: [],
        affectedLocations: [],
        promotedFrom: 'custom',
      }))
    saveGlobalEvents(slotIndex, formatted)
    goStep3()
  }, [customEvents, goStep3, slotIndex])

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
                  onClick={() => {
                    setWorldId(w.id)
                    setSelectedPresetId(null)
                  }}
                >
                  <h3 className="sandbox-world-card-title">{w.name}</h3>
                  <p className="sandbox-world-card-sub">{w.subtitle}</p>
                  <p className="sandbox-world-card-desc">{w.description}</p>
                </button>
              ))}
            </section>
            {selectedWorld && WORLD_PRESETS[worldId] ? (
              <section className="sandbox-presets-section">
                <h3 className="sandbox-presets-title">选择预设开局（可选）</h3>
                <section className="sandbox-presets-list">
                  {WORLD_PRESETS[worldId].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`sandbox-preset-card${selectedPresetId === preset.id ? ' selected' : ''}`}
                      onClick={() => applyPreset(preset)}
                    >
                      <span className="sandbox-preset-label">{preset.label}</span>
                      <span className="sandbox-preset-bg">{preset.background}</span>
                    </button>
                  ))}
                </section>
              </section>
            ) : null}
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
                        className="sandbox-skill-btn sandbox-skill-btn-lg"
                        disabled={(skills[skillName] ?? 0) - 10 < SKILL_MIN}
                        onClick={() => adjustSkill(skillName, -10)}
                      >
                        -10
                      </button>
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
                        disabled={(skills[skillName] ?? 0) >= SKILL_MAX || remaining <= 0}
                        onClick={() => adjustSkill(skillName, 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="sandbox-skill-btn sandbox-skill-btn-lg"
                        disabled={
                          (skills[skillName] ?? 0) + 10 > SKILL_MAX || remaining < 10
                        }
                        onClick={() => adjustSkill(skillName, 10)}
                      >
                        +10
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
                onClick={() => setStep(2.5)}
              >
                {'\u4e0b\u4e00\u6b65'}
              </button>
            </section>
          </>
        ) : null}

        {step === 2.5 ? (
          <div className="prologue-step sandbox-history-step">
            <h2 className="sandbox-step-title">这个世界发生过什么？</h2>
            <p className="prologue-hint sandbox-history-hint">
              历史大事件将影响你探索到的每一片土地
            </p>

            {isGeneratingHistory ? (
              <div className="history-generating" role="status" aria-live="polite">
                <div className="history-gen-spinner">◆</div>
                <div className="history-gen-text">{historyGenText}</div>
              </div>
            ) : null}

            {!worldHistoryMode && !isGeneratingHistory ? (
              <div className="history-mode-select">
                <button
                  type="button"
                  className="mode-card"
                  onClick={() => void handleAiWorldHistory()}
                >
                  <div className="mode-title">让AI决定</div>
                  <div className="mode-desc">AI根据世界观自动生成历史背景</div>
                </button>
                <button
                  type="button"
                  className="mode-card"
                  onClick={() => setWorldHistoryMode('custom')}
                >
                  <div className="mode-title">我来定义</div>
                  <div className="mode-desc">自己写下改变世界的大事件（最多3条）</div>
                </button>
              </div>
            ) : null}

            {worldHistoryMode === 'custom' ? (
              <div className="custom-events">
                {customEvents.map((event, idx) => (
                  <div key={idx} className="event-form">
                    <div className="event-form-header">
                      <span>事件 {idx + 1}</span>
                      {customEvents.length > 1 ? (
                        <button
                          type="button"
                          className="remove-event-btn"
                          onClick={() =>
                            setCustomEvents(customEvents.filter((_, i) => i !== idx))
                          }
                        >
                          删除
                        </button>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      placeholder="事件名称"
                      value={event.name}
                      onChange={(e) => {
                        const updated = [...customEvents]
                        updated[idx] = { ...updated[idx], name: e.target.value }
                        setCustomEvents(updated)
                      }}
                    />
                    <select
                      value={event.type}
                      onChange={(e) => {
                        const updated = [...customEvents]
                        updated[idx] = { ...updated[idx], type: e.target.value }
                        setCustomEvents(updated)
                      }}
                    >
                      {EVENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={event.era}
                      onChange={(e) => {
                        const updated = [...customEvents]
                        updated[idx] = { ...updated[idx], era: e.target.value }
                        setCustomEvents(updated)
                      }}
                    >
                      {ERAS.map((era) => (
                        <option key={era} value={era}>
                          {era}
                        </option>
                      ))}
                    </select>
                    <textarea
                      placeholder="简述这个事件（一两句话）"
                      value={event.summary}
                      onChange={(e) => {
                        const updated = [...customEvents]
                        updated[idx] = { ...updated[idx], summary: e.target.value }
                        setCustomEvents(updated)
                      }}
                    />
                  </div>
                ))}

                {customEvents.length < 3 ? (
                  <button
                    type="button"
                    className="add-event-btn"
                    onClick={() =>
                      setCustomEvents([
                        ...customEvents,
                        { name: '', type: 'war', era: '百年前', summary: '' },
                      ])
                    }
                  >
                    + 添加事件
                  </button>
                ) : null}

                <section className="prologue-footer">
                  <button type="button" className="prologue-btn" onClick={() => setStep(2)}>
                    上一步
                  </button>
                  <button
                    type="button"
                    className="prologue-btn prologue-btn-primary"
                    disabled={customEvents.some((e) => !e.name.trim() || !e.summary.trim())}
                    onClick={confirmCustomHistory}
                  >
                    确认，开始冒险
                  </button>
                </section>
              </div>
            ) : (
              <section className="prologue-footer">
                <button type="button" className="prologue-btn" onClick={() => setStep(2)}>
                  上一步
                </button>
              </section>
            )}
          </div>
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
                  setStep(2.5)
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
