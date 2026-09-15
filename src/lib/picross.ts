export type CellColor = string | null; // Hex color string or null for empty
export type PuzzleGrid = CellColor[][];

export interface Clue {
  count: number;
  color: string;
}

export interface PicrossPuzzle {
  id: string;
  name: string;
  width: number;
  height: number;
  solution: PuzzleGrid;
  rowClues: Clue[][];
  colClues: Clue[][];
}

export interface CollageSection {
  row: number;
  col: number;
  solution: PuzzleGrid;
  rowClues: Clue[][];
  colClues: Clue[][];
}

export interface CollagePuzzle {
  id: string;
  type: 'collage';
  name: string;
  modulesX: number;
  modulesY: number;
  moduleSize: number;
  sections: CollageSection[];
}

/**
 * Generates the clues for a given 2D array of colors.
 */
export function generateClues(grid: PuzzleGrid): { rowClues: Clue[][]; colClues: Clue[][] } {
  const height = grid.length;
  const width = grid[0].length;
  
  const rowClues: Clue[][] = [];
  const colClues: Clue[][] = [];

  // Generate Row Clues
  for (let r = 0; r < height; r++) {
    const row = grid[r];
    const clues: Clue[] = [];
    let currentCount = 0;
    let currentColor: CellColor = null;

    for (let c = 0; c < width; c++) {
      const cell = row[c];
      if (cell) {
        if (currentColor === cell) {
          currentCount++;
        } else {
          if (currentCount > 0 && currentColor) {
            clues.push({ count: currentCount, color: currentColor });
          }
          currentColor = cell;
          currentCount = 1;
        }
      } else {
        if (currentCount > 0 && currentColor) {
          clues.push({ count: currentCount, color: currentColor });
          currentCount = 0;
          currentColor = null;
        }
      }
    }
    if (currentCount > 0 && currentColor) {
      clues.push({ count: currentCount, color: currentColor });
    }
    rowClues.push(clues.length > 0 ? clues : [{ count: 0, color: 'transparent' }]);
  }

  // Generate Col Clues
  for (let c = 0; c < width; c++) {
    const clues: Clue[] = [];
    let currentCount = 0;
    let currentColor: CellColor = null;

    for (let r = 0; r < height; r++) {
      const cell = grid[r][c];
      if (cell) {
        if (currentColor === cell) {
          currentCount++;
        } else {
          if (currentCount > 0 && currentColor) {
            clues.push({ count: currentCount, color: currentColor });
          }
          currentColor = cell;
          currentCount = 1;
        }
      } else {
        if (currentCount > 0 && currentColor) {
          clues.push({ count: currentCount, color: currentColor });
          currentCount = 0;
          currentColor = null;
        }
      }
    }
    if (currentCount > 0 && currentColor) {
      clues.push({ count: currentCount, color: currentColor });
    }
    colClues.push(clues.length > 0 ? clues : [{ count: 0, color: 'transparent' }]);
  }

  return { rowClues, colClues };
}

/**
 * Validates if the player's grid matches the solution.
 */
export function validatePuzzle(playerGrid: PuzzleGrid, solution: PuzzleGrid): boolean {
  const height = solution.length;
  if (height === 0) return true;
  const width = solution[0].length;

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      // In Picross, if the solution has a color, the player must have placed the same color.
      // If the solution is empty (null), the player must have NOT placed a color (it can be an X or empty).
      const sol = solution[r][c];
      const p = playerGrid[r][c];
      
      // We assume playerGrid[r][c] is the actual color placed, or null if empty/X
      if (sol !== p) {
        return false;
      }
    }
  }
  return true;
}
