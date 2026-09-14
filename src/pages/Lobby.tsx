import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Play, Crown } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { type RoomData, subscribeToRoom, getLocalPlayerId, startVoting } from '../lib/room';

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
    if (room?.state === 'voting') {
      navigate(`/voting/${roomId}`);
    } else if (room?.state === 'playing') {
      navigate(`/game/${roomId}`);
    }
  }, [room?.state, roomId, navigate]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Cargando sala...</div>;
  }

  if (!room) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold text-red-600">Sala no encontrada o cerrada</h2>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-slate-200 rounded-xl font-bold text-slate-800">Volver al Inicio</button>
      </div>
    );
  }

  const isHost = room.hostId === localPlayerId;
  const players = Object.values(room.players || {});
  const numPlayers = players.length;
  // If host is not playing, they don't count towards the required player limit
  const playingCount = room.hostIsPlaying ? numPlayers : numPlayers - (isHost ? 1 : 0);

  const handleStartVoting = async () => {
    if (isHost && roomId) {
      await startVoting(roomId);
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-4 pb-12 px-4 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/')}
          className="p-2 bg-white hover:bg-slate-100 rounded-full shadow-sm transition-colors border border-slate-200"
        >
          <ArrowLeft size={24} className="text-slate-800" />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sala</h2>
          <div className="text-4xl font-black text-indigo-600 tracking-widest">{roomId}</div>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3 flex flex-col items-center p-6 bg-white rounded-3xl shadow-xl border border-slate-200">
          <h3 className="text-lg font-bold text-slate-600 mb-4">Invita a tus amigos</h3>
          <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100">
            <QRCodeSVG 
              value={`${window.location.origin}/?join=${roomId}`} 
              size={180}
              level="H"
            />
          </div>
          <p className="text-sm text-slate-500 text-center">
            Escanea el código o entra en<br/>
            <span className="font-bold text-indigo-500">{window.location.host}</span><br/>
            y usa el PIN: <span className="font-black text-slate-800 text-lg">{roomId}</span>
          </p>
        </div>

        <div className="md:flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-indigo-500" />
            <h3 className="text-xl font-bold text-slate-800">Jugadores ({playingCount})</h3>
          </div>
          
          <div className="flex-1 bg-white rounded-3xl shadow-xl border border-slate-200 p-4 space-y-2 overflow-y-auto max-h-[400px]">
            {players.length === 0 && <div className="text-slate-400 font-bold text-center mt-8">Esperando jugadores...</div>}
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg text-slate-800">{p.name} {p.id === localPlayerId ? "(Tú)" : ""}</span>
                  {p.isHost && <Crown size={16} className="text-yellow-500" />}
                </div>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-bold">En la sala</span>
              </div>
            ))}
          </div>

          {isHost ? (
            <button 
              onClick={handleStartVoting}
              disabled={playingCount < 1}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-black py-4 px-6 rounded-2xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
            >
              <Play size={24} />
              <span>Empezar Votación</span>
            </button>
          ) : (
            <div className="mt-6 w-full text-center p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-2xl font-bold animate-pulse shadow-sm">
              Esperando al Host para iniciar...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
