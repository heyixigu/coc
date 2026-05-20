import type { CellType, Direction, Grid, Cell } from './types';
import { DIRECTIONS, DIRECTION_DELTA, OPPOSITE } from './types';
import { resetUsedNames, getRandomName, type WorldId } from './names';

const TYPE_WEIGHTS: { type: CellType; weight: number }[] = [
  { type: 'wild', weight: 50 },
  { type: 'town', weight: 30 },
  { type: 'dungeon', weight: 15 },
  { type: 'road', weight: 5 },
];

const TOTAL_WEIGHT = TYPE_WEIGHTS.reduce((s, t) => s + t.weight, 0);

const LOCAL_TYPE_WEIGHTS: { type: CellType; weight: number }[] = [
  { type: 'wild', weight: 70 },
  { type: 'road', weight: 30 },
];

const LOCAL_TOTAL_WEIGHT = LOCAL_TYPE_WEIGHTS.reduce((s, t) => s + t.weight, 0);

function randomType(useLocalPool: boolean): CellType {
  const pool = useLocalPool ? LOCAL_TYPE_WEIGHTS : TYPE_WEIGHTS;
  const total = useLocalPool ? LOCAL_TOTAL_WEIGHT : TOTAL_WEIGHT;
  let r = Math.random() * total;
  for (const t of pool) {
    r -= t.weight;
    if (r <= 0) return t.type;
  }
  return 'wild';
}

export function generateGrid(
  rows: number,
  cols: number,
  centerX: number,
  centerY: number,
  localMap = false,
  worldId: WorldId = 'fantasy',
): Grid {
  resetUsedNames(worldId);
  const grid: Grid = [];

  for (let y = 0; y < rows; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < cols; x++) {
      const isCenter = x === centerX && y === centerY;
      const type = randomType(localMap);
      const id = `${x}-${y}`;
      row.push({
        id,
        name: isCenter ? getRandomName(type, worldId) : '',
        explored: isCenter,
        type,
        connections: [],
      });
    }
    grid.push(row);
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y][x];
      for (const dir of DIRECTIONS) {
        const delta = DIRECTION_DELTA[dir];
        const nx = x + delta.x;
        const ny = y + delta.y;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;

        if (cell.connections.includes(dir)) continue;
        if (grid[ny][nx].connections.includes(OPPOSITE[dir])) continue;

        if (Math.random() < 0.7) {
          cell.connections.push(dir);
          grid[ny][nx].connections.push(OPPOSITE[dir]);
        }
      }
    }
  }

  return grid;
}

export function getConnectedDirections(grid: Grid, x: number, y: number): Direction[] {
  return grid[y][x].connections;
}

export function exploreCell(grid: Grid, x: number, y: number, worldId: WorldId = 'fantasy'): Grid {
  const newGrid = grid.map(row => row.map(cell => ({ ...cell, connections: [...cell.connections] })));
  const cell = newGrid[y][x];
  if (!cell.explored) {
    cell.explored = true;
    cell.name = getRandomName(cell.type, worldId);
  }
  return newGrid;
}

export function getCell(grid: Grid, x: number, y: number): Cell {
  return grid[y][x];
}

export function isAdjacent(x1: number, y1: number, x2: number, y2: number): boolean {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
}

export function getEmptyGrid(rows: number, cols: number): Grid {
  const grid: Grid = [];
  for (let y = 0; y < rows; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < cols; x++) {
      row.push({
        id: `${x}-${y}`,
        name: '',
        explored: false,
        type: 'wild',
        connections: [],
      });
    }
    grid.push(row);
  }
  return grid;
}
