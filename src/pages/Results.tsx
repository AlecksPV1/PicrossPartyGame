import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type RoomData, subscribeToRoom, getLocalPlayerId, startVoting } from '../lib/room';
import { Forward, Crown } from 'lucide-react';
import clsx from 'clsx';

export default function Results() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomData | null>(null);
  const localPlayerId = getLocalPlayerId();

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = subscribeToRoom(roomId, (data) => {
      setRoom(data);
    });
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (room?.state === 'voting') {
      navigate(`/voting/${roomId}`);
    } else if (room?.state === 'playing') {
      navigate(`/game/${roomId}`);
    } else if (room?.state === 'lobby') {
      navigate(`/lobby/${roomId}`);
    }
  }, [room?.state, roomId, navigate]);

  const isHost = room?.hostId === localPlayerId;

  const handleNextRound = async () => {
    if (isHost && roomId && room) {
      // Check if it's over
      if (room.currentRound >= room.totalRounds) {
        // We're already on the final screen, this button shouldn't appear or should reset
        navigate('/');
      } else {
        // Go to next voting
        // We need to increment the round
        const { ref, update } = await import('firebase/database');
        const { db } = await import('../lib/firebase');
        
        const roomRef = ref(db, `rooms/${roomId}`);
        await update(roomRef, {
          currentRound: room.currentRound + 1
        });
        
        await startVoting(roomId);
      }
    }
  };

  if (!room) return <div className="flex-1 flex items-center justify-center font-bold text-slate-500">Cargando resultados...</div>;

  const isFinal = room.currentRound >= room.totalRounds;
  const players = Object.values(room.players)
    .filter(p => !p.isHost || room.hostIsPlaying)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="flex-1 flex flex-col items-center p-6 bg-slate-50 min-h-screen pt-12">
      <h2 className="text-4xl font-black mb-2 text-center text-indigo-600">
        {isFinal ? '¡Resultados Finales!' : 'Resultados de la Ronda'}
      </h2>
      <p className="text-slate-500 mb-8 font-bold">
        {isFinal ? '¡La fiesta ha terminado!' : `Ronda completada ${room.currentRound}`}
      </p>

      {isFinal && (
        <div className="flex flex-col items-center justify-center mb-8 animate-bounce">
          <Crown size={80} className="text-yellow-400 mb-2 drop-shadow-md" />
          <h3 className="text-3xl font-black text-slate-800">¡Ganador!</h3>
          <p className="text-2xl font-bold text-indigo-600 mt-2">{players[0]?.name}</p>
        </div>
      )}

      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-indigo-50 p-4 border-b border-indigo-100 grid grid-cols-4 font-black text-indigo-800">
          <div className="col-span-1 text-center">Rango</div>
          <div className="col-span-2">Jugador</div>
          <div className="col-span-1 text-right">Pts</div>
        </div>
        <div className="divide-y divide-slate-100">
          {players.map((p, index) => (
            <div key={p.id} className={clsx(
              "p-4 grid grid-cols-4 items-center transition-colors",
              index === 0 ? 'bg-yellow-50/50' : ''
            )}>
              <div className={clsx(
                "col-span-1 text-center font-black text-2xl",
                index === 0 ? 'text-yellow-500' : 'text-slate-400'
              )}>
                #{index + 1}
              </div>
              <div className="col-span-2 font-bold text-xl text-slate-800">{p.name} {p.id === localPlayerId ? '(Tú)' : ''}</div>
              <div className="col-span-1 text-right font-black text-2xl text-indigo-600">{p.score}</div>
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <div className="mt-12">
          {isFinal ? (
            <button 
              onClick={() => navigate('/')}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-10 rounded-2xl shadow-xl text-xl flex items-center gap-2"
            >
              Volver al Inicio
            </button>
          ) : (
            <button 
              onClick={handleNextRound}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-10 rounded-2xl shadow-xl text-xl flex items-center gap-2 transition-transform active:scale-95"
            >
              Siguiente Ronda <Forward />
            </button>
          )}
        </div>
      ) : (
        <div className="mt-12 text-center p-4 bg-slate-100 rounded-2xl text-slate-500 font-bold animate-pulse">
          {isFinal ? 'El Host puede cerrar la sala' : 'Esperando a que el Host inicie la siguiente ronda...'}
        </div>
      )}
    </div>
  );
}
