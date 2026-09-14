import React, { useState, useEffect, useMemo } from 'react';
import { type PicrossPuzzle, type PuzzleGrid } from '../lib/picross';
import { generateClues, validatePuzzle } from '../lib/picross';
import clsx from 'clsx';

type InteractiveCell = { state: 'empty' | 'marked' | 'filled', color: string | null };
type InteractiveGrid = InteractiveCell[][];

export default function PicrossBoard({ puzzle, onComplete }: { puzzle: PicrossPuzzle, onComplete: () => void }) {
  const [grid, setGrid] = useState<InteractiveGrid>([]);
  const [activeColor, setActiveColor] = useState<string>('');
  
  // Extract unique colors for palette
  const uniqueColors = useMemo(() => {
    const colors = new Set<string>();
    puzzle.solution.forEach(row => {
      row.forEach(cell => {
        if (cell) colors.add(cell);
      });
    });
    return Array.from(colors);
  }, [puzzle.solution]);

  const { rowClues, colClues } = useMemo(() => generateClues(puzzle.solution), [puzzle.solution]);
  const height = puzzle.solution.length;
  const width = puzzle.solution[0]?.length || 0;

  useEffect(() => {
    // Load from local storage or create empty
    const saved = localStorage.getItem(`picross_${puzzle.id}`);
    if (saved) {
      setGrid(JSON.parse(saved));
    } else {
      const emptyGrid: InteractiveGrid = Array(height).fill(null).map(() => Array(width).fill({ state: 'empty', color: null }));
      setGrid(emptyGrid);
    }
  }, [puzzle.id, height, width]);

  useEffect(() => {
    if (uniqueColors.length > 0 && !uniqueColors.includes(activeColor)) {
      setActiveColor(uniqueColors[0]);
    }
  }, [puzzle.id, uniqueColors, activeColor]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Drag-to-draw state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'fill' | 'mark' | 'erase'>('fill');
  const [activeTool, setActiveTool] = useState<'fill' | 'mark'>('fill');

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem(`picross_${puzzle.id}`, JSON.stringify(grid));
  }, [grid, puzzle.id]);

  useEffect(() => {
    const handleMouseUp = () => setIsDrawing(false);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

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

  const interact = (r: number, c: number, isStart: boolean) => {
    setGrid(prev => {
      if (!prev || prev.length === 0) return prev;
      const newGrid = prev.map(row => [...row]);
      const currentCell = newGrid[r][c];

      let currentDrawMode = drawMode;

      if (isStart) {
        setIsDrawing(true);
        if (activeTool === 'mark') {
          currentDrawMode = currentCell.state === 'marked' ? 'erase' : 'mark';
        } else {
          currentDrawMode = (currentCell.state === 'filled' && currentCell.color === activeColor) ? 'erase' : 'fill';
        }
        setDrawMode(currentDrawMode);
      } else if (!isDrawing) {
        return prev;
      }

      if (currentDrawMode === 'erase') {
        newGrid[r][c] = { state: 'empty', color: null };
      } else if (currentDrawMode === 'mark') {
        newGrid[r][c] = { state: 'marked', color: null };
      } else if (currentDrawMode === 'fill') {
        newGrid[r][c] = { state: 'filled', color: activeColor };
      }

      return newGrid;
    });
  };

  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    if (e.button === 2) return; // ignore right click for drag start
    (e.target as HTMLElement).releasePointerCapture(e.pointerId); // allow pointerenter on other elements
    interact(r, c, true);
  };

  const handlePointerEnter = (_e: React.PointerEvent, r: number, c: number) => {
    interact(r, c, false);
  };

  const handleContextMenu = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    // Manual single right-click mark/erase for PC
    setGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      const currentCell = newGrid[r][c];
      if (currentCell.state === 'marked') {
        newGrid[r][c] = { state: 'empty', color: null };
      } else {
        newGrid[r][c] = { state: 'marked', color: null };
      }
      return newGrid;
    });
  };

  if (!grid || grid.length === 0) return null;

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
              activeColor === color ? "scale-110 border-slate-800 shadow-md" : "scale-100 border-transparent opacity-50"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Tool Selector */}
      <div className="flex gap-2 mb-4 bg-slate-200 p-1 rounded-xl">
        <button 
          onClick={() => setActiveTool('fill')}
          className={clsx(
            "px-6 py-2 rounded-lg font-bold transition-all",
            activeTool === 'fill' ? "bg-indigo-500 text-white shadow-md" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Pintar
        </button>
        <button 
          onClick={() => setActiveTool('mark')}
          className={clsx(
            "px-6 py-2 rounded-lg font-bold transition-all",
            activeTool === 'mark' ? "bg-red-500 text-white shadow-md" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Marcar (X)
        </button>
      </div>

      <div className="overflow-auto max-w-full p-4 bg-white rounded-2xl shadow-xl border border-slate-200 touch-none flex justify-center" style={{ touchAction: 'none' }}>
        <div 
          className="grid gap-[1px] bg-slate-400 border-2 border-slate-700 select-none w-fit"
          style={{ 
            gridTemplateColumns: `auto repeat(${width}, 2rem)`,
            gridTemplateRows: `auto repeat(${height}, 2rem)`
          }}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Top-left empty corner */}
          <div className="bg-white"></div>

          {/* Top Clues (Col clues) */}
          {colClues.map((clueArr, cIndex) => (
            <div key={`col-${cIndex}`} className="flex flex-col justify-end items-center pb-1 gap-[1px] bg-white text-sm">
              {clueArr.map((clue, idx) => (
                <span 
                  key={idx} 
                  className="font-black w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px]"
                  style={clue.color === 'transparent' ? { color: 'transparent' } : { backgroundColor: clue.color, color: '#fff', textShadow: '0 0 2px rgba(0,0,0,0.8)' }}
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
              <div className="flex justify-end items-center pr-2 gap-[1px] bg-white text-sm">
                {clueArr.map((clue, idx) => (
                  <span 
                    key={idx} 
                    className="font-black w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px]"
                    style={clue.color === 'transparent' ? { color: 'transparent' } : { backgroundColor: clue.color, color: '#fff', textShadow: '0 0 2px rgba(0,0,0,0.8)' }}
                  >
                    {clue.count}
                  </span>
                ))}
              </div>

              {/* Grid Cells */}
              {grid[rIndex].map((cell, cIndex) => {
                return (
                  <div
                    key={`cell-${rIndex}-${cIndex}`}
                    onPointerDown={(e) => handlePointerDown(e, rIndex, cIndex)}
                    onPointerEnter={(e) => handlePointerEnter(e, rIndex, cIndex)}
                    onContextMenu={(e) => handleContextMenu(e, rIndex, cIndex)}
                    className="w-8 h-8 md:w-8 md:h-8 cursor-pointer flex items-center justify-center transition-colors hover:opacity-80 touch-none bg-white"
                    style={{
                      backgroundColor: cell.state === 'filled' && cell.color ? cell.color : '#ffffff'
                    }}
                  >
                    {cell.state === 'marked' && (
                      <span className="text-red-500 font-black text-xl leading-none select-none pointer-events-none">✖</span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-600 rounded-lg text-sm font-bold animate-in fade-in slide-in-from-bottom-2">
          {errorMsg}
        </div>
      )}

      <button 
        onClick={handleVerify}
        className="mt-8 px-10 py-4 bg-green-500 hover:bg-green-600 text-white font-black text-xl rounded-2xl shadow-lg transition-all active:scale-95"
      >
        ¡Terminé!
      </button>
    </div>
  );
}
