import type { Grid, Position } from './types';
import { MapGrid } from './MapGrid';

interface ContinentMapProps {
  grid: Grid;
  currentPos: Position;
  onMove: (x: number, y: number) => void;
  onEnterLocal: (x: number, y: number) => void;
}

export function ContinentMap({ grid, currentPos, onMove, onEnterLocal }: ContinentMapProps) {
  return (
    <div className="map-container">
      <h2 className="map-title">大陆地图 (8×8)</h2>
      <MapGrid
        grid={grid}
        currentPos={currentPos}
        onCellClick={onMove}
        onCellEnter={onEnterLocal}
      />
    </div>
  );
}
