import { SANDBOX_SKILL_NAMES } from '../config/sandbox_judge_prompt.js'

/**
 * @typedef {import('../sandboxStorage.js').SandboxCharacter} SandboxCharacter
 * @typedef {import('../sandboxStorage.js').SandboxCompanion} SandboxCompanion
 * @typedef {import('../sandboxStorage.js').SandboxPlayerInventory} SandboxPlayerInventory
 * @typedef {import('../sandboxStorage.js').SandboxWorldState} SandboxWorldState
 * @typedef {import('../sandboxStorage.js').SandboxQuestState} SandboxQuestState
 * @typedef {import('../sandboxStorage.js').SandboxQuestEntry} SandboxQuestEntry
 */

/**
 * @param {{
 *   leftTab: 'player' | 'companions',
 *   onLeftTabChange: (t: 'player' | 'companions') => void,
 *   character: SandboxCharacter,
 *   playerInventory: SandboxPlayerInventory,
 *   companions: SandboxCompanion[],
 *   statCard: import('react').ReactNode,
 *   minimapSlot?: import('react').ReactNode,
 *   labels: Record<string, string>,
 *   safeSkillValue: (c: SandboxCharacter, skill: string) => number,
 * }} props
 */
export function SandboxLeftPanelTabs({
  leftTab,
  onLeftTabChange,
  character,
  playerInventory,
  companions,
  statCard,
  minimapSlot = null,
  labels,
  safeSkillValue,
}) {
  const activeCompanions = companions.filter((c) => c.status === 'active')
  const hasCompanions = activeCompanions.length > 0

  return (
    <>
      {minimapSlot}

      <div className="sandbox-tab-header left-tab-header">
        <button
          type="button"
          className={`sandbox-tab-btn left-tab-btn${leftTab === 'player' ? ' active' : ''}`}
          onClick={() => onLeftTabChange('player')}
        >
          {labels.playerTab}
        </button>
        {hasCompanions ? (
          <button
            type="button"
            className={`sandbox-tab-btn left-tab-btn${leftTab === 'companions' ? ' active' : ''}`}
            onClick={() => onLeftTabChange('companions')}
          >
            {labels.companionsTab}
          </button>
        ) : null}
      </div>

      {leftTab === 'player' ? (
        <div className="sandbox-tab-content left-tab-content">
          {statCard}

          <InventorySection
            title={labels.equipped}
            empty={labels.noEquipped}
            items={playerInventory.equipped}
          />
          <InventorySection
            title={labels.carried}
            empty={labels.emptyBag}
            items={playerInventory.carried}
            showQty
          />
        </div>
      ) : null}

      {leftTab === 'companions' && hasCompanions ? (
        <div className="sandbox-tab-content left-tab-content">
          {activeCompanions.map((companion, idx) => (
            <div key={companion.id} className="companion-block">
              <div className="companion-name">{companion.name}</div>
              {companion.role ? (
                <div className="companion-role muted small">{companion.role}</div>
              ) : null}
              <div className="hp-mp-row">
                <span>
                  HP {companion.hp}/{companion.maxHp}
                </span>
                <span>
                  MP {companion.mp}/{companion.maxMp}
                </span>
              </div>
              <div className="section-title">{labels.skills}</div>
              <ul className="sandbox-skill-readonly">
                {SANDBOX_SKILL_NAMES.map((skill) => (
                  <li key={skill} className="skill-row">
                    <span>{skill}</span>
                    <span>{companion.skills[skill] ?? 0}</span>
                  </li>
                ))}
              </ul>
              <InventorySection
                title={labels.equipped}
                empty={labels.noEquipped}
                items={companion.equipped ?? []}
              />
              <InventorySection
                title={labels.carried}
                empty={labels.emptyBag}
                items={companion.carried ?? []}
                showQty
              />
              {idx < activeCompanions.length - 1 ? <div className="companion-divider" /> : null}
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}

/**
 * @param {{
 *   title: string,
 *   empty: string,
 *   items: import('../sandboxStorage.js').SandboxInventoryItem[],
 *   showQty?: boolean,
 * }} props
 */
function InventorySection({ title, empty, items, showQty = false }) {
  return (
    <div className="info-section">
      <div className="section-title">{title}</div>
      {items.length === 0 ? (
        <div className="empty-hint">{empty}</div>
      ) : (
        items.map((item, i) => (
          <div key={`${item.name}-${i}`} className="item-row inventory-item-row">
            <span className="item-name">{item.name}</span>
            {showQty && item.quantity && item.quantity > 1 ? (
              <span className="item-qty">x{item.quantity}</span>
            ) : null}
            {item.description ? <span className="item-desc">{item.description}</span> : null}
          </div>
        ))
      )}
    </div>
  )
}

/**
 * @param {{
 *   rightTab: 'world' | 'quest' | 'dice',
 *   onRightTabChange: (t: 'world' | 'quest' | 'dice') => void,
 *   worldState: SandboxWorldState,
 *   questState: SandboxQuestState,
 *   expandedQuestIds: Set<string>,
 *   onToggleQuest: (id: string) => void,
 *   diceBlock: import('react').ReactNode,
 *   labels: Record<string, string>,
 * }} props
 */
export function SandboxRightPanelTabs({
  rightTab,
  onRightTabChange,
  worldState,
  questState,
  expandedQuestIds,
  onToggleQuest,
  diceBlock,
  labels,
}) {
  const mainActive = questState.quests.filter((q) => q.category === 'main' && q.status === 'active')
  const sideActive = questState.quests.filter((q) => q.category === 'side' && q.status === 'active')

  const env = worldState.environment ?? {
    weather: '晴',
    timeOfDay: '正午',
    season: '春',
    dayCount: 1,
  }
  const eco = worldState.economy ?? { priceLevel: 3, currency: '金币', marketNote: '' }

  return (
    <div className="sandbox-right-panel sandbox-right-panel--tabs">
      <div className="sandbox-tab-header right-tab-header">
        <button
          type="button"
          className={`sandbox-tab-btn right-tab-btn${rightTab === 'world' ? ' active' : ''}`}
          onClick={() => onRightTabChange('world')}
        >
          {labels.worldTab}
        </button>
        <button
          type="button"
          className={`sandbox-tab-btn right-tab-btn${rightTab === 'quest' ? ' active' : ''}`}
          onClick={() => onRightTabChange('quest')}
        >
          {labels.questTab}
        </button>
        <button
          type="button"
          className={`sandbox-tab-btn right-tab-btn${rightTab === 'dice' ? ' active' : ''}`}
          onClick={() => onRightTabChange('dice')}
        >
          {labels.diceTab}
        </button>
      </div>

      {rightTab === 'world' ? (
        <div className="sandbox-tab-content right-tab-content">
          <div className="section-title">{labels.environment}</div>
          <div className="world-env world-item">
            第{env.dayCount}天 · {env.season} · {env.timeOfDay} · {env.weather}
          </div>

          <div className="section-title">经济</div>
          <div className="world-economy world-item">
            物价 {'★'.repeat(eco.priceLevel)}
            {'☆'.repeat(5 - eco.priceLevel)} | {eco.currency}
            {eco.marketNote ? <span className="market-note"> {eco.marketNote}</span> : null}
          </div>

          <div className="section-title">{labels.factions}</div>
          {worldState.factions.length === 0 ? (
            <div className="empty-hint">{labels.noFactions}</div>
          ) : (
            worldState.factions.map((f) => (
              <div key={f.id} className="world-item">
                {f.name} — {f.attitudeToPlayer} · {f.currentStatus}
              </div>
            ))
          )}

          <div className="section-title">{labels.locations}</div>
          {worldState.locations.length === 0 ? (
            <div className="empty-hint">{labels.noLocations}</div>
          ) : (
            worldState.locations.map((loc) => (
              <div key={loc.id} className="location-detail world-item">
                <span className="location-detail-name">{loc.name}</span>
                {!loc.isAccessible ? <span className="loc-blocked">封锁</span> : null}
                <span className="loc-danger">
                  危险{'●'.repeat(loc.dangerLevel)}
                  {'○'.repeat(5 - loc.dangerLevel)}
                </span>
                {loc.controlledBy ? (
                  <span className="loc-control">{loc.controlledBy}</span>
                ) : null}
                {loc.status ? <span className="loc-status">{loc.status}</span> : null}
                {!loc.isAccessible && loc.accessNote ? (
                  <span className="loc-access-note">{loc.accessNote}</span>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {rightTab === 'quest' ? (
        <div className="sandbox-tab-content right-tab-content">
          <div className="section-title">{labels.questMain}</div>
          {mainActive.length === 0 ? (
            <div className="empty-hint">{labels.noMainQuest}</div>
          ) : (
            mainActive.map((q) => (
              <QuestBlock
                key={q.id}
                quest={q}
                expanded={expandedQuestIds.has(q.id)}
                onToggle={() => onToggleQuest(q.id)}
                labels={labels}
              />
            ))
          )}

          <div className="section-title">{labels.questSide}</div>
          {sideActive.length === 0 ? (
            <div className="empty-hint">{labels.noSideQuest}</div>
          ) : (
            sideActive.map((q) => (
              <QuestBlock
                key={q.id}
                quest={q}
                expanded={expandedQuestIds.has(q.id)}
                onToggle={() => onToggleQuest(q.id)}
                labels={labels}
              />
            ))
          )}

          {questState.quests.filter((q) => q.status !== 'active').length > 0 ? (
            <>
              <div className="section-title">{labels.questHistory}</div>
              {questState.quests
                .filter((q) => q.status !== 'active')
                .map((q) => (
                  <QuestBlock
                    key={q.id}
                    quest={q}
                    expanded={expandedQuestIds.has(q.id)}
                    onToggle={() => onToggleQuest(q.id)}
                    labels={labels}
                  />
                ))}
            </>
          ) : null}
        </div>
      ) : null}

      {rightTab === 'dice' ? (
        <div className="sandbox-tab-content right-tab-content sandbox-dice-tab">{diceBlock}</div>
      ) : null}
    </div>
  )
}

/**
 * @param {{
 *   quest: SandboxQuestEntry,
 *   expanded: boolean,
 *   onToggle: () => void,
 *   labels: Record<string, string>,
 * }} props
 */
function QuestBlock({ quest, expanded, onToggle, labels }) {
  const isDone = quest.status === 'completed' || quest.status === 'failed'
  const folded = isDone && !expanded
  const statusLabel =
    quest.status === 'completed' ? labels.questCompleted : labels.questFailed

  return (
    <div
      className={`quest-block quest-item quest-${quest.status}${folded ? ' quest-item--folded' : ''}`}
      onClick={isDone ? onToggle : undefined}
      onKeyDown={
        isDone
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggle()
              }
            }
          : undefined
      }
      role={isDone ? 'button' : undefined}
      tabIndex={isDone ? 0 : undefined}
    >
      <div className="quest-item-head">
        <div className={`quest-title quest-title--${quest.category}`}>{quest.title}</div>
        {isDone ? <span className="quest-status-badge">{statusLabel}</span> : null}
      </div>
      {!folded
        ? quest.objectives.map((obj) => (
            <div
              key={obj.id}
              className={`quest-obj${obj.completed ? ' completed' : ''}`}
            >
              {obj.completed ? '?' : '?'} {obj.description}
            </div>
          ))
        : null}
    </div>
  )
}
