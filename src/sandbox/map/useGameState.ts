import { useState, useCallback, useRef } from 'react';
import type { GameState, Grid, Position, Layer, Cell } from './types';
import { generateGrid, exploreCell, isAdjacent } from './generateMap';
import type { WorldId } from './names';

function initContinent(worldId: WorldId = 'fantasy'): Grid {
  return generateGrid(8, 8, 4, 4, false, worldId);
}

function initLocal(worldId: WorldId = 'fantasy'): Grid {
  return generateGrid(5, 5, 2, 2, true, worldId);
}

export function createInitialMapState(mapWorldId: WorldId = 'fantasy'): GameState {
  return {
    layer: 'continent',
    continentGrid: initContinent(mapWorldId),
    localGrid: initLocal(mapWorldId),
    continentPos: { x: 4, y: 4 },
    localPos: { x: 2, y: 2 },
    localOrigin: null,
  };
}

export interface UseGameStateOptions {
  initialState?: GameState;
  mapWorldId?: WorldId;
  onNewCell?: (layer: Layer, x: number, y: number, cell: Cell) => void;
}

export function useGameState(options: UseGameStateOptions = {}) {
  const mapWorldId = options.mapWorldId ?? 'fantasy';
  const onNewCellRef = useRef(options.onNewCell);
  onNewCellRef.current = options.onNewCell;

  const [state, setState] = useState<GameState>(
    () => options.initialState ?? createInitialMapState(mapWorldId),
  );

  const moveTo = useCallback((layer: Layer, x: number, y: number) => {
    setState(prev => {
      const isContinent = layer === 'continent';
      const grid = isContinent ? prev.continentGrid : prev.localGrid;
      const currentPos = isContinent ? prev.continentPos : prev.localPos;

      if (!isAdjacent(currentPos.x, currentPos.y, x, y)) return prev;

      const cellBefore = grid[y][x];
      const wasUnexplored = !cellBefore.explored;
      const newGrid = exploreCell(grid, x, y, mapWorldId);
      const exploredCell = newGrid[y][x];

      let next: GameState;
      if (isContinent) {
        next = {
          ...prev,
          continentGrid: newGrid,
          continentPos: { x, y },
        };
      } else {
        next = {
          ...prev,
          localGrid: newGrid,
          localPos: { x, y },
        };
      }

      if (wasUnexplored && onNewCellRef.current) {
        queueMicrotask(() => onNewCellRef.current?.(layer, x, y, exploredCell));
      }

      return next;
    });
  }, [mapWorldId]);

  const enterLocalMap = useCallback((originX: number, originY: number) => {
    setState(prev => ({
      ...prev,
      layer: 'local',
      localGrid: initLocal(mapWorldId),
      localPos: { x: 2, y: 2 },
      localOrigin: { x: originX, y: originY },
    }));
  }, [mapWorldId]);

  const exitLocalMap = useCallback(() => {
    setState(prev => ({
      ...prev,
      layer: 'continent',
    }));
  }, []);

  const reset = useCallback(() => {
    setState(createInitialMapState(mapWorldId));
  }, [mapWorldId]);

  return {
    state,
    moveTo,
    enterLocalMap,
    exitLocalMap,
    reset,
    setState,
  };
}
