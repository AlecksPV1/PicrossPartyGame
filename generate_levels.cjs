const fs = require('fs');

function generateClues(grid) {
  const height = grid.length;
  const width = grid[0].length;
  
  const rowClues = [];
  const colClues = [];

  for (let r = 0; r < height; r++) {
    const row = grid[r];
    const clues = [];
    let currentCount = 0;
    let currentColor = null;

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

  for (let c = 0; c < width; c++) {
    const clues = [];
    let currentCount = 0;
    let currentColor = null;

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

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9'];

function createInvader(size, color) {
  const grid = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      // symmetric across y axis
      const dist = Math.abs(c - Math.floor(size/2));
      if (Math.random() > 0.3 + dist * 0.1) {
        row.push(color);
      } else {
        row.push(null);
      }
    }
    grid.push(row);
  }
  // Enforce symmetry
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < Math.floor(size/2); c++) {
      grid[r][size - 1 - c] = grid[r][c];
    }
  }
  return grid;
}

const levels = [];

for (let size of [5, 10, 15]) {
  for (let i = 1; i <= 20; i++) {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const grid = createInvader(size, color);
    const { rowClues, colClues } = generateClues(grid);
    
    levels.push({
      id: `ai_level_${size}x${size}_${i}`,
      name: `Alien ${size}x${size} #${i}`,
      width: size,
      height: size,
      solution: grid,
      rowClues,
      colClues
    });
  }
}

const fileContent = `import { type PicrossPuzzle } from './picross';\n\nexport const PREDEFINED_LEVELS: PicrossPuzzle[] = ${JSON.stringify(levels, null, 2)};\n`;

fs.writeFileSync('src/lib/levels.ts', fileContent);
console.log('Generated 60 levels!');
