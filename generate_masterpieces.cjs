const { Jimp } = require('jimp');
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

function rgbaToHex(r, g, b, a) {
  if (a < 128) return null; // Transparent
  const toHex = (c) => c.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Fixed color palette to reduce noise
const PALETTE = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', 
  '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1',
  '#a855f7', '#ec4899', '#78350f', '#fcd34d'
];

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

function nearestColor(r, g, b) {
  let minD = Infinity;
  let nearest = PALETTE[0];
  for (let hex of PALETTE) {
    const [pr, pg, pb] = hexToRgb(hex);
    const d = (r-pr)**2 + (g-pg)**2 + (b-pb)**2;
    if (d < minD) {
      minD = d;
      nearest = hex;
    }
  }
  return nearest;
}

async function processImage(url, id, name, modulesX, modulesY, moduleSize) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const buffer = await response.arrayBuffer();
  const img = await Jimp.read(Buffer.from(buffer));
  
  const width = modulesX * moduleSize;
  const height = modulesY * moduleSize;
  
  img.resize({ w: width, h: height });
  
  const sections = [];
  
  for (let mY = 0; mY < modulesY; mY++) {
    for (let mX = 0; mX < modulesX; mX++) {
      const grid = [];
      for (let rowIdx = 0; rowIdx < moduleSize; rowIdx++) {
        const row = [];
        for (let colIdx = 0; colIdx < moduleSize; colIdx++) {
          const pixelColor = img.getPixelColor(mX * moduleSize + colIdx, mY * moduleSize + rowIdx);
          const r = (pixelColor >>> 24) & 255;
          const g = (pixelColor >>> 16) & 255;
          const b = (pixelColor >>> 8) & 255;
          const a = pixelColor & 255;
          if (a < 128) {
            row.push(null);
          } else {
            row.push(nearestColor(r, g, b));
          }
        }
        grid.push(row);
      }
      
      const { rowClues, colClues } = generateClues(grid);
      sections.push({
        row: mY,
        col: mX,
        solution: grid,
        rowClues,
        colClues
      });
    }
  }
  
  return {
    id,
    type: 'collage',
    name,
    modulesX,
    modulesY,
    moduleSize,
    sections
  };
}

async function run() {
  const artworks = [
    {
      id: 'starry_night',
      name: 'La Noche Estrellada',
      url: 'https://picsum.photos/seed/starrynight/600/400',
      modulesX: 6,
      modulesY: 4,
      moduleSize: 10
    },
    {
      id: 'great_wave',
      name: 'La Gran Ola',
      url: 'https://picsum.photos/seed/greatwave/600/400',
      modulesX: 6,
      modulesY: 4,
      moduleSize: 10
    },
    {
      id: 'mona_lisa',
      name: 'La Mona Lisa',
      url: 'https://picsum.photos/seed/monalisa/400/500',
      modulesX: 4,
      modulesY: 5,
      moduleSize: 10
    }
  ];

  const results = [];
  for (let art of artworks) {
    console.log('Processing', art.name);
    const result = await processImage(art.url, art.id, art.name, art.modulesX, art.modulesY, art.moduleSize);
    results.push(result);
  }
  
  // Also keep the existing emoji collage if we want, or just replace with artworks
  // We'll just replace with artworks for Masterpieces!
  
  const content = `import { type CollagePuzzle } from './picross';\n\nexport const COLLAGES: CollagePuzzle[] = ${JSON.stringify(results, null, 2)};\n`;
  fs.writeFileSync('src/lib/collages.ts', content);
  console.log('Done!');
}

run();
