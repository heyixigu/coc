import type { Grid, Position } from './types';
import { CellBlock } from './CellBlock';

interface MapGridProps {
  grid: Grid;
  currentPos: Position;
  onCellClick: (x: number, y: number) => void;
  onCellEnter?: (x: number, y: number) => void;
}

export function MapGrid({ grid, currentPos, onCellClick, onCellEnter }: MapGridProps) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const gridRows = rows * 2 - 1;
  const gridCols = cols * 2 - 1;

  const items: { type: 'cell' | 'hconn' | 'vconn' | 'empty'; x: number; y: number; cx?: number; cy?: number }[] = [];

  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      const isEvenRow = gy % 2 === 0;
      const isEvenCol = gx % 2 === 0;

      if (isEvenRow && isEvenCol) {
        items.push({ type: 'cell', x: gx, y: gy, cx: gx / 2, cy: gy / 2 });
      } else if (isEvenRow && !isEvenCol) {
        items.push({ type: 'hconn', x: gx, y: gy, cx: (gx - 1) / 2, cy: gy / 2 });
      } else if (!isEvenRow && isEvenCol) {
        items.push({ type: 'vconn', x: gx, y: gy, cx: gx / 2, cy: (gy - 1) / 2 });
      } else {
        items.push({ type: 'empty', x: gx, y: gy });
      }
    }
  }

  const isConnected = (x: number, y: number, dir: '右' | '下'): boolean => {
    if (y < 0 || y >= rows || x < 0 || x >= cols) return false;
    return grid[y][x].connections.includes(dir);
  };

  return (
    <div
      className="map-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, auto)`,
        gridTemplateRows: `repeat(${gridRows}, auto)`,
        gap: 0,
      }}
    >
      {items.map(item => {
        const key = `${item.y}-${item.x}`;
        if (item.type === 'cell') {
          const cell = grid[item.cy!][item.cx!];
          const isCurrent = currentPos.x === item.cx && currentPos.y === item.cy;
          return (
            <CellBlock
              key={key}
              cell={cell}
              isCurrent={isCurrent}
              onClick={() => onCellClick(item.cx!, item.cy!)}
              onEnter={() => onCellEnter?.(item.cx!, item.cy!)}
            />
          );
        }
        if (item.type === 'hconn') {
          const connected = isConnected(item.cx!, item.cy!, '右');
          return (
            <div key={key} className={`conn conn--h ${connected ? 'conn--active' : ''}`}>
              {connected ? '─' : ''}
            </div>
          );
        }
        if (item.type === 'vconn') {
          const connected = isConnected(item.cx!, item.cy!, '下');
          return (
            <div key={key} className={`conn conn--v ${connected ? 'conn--active' : ''}`}>
              {connected ? '│' : ''}
            </div>
          );
        }
        return <div key={key} className="conn conn--empty" />;
      })}
    </div>
  );
}
