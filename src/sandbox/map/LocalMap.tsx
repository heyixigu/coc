import type { Grid, Position } from './types';
import { MapGrid } from './MapGrid';

interface LocalMapProps {
  grid: Grid;
  currentPos: Position;
  onMove: (x: number, y: number) => void;
  onExit: () => void;
}

export function LocalMap({ grid, currentPos, onMove, onExit }: LocalMapProps) {
  return (
    <div className="map-container">
      <div className="map-header">
        <h2 className="map-title">局部地图 (5×5)</h2>
        <button type="button" className="back-btn" onClick={onExit}>
          ← 返回大陆
        </button>
      </div>
      <MapGrid
        grid={grid}
        currentPos={currentPos}
        onCellClick={onMove}
      />
    </div>
  );
}
