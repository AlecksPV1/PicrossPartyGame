import { useNavigate } from 'react-router-dom';
import { Play, Users } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');

  const createRoom = () => {
    const roomId = Math.floor(1000 + Math.random() * 9000).toString();
    navigate(`/lobby/${roomId}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim().length === 4) {
      navigate(`/lobby/${pin.trim()}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Color Picross
        </h1>
        <p className="text-xl text-slate-400">Party Game</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <button 
          onClick={createRoom}
          className="w-full flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-purple-900/50 transition-all active:scale-95"
        >
          <Play size={24} />
          <span>Crear Sala (Host)</span>
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-slate-700"></div>
          <span className="flex-shrink-0 mx-4 text-slate-500 text-sm font-medium uppercase">o unirse</span>
          <div className="flex-grow border-t border-slate-700"></div>
        </div>

        <form onSubmit={joinRoom} className="space-y-3">
          <input 
            type="text" 
            placeholder="PIN de 4 dígitos" 
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-slate-800 border-2 border-slate-700 text-center text-2xl font-bold py-3 px-4 rounded-2xl focus:outline-none focus:border-pink-500 transition-colors"
          />
          <button 
            type="submit"
            disabled={pin.length !== 4}
            className="w-full flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl transition-all active:scale-95"
          >
            <Users size={24} />
            <span>Unirse a Sala</span>
          </button>
        </form>
      </div>
    </div>
  );
}
