import React, { useState, useEffect, useMemo } from 'react';
import { generateClues, type PuzzleGrid } from '../lib/picross';
import { ArrowLeft, Plus, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export default function Editor() {
  const navigate = useNavigate();
  const [size, setSize] = useState(5);
  const [grid, setGrid] = useState<PuzzleGrid>([]);
  const [colors, setColors] = useState<string[]>(['#1e293b', '#ef4444', '#22c55e', '#3b82f6']);
  const [activeColor, setActiveColor] = useState<string>('#1e293b');
  const [levelName, setLevelName] = useState('Nuevo Nivel');

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'paint' | 'erase'>('paint');

  // Initialize grid
  useEffect(() => {
    setGrid(Array(size).fill(null).map(() => Array(size).fill(null)));
  }, [size]);

  // Handle global mouse up for drawing
  useEffect(() => {
    const handleMouseUp = () => setIsDrawing(false);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  const interact = (r: number, c: number, isStart: boolean) => {
    setGrid(prev => {
      if (!prev || prev.length !== size) return prev;
      const newGrid = prev.map(row => [...row]);
      
      let currentDrawMode = drawMode;
      if (isStart) {
        setIsDrawing(true);
        // If clicking on same color, switch to erase
        if (newGrid[r][c] === activeColor) {
          currentDrawMode = 'erase';
        } else {
          currentDrawMode = 'paint';
        }
        setDrawMode(currentDrawMode);
      } else if (!isDrawing) {
        return prev;
      }

      newGrid[r][c] = currentDrawMode === 'erase' ? null : activeColor;
      return newGrid;
    });
  };

  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    if (e.button === 2) {
      e.preventDefault();
      // Right click always erases in editor
      setDrawMode('erase');
      setIsDrawing(true);
      setGrid(prev => {
        const newGrid = prev.map(row => [...row]);
        newGrid[r][c] = null;
        return newGrid;
      });
      return;
    }
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    interact(r, c, true);
  };

  const handlePointerEnter = (_e: React.PointerEvent, r: number, c: number) => {
    interact(r, c, false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const addColor = () => {
    const newColor = prompt("Ingresa el color en HEX (ej. #ff00ff)");
    if (newColor && /^#[0-9A-F]{6}$/i.test(newColor)) {
      setColors(prev => [...prev, newColor]);
    } else if (newColor) {
      alert("Formato invlido. Usa #RRGGBB");
    }
  };

  const handleExport = () => {
    const data = {
      name: levelName,
      size,
      solution: grid
    };
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json);
    alert("!Cdigo JSON copiado al portapapeles!");
  };

  // Generate real-time clues
  const { rowClues, colClues } = useMemo(() => {
    if (grid.length === 0) return { rowClues: [], colClues: [] };
    return generateClues(grid);
  }, [grid]);

  return (
    <div className="flex-1 flex flex-col pt-4 pb-12 px-4 w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="p-2 bg-white hover:bg-slate-100 rounded-full shadow-sm transition-colors border border-slate-200">
          <ArrowLeft size={24} className="text-slate-800" />
        </button>
        <div className="text-center">
          <h2 className="text-3xl font-black text-indigo-600 tracking-widest">CREADOR DE NIVELES</h2>
        </div>
        <button onClick={handleExport} className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-colors flex gap-2 font-bold">
          <Copy size={20} /> Exportar
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
        {/* Controls Sidebar */}
        <div className="w-full md:w-64 bg-white p-6 rounded-3xl shadow-xl border border-slate-200 space-y-6 shrink-0">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Nombre del Nivel</label>
            <input 
              type="text" 
              value={levelName}
              onChange={e => setLevelName(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Tamao</label>
            <select 
              value={size}
              onChange={e => setSize(Number(e.target.value))}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold"
            >
              <option value={5}>5 x 5</option>
              <option value={10}>10 x 10</option>
              <option value={15}>15 x 15</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">Paleta de Colores</label>
            <div className="flex flex-wrap gap-2">
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => setActiveColor(color)}
                  className={clsx(
                    "w-10 h-10 rounded-full transition-transform border-4",
                    activeColor === color ? "scale-110 border-slate-800 shadow-md" : "scale-100 border-transparent opacity-50 hover:opacity-100"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
              <button 
                onClick={addColor}
                className="w-10 h-10 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center text-slate-400 hover:border-slate-600 hover:text-slate-600 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            
            <button 
              onClick={() => setActiveColor('erase')}
              className={clsx(
                "mt-4 w-full py-2 rounded-xl font-bold border-2 transition-colors",
                activeColor === 'erase' ? "bg-red-100 border-red-500 text-red-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              Borrador
            </button>
          </div>
        </div>

        {/* Editor Grid */}
        <div className="flex-1 bg-white p-6 rounded-3xl shadow-xl border border-slate-200 overflow-auto flex justify-center">
          {grid.length > 0 && (
            <div 
              className="grid gap-[1px] bg-slate-300 border-2 border-slate-600 select-none w-fit"
              style={{ 
                gridTemplateColumns: `auto repeat(${size}, minmax(1.5rem, 2rem))`,
                gridTemplateRows: `auto repeat(${size}, minmax(1.5rem, 2rem))`
              }}
              onContextMenu={handleContextMenu}
            >
              {/* Top-left empty corner */}
              <div className="bg-white"></div>

              {/* Top Clues */}
              {colClues.map((clueArr, cIndex) => (
                <div key={`col-${cIndex}`} className="flex flex-col justify-end items-center pb-1 gap-[1px] bg-slate-50 text-sm border-b border-slate-300">
                  {clueArr.map((clue, idx) => (
                    <span 
                      key={idx} 
                      className="font-black w-4 h-4 flex items-center justify-center rounded-[2px] text-[10px]"
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
                  {/* Left Clues */}
                  <div className="flex justify-end items-center pr-2 gap-[1px] bg-slate-50 text-sm border-r border-slate-300">
                    {clueArr.map((clue, idx) => (
                      <span 
                        key={idx} 
                        className="font-black w-4 h-4 flex items-center justify-center rounded-[2px] text-[10px]"
                        style={clue.color === 'transparent' ? { color: 'transparent' } : { backgroundColor: clue.color, color: '#fff', textShadow: '0 0 2px rgba(0,0,0,0.8)' }}
                      >
                        {clue.count}
                      </span>
                    ))}
                  </div>

                  {/* Grid Cells */}
                  {grid[rIndex].map((cellColor, cIndex) => {
                    const isRightBorder = (cIndex + 1) % 5 === 0 && cIndex !== size - 1;
                    const isBottomBorder = (rIndex + 1) % 5 === 0 && rIndex !== size - 1;
                    return (
                      <div
                        key={`cell-${rIndex}-${cIndex}`}
                        onPointerDown={(e) => handlePointerDown(e, rIndex, cIndex)}
                        onPointerEnter={(e) => handlePointerEnter(e, rIndex, cIndex)}
                        className={clsx(
                          "w-6 h-6 sm:w-8 sm:h-8 cursor-crosshair transition-colors hover:opacity-80 bg-white",
                          isRightBorder ? "border-r-2 border-r-slate-400" : "",
                          isBottomBorder ? "border-b-2 border-b-slate-400" : ""
                        )}
                        style={{
                          backgroundColor: cellColor || '#ffffff'
                        }}
                      >
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
