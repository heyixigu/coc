from pathlib import Path

p = Path("src/sandbox/SandboxGameApp.jsx")
text = p.read_text(encoding="utf-8")
start = text.index("  const skillsBlock = (")
end = text.index("  const diceBlock = (")
insert = Path("scripts/patch_insert.txt").read_text(encoding="utf-8") if Path("scripts/patch_insert.txt").exists() else ""
if not insert:
    insert = open(Path(__file__).parent / "patch_insert.txt", encoding="utf-8").read() if False else ""
text = text[:start] + insert + text[end:]

new_right = """  const rightPanelBlock = (
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
  )"""

import re
text = re.sub(
    r"  const rightPanelBlock = \(\s*<div className=\"sandbox-right-panel\">.*?</motion>\s*\)\s*\n\s*const chatBlock",
    new_right + "\n\n  const chatBlock",
    text,
    count=1,
    flags=re.S,
)
text = re.sub(
    r"  const rightPanelBlock = \(\s*<div className=\"sandbox-right-panel\">.*?</div>\s*\)\s*\n\s*const chatBlock",
    new_right + "\n\n  const chatBlock",
    text,
    count=1,
    flags=re.S,
)

text = text.replace(
    "<motion className=\"sandbox-panel-body sandbox-panel-body--tabs\">",
    "<div className=\"sandbox-panel-body sandbox-panel-body--tabs\">",
)
text = text.replace("  const items = safeItems(character)\n\n", "")
idx = text.find("\nfunction SandboxQuestItem")
if idx != -1:
    text = text[:idx].rstrip() + "\n"
p.write_text(text, encoding="utf-8")
print("done", "SandboxRightPanelTabs" in text)
