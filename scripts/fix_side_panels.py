from pathlib import Path

p = Path("src/sandbox/components/SandboxSidePanels.jsx")
lines = p.read_bytes().decode("utf-8", errors="replace").splitlines()
replacements = {
    230: '        <div className="sandbox-tab-content right-tab-content">',
    231: '          <div className="section-title">{labels.factions}</div>',
    232: "          {factionLines.length === 0 ? (",
    233: '            <motion className="empty-hint">{labels.noFactions}</motion>',
    234: "          ) : (",
}
# 1-based line numbers from read_file
fixes = [
    (231, '          <motion className="section-title">{labels.factions}</div>'),
    (232, "          {factionLines.length === 0 ? ("),
    (233, '            <div className="empty-hint">{labels.noFactions}</div>'),
    (242, '          <div className="section-title">{labels.locations}</div>'),
    (253, '          <div className="section-title">{labels.environment}</div>'),
    (254, "          <div className=\"world-item\">{envLine || '\u2014'}</div>"),
    (260, '          <div className="section-title">{labels.questMain}</motion>'),
    (276, '          <div className="section-title">{labels.questSide}</div>'),
]
for ln, content in fixes:
    idx = ln - 1
    if idx < len(lines):
        lines[idx] = content.replace("<motion", "<div").replace("</motion>", "</div>")
for i, line in enumerate(lines):
    if "<motion" in line:
        lines[i] = line.replace("<motion", "<div").replace("</motion>", "</motion>")
    if line.strip() == "</motion>":
        lines[i] = "</div>"
    if "motion className" in line:
        lines[i] = line.replace("motion", "div", 1)

p.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("done")
