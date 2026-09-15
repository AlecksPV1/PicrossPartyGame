import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, ZoomIn } from 'lucide-react';

interface ImageImporterProps {
  gridSize: number; // The target dimensions (e.g. 15 for 15x15)
  onImport: (pixels: (string | null)[][], colors: string[]) => void;
}

// Convert RGB to HEX
function rgbToHex(r: number, g: number, b: number) {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

// Simple color quantization (round to nearest block of colors)
function quantizeColor(r: number, g: number, b: number) {
  const step = 64; // Reduce color space (0, 64, 128, 192, 255)
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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate draw dimensions
    const drawWidth = image.width * zoom;
    const drawHeight = image.height * zoom;
    
    // Center initially, plus offset
    const dx = (canvas.width - drawWidth) / 2 + offset.x;
    const dy = (canvas.height - drawHeight) / 2 + offset.y;

    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

    // Draw an overlay square representing the crop area (center)
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

  }, [image, zoom, offset]);

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

  const processImage = () => {
    if (!image || !canvasRef.current) return;

    // Create offscreen canvas exact size of puzzle grid
    const offCanvas = document.createElement('canvas');
    offCanvas.width = gridSize;
    offCanvas.height = gridSize;
    const ctx = offCanvas.getContext('2d');
    if (!ctx) return;

    // We want to map the 240x240 view directly down to gridSize x gridSize
    ctx.drawImage(canvasRef.current, 0, 0, 240, 240, 0, 0, gridSize, gridSize);

    const imgData = ctx.getImageData(0, 0, gridSize, gridSize).data;
    const newGrid: (string | null)[][] = [];
    const colorSet = new Set<string>();

    for (let r = 0; r < gridSize; r++) {
      const row: (string | null)[] = [];
      for (let c = 0; c < gridSize; c++) {
        const i = (r * gridSize + c) * 4;
        const R = imgData[i];
        const G = imgData[i+1];
        const B = imgData[i+2];
        const A = imgData[i+3];

        if (A > 128 && !(R > 240 && G > 240 && B > 240)) { // ignore transparent and pure white
          const hex = quantizeColor(R, G, B);
          row.push(hex);
          colorSet.add(hex);
        } else {
          row.push(null);
        }
      }
      newGrid.push(row);
    }

    onImport(newGrid, Array.from(colorSet));
  };

  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4 space-y-4">
      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Upload size={18} /> Importar Imagen</h3>
      
      {!image ? (
        <div>
          <label className="block w-full bg-indigo-50 hover:bg-indigo-100 border-2 border-dashed border-indigo-300 text-indigo-700 text-center font-bold py-8 rounded-xl cursor-pointer transition-colors">
            <span>Seleccionar Imagen</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
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

          <div className="flex gap-2">
            <button onClick={processImage} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl transition-colors">
              Convertir a Pixel Art
            </button>
            <button onClick={() => setImage(null)} className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center font-medium">Usa la imagen para autocompletar la cuadrícula. Luego podrás retocar los colores manualmente.</p>
        </div>
      )}
    </div>
  );
}
