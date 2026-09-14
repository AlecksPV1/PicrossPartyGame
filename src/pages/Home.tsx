import { useNavigate } from 'react-router-dom';
import { Users, Gamepad2 } from 'lucide-react';
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
  
  // Host Configuration
  const [rounds, setRounds] = useState(3);
  const [hostIsPlaying, setHostIsPlaying] = useState(true);

  const handleCreateRoom = async () => {
    if (!name) {
      setError('Por favor, ingresa tu apodo primero');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const playerId = getLocalPlayerId();
      const newRoomId = createRoomId();
      await createRoom(newRoomId, playerId, name, hostIsPlaying, rounds);
      navigate(`/lobby/${newRoomId}`);
    } catch (err: any) {
      setError(err.message || 'Error al crear la sala');
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!name) {
      setError('Por favor, ingresa tu apodo primero');
      return;
    }
    if (!pin || pin.length !== 4) {
      setError('El PIN debe tener 4 caracteres');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const playerId = getLocalPlayerId();
      await joinRoom(pin.toUpperCase(), playerId, name);
      navigate(`/lobby/${pin.toUpperCase()}`);
    } catch (err: any) {
      setError(err.message || 'Error al unirse a la sala. Verifica el PIN.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <div className="text-center mb-8">
          <Gamepad2 size={64} className="mx-auto text-indigo-500 mb-4 drop-shadow-md" />
          <h1 className="text-4xl font-black text-slate-800 tracking-tight italic">PARTY PICROSS</h1>
          <p className="text-slate-500 font-bold mt-2">¡Únete a la fiesta!</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-600 rounded-xl font-bold text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1 ml-2">Tu Apodo</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Pikachu, Juan..."
              className="w-full bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Entrar a una sala</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  placeholder="PIN DE 4 LETRAS"
                  maxLength={4}
                  className="flex-1 w-0 bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-4 py-3 font-black tracking-widest uppercase focus:outline-none focus:border-indigo-500"
                />
                <button 
                  onClick={handleJoinRoom}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-600 text-white font-black px-6 py-3 rounded-xl transition-colors disabled:opacity-50 shadow-md"
                >
                  ENTRAR
                </button>
              </div>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 font-bold text-sm">O CREA UNA SALA</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Rondas</label>
              <select 
                value={rounds} 
                onChange={e => setRounds(Number(e.target.value))}
                className="w-full bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>1 Ronda</option>
                <option value={3}>3 Rondas</option>
                <option value={5}>5 Rondas</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Rol del Host</label>
              <select 
                value={hostIsPlaying ? 'play' : 'screen'} 
                onChange={e => setHostIsPlaying(e.target.value === 'play')}
                className="w-full bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-indigo-500"
              >
                <option value="play">Jugar y competir</option>
                <option value="screen">Solo ser pantalla (No juega)</option>
              </select>
            </div>

            <button 
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-xl transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              <Users size={24} />
              <span>CREAR SALA COMO HOST</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
