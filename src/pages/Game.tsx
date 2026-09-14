import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type RoomData, subscribeToRoom, getLocalPlayerId } from '../lib/room';
import { PREDEFINED_LEVELS } from '../lib/levels';
import PicrossBoard from '../components/PicrossBoard';
import { ref, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { Timer, CheckCircle, PenTool, AlertTriangle } from 'lucide-react';

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomData | null>(null);
  const localPlayerId = getLocalPlayerId();
  
  const [sdTimeLeft, setSdTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = subscribeToRoom(roomId, (data) => {
      setRoom(data);
    });
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (room?.state === 'results') {
      navigate(`/results/${roomId}`);
    }
  }, [room?.state, roomId, navigate]);

  const puzzle = useMemo(() => {
    if (!room?.currentPuzzleId) return null;
    return PREDEFINED_LEVELS.find(l => l.id === room.currentPuzzleId);
  }, [room?.currentPuzzleId]);

  const isHost = room?.hostId === localPlayerId;
  const isSpectatingHost = isHost && !room?.hostIsPlaying;

  // Sudden Death Timer & Auto End
  useEffect(() => {
    if (!room || !roomId || room.state !== 'playing') return;

    const players = Object.values(room.players);
    const playingPlayers = players.filter(p => p.id !== room.hostId || room.hostIsPlaying);
    const totalPlaying = playingPlayers.length;
    const finishedCount = playingPlayers.filter(p => p.finishedTime).length;
    
    // Check if we need to start sudden death (host only)
    if (isHost && !room.suddenDeathEndTime && totalPlaying > 0 && finishedCount >= Math.ceil(totalPlaying / 2)) {
      if (finishedCount < totalPlaying) {
        // Start sudden death (60s)
        const roomRef = ref(db, `rooms/${roomId}`);
        update(roomRef, { suddenDeathEndTime: Date.now() + 60000 });
      }
    }

    // Check if everyone is done
    if (isHost && totalPlaying > 0 && finishedCount === totalPlaying) {
      handleEndRound();
      return;
    }

    // Handle sudden death countdown
    if (room.suddenDeathEndTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((room.suddenDeathEndTime! - Date.now()) / 1000));
        setSdTimeLeft(remaining);
        
        if (remaining <= 0 && isHost) {
          clearInterval(interval);
          handleEndRound();
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setSdTimeLeft(null);
    }
  }, [room, roomId, isHost]);

  const handleEndRound = async () => {
    if (!roomId || !room) return;
    
    // Assign points
    const players = Object.values(room.players);
    const updatedPlayers = { ...room.players };
    
    // 1st = 100, 2nd = 80, 3rd = 60, 4th = 40, else = 20
    const POINTS = [100, 80, 60, 40];
    
    players.forEach(p => {
      if (p.finishedTime && p.roundPosition) {
        const pts = POINTS[p.roundPosition - 1] || 20;
        updatedPlayers[p.id].score += pts;
      } else if (!p.isHost || room.hostIsPlaying) {
        // Played but didn't finish
        updatedPlayers[p.id].score += 10;
      }
    });

    const roomRef = ref(db, `rooms/${roomId}`);
    await update(roomRef, {
      state: 'results',
      players: updatedPlayers,
      suddenDeathEndTime: null
    });
  };

  const handleComplete = async () => {
    if (!roomId || !room) return;
    
    const finishedCount = Object.values(room.players).filter(p => p.finishedTime).length;
    const position = finishedCount + 1;
    
    const playerRef = ref(db, `rooms/${roomId}/players/${localPlayerId}`);
    await update(playerRef, {
      finishedTime: Date.now(),
      roundPosition: position
    });
  };

  if (!room || !puzzle) return <div className="flex-1 flex items-center justify-center font-bold text-slate-500">Cargando partida...</div>;

  const myPlayer = room.players[localPlayerId];
  const amIFinished = myPlayer?.finishedTime != null;

  // Render Host Spectator Dashboard
  if (isSpectatingHost) {
    return (
      <div className="flex-1 flex flex-col items-center p-6 bg-slate-50 min-h-screen pt-12">
        <h2 className="text-4xl font-black mb-8 text-indigo-600">Ronda en Curso</h2>
        
        {sdTimeLeft !== null && (
          <div className="text-6xl font-black text-red-500 mb-8 animate-pulse flex items-center gap-4">
            <AlertTriangle size={64} />
            <span>{sdTimeLeft}s</span>
          </div>
        )}

        <div className="w-full max-w-2xl bg-white p-6 rounded-3xl shadow-xl border-2 border-slate-100">
          <h3 className="text-xl font-bold mb-4 text-slate-800">Estado en Vivo</h3>
          <div className="space-y-3">
            {Object.values(room.players)
              .filter(p => !p.isHost) // Only show actual players
              .sort((a, b) => (a.roundPosition || 999) - (b.roundPosition || 999))
              .map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-xl text-slate-800">{p.name}</span>
                {p.finishedTime ? (
                  <span className="text-green-500 font-black flex items-center gap-2"><CheckCircle /> ¡Terminó! (#{p.roundPosition})</span>
                ) : (
                  <span className="text-slate-400 font-bold flex items-center gap-2"><PenTool size={18} /> Resolviendo...</span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <button onClick={handleEndRound} className="mt-8 text-red-500 font-bold underline hover:text-red-700">Forzar fin de ronda</button>
      </div>
    );
  }

  // Render Player Game
  return (
    <div className="flex-1 flex flex-col items-center pb-8 pt-4">
      {sdTimeLeft !== null && !amIFinished && (
        <div className="w-full max-w-sm bg-red-500 text-white p-3 rounded-xl mb-4 text-center font-black text-xl shadow-lg flex items-center justify-center animate-bounce">
          <Timer className="mr-2" /> ¡APÚRATE! {sdTimeLeft}s
        </div>
      )}

      {amIFinished ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="bg-green-50 border-2 border-green-200 text-green-700 p-8 rounded-3xl text-center shadow-xl max-w-md w-full">
            <CheckCircle size={80} className="mx-auto mb-4 text-green-500" />
            <h2 className="text-3xl font-black mb-2 text-green-700">¡Puzle Completado!</h2>
            <p className="font-bold text-xl text-green-600">Llegaste en la posición #{myPlayer.roundPosition}</p>
            <p className="mt-4 text-green-600/70 font-bold">Esperando a que los demás terminen...</p>
          </div>
        </div>
      ) : (
        <>
          <PicrossBoard puzzle={puzzle} onComplete={handleComplete} />
        </>
      )}
    </div>
  );
}
