/**
 * @typedef {import('../sandboxStorage.js').SandboxCharacter} SandboxCharacter
 */

/**
 * @param {{
 *   character: SandboxCharacter | null,
 *   flash?: boolean | { hp?: 'up' | 'down', mp?: 'up' | 'down' },
 *   onChange?: (key: string, raw: string) => void,
 * }} props
 */
export default function SandboxStatCard({ character, flash, onChange }) {
  void onChange // reserved for manual stat edits
  if (!character) return null

  const {
    name,
    gender,
    background,
    skills = {},
    hp,
    maxHp,
    mp,
    maxMp,
    items = [],
  } = character

  const hasFlash =
    !!flash &&
    (typeof flash !== 'object' ||
      !!(/** @type {{ hp?: string, mp?: string }} */ (flash).hp) ||
      /** @type {{ hp?: string, mp?: string }} */ (flash).mp)

  return (
    <div className="stat-card">
      <div className="info-section">
        <div className="section-title">基础信息</div>
        <div className="char-name-row">
          <span className="char-name">{name}</span>
          <span className="char-gender">{gender}</span>
        </div>
        <div className={`hp-mp-row${hasFlash ? ' stat-flash' : ''}`}>
          <span className="hp-text">
            HP {hp}/{maxHp}
          </span>
          <span className="mp-text">
            MP {mp}/{maxMp}
          </span>
        </div>
        {background ? <div className="background-text">{background}</div> : null}
      </div>

      <div className="info-section">
        <div className="section-title">技能</div>
        {Object.entries(skills).map(([skill, val]) => (
          <div key={skill} className="skill-row">
            <span className="skill-name">{skill}</span>
            <div className="skill-bar-wrap">
              <div className="skill-bar" style={{ width: `${(Number(val) / 80) * 100}%` }} />
            </div>
            <span className="skill-val">{val}</span>
          </div>
        ))}
      </div>

      <div className="info-section">
        <div className="section-title">物品栏</div>
        {items.length === 0 ? (
          <div className="empty-hint">背包空空</div>
        ) : (
          items.map((item, i) => (
            <div key={`${item}-${i}`} className="item-row">
              <span className="item-dot">·</span>
              <span className="item-name">{item}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
