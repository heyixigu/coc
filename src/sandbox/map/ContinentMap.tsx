import type { Grid, Position } from './types';
import { MapGrid } from './MapGrid';

interface ContinentMapProps {
  grid: Grid;
  currentPos: Position;
}

export function ContinentMap({ grid, currentPos }: ContinentMapProps) {
  return (
    <div className="map-container">
      <h2 className="map-title">大陆地图 (8×8)</h2>
      <MapGrid grid={grid} currentPos={currentPos} />
    </div>
  );
}
