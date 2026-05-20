import './MiniMap.css'

/**
 * @typedef {import('../map/types.js').Grid} Grid
 * @typedef {import('../map/types.js').Position} Position
 */

/**
 * @param {{
 *   grid: Grid,
 *   currentPos: Position,
 * }} props
 */
export default function MiniMap({ grid, currentPos }) {
  if (!grid || !currentPos) return null

  const { x: cx, y: cy } = currentPos

  const cells = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx
      const ny = cy + dy
      const inBounds =
        ny >= 0 && ny < grid.length && nx >= 0 && nx < (grid[0]?.length || 0)
      cells.push({
        cell: inBounds ? grid[ny][nx] : null,
        isCenter: dx === 0 && dy === 0,
        key: `${dx}-${dy}`,
      })
    }
  }

  return (
    <div className="minimap-section">
      <div className="minimap-title">周边地图</div>
      <div className="minimap-grid">
        {cells.map(({ cell, isCenter, key }) => {
          if (!cell) {
            return <div key={key} className="minimap-cell minimap-cell--void" />
          }

          if (!cell.explored) {
            return <div key={key} className="minimap-cell minimap-cell--fog" />
          }

          return (
            <div
              key={key}
              className={[
                'minimap-cell',
                `minimap-cell--${cell.type}`,
                isCenter ? 'minimap-cell--current' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="minimap-cell-name">
                {isCenter ? '★' : ''}
                {cell.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
