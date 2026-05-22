# AI Project State

生成时间：2026-05-22（末次同步：废弃文件清理、`applyStateChangeData` 单次读写）

本文档供新的 AI 对话快速接手项目。优先级：若本文档与源码冲突，以源码为准；若与用户最新指令冲突，以用户最新指令为准。

## 1. 项目概览

### 技术栈

- 前端：React 19 + Vite 8。
- 语言：JavaScript / JSX，使用 JSDoc `@typedef` 表达类型。
- 样式：原生 CSS，移动端优先，多个屏幕/组件各自维护 CSS。
- AI 接口：`src/deepseek.js` 调用 DeepSeek Chat Completions，模型常量当前为 `deepseek-v4-flash`。
- 存储：浏览器 `localStorage`，CoC 与沙盒各自分槽存储。
- 构建/检查：`npm run build`、`npm run lint`。

### 双模式说明

- CoC 主线：原有克苏鲁跑团主线，入口在 `GameApp.jsx`，配置在 `src/config/`，存储在 `storage.js` 的 `coc-slot-*` key 下。
- 沙盒模式：新增的通用世界观跑团，入口在 `sandbox/SandboxGameApp.jsx`，序幕在 `sandbox/prologue/SandboxPrologue.jsx`，配置与存储集中在 `src/sandbox/`。
- 路由统一在 `App.jsx`，除路由/模式选择外，应严格避免改动 CoC 主线文件。

### 当前已实现功能

- 全局模式选择：CoC 主线 / 沙盒模式。
- CoC：API Key、序幕、主游戏、掷骰、打字机、存档槽、导入导出、封档摘要。
- 沙盒：4 个槽位、世界观选择、角色创建、序幕生成、主游戏对话。
- 沙盒西式奇幻：地区选择、种族选择、地区/种族写入角色并注入 GM prompt。
- 沙盒七项技能：战斗、交涉、感知、潜行、学识、意志、体魄。
- 沙盒 Judge：独立裁判调用判断是否需要技能检定。
- 沙盒骰子：D100，连续失败影响逻辑，支持伙伴检定。
- 沙盒 GM 回复：当前主 GM 回复为五段格式，不再要求在主回复中输出状态 JSON。
- 沙盒状态变更：新增独立 API 调用 `sandboxStateChangeExtractor.js` 提取并应用 NPC/任务/地点/环境/背包/同伴/HPMP。
- 沙盒事实/时间线/记忆图：`extractAllStateUpdates` 后台提取事实库、事件时间线、NPC 记忆图谱。
- 沙盒世界书：内置世界书 + 自定义条目，支持按关键词注入。
- 沙盒侧栏：角色、背包、伙伴、NPC、任务、世界状态、世界书入口。
- 沙盒时间线弹窗：展示事件时间线。
- 沙盒撤回：`playerTurnCount > 1` 后可保存/恢复撤回快照。
- 沙盒封档：将事件归档，清理部分阶段性提取状态。
- 存档导入导出：CoC 与沙盒各自支持 slot bundle。

## 2. 完整目录结构与文件职责

### `src/` 根目录

- `src/main.jsx`：React 应用入口，挂载 `App`。
- `src/App.jsx`：顶层路由、模式选择、槽位选择、CoC/沙盒入口切换。
- `src/App.css`：顶层布局、通用视觉样式。
- `src/index.css`：全局基础 CSS。
- `src/deepseek.js`：DeepSeek API 封装，支持非流式与流式请求。
- `src/storage.js`：CoC 存档与全局偏好存储；也维护 `selectedMode` / `selectedSlot`。
- `src/GameApp.jsx`：CoC 主游戏界面和主循环。
- `src/startActOne.js`：CoC 第一幕启动逻辑。
- `src/playerTurn.js`：CoC 玩家回合流程。
- `src/gmTurn.js`：CoC GM 回复生成与校验调用。
- `src/gmRollLoop.js`：CoC GM 掷骰循环。
- `src/validateGmReply.js`：CoC GM 回复格式校验。
- `src/typewriter.js`：CoC 打字机展示。
- `src/rollingSummary.js`：CoC 滚动摘要。
- `src/turnSummary.js`：CoC 单轮摘要。
- `src/archiveEvent.js`：CoC 封档事件生成。
- `src/resolveTurnRolls.js`：预处理/解析本轮骰子结果。
- `src/rollMarker.js`：识别 `[ROLL:技能:数值]` 标记。
- `src/dice.js`：CoC 骰子工具。
- `src/cocJudge.js`：CoC 裁判逻辑。
- `src/skillJudge.js`：CoC 技能判定解析。
- `src/playerSkills.js`：CoC 玩家技能数据。
- `src/characterInit.js`：CoC 角色初始化。
- `src/parseGmStatus.js`：CoC 从 GM 文本解析角色状态。
- `src/parseGmItems.js`：CoC 从 GM 文本解析物品。
- `src/parseScenarios.js`：CoC 场景解析。
- `src/itemInject.js`：CoC 物品上下文注入。
- `src/syncInventoryFromGm.js`：CoC 根据 GM 文本同步物品。
- `src/syncRosterFromGm.js`：CoC 根据 GM 文本同步队伍/角色状态。

### `src/config/`

- `src/config/act_one_prompt.js`：CoC 第一幕 prompt。
- `src/config/characters.js`：CoC 角色配置。
- `src/config/characterSprites.js`：角色立绘/像素动画配置。
- `src/config/gmLoadingPhrases.js`：CoC GM 加载提示语。
- `src/config/judge_prompt.js`：CoC 裁判 prompt。
- `src/config/prologue_prompt.js`：CoC 序幕生成 prompt。
- `src/config/prologue_texts.js`：CoC 序幕文本。
- `src/config/summary_prompt.js`：CoC 摘要 prompt。
- `src/config/system_prompt.js`：CoC GM 系统 prompt。
- `src/config/world_detail.js`：CoC 世界细节配置。

### `src/components/`

- `src/components/CharacterPhotoFrame.jsx`：角色照片框组件。
- `src/components/CharacterSprite.jsx`：角色精灵显示组件。
- `src/components/MobileDrawer.jsx`：移动端抽屉组件。
- `src/components/MobileIcons.jsx`：移动端图标组件。
- `src/components/PartnerAvatarButton.jsx`：伙伴头像按钮。
- `src/components/PartnerMiniCard.jsx`：伙伴迷你卡片。
- `src/components/SpriteAnimator.jsx`：精灵动画组件。
- `src/components/TypewriterText.jsx`：通用打字机文本组件。

### `src/hooks/`

- `src/hooks/useIsMobile.js`：判断移动端视口。
- `src/hooks/useMobileGestures.js`：移动端手势处理。
- `src/hooks/useSpriteState.js`：角色精灵状态 hook。
- `src/hooks/useVisualViewportOffset.js`：移动端键盘/视口偏移 hook。

### `src/prologue/`

- `src/prologue/ApiKeyScreen.jsx`：API Key 输入屏。
- `src/prologue/Prologue.jsx`：CoC 序幕 UI 与生成流程。
- `src/prologue/Prologue.css`：CoC 序幕样式。
- `src/prologue/finishPrologue.js`：CoC 序幕完成后写入存档。

### `src/screens/`

- `src/screens/MainScreen.jsx`：主入口屏。
- `src/screens/ModeSelectScreen.jsx`：CoC 模式选择（历史；沙盒现用 `SandboxModeSelectScreen`）。
- `src/screens/ScreenBackButton.jsx`：返回按钮。
- `src/screens/SlotSelectScreen.jsx`：存档槽选择/删除/导入导出。
- `src/screens/Screens.css`：通用屏幕样式。

### `src/worldbook/`

- `src/worldbook/worldbookData.js`：内置世界书条目，含 `WorldbookEntry` typedef。
- `src/worldbook/worldbookMatcher.js`：关键词匹配并构造世界书注入文本。
- `src/worldbook/worldbookStorage.js`：每个沙盒槽的自定义世界书 localStorage 读写。
- `src/worldbook/WorldbookEditor.jsx`：世界书编辑 UI。
- `src/worldbook/WorldbookEditor.css`：世界书编辑样式。

### `src/sandbox/`

- `src/sandbox/SandboxGameApp.jsx`：沙盒主游戏 UI 与回合编排。
- `src/sandbox/SandboxGameApp.css`：沙盒主游戏样式。
- `src/sandbox/SandboxModeSelectScreen.jsx`：沙盒模式入口屏。
- `src/sandbox/SandboxModeSelectScreen.css`：沙盒模式入口样式。
- `src/sandbox/sandboxStorage.js`：沙盒主存档、侧存储、撤回、导入导出。
- `src/sandbox/sandboxMigration.js`：沙盒数据迁移与补字段。
- `src/sandbox/sandboxPlayerTurn.js`：沙盒玩家回合主流程，调用 Judge、骰子、GM、后台提取。
- `src/sandbox/sandboxGmTurn.js`：沙盒 GM 非流式生成与五段格式校验。
- `src/sandbox/sandboxValidateGmReply.js`：沙盒 GM 五段格式校验；仍保留旧【状态变更】JSON 提取工具供兼容代码使用。
- `src/sandbox/sandboxStateChangeExtractor.js`：独立 API 提取状态变更 JSON，并应用到存储。
- `src/sandbox/sandboxStateChangeParser.js`：`applyStateChangeData` 应用状态变更；主存档字段一次 load/一次 save；NPC/任务/世界走独立 key；兼容旧 GM 内【状态变更】。
- `src/sandbox/sandboxFactExtractor.js`：仅事实库、事件时间线、NPC 记忆图谱后台提取（不再处理背包）；保留 deprecated wrapper。
- `src/sandbox/sandboxExtractRollback.js`：重生成时回滚本轮事实/时间线/记忆图。
- `src/sandbox/sandboxArchiveEvent.js`：沙盒封档，归档事件并清理阶段性时间线。
- `src/sandbox/sandboxRollingSummary.js`：沙盒滚动摘要。
- `src/sandbox/sandboxTurnSummary.js`：沙盒单轮摘要。
- `src/sandbox/sandboxTypewriter.js`：沙盒打字机展示。
- `src/sandbox/sandboxMessageChain.js`：构造发给 GM 的消息链。
- `src/sandbox/sandboxContextInject.js`：构造角色/伙伴上下文注入。
- `src/sandbox/sandboxDice.js`：沙盒 D100 判定与 `[ROLL_RESULT]` 文本。
- `src/sandbox/sandboxSkillJudge.js`：解析 Judge 返回的技能检定 JSON。
- `src/sandbox/sandboxParseGmStatus.js`：`parseSandboxGmStatus`（序幕）、`mergeSandboxFromGmText`（主游戏）解析五段 GM 展示文本中的 HP/MP/物品/伙伴。
- `src/sandbox/sandboxNpcMatcher.js`：按玩家输入/近期消息匹配相关 NPC 和记忆图节点。

### `src/sandbox/config/`

- `src/sandbox/config/sandbox_system_prompt.js`：沙盒 GM 主 prompt；当前要求五段，不要求【状态变更】JSON。
- `src/sandbox/config/sandbox_judge_prompt.js`：沙盒 Judge prompt 与七项技能常量。
- `src/sandbox/config/sandbox_worlds.js`：沙盒世界观配置。
- `src/sandbox/config/sandbox_fantasy_regions.js`：西式奇幻地区与种族配置。
- `src/sandbox/config/sandbox_summary_prompt.js`：沙盒摘要 prompt。
- `src/sandbox/config/sandbox_loading_phrases.js`：沙盒加载提示语。
- 开场文案由 `buildSandboxOpeningUserMessage()`（`sandbox_system_prompt.js`）生成，无独立 opening prompt 文件。

### `src/sandbox/prologue/`

- `src/sandbox/prologue/SandboxPrologue.jsx`：沙盒序幕 UI，世界观/地区/种族/角色/技能/开场生成。
- `src/sandbox/prologue/SandboxPrologue.css`：沙盒序幕样式。
- `src/sandbox/prologue/finishSandboxPrologue.js`：序幕完成后写入沙盒槽；兼容旧 openingRaw 中的【状态变更】。

### `src/sandbox/components/`

- `src/sandbox/components/SandboxSidePanels.jsx`：沙盒左右侧栏 Tabs，显示状态、背包、伙伴、NPC、任务、世界书等。
- `src/sandbox/components/SandboxStatCard.jsx`：沙盒 HP/MP 等状态卡片。
- `src/sandbox/components/TimelineOverlay.jsx`：事件时间线弹窗。
- `src/sandbox/components/TimelineOverlay.css`：时间线弹窗样式。

## 3. 沙盒序幕流程

入口：`App.jsx` 渲染 `SandboxPrologue`，传入 `apiKey`、`slotIndex`、`onComplete`。

当前步骤顺序：

1. 世界观选择（Step 1）
   - 读取 `SANDBOX_WORLDS`。
   - 可选择预设开局（目前 `WORLD_PRESETS` 在组件内）。
   - 非 fantasy 世界直接进入创建角色；fantasy 世界进入地区选择。

2. 初始地区选择（Step 1.5，仅 fantasy）
   - 数据来自 `sandbox_fantasy_regions.js` 的 `FANTASY_REGIONS`。
   - 显示地区名、副标题、统治势力。
   - 详情折叠面板显示描述、开局场景、开局优势、各种族态度。
   - 写入角色字段 `regionId`。

3. 创建角色（Step 2）
   - fantasy 世界显示种族折叠面板。
   - 种族来自 `FANTASY_RACE_OPTIONS`。
   - 选择后写入 `raceId` / `raceName`。
   - 输入姓名、性别、背景。
   - 调整七项技能，总点数 `SKILL_TOTAL = 350`，单项范围 5~80。
   - HP/MP 根据体魄/学识计算。

4. 生成开场（Step 3）
   - `buildCharacter()` 生成角色对象。
   - `buildSandboxOpeningUserMessage(character, world)` 生成用户消息。
   - `buildSandboxGmPrompt(...)` 生成系统 prompt。
   - `fetchValidatedSandboxGmReply(...)` 调用 GM。
   - 当前开场要求五段，不要求【状态变更】。
   - `stripStateChangeSection` 仅用于兼容旧回复。
   - `runSandboxTypewriter` 展示开场。

5. 进入游戏
   - `handleEnterGame()` 校验 `effectiveSlotIndex`。
   - `finishSandboxPrologue({ slotIndex, character, world, opening, openingRaw })` 写入沙盒槽。
   - `onComplete()` 回到 `App.jsx`。
   - `App.handleSandboxPrologueComplete()` 校验 `selectedSlot` 为 1~4，写回 `selectedMode: 'sandbox'`，跳转 `sandboxGame`。

## 4. 沙盒主游戏流程

### 总览

```text
玩家输入
  -> SandboxGameApp.handleSend
  -> saveUndoSnapshot
  -> runSandboxTurn
  -> runSandboxPlayerTurn
  -> Judge API 判断技能
  -> resolveSandboxSkillChecks 掷骰
  -> buildSandboxGmPrompt 生成 GM system prompt
  -> fetchValidatedSandboxGmReply 生成五段 GM 回复
  -> validateSandboxGmReply 校验五段
  -> runSandboxTypewriter 打字机展示
  -> persistSandboxToSlot 保存消息
  -> onGmComplete(displayText) 触发 extractAllStateUpdates（事实库/时间线/记忆图，含 playerText）
  -> extractAndApplyStateChange 并行触发（状态 JSON → applyStateChangeData）
  -> 任一提取成功后可 refreshExtractedState 刷新侧栏/时间线
```

### Judge 调用

- 文件：`sandboxPlayerTurn.js`。
- Prompt：`SANDBOX_JUDGE_SYSTEM_PROMPT`。
- 输入：玩家姓名、同行伙伴、玩家行动。
- 输出：

```json
[]
```

或：

```json
[{"skill":"感知","value":50}]
```

或：

```json
{"checks":[{"character":"伙伴名","skill":"潜行","value":50}]}
```

- 程序会用角色卡/伙伴卡覆盖 `value`，技能必须为七项之一。

### 掷骰逻辑

- `parseSandboxJudgeSkillsJson` 解析 Judge JSON。
- `resolveSandboxCheckValues` 绑定玩家或伙伴技能值。
- `resolveSandboxSkillChecks` 生成 D100 结果。
- 结果通过 `buildPreRollSystemContent` 注入为 `[ROLL_RESULT:技能名:投掷值:判定]`。
- GM prompt 附加 `SANDBOX_PRE_ROLL_ADDENDUM`，要求不再输出 `[ROLL]`。

### GM 生成

- `buildSandboxGmPrompt` 汇总：
  - 世界观 flavor。
  - 世界书注入。
  - 主角档案。
  - 地区与种族。
  - 相关 NPC。
  - 当前伙伴。
  - 事实库。
  - 近期事件时间线。
  - 世界状态。
  - 进行中任务。
  - NPC 记忆与关系。
  - 历史封档。
- `buildSandboxGmApiChain` 组装消息链。
- `fetchValidatedSandboxGmReply` 非流式调用 API，失败时追加格式纠正提示重试一次。

### GM 回复格式与校验

当前实际 GM 主回复格式为五段：

```text
【场景】
【主角行为】
【他人行为】
【当前状态】
【你可以：】
```

`validateSandboxGmReply` 校验：

- 必须包含上述五个标题。
- `【当前状态】` 块必须包含 HP 数字格式。
- `【当前状态】` 块必须包含 MP 数字格式。
- `【当前状态】` 块必须包含 `物品：` 或 `物品:`。
- 若传入 `characterName`，状态块必须包含主角姓名。

历史说明：旧协议曾要求六段并包含 `【状态变更】` JSON。由于格式异常频繁，当前已拆分为独立状态提取 API；不要再把【状态变更】塞回主 GM prompt，除非用户明确要求回滚架构。

### 状态变更解析

当前状态变更不由 GM 主回复输出，而由 `sandboxStateChangeExtractor.js` 单独调用 API：

- 输入：当前状态快照、本轮玩家行动、本轮 GM 回复。
- 输出：只允许 JSON 对象，无变化输出 `{}`。
- 可写字段：
  - `npcChanges`
  - `questChanges`
  - `locationChanges`
  - `environmentChange`
  - `playerInventory`
  - `companionChanges`
  - `playerStatus`
- 应用函数：`applyStateChangeData`（`sandboxStateChangeParser.js`）。
- **主存档写入**：`playerStatus` / `playerInventory` / `companionChanges` 在同一 `loadSandboxSlot` 对象上修改后，**只调用一次** `saveSandboxSlot`，避免多次读写互相覆盖导致同伴数值丢失。
- **侧存储写入**：`npcChanges`、`questChanges`、`locationChanges`/`environmentChange` 仍各自 `load/save` 独立 localStorage key。
- 异常：`applyStateChangeData` 各块 `catch` 使用 `console.warn('applyStateChangeData [slot|npcChanges|...]:', e)`，不静默吞错。
- 降级策略：状态提取 API 失败只 `console.warn`，不阻塞剧情展示。

旧兼容：

- `applyStateChangeFromGmReply` 仍可从旧 GM 回复中的 `【状态变更】` 提取 JSON。
- `finishSandboxPrologue` 仍兼容旧 openingRaw。

### 八合一 AI 提取（现实际保留事实库/时间线/记忆图）

文件：`sandboxFactExtractor.js`。

当前职责：

- 新事实：`newFacts`
- 更新事实：`updatedFacts`
- 时间线事件：`timelineEvent`
- NPC 记忆图谱：`memoryGraphUpdates`

注意：prompt 文案中仍有“状态提取器”“NPC/任务/世界/物品/同伴状态已由【状态变更】段处理”等历史措辞。实际状态变更已由独立提取器处理，不再来自 GM 主回复的【状态变更】段。

### 打字机展示

- `presentGm` 调用 `runSandboxTypewriter`。
- 打字期间先插入空 GM placeholder。
- 打字结束后写入最终 GM 文本。
- `persistSandboxToSlot({ messages: finalMessages })` 保存。
- 保存后触发 `onGmComplete(displayText)` 启动事实/时间线/记忆图后台提取。
- 同时启动 `extractAndApplyStateChange` 后台状态变更提取。

## 5. 数据存储结构

### 全局偏好

Key：

```text
coc-simulator-state-v1
```

结构：

```ts
{
  apiKey: string,
  selectedMode: 'coc' | 'sandbox' | null,
  selectedSlot: number | null
}
```

说明：`selectedSlot` 最大允许 4，以支持沙盒 4 槽；CoC 对局数据仍只使用 1~2 槽。

### CoC 槽位 keys

格式：

```text
coc-slot-${slotIndex}-${field}
```

`slotIndex`：1~2。

字段：

```text
messages
inventory
roster
diceLog
turnSummaries
archivedEvents
eventIndex
playerTurnCount
prologueComplete
selectedScenario
scenarioTitle
meta
```

旧整体 key：

```text
coc-save-slot-${slotIndex}
```

### 沙盒主存档 keys

格式：

```text
sandbox-slot-${slotIndex}-${field}
```

`slotIndex`：1~4。

主字段：

```text
messages
character
diceLog
turnSummaries
archivedEvents
eventIndex
playerTurnCount
consecutiveFails
prologueComplete
world
meta
companions
player-inventory
```

旧整体 key：

```text
sandbox-save-slot-${slotIndex}
```

`SandboxState` 结构：

```ts
{
  character: SandboxCharacter | null,
  world: SandboxWorldRef | null,
  messages: SandboxChatMessage[],
  diceLog: SandboxDiceLogEntry[],
  playerTurnCount: number,
  consecutiveFails: number,
  prologueComplete: boolean,
  turnSummaries: SandboxTurnSummaryEntry[],
  archivedEvents: SandboxArchivedEventEntry[],
  eventIndex: number,
  companions: SandboxCompanion[],
  playerInventory: SandboxPlayerInventory,
  __version?: number
}
```

### 沙盒侧存储 keys

```text
sandbox-slot-${slotIndex}-npc-archive
sandbox-slot-${slotIndex}-fact-database
sandbox-slot-${slotIndex}-event-timeline
sandbox-slot-${slotIndex}-world-state
sandbox-slot-${slotIndex}-quest-state
sandbox-slot-${slotIndex}-npc-memory-graph
```

结构：

```ts
SandboxNpcArchive = { npcs: SandboxNpcEntry[] }
SandboxFactDatabase = { facts: SandboxFactEntry[] }
SandboxEventTimeline = { events: SandboxTimelineEvent[] }
SandboxWorldState = {
  locations: SandboxWorldLocation[],
  factions: SandboxWorldFaction[],
  environment: SandboxWorldEnvironment,
  economy: SandboxWorldEconomy
}
SandboxQuestState = { quests: SandboxQuestEntry[] }
SandboxNpcMemoryGraph = {
  nodes: SandboxNpcMemoryNode[],
  edges: SandboxNpcMemoryEdge[]
}
```

### 世界书自定义条目

Key：

```text
sandbox-slot-${slotIndex}-worldbook
```

结构：

```ts
WorldbookEntry[] = [{
  id: string,
  keywords: string[],
  content: string,
  priority: number,
  worldId: string,
  isCustom: boolean
}]
```

### 撤回快照

Key：

```text
sandbox-slot-${slotIndex}-undo-snapshot
```

结构：

```ts
{
  messages: SandboxChatMessage[],
  playerTurnCount: number,
  consecutiveFails: number,
  factDatabase: SandboxFactDatabase,
  eventTimeline: SandboxEventTimeline,
  npcArchive: SandboxNpcArchive,
  worldState: SandboxWorldState,
  questState: SandboxQuestState,
  npcMemoryGraph: SandboxNpcMemoryGraph,
  lastPlayerMessage: string,
  snapshotAt: number
}
```

### 已移除/遗留沙盒 keys

删除槽位时会清理：

```text
sandbox-slot-${slotIndex}-map-state
sandbox-slot-${slotIndex}-world-memory-global-events
sandbox-slot-${slotIndex}-world-memory-local-events
sandbox-slot-${slotIndex}-world-memory-locations
sandbox-slot-${slotIndex}-world-memory-location-profiles
```

说明：地图 / 世界记忆模块已移除，key 仅作为清理遗留存在。

## 6. TypeDef 类型定义汇总

### CoC 与全局类型（`storage.js` / `App.jsx`）

```ts
type GameMode = 'coc' | 'sandbox'
type CocSlotIndex = 1 | 2
type AppScreen =
  | 'main'
  | 'apiKey'
  | 'modeSelect'
  | 'slotSelect'
  | 'prologue'
  | 'game'
  | 'sandboxPrologue'
  | 'sandboxGame'

type TurnSummaryEntry = { turn: number, summary: string }
type ArchivedEventEntry = { index: number, summary: string, archivedAt: string, endMessageId?: string }
type ChatMessage = { id: string, role: 'gm' | 'player' | 'system', content: string, ts: number, isSummary?: boolean, isArchive?: boolean }
type D100Outcome = 'extreme' | 'success' | 'fail' | 'fumble'
type DiceLogEntry = { id: string, skillName: string, value: number, dice: string, outcome: D100Outcome | null, judgeText: string, ts: number }
type PlayerChar = { name: string, hp: number, mp: number, san: number, talisman: number }
type PartnerChar = { name: string, hp: number, mp: number, san: number }
type SelectedScenario = { title: string, summary: string, tags: string[], opening: string }
type CocSlotMeta = { isEmpty: boolean, characterName: string, worldName: string, turnCount: number, lastPlayedAt: string, gameState: CocGameState }
type CocGameState = {
  player: PlayerChar | null,
  partner: PartnerChar | null,
  messages: ChatMessage[],
  diceLog: DiceLogEntry[],
  prologueComplete: boolean,
  selectedScenario: SelectedScenario | null,
  scenarioTitle: string | null,
  playerTurnCount: number,
  playerItems: string[],
  partnerItems: string[],
  sceneItems: string[],
  turnSummaries: TurnSummaryEntry[],
  archivedEvents: ArchivedEventEntry[],
  eventIndex: number
}
type AppState = {
  apiKey: string,
  selectedMode: GameMode | null,
  selectedSlot: number | null,
  player: PlayerChar | null,
  partner: PartnerChar | null,
  messages: ChatMessage[],
  diceLog: DiceLogEntry[],
  prologueComplete: boolean,
  selectedScenario: SelectedScenario | null,
  scenarioTitle: string | null,
  playerTurnCount: number,
  playerItems: string[],
  partnerItems: string[],
  sceneItems: string[]
}
type SlotExportBundle = {
  version: number,
  mode: 'sandbox' | 'coc',
  slotIndex: number,
  exportedAt: string,
  fields: Record<string, unknown>
}
```

### 沙盒存储类型（`sandboxStorage.js`）

```ts
type SandboxSlotMeta = {
  isEmpty: boolean,
  characterName: string,
  worldName: string,
  turnCount: number,
  lastPlayedAt: string,
  gameState: SandboxState
}
type SandboxTurnSummaryEntry = { turn: number, summary: string }
type SandboxArchivedEventEntry = { index: number, summary: string, archivedAt: string, endMessageId?: string }
type SandboxNpcEntry = {
  id: string,
  name: string,
  identity: string,
  appearance: string,
  personality: string,
  secret: string,
  relationship: string,
  relationStrength: number,
  status: string,
  isDead: boolean,
  updatedAt: string
}
type SandboxNpcArchive = { npcs: SandboxNpcEntry[] }
type SandboxFactCategory = 'world' | 'npc' | 'location' | 'item' | 'quest'
type SandboxFactEntry = {
  id: string,
  content: string,
  category: SandboxFactCategory,
  relatedNames: string[],
  createdAt: number,
  updatedAt: number,
  supersededBy: string | null,
  importance: number,
  confidence: 'high' | 'medium' | 'low',
  sourceTurn: number
}
type SandboxFactDatabase = { facts: SandboxFactEntry[] }
type SandboxTimelineCategory = 'story' | 'combat' | 'npc' | 'discovery' | 'quest'
type SandboxTimelineEvent = {
  id: string,
  turn: number,
  title: string,
  description: string,
  category: SandboxTimelineCategory,
  relatedNames: string[],
  consequence: string,
  importance: number,
  tags: string[]
}
type SandboxEventTimeline = { events: SandboxTimelineEvent[] }
type SandboxWorldLocation = { id: string, name: string, status: string, dangerLevel: number, controlledBy: string, isAccessible: boolean, accessNote: string, updatedAt: number }
type SandboxWorldFaction = { id: string, name: string, attitudeToPlayer: string, currentStatus: string, updatedAt: number }
type SandboxWorldEnvironment = { weather: string, timeOfDay: string, season: string, dayCount: number }
type SandboxWorldEconomy = { priceLevel: number, currency: string, marketNote: string }
type SandboxWorldState = { locations: SandboxWorldLocation[], factions: SandboxWorldFaction[], environment: SandboxWorldEnvironment, economy: SandboxWorldEconomy }
type SandboxQuestStatus = 'active' | 'completed' | 'failed'
type SandboxQuestCategory = 'main' | 'side'
type SandboxQuestObjective = { id: string, description: string, completed: boolean }
type SandboxQuestEntry = { id: string, title: string, description: string, status: SandboxQuestStatus, category: SandboxQuestCategory, givenBy: string, objectives: SandboxQuestObjective[], reward: string, createdAt: number, updatedAt: number }
type SandboxQuestState = { quests: SandboxQuestEntry[] }
type SandboxNpcPlayerMemory = { turn: number, content: string }
type SandboxNpcAttitudeEntry = { turn: number, attitude: string, reason: string }
type SandboxNpcMemoryNode = { id: string, name: string, memoriesOfPlayer: SandboxNpcPlayerMemory[], attitudeHistory: SandboxNpcAttitudeEntry[] }
type SandboxNpcMemoryEdge = { id: string, from: string, to: string, relationship: string, updatedAt: number }
type SandboxNpcMemoryGraph = { nodes: SandboxNpcMemoryNode[], edges: SandboxNpcMemoryEdge[] }
type SandboxCompanionStatus = 'active' | 'dead' | 'left'
type SandboxInventoryItem = { name: string, description: string, quantity?: number }
type SandboxPlayerInventory = { equipped: SandboxInventoryItem[], carried: SandboxInventoryItem[] }
type SandboxCompanion = {
  id: string,
  name: string,
  role: string,
  background: string,
  personality: string,
  appearance: string,
  skills: SandboxSkills,
  hp: number,
  maxHp: number,
  mp: number,
  maxMp: number,
  loyalty: number,
  control: number,
  goal: string,
  status: SandboxCompanionStatus,
  isDead: boolean,
  isDeparted: boolean,
  equipped: SandboxInventoryItem[],
  carried: SandboxInventoryItem[]
}
type SandboxChatMessage = { id: string, role: 'gm' | 'player' | 'system', content: string, ts: number, isSummary?: boolean, isArchive?: boolean }
type SandboxD100Outcome = 'extreme' | 'success' | 'fail' | 'fumble'
type SandboxDiceLogEntry = { id: string, skillName: string, value: number, dice: string, outcome: SandboxD100Outcome | null, judgeText: string, ts: number }
type SandboxSkills = Record<string, number>
type SandboxGender = '男' | '女' | '其他'
type SandboxCharacter = {
  name: string,
  gender: SandboxGender,
  background: string,
  skills: SandboxSkills,
  hp: number,
  maxHp: number,
  mp: number,
  maxMp: number,
  items: string[],
  regionId?: string | null,
  raceId?: string | null,
  raceName?: string | null
}
type SandboxWorldRef = { id: SandboxWorldId, name: string, flavor: string }
type SandboxState = {
  character: SandboxCharacter | null,
  world: SandboxWorldRef | null,
  messages: SandboxChatMessage[],
  diceLog: SandboxDiceLogEntry[],
  playerTurnCount: number,
  consecutiveFails: number,
  prologueComplete: boolean,
  turnSummaries: SandboxTurnSummaryEntry[],
  archivedEvents: SandboxArchivedEventEntry[],
  eventIndex: number,
  companions: SandboxCompanion[],
  playerInventory: SandboxPlayerInventory,
  __version?: number
}
```

### 沙盒世界与世界书类型

```ts
type SandboxWorldId = 'east' | 'fantasy' | 'cyberpunk' | 'wasteland' | 'custom'
type SandboxRegion = {
  id: string,
  name: string,
  subtitle: string,
  description: string,
  rulingFaction: string,
  openingScene: string,
  advantage: string,
  raceAttitudes: Record<string, string>
}
type SandboxRace = { id: string, name: string, description: string, npcBaseAttitude: string }
type SandboxWorld = {
  id: SandboxWorldId,
  name: string,
  subtitle: string,
  description: string,
  flavor: string,
  races: string[],
  regions?: SandboxRegion[],
  raceOptions?: SandboxRace[]
}
type WorldbookEntry = {
  id: string,
  keywords: string[],
  content: string,
  priority: number,
  worldId: string,
  isCustom: boolean
}
```

### 沙盒 AI 提取中间类型

```ts
type SandboxSkillCheck = { skill: string, value: number, character?: string }
type SandboxGmResult =
  | { ok: true, text: string }
  | { ok: false, code: string, message?: string, raw?: string }

type FactExtractNew = { content: string, category: SandboxFactCategory, relatedNames: string[], importance: number, confidence: 'high' | 'medium' | 'low' }
type FactExtractUpdate = { supersedes: string, content: string, category: SandboxFactCategory, relatedNames: string[], importance: number, confidence: 'high' | 'medium' | 'low' }
type TimelineExtractEvent = { title: string, description: string, category: SandboxTimelineCategory, relatedNames: string[], consequence: string, importance: number, tags: string[] }
type NpcExtractUpdate = { name: string, isNew?: boolean, identity?: string, appearance?: string, personality?: string, secret?: string, relationship?: string, relationStrength?: number, status?: string, isDead?: boolean }
type CompanionProfileExtract = { name: string, isNew?: boolean, role?: string, background?: string, personality?: string, appearance?: string, loyalty?: number, control?: number, goal?: string, isDead?: boolean, isDeparted?: boolean }
type LocationUpdate = { name: string, status?: string, dangerLevel?: number, controlledBy?: string, isAccessible?: boolean, accessNote?: string, isNew?: boolean }
type FactionUpdate = { name: string, attitudeToPlayer?: string, currentStatus?: string, isNew?: boolean }
type EnvironmentUpdate = { weather?: string, timeOfDay?: string, season?: string, dayPassed?: boolean }
type EconomyUpdate = { priceLevel?: number, currency?: string, marketNote?: string }
type WorldStateUpdates = { locations?: LocationUpdate[], factions?: FactionUpdate[], environment?: EnvironmentUpdate | null, economy?: EconomyUpdate | null }
type AllStateExtractResult = { newFacts: FactExtractNew[], updatedFacts: FactExtractUpdate[], timelineEvent: TimelineExtractEvent | null, memoryGraphUpdates: MemoryGraphUpdates | null }
type NewQuestExtract = { title: string, description: string, category: SandboxQuestCategory, givenBy: string, objectives: { description: string }[], reward: string }
type UpdatedQuestExtract = { id: string, status?: SandboxQuestStatus, completedObjectives?: string[], newObjectives?: { description: string }[] }
type QuestUpdates = { newQuests?: NewQuestExtract[], updatedQuests?: UpdatedQuestExtract[] }
type MemoryNodeUpdate = { npcName: string, newMemory?: string, newAttitude?: string, attitudeReason?: string }
type MemoryEdgeUpdate = { fromName: string, toName: string, relationship: string, isNew?: boolean }
type MemoryGraphUpdates = { nodeUpdates?: MemoryNodeUpdate[], edgeUpdates?: MemoryEdgeUpdate[] }
```

### 仅作为 import alias 的 typedef

多个文件声明了 import alias，例如：

```ts
type ChatMsg = import('../deepseek.js').ChatMsg
type SandboxCharacter = import('../sandboxStorage.js').SandboxCharacter
type SandboxCompanion = import('../sandboxStorage.js').SandboxCompanion
type SandboxFactEntry = import('../sandboxStorage.js').SandboxFactEntry
type SandboxTimelineEvent = import('../sandboxStorage.js').SandboxTimelineEvent
type SandboxWorldState = import('../sandboxStorage.js').SandboxWorldState
type SandboxQuestState = import('../sandboxStorage.js').SandboxQuestState
type SandboxNpcMemoryGraph = import('../sandboxStorage.js').SandboxNpcMemoryGraph
```

## 7. GM 协议

### 当前实际协议：五段 GM 主回复

当前源码要求沙盒 GM 主回复只输出五段：

```text
【场景】
环境与氛围、剧情推进；不替玩家做决定或替玩家发言。

【主角行为】
本轮玩家行动在叙事中的展开；若已预掷骰，体现检定后果。

【他人行为】
NPC、敌人或环境反应；无则写“无”。

【当前状态】
主角名 HP x/y MP x/y
物品：无
伙伴状态按 [伙伴:姓名] 或 [新伙伴:姓名] 输出。

【你可以：】
列出 2~4 个主角可采取的行动；不要问“要不要检定”。
```

### 历史六段协议

旧协议曾要求第六段：

```text
【状态变更】
{ ...JSON... }
```

这正是格式异常频繁的来源之一。当前修复方向是：主 GM 不再输出此段，由 `sandboxStateChangeExtractor.js` 额外调用一次 API 输出纯 JSON。

如果将来用户明确要求恢复六段，必须同步修改：

- `sandbox_system_prompt.js`
- `sandboxValidateGmReply.js`
- `sandboxGmTurn.js` 的重试提示
- `SandboxGameApp.jsx` 的状态应用时机
- `finishSandboxPrologue.js` 的序幕兼容逻辑

### 独立状态变更 JSON 协议

独立提取器输出：

```json
{}
```

或：

```json
{
  "playerStatus": { "hp": 12, "maxHp": 15 },
  "npcChanges": [
    {
      "name": "莱娜",
      "isNew": true,
      "identity": "旅店老板",
      "relationship": "中立",
      "status": "正在提供线索"
    }
  ]
}
```

规则：

- 只输出 JSON 对象。
- 无变化输出 `{}`。
- 只写本轮实际变化字段。
- `playerInventory` 是完整快照。
- `companionChanges` 中单个同伴必须包含完整当前 HP/MP/状态。
- `environmentChange.dayPassed=true` 只在明确过夜/次日时使用。

## 8. 已知问题

- GM 格式异常：历史根因是主 GM 同时写五段叙事 + 【状态变更】JSON。当前为五段主回复 + 独立 `sandboxStateChangeExtractor`；长上下文下五段格式仍可能偶发失败（`sandboxGmTurn` 会重试一次）。
- 序幕「未选择存档」：曾由 `selectedSlot` 上限（CoC 2 槽 vs 沙盒 4 槽）与槽位未锁定引起；已用 `normalizeAppSelectedSlot`、`normalizeSandboxSlotIndex`、`lockedSlotRef` 缓解。
- `SandboxCompanionStatus` typedef 为 `'active' | 'dead' | 'left'`，运行时状态提取常用 `departed` / `isDeparted`，需后续统一。
- `sandboxFactExtractor.js` prompt 仍写“NPC/任务/世界/物品/同伴状态已由【状态变更】段处理”，实际背包/同伴等由 `sandboxStateChangeExtractor` 处理，事实提取器只管事实/时间线/记忆图。

### 已修复（文档记录）

- 时间线不更新：已改为 GM 消息 `persistSandboxToSlot` 后再跑 `extractAllStateUpdates`，并传入 `playerText`。
- 同伴数值被覆盖消失：`applyStateChangeData` 已改为单次 load + 单次 save 主存档块。

## 9. 未完成的功能

- Quest State 升级：任务目标 ID/标题匹配仍较脆弱，`UpdatedQuestExtract` 用 id，但状态变更更新任务用 title。
- NPC Memory Graph 升级：关系图仍是基础节点/边，缺少更强的关系强度、时间衰减、冲突合并。
- playerInventory 升级：主角色 `items: string[]` 仍与结构化 `playerInventory` 并存，需要彻底迁移。
- companions 档案升级：伙伴状态、背包、离队/死亡字段需要统一归档模型。
- 世界书 CoC 对接：当前世界书只接入沙盒。
- GM 格式异常修复：主 GM 已拆出状态 JSON，但仍需继续观察五段格式在长上下文中的稳定性。

## 10. 对 AI 的工作规则

- 讨论清楚再写代码。
- 写代码统一用 Cursor 提示词格式时，使用代码块包裹完整代码。
- 沙盒和 CoC 严格分离。
- 不修改任何 CoC 相关文件，除非是 `App.jsx` 路由/模式切换必要改动。
- 新组件必须提供完整代码、完整 import、明确路径。
- 用户使用中文，移动端开发为主。
- 沙盒技能是七项：战斗 / 交涉 / 感知 / 潜行 / 学识 / 意志 / 体魄，不是八项。
- 在用户说“开始写”或“生成提示词”之前，只讨论不生成代码。若用户直接要求实现，则可进入代码修改。
- 遇到存档结构变化，优先加迁移与兼容读取，不要直接破坏旧存档。
- 任何沙盒状态写入必须确认 slotIndex 为 1~4。
- 不要静默吞掉关键异常；至少 `console.warn`。

## 11. 废弃代码与残留标注

### 已删除文件（2026-05-22 清理，勿再引用）

以下文件已从仓库移除，当前 `src/` 中无 import：

| 原路径 | 原因 |
|--------|------|
| `src/sandbox/sandboxNpcExtractor.js` | 旧 NPC 提取，已由 `sandboxFactExtractor` + `sandboxStateChangeExtractor` 替代 |
| `src/sandbox/config/sandbox_opening_prompt.js` | 未引用；开场由 `buildSandboxOpeningUserMessage` 承担 |
| `src/screens/SandboxPlaceholderScreen.jsx` | 沙盒占位屏，主流程走 `SandboxModeSelectScreen` / `sandboxPrologue` |
| `src/sandbox/sandboxInventoryExtract.js` | 背包提取已并入状态变更提取器；`sandboxFactExtractor` 已移除对其 import |

### 地图相关残留

- `sandboxStorage.js` 中 `LEGACY_SANDBOX_STORAGE_SUFFIXES` 仍列出：
  - `map-state`
  - `world-memory-global-events`
  - `world-memory-local-events`
  - `world-memory-locations`
  - `world-memory-location-profiles`
- 这些是已移除地图 / 世界记忆模块的 localStorage 清理残留，不要当成当前功能。

### Deprecated wrapper

- `sandboxFactExtractor.js`
  - `extractFactsAndEvents(opts)`：`@deprecated`，仅转发到 `extractAllStateUpdates(opts)`。
  - `extractAndUpdateFacts(opts)`：`@deprecated`，仅转发到 `extractAllStateUpdates(opts)`。

### `keyItems`

- 当前 `src/` 搜索未发现活跃 `keyItems` 字段定义或调用。
- 若旧存档中存在，应视为废弃字段，不应新增依赖。

### 六合一 / 八合一注释

- `sandboxPlayerTurn.js` 仍有“八合一提取”注释。
- 当前实际提取职责已经拆分：
  - `sandboxStateChangeExtractor.js`：NPC/任务/世界/背包/同伴/HPMP 状态变更。
  - `sandboxFactExtractor.js`：事实库/事件时间线/NPC 记忆图谱。
- 文档或 prompt 中出现“六合一/八合一”时，应按当前拆分理解，不要新增大型混合 JSON。

## 12. 调用点检查

### `extractAllStateUpdates`

调用处：

- `src/sandbox/sandboxPlayerTurn.js`
  - 在 GM 回复保存后由 `presentGm` 调用 `onGmComplete(displayText)` 间接触发。
  - 参数：
    - `apiKey: key`
    - `gmReply`
    - `playerText: actionText`
    - `currentTurn: factTurn`
    - `slotIndex`
    - `onComplete: onExtractComplete`
    - `rollbackBeforeExtract: regenerate`

定义/兼容处：

- `src/sandbox/sandboxFactExtractor.js`
  - `extractAllStateUpdates`
  - `extractFactsAndEvents` deprecated wrapper
  - `extractAndUpdateFacts` deprecated wrapper

### `buildSandboxGmPrompt`

调用处 1：`src/sandbox/sandboxPlayerTurn.js`

```js
buildSandboxGmPrompt(
  character,
  world,
  archivedEvents,
  relevantNpcs,
  activeCompanions,
  activeFacts,
  recentEvents,
  worldState,
  questState,
  relevantMemoryGraph,
  slotIndex ?? null,
  actionText,
  lastGmReply,
)
```

调用处 2：`src/sandbox/prologue/SandboxPrologue.jsx`

```js
buildSandboxGmPrompt(
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
  effectiveSlotIndex,
  userContent,
  '',
)
```

### `validateSandboxGmReply`

调用处：

- `src/sandbox/sandboxGmTurn.js`
  - `fetchValidatedSandboxGmReply` 内部调用。
  - 校验失败后追加 `SANDBOX_FORMAT_RETRY_HINT` 重试一次。

定义处：

- `src/sandbox/sandboxValidateGmReply.js`

当前校验不再要求 `【状态变更】`。

## 13. 近期关键变更记录

- 沙盒槽位：`selectedSlot` 上限 4；序幕 `effectiveSlotIndex` 锁定。
- 种族 UI：fantasy 种族选择改为折叠面板。
- GM 协议：主回复五段；`【状态变更】` 改由 `sandboxStateChangeExtractor.js` 独立 API。
- 时间线：`extractAllStateUpdates` 在消息保存后触发，并传入 `playerText`。
- `applyStateChangeData`：主存档 `playerStatus`/`playerInventory`/`companionChanges` 单次 load + 单次 save；`console.warn` 替代静默 catch。
- 废弃清理：删除 `sandboxNpcExtractor.js`、`sandbox_opening_prompt.js`、`SandboxPlaceholderScreen.jsx`、`sandboxInventoryExtract.js`。
- 源码规模：`src/` 下约 **92** 个 `.js`/`.jsx` 文件（不含 `.css`）。

## 14. 源码文件清单（`src/`，仅 .js / .jsx）

共 92 个文件，按目录分组（与 §2 职责说明对照使用）：

**根目录（27）**：`App.jsx`, `GameApp.jsx`, `main.jsx`, `deepseek.js`, `storage.js`, `playerTurn.js`, `gmTurn.js`, `gmRollLoop.js`, `validateGmReply.js`, `typewriter.js`, `rollingSummary.js`, `turnSummary.js`, `archiveEvent.js`, `startActOne.js`, `resolveTurnRolls.js`, `rollMarker.js`, `dice.js`, `cocJudge.js`, `skillJudge.js`, `playerSkills.js`, `characterInit.js`, `parseGmStatus.js`, `parseGmItems.js`, `parseScenarios.js`, `itemInject.js`, `syncInventoryFromGm.js`, `syncRosterFromGm.js`

**config（10）**、**components（8）**、**hooks（4）**、**prologue（3）**、**screens（4）**、**worldbook（4）**

**sandbox（32）**：含 `SandboxGameApp.jsx`, `sandboxPlayerTurn.js`, `sandboxFactExtractor.js`, `sandboxStateChangeExtractor.js`, `sandboxStateChangeParser.js`, `sandboxParseGmStatus.js`, `sandboxStorage.js`, `prologue/*`, `config/*`, `components/*` 等。

完整路径可用 PowerShell 列出：

```powershell
Get-ChildItem -Path src -Recurse -Include *.js,*.jsx -File | ForEach-Object { $_.FullName.Replace((Get-Location).Path + '\', '').Replace('\','/') } | Sort-Object
```

