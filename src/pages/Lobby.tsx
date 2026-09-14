import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Play, Crown } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { type RoomData, subscribeToRoom, getLocalPlayerId, startGame } from '../lib/room';

export default function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);

  const localPlayerId = getLocalPlayerId();

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = subscribeToRoom(roomId, (data) => {
      setRoom(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    // If room state becomes 'playing', navigate to game
    if (room?.state === 'playing') {
      navigate(`/game/${roomId}`);
    }
  }, [room?.state, roomId, navigate]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Cargando sala...</div>;
  }

  if (!room) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold text-red-400">Sala no encontrada o cerrada</h2>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-slate-700 rounded-xl">Volver al Inicio</button>
      </div>
    );
  }

  const isHost = room.hostId === localPlayerId;
  const players = Object.values(room.players || {});

  const handleStartGame = async () => {
    if (isHost && roomId) {
      // Pick a random puzzle for now (we'll add voting later)
      await startGame(roomId, 'level_3'); 
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-4 pb-12">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/')}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sala</h2>
          <div className="text-3xl font-black text-white tracking-widest">{roomId}</div>
        </div>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-8">
        {/* Host controls / QR */}
        <div className="md:w-1/3 flex flex-col items-center p-6 bg-slate-800/50 rounded-3xl border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Invita a tus amigos</h3>
          <div className="bg-white p-4 rounded-2xl mb-4">
            <QRCodeSVG 
              value={`${window.location.origin}/?join=${roomId}`} 
              size={180}
              level="H"
            />
          </div>
          <p className="text-sm text-slate-400 text-center">
            Escanea el código o entra en<br/>
            <span className="font-bold text-pink-400">{window.location.host}</span><br/>
            y usa el PIN: <span className="font-bold text-white">{roomId}</span>
          </p>
        </div>

        {/* Players list */}
        <div className="md:flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-purple-400" />
            <h3 className="text-xl font-bold">Jugadores ({players.length}/8)</h3>
          </div>
          
          <div className="flex-1 bg-slate-800 rounded-3xl border border-slate-700 p-4 space-y-2 overflow-y-auto max-h-[400px]">
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-xl border border-slate-600">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{p.name} {p.id === localPlayerId ? "(Tú)" : ""}</span>
                  {p.isHost && <Crown size={16} className="text-yellow-500" />}
                </div>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-lg font-bold">En la sala</span>
              </div>
            ))}
          </div>

          {isHost ? (
            <button 
              onClick={handleStartGame}
              disabled={players.length < 1}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
            >
              <Play size={24} />
              <span>Empezar Partida</span>
            </button>
          ) : (
            <div className="mt-6 w-full text-center p-4 bg-slate-800 rounded-2xl text-slate-400 font-bold animate-pulse">
              Esperando al Host para iniciar...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
