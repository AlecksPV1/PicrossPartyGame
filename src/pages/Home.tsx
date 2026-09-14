import { useNavigate } from 'react-router-dom';
import { Play, Users } from 'lucide-react';
import { useState } from 'react';
import { createRoom, createRoomId, getLocalPlayerId, joinRoom } from '../lib/room';

export default function Home() {
  const navigate = useNavigate();
  const [pin, setPin] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('join') || '';
  });
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async () => {
    if (!name.trim()) {
      setError("Ingresa tu nombre para crear la sala");
      return;
    }
    setLoading(true);
    try {
      const roomId = createRoomId();
      const playerId = getLocalPlayerId();
      await createRoom(roomId, playerId, name);
      navigate(`/lobby/${roomId}`);
    } catch (err) {
      setError("Error al crear la sala");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ingresa tu nombre para jugar");
      return;
    }
    if (pin.trim().length === 4) {
      setLoading(true);
      try {
        const playerId = getLocalPlayerId();
        await joinRoom(pin.trim(), playerId, name);
        navigate(`/lobby/${pin.trim()}`);
      } catch (err: any) {
        setError(err.message || "Error al unirse");
      } finally {
        setLoading(false);
      }
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
        <div className="space-y-2">
          <label className="text-slate-400 font-bold ml-2">Tu Apodo</label>
          <input 
            type="text" 
            placeholder="Ej. Juan..." 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800 border-2 border-slate-700 text-lg font-bold py-3 px-4 rounded-2xl focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 text-red-300 font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        <button 
          onClick={handleCreateRoom}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-purple-900/50 transition-all active:scale-95"
        >
          <Play size={24} />
          <span>Crear Sala (Host)</span>
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-slate-700"></div>
          <span className="flex-shrink-0 mx-4 text-slate-500 text-sm font-medium uppercase">o unirse</span>
          <div className="flex-grow border-t border-slate-700"></div>
        </div>

        <form onSubmit={handleJoinRoom} className="space-y-3">
          <input 
            type="text" 
            placeholder="PIN de 4 dígitos" 
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-slate-800 border-2 border-slate-700 text-center text-2xl font-bold py-3 px-4 rounded-2xl focus:outline-none focus:border-pink-500 transition-colors tracking-widest"
          />
          <button 
            type="submit"
            disabled={pin.length !== 4 || loading}
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
