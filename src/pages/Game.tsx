import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PREDEFINED_LEVELS } from '../lib/levels';
import PicrossBoard from '../components/PicrossBoard';
import { useState } from 'react';

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  // For testing, just pick the first level
  const [level] = useState(PREDEFINED_LEVELS[2]); // The Cat
  const [won, setWon] = useState(false);

  const handleComplete = () => {
    if (!won) {
      setWon(true);
      // In a real game, this would send completion time to Firebase
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-4 pb-12">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate(`/lobby/${roomId}`)}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{level.name}</h2>
          <div className="text-lg font-black text-white">Sala {roomId}</div>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {won ? (
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
              ¡Completado!
            </h2>
            <div className="p-8 bg-slate-800 rounded-3xl shadow-xl shadow-green-900/20">
               {/* Display the completed grid nicely */}
               <div 
                  className="grid gap-1"
                  style={{ 
                    gridTemplateColumns: `repeat(${level.width}, 2rem)`,
                    gridTemplateRows: `repeat(${level.height}, 2rem)`
                  }}
                >
                  {level.solution.map((row, r) => 
                    row.map((cell, c) => (
                      <div 
                        key={`${r}-${c}`}
                        className="w-8 h-8 rounded-sm"
                        style={{ backgroundColor: cell || 'transparent' }}
                      />
                    ))
                  )}
               </div>
            </div>
            <button 
              onClick={() => navigate(`/lobby/${roomId}`)}
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 font-bold rounded-xl transition-colors"
            >
              Volver al Lobby
            </button>
          </div>
        ) : (
          <PicrossBoard puzzle={level} onComplete={handleComplete} />
        )}
      </div>
    </div>
  );
}
