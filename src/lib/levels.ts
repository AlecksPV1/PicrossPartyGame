import { generateClues, type PicrossPuzzle, type PuzzleGrid } from './picross';

const RED = '#ef4444';
const GREEN = '#22c55e';
const BLUE = '#3b82f6';
const YELLOW = '#eab308';
const BROWN = '#8b5cf6'; // Using purple for brown for now
const BLACK = '#1e293b';

// Helper to create empty grids
const emptyGrid = (w: number, h: number): PuzzleGrid => 
  Array(h).fill(null).map(() => Array(w).fill(null));

// Heart Level (5x5)
const heartGrid: PuzzleGrid = [
  [null, RED, null, RED, null],
  [RED, RED, RED, RED, RED],
  [RED, RED, RED, RED, RED],
  [null, RED, RED, RED, null],
  [null, null, RED, null, null],
];

// Star Level (5x5)
const starGrid: PuzzleGrid = [
  [null, null, YELLOW, null, null],
  [null, YELLOW, YELLOW, YELLOW, null],
  [YELLOW, YELLOW, YELLOW, YELLOW, YELLOW],
  [null, YELLOW, null, YELLOW, null],
  [YELLOW, null, null, null, YELLOW],
];

// Cat Level (6x6)
const catGrid: PuzzleGrid = [
  [BLACK, null, null, null, null, BLACK],
  [BLACK, BLACK, null, null, BLACK, BLACK],
  [BLACK, BLACK, BLACK, BLACK, BLACK, BLACK],
  [BLACK, GREEN, BLACK, BLACK, GREEN, BLACK],
  [BLACK, BLACK, BLACK, BLACK, BLACK, BLACK],
  [null, BLACK, BLACK, BLACK, BLACK, null],
];

function createLevel(id: string, name: string, grid: PuzzleGrid): PicrossPuzzle {
  const { rowClues, colClues } = generateClues(grid);
  return {
    id,
    name,
    width: grid[0].length,
    height: grid.length,
    solution: grid,
    rowClues,
    colClues
  };
}

export const PREDEFINED_LEVELS: PicrossPuzzle[] = [
  createLevel('level_1', 'Corazón', heartGrid),
  createLevel('level_2', 'Estrella', starGrid),
  createLevel('level_3', 'Gatito', catGrid),
];
