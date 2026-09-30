import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, GraduationCap } from 'lucide-react';
import PicrossBoard from '../components/PicrossBoard';
import { type PicrossPuzzle } from '../lib/picross';

const RED = '#ef4444';
const GREEN = '#10b981';

const TUTORIAL_PUZZLE: PicrossPuzzle = {
  id: 'tutorial',
  name: 'Tutorial: Manzana',
  width: 5,
  height: 5,
  solution: [
    [null, null, GREEN, null, null],
    [null, RED, RED, RED, null],
    [RED, RED, RED, RED, RED],
    [RED, RED, RED, RED, RED],
    [null, RED, RED, RED, null],
  ],
  rowClues: [
    [{ count: 1, color: GREEN }],
    [{ count: 3, color: RED }],
    [{ count: 5, color: RED }],
    [{ count: 5, color: RED }],
    [{ count: 3, color: RED }],
  ],
  colClues: [
    [{ count: 2, color: RED }],
    [{ count: 4, color: RED }],
    [{ count: 1, color: GREEN }, { count: 4, color: RED }],
    [{ count: 4, color: RED }],
    [{ count: 2, color: RED }],
  ]
};

export default function Tutorial() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleGridChange = (grid: (string | null)[][]) => {
    if (step === 0) {
      // Check if Row 2 is fully red
      const row2IsRed = grid[2]?.every(cell => cell === RED);
      if (row2IsRed) {
        setStep(1);
      }
    } else if (step === 1) {
      // Check if Row 3 is fully red
      const row3IsRed = grid[3]?.every(cell => cell === RED);
      if (row3IsRed) {
        setStep(2);
      }
    } else if (step === 2) {
      // Check if Col 2 has top Green and rest Red
      if (grid[0]?.[2] === GREEN && grid[1]?.[2] === RED && grid[4]?.[2] === RED) {
        setStep(3);
      }
    }
  };

  const handleComplete = () => {
    setCompleted(true);
    setStep(4);
  };

  const stepTexts = [
    <>
      <p className="mb-4"><strong>¡Bienvenido al Tutorial!</strong> El objetivo de Color Picross es pintar la cuadrícula para descubrir la imagen oculta usando los números en los bordes como pistas.</p>
      <p><strong>Regla 1: Las pistas.</strong> Observa la 3ª fila. Tiene un <span className="font-bold text-red-500 bg-red-100 px-2 py-1 rounded">5</span>. Como la cuadrícula mide exactamente 5 casillas, ¡sabemos que toda la fila va de rojo!</p>
      <p className="mt-4 font-black text-indigo-600 bg-indigo-50 p-3 rounded-lg border border-indigo-200">
        👉 TAREA: Selecciona el color rojo (abajo) y pinta toda la 3ª fila (la de en medio).
      </p>
    </>,
    <>
      <p className="mb-4"><strong>¡Excelente!</strong> Acabas de aplicar la regla más importante: buscar filas o columnas que puedas llenar por completo.</p>
      <p>Observa que la 4ª fila también tiene como pista un <span className="font-bold text-red-500 bg-red-100 px-2 py-1 rounded">5</span>.</p>
      <p className="mt-4 font-black text-indigo-600 bg-indigo-50 p-3 rounded-lg border border-indigo-200">
        👉 TAREA: Pinta toda la 4ª fila de rojo también.
      </p>
    </>,
    <>
      <p className="mb-4"><strong>¡Perfecto!</strong> Ahora vamos a complicarlo un poco.</p>
      <p><strong>Regla 2: Pistas múltiples.</strong> Mira la columna central (la 3ª columna). Arriba tiene un <span className="font-bold text-green-500 bg-green-100 px-2 py-1 rounded">1</span> verde y un <span className="font-bold text-red-500 bg-red-100 px-2 py-1 rounded">4</span> rojo. Esto significa que de arriba a abajo hay 1 bloque verde, luego un cambio de color (o espacio), y después 4 rojos seguidos.</p>
      <p className="mt-4 font-black text-indigo-600 bg-indigo-50 p-3 rounded-lg border border-indigo-200">
        👉 TAREA: Pinta la primera casilla de la columna central de verde, y completa el resto de la columna con rojo.
      </p>
    </>,
    <>
      <p className="mb-4"><strong>¡Muy bien!</strong> Ya tienes el tallo y parte del centro de la manzana.</p>
      <p><strong>Regla 3: Marcar espacios vacíos.</strong> La 1ª columna dice <span className="font-bold text-red-500 bg-red-100 px-2 py-1 rounded">2</span>, y ya pintaste 2 rojos ahí. Eso significa que las demás casillas de esa columna van VACÍAS.</p>
      <p className="mb-4">Puedes seleccionar la herramienta <strong>'X'</strong> para marcar las casillas que sabes que van vacías para no confundirte (es opcional pero muy útil).</p>
      <p className="font-black text-indigo-600 bg-indigo-50 p-3 rounded-lg border border-indigo-200">
        👉 TAREA FINAL: Usa tu lógica para pintar el resto de la manzana observando las pistas que faltan. Cuando termines, presiona el botón <strong>"¡Terminé!"</strong> que aparecerá debajo del tablero.
      </p>
    </>,
    <>
      <div className="text-center py-4">
        <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
        <h3 className="text-3xl font-black text-slate-800 mb-4">¡Tutorial Completado!</h3>
        <p className="text-lg text-slate-600 font-bold mb-8">Has aprendido todas las mecánicas básicas de Color Picross. ¡Ya estás listo para jugar y competir contra tus amigos!</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-8 rounded-xl transition-transform active:scale-95 shadow-lg w-full max-w-sm"
        >
          VOLVER AL INICIO
        </button>
      </div>
    </>
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b-2 border-slate-200 p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <GraduationCap className="text-indigo-500" />
              <span>Tutorial</span>
            </h1>
          </div>
        </div>
        <div className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-bold border border-indigo-200">
          Paso {Math.min(step + 1, 4)} / 4
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col xl:flex-row gap-8 items-start justify-center">
          
          {/* Instructions Panel */}
          <div className="w-full xl:w-[450px] bg-white rounded-3xl shadow-xl border-2 border-slate-200 p-6 xl:p-8 shrink-0 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
              {step < 4 ? 'Instrucciones' : '¡Felicidades!'}
            </h2>
            <div className="text-slate-700 text-lg leading-relaxed animate-in fade-in slide-in-from-right-4 duration-500">
              {stepTexts[step]}
            </div>
            
            {/* Progress indicator dots */}
            {step < 4 && (
              <div className="flex justify-center gap-2 mt-8">
                {[0, 1, 2, 3].map(i => (
                  <div 
                    key={i} 
                    className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                      i === step ? 'bg-indigo-500' : i < step ? 'bg-green-500' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Game Board */}
          {!completed && (
            <div className="w-full flex justify-center animate-in zoom-in-95 duration-500">
              <div className="pointer-events-auto">
                <PicrossBoard 
                  key="tutorial_board"
                  puzzle={TUTORIAL_PUZZLE} 
                  saveKey="tutorial_apple"
                  onComplete={handleComplete} 
                  onChange={handleGridChange} 
                />
              </div>
            </div>
          )}
          
          {completed && (
            <div className="w-full max-w-lg xl:w-[500px] flex justify-center items-center p-12 bg-white rounded-3xl shadow-xl border-2 border-slate-200 animate-in zoom-in-95 duration-500">
              <div 
                className="bg-slate-200 p-1 rounded-lg shadow-inner w-full"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '1px'
                }}
              >
                {TUTORIAL_PUZZLE.solution.flat().map((color, i) => (
                  <div 
                    key={i} 
                    className="aspect-square bg-white shadow-sm"
                    style={{ backgroundColor: color || 'white' }}
                  />
                ))}
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
