from pathlib import Path

p = Path("src/sandbox/components/SandboxSidePanels.jsx")
lines = p.read_text(encoding="utf-8").splitlines()
start = None
end = None
for i, line in enumerate(lines):
    if start is None and "sandbox-tab-content left-tab-content" in line and i > 50:
        start = i
    if start is not None and end is None and line.strip().startswith("<InventorySection"):
        end = i
        break
if start is None or end is None:
    raise SystemExit(f"markers not found start={start} end={end}")
new_block = [
    "        <div className=\"sandbox-tab-content left-tab-content\">",
    "          {statCard}",
    "",
]
lines = lines[:start] + new_block + lines[end:]
p.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("patched", start, end)
