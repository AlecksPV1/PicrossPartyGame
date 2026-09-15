import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, ZoomIn, Copy } from 'lucide-react';
import { generateClues } from '../lib/picross';

interface ImageImporterProps {
  gridSize: number; // The target dimensions (e.g. 15 for 15x15) - used for single mode
  onImport: (pixels: (string | null)[][], colors: string[]) => void;
}

// Convert RGB to HEX
function rgbToHex(r: number, g: number, b: number) {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

// Simple color quantization (round to nearest block of colors)
function quantizeColor(r: number, g: number, b: number) {
  const step = 64; 
  const qr = Math.round(r / step) * step;
  const qg = Math.round(g / step) * step;
  const qb = Math.round(b / step) * step;
  return rgbToHex(
    Math.min(255, qr), 
    Math.min(255, qg), 
    Math.min(255, qb)
  );
}

export default function ImageImporter({ gridSize, onImport }: ImageImporterProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [isCollage, setIsCollage] = useState(false);
  const [cols, setCols] = useState(2);
  const [rows, setRows] = useState(2);
  const [modSize, setModSize] = useState(10);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      };
      img.src = url;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    if (!canvas || !preview || !image) return;
    
    const ctx = canvas.getContext('2d');
    const pCtx = preview.getContext('2d');
    if (!ctx || !pCtx) return;

    // 1. Draw Original Image
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawWidth = image.width * zoom;
    const drawHeight = image.height * zoom;
    const dx = (canvas.width - drawWidth) / 2 + offset.x;
    const dy = (canvas.height - drawHeight) / 2 + offset.y;
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

    // Draw grid overlay on original
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    if (isCollage) {
      ctx.beginPath();
      for (let c = 1; c < cols; c++) {
        const x = (canvas.width / cols) * c;
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
      }
      for (let r = 1; r < rows; r++) {
        const y = (canvas.height / rows) * r;
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();
    }

    // 2. Generate Real-time Pixel Art Preview
    const targetW = isCollage ? cols * modSize : gridSize;
    const targetH = isCollage ? rows * modSize : gridSize;
    
    const offCanvas = document.createElement('canvas');
    offCanvas.width = targetW;
    offCanvas.height = targetH;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    // Draw original view into mini canvas to downscale
    offCtx.drawImage(canvas, 0, 0, 240, 240, 0, 0, targetW, targetH);
    
    // Clear preview canvas
    pCtx.fillStyle = '#f8fafc';
    pCtx.fillRect(0, 0, preview.width, preview.height);
    
    const imgData = offCtx.getImageData(0, 0, targetW, targetH).data;
    const cellW = preview.width / targetW;
    const cellH = preview.height / targetH;

    for (let r = 0; r < targetH; r++) {
      for (let c = 0; c < targetW; c++) {
        const i = (r * targetW + c) * 4;
        const R = imgData[i];
        const G = imgData[i+1];
        const B = imgData[i+2];
        const A = imgData[i+3];

        if (A > 128 && !(R > 240 && G > 240 && B > 240)) {
          pCtx.fillStyle = quantizeColor(R, G, B);
          pCtx.fillRect(c * cellW, r * cellH, cellW, cellH);
        }
      }
    }

    // Draw grid overlay on preview
    pCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    pCtx.lineWidth = 1;
    pCtx.beginPath();
    for (let c = 0; c <= targetW; c++) {
      pCtx.moveTo(c * cellW, 0); pCtx.lineTo(c * cellW, preview.height);
    }
    for (let r = 0; r <= targetH; r++) {
      pCtx.moveTo(0, r * cellH); pCtx.lineTo(preview.width, r * cellH);
    }
    pCtx.stroke();

    // Thick lines for collage sections
    if (isCollage) {
      pCtx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      pCtx.lineWidth = 2;
      pCtx.beginPath();
      for (let c = 1; c < cols; c++) {
        const x = c * modSize * cellW;
        pCtx.moveTo(x, 0); pCtx.lineTo(x, preview.height);
      }
      for (let r = 1; r < rows; r++) {
        const y = r * modSize * cellH;
        pCtx.moveTo(0, y); pCtx.lineTo(preview.width, y);
      }
      pCtx.stroke();
    }

  }, [image, zoom, offset, isCollage, cols, rows, modSize, gridSize]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!image) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const processSingle = () => {
    if (!image || !canvasRef.current) return;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = gridSize;
    offCanvas.height = gridSize;
    const ctx = offCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(canvasRef.current, 0, 0, 240, 240, 0, 0, gridSize, gridSize);
    const { newGrid, colorSet } = extractPixels(ctx, gridSize, gridSize);
    onImport(newGrid, Array.from(colorSet));
  };

  const extractPixels = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const imgData = ctx.getImageData(0, 0, w, h).data;
    const newGrid: (string | null)[][] = [];
    const colorSet = new Set<string>();

    for (let r = 0; r < h; r++) {
      const row: (string | null)[] = [];
      for (let c = 0; c < w; c++) {
        const i = (r * w + c) * 4;
        const R = imgData[i];
        const G = imgData[i+1];
        const B = imgData[i+2];
        const A = imgData[i+3];

        if (A > 128 && !(R > 240 && G > 240 && B > 240)) {
          const hex = quantizeColor(R, G, B);
          row.push(hex);
          colorSet.add(hex);
        } else {
          row.push(null);
        }
      }
      newGrid.push(row);
    }
    return { newGrid, colorSet };
  };

  const processCollageAndExport = () => {
    if (!image || !canvasRef.current) return;
    const sectionWidth = 240 / cols;
    const sectionHeight = 240 / rows;
    
    const sections = [];
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = modSize;
        offCanvas.height = modSize;
        const ctx = offCanvas.getContext('2d');
        if (!ctx) continue;
        
        // Draw just this section
        const sx = c * sectionWidth;
        const sy = r * sectionHeight;
        ctx.drawImage(canvasRef.current, sx, sy, sectionWidth, sectionHeight, 0, 0, modSize, modSize);
        
        const { newGrid } = extractPixels(ctx, modSize, modSize);
        const { rowClues, colClues } = generateClues(newGrid);
        
        sections.push({
          row: r,
          col: c,
          solution: newGrid,
          rowClues,
          colClues
        });
      }
    }

    const data = {
      type: "collage",
      name: "Nuevo Collage",
      modulesX: cols,
      modulesY: rows,
      moduleSize: modSize,
      sections
    };
    
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json);
    alert("¡Collage copiado al portapapeles! " + cols * rows + " puzles generados.");
  };

  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Upload size={18} /> Importar Imagen</h3>
      </div>
      
      {!image ? (
        <div>
          <label className="block w-full bg-indigo-50 hover:bg-indigo-100 border-2 border-dashed border-indigo-300 text-indigo-700 text-center font-bold py-8 rounded-xl cursor-pointer transition-colors">
            <span>Seleccionar Imagen</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 p-1 bg-slate-200 rounded-lg">
            <button 
              onClick={() => setIsCollage(false)} 
              className={`flex-1 text-sm font-bold py-1 rounded-md transition-colors ${!isCollage ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-300'}`}
            >
              Nivel Simple
            </button>
            <button 
              onClick={() => setIsCollage(true)} 
              className={`flex-1 text-sm font-bold py-1 rounded-md transition-colors ${isCollage ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-300'}`}
            >
              Modo Collage
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <div className="text-center">
              <span className="text-xs font-bold text-slate-500 mb-1 block">Original</span>
              <canvas 
                ref={canvasRef}
                width={240} 
                height={240} 
                className="bg-white border-2 border-slate-300 rounded-lg cursor-move shadow-inner touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
            </div>
            
            <div className="text-center">
              <span className="text-xs font-bold text-slate-500 mb-1 block">Pixel Art (Preview)</span>
              <canvas 
                ref={previewRef}
                width={240} 
                height={240} 
                className="bg-white border-2 border-slate-300 rounded-lg shadow-inner"
              />
            </div>
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600 mb-2">
              <ZoomIn size={16} /> Zoom
            </label>
            <input 
              type="range" 
              min="0.1" 
              max="5" 
              step="0.1" 
              value={zoom} 
              onChange={e => setZoom(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          {isCollage && (
            <div className="grid grid-cols-3 gap-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Columnas</label>
                <input type="number" min="1" max="10" value={cols} onChange={e => setCols(Number(e.target.value))} className="w-full rounded bg-white border border-slate-200 px-2 py-1 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Filas</label>
                <input type="number" min="1" max="10" value={rows} onChange={e => setRows(Number(e.target.value))} className="w-full rounded bg-white border border-slate-200 px-2 py-1 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tamaño px</label>
                <select value={modSize} onChange={e => setModSize(Number(e.target.value))} className="w-full rounded bg-white border border-slate-200 px-2 py-1 text-sm font-bold">
                  <option value={5}>5x5</option>
                  <option value={10}>10x10</option>
                  <option value={15}>15x15</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!isCollage ? (
              <button onClick={processSingle} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl transition-colors">
                Convertir a Pixel Art
              </button>
            ) : (
              <button onClick={processCollageAndExport} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Copy size={18} /> Exportar Collage Completo
              </button>
            )}
            <button onClick={() => setImage(null)} className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center font-medium">
            {!isCollage 
              ? "Usa la imagen para autocompletar la cuadrícula actual." 
              : `Esto generará ${cols * rows} puzles de ${modSize}x${modSize} y copiará el JSON de todo el Collage al portapapeles.`}
          </p>
        </div>
      )}
    </div>
  );
}
