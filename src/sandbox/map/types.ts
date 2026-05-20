export type CellType = 'town' | 'wild' | 'dungeon' | 'road';
export type Direction = '上' | '下' | '左' | '右';

export const DIRECTIONS: Direction[] = ['上', '下', '左', '右'];

export const DIRECTION_DELTA: Record<Direction, { x: number; y: number }> = {
  '上': { x: 0, y: -1 },
  '下': { x: 0, y: 1 },
  '左': { x: -1, y: 0 },
  '右': { x: 1, y: 0 },
};

export const OPPOSITE: Record<Direction, Direction> = {
  '上': '下',
  '下': '上',
  '左': '右',
  '右': '左',
};

export interface Cell {
  id: string;
  name: string;
  explored: boolean;
  type: CellType;
  connections: Direction[];
}

export type Grid = Cell[][];

export type Layer = 'continent' | 'local';

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  layer: Layer;
  continentGrid: Grid;
  localGrid: Grid;
  continentPos: Position;
  localPos: Position;
  localOrigin: Position | null;
}
