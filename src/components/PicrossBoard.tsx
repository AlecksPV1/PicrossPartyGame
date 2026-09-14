import React, { useState, useEffect } from 'react';
import { type PicrossPuzzle, type CellColor, type PuzzleGrid, validatePuzzle } from '../lib/picross';
import { clsx } from 'clsx';

interface PicrossBoardProps {
  puzzle: PicrossPuzzle;
  onComplete: () => void;
}

export default function PicrossBoard({ puzzle, onComplete }: PicrossBoardProps) {
  const { width, height, rowClues, colClues } = puzzle;
  
  // State for the player's grid. We store it as a 2D array.
  // Cell can be 'color' (filled), 'x' (marked as empty), or null (unmarked)
  type PlayerCell = { state: 'empty' | 'filled' | 'marked', color: CellColor };
  
  const [grid, setGrid] = useState<PlayerCell[][]>(() => {
    // Try to load from localStorage first
    const saved = localStorage.getItem(`picross_${puzzle.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return Array(height).fill(null).map(() => 
      Array(width).fill(null).map(() => ({ state: 'empty', color: null }))
    );
  });

  const [activeColor, setActiveColor] = useState<string>('#ef4444'); // Default color

  // Extract unique colors from the solution to show a palette
  const uniqueColors = Array.from(new Set(
    puzzle.solution.flat().filter((c): c is string => c !== null)
  ));

  // If active color is not in the palette, set it to the first one
  useEffect(() => {
    if (uniqueColors.length > 0 && !uniqueColors.includes(activeColor)) {
      setActiveColor(uniqueColors[0]);
    }
  }, [puzzle.id]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem(`picross_${puzzle.id}`, JSON.stringify(grid));
  }, [grid, puzzle.id]);

  const handleVerify = () => {
    const currentPuzzleState: PuzzleGrid = grid.map(row => 
      row.map(cell => cell.state === 'filled' ? cell.color : null)
    );
    
    if (validatePuzzle(currentPuzzleState, puzzle.solution)) {
      setErrorMsg(null);
      onComplete();
    } else {
      setErrorMsg('Aún hay errores en el tablero. ¡Revisa las pistas!');
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  const handleCellClick = (r: number, c: number, type: 'left' | 'right') => {
    setGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      const currentCell = newGrid[r][c];

      if (type === 'left') { // Left click: fill or empty
        if (currentCell.state === 'filled' && currentCell.color === activeColor) {
          newGrid[r][c] = { state: 'empty', color: null };
        } else {
          newGrid[r][c] = { state: 'filled', color: activeColor };
        }
      } else { // Right click: mark X
        if (currentCell.state === 'marked') {
          newGrid[r][c] = { state: 'empty', color: null };
        } else {
          newGrid[r][c] = { state: 'marked', color: null };
        }
      }
      return newGrid;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    handleCellClick(r, c, 'right');
  };

  // Render board

  return (
    <div className="flex flex-col items-center select-none touch-none">
      {/* Palette */}
      <div className="flex gap-2 mb-6">
        {uniqueColors.map(color => (
          <button
            key={color}
            onClick={() => setActiveColor(color)}
            className={clsx(
              "w-10 h-10 rounded-full transition-transform border-4",
              activeColor === color ? "scale-110 border-white shadow-lg shadow-white/20" : "scale-100 border-transparent opacity-50"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="overflow-auto max-w-full p-4 bg-slate-800 rounded-xl shadow-2xl">
        <div 
          className="grid gap-1"
          style={{ 
            gridTemplateColumns: `auto repeat(${width}, 2rem)`,
            gridTemplateRows: `auto repeat(${height}, 2rem)`
          }}
        >
          {/* Top-left empty corner */}
          <div className="border-b-2 border-r-2 border-slate-600"></div>

          {/* Top Clues (Col clues) */}
          {colClues.map((clueArr, cIndex) => (
            <div key={`col-${cIndex}`} className="flex flex-col justify-end items-center pb-1 gap-1 border-b-2 border-slate-600 text-sm">
              {clueArr.map((clue, idx) => (
                <span 
                  key={idx} 
                  className="font-bold w-5 h-5 flex items-center justify-center rounded-sm text-xs"
                  style={clue.color === 'transparent' ? { color: 'transparent' } : { backgroundColor: clue.color, color: '#fff', textShadow: '0 0 2px #000' }}
                >
                  {clue.count}
                </span>
              ))}
            </div>
          ))}

          {/* Rows */}
          {rowClues.map((clueArr, rIndex) => (
            <React.Fragment key={`row-${rIndex}`}>
              {/* Left Clues (Row clues) */}
              <div className="flex justify-end items-center pr-2 gap-1 border-r-2 border-slate-600 text-sm">
                {clueArr.map((clue, idx) => (
                  <span 
                    key={idx} 
                    className="font-bold w-5 h-5 flex items-center justify-center rounded-sm text-xs"
                    style={clue.color === 'transparent' ? { color: 'transparent' } : { backgroundColor: clue.color, color: '#fff', textShadow: '0 0 2px #000' }}
                  >
                    {clue.count}
                  </span>
                ))}
              </div>

              {/* Grid Cells */}
              {grid[rIndex].map((cell, cIndex) => {
                // Add thicker borders for 5x5 sections to make it easier to read
                const isRightBorder = (cIndex + 1) % 5 === 0 && cIndex !== width - 1;
                const isBottomBorder = (rIndex + 1) % 5 === 0 && rIndex !== height - 1;
                
                return (
                  <div
                    key={`cell-${rIndex}-${cIndex}`}
                    onClick={() => handleCellClick(rIndex, cIndex, 'left')}
                    onContextMenu={(e) => handleContextMenu(e, rIndex, cIndex)}
                    className={clsx(
                      "w-8 h-8 md:w-8 md:h-8 cursor-pointer flex items-center justify-center transition-colors border-slate-700/50 hover:bg-slate-700",
                      "border-r border-b", // Base borders
                      isRightBorder ? "border-r-2 border-r-slate-400" : "",
                      isBottomBorder ? "border-b-2 border-b-slate-400" : "",
                      rIndex === 0 ? "border-t border-t-slate-700/50" : "",
                      cIndex === 0 ? "border-l border-l-slate-700/50" : ""
                    )}
                    style={{
                      backgroundColor: cell.state === 'filled' && cell.color ? cell.color : 'transparent'
                    }}
                  >
                    {cell.state === 'marked' && (
                      <span className="text-slate-500 font-black text-xl leading-none select-none pointer-events-none">X</span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 p-3 bg-red-500/20 text-red-300 rounded-lg text-sm font-bold animate-in fade-in slide-in-from-bottom-2">
          {errorMsg}
        </div>
      )}

      <button 
        onClick={handleVerify}
        className="mt-8 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl shadow-lg shadow-green-900/50 transition-all active:scale-95"
      >
        ¡Terminé! Verificar
      </button>
    </div>
  );
}
