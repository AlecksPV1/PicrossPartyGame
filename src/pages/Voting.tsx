import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type RoomData, subscribeToRoom, getLocalPlayerId } from '../lib/room';
import { PREDEFINED_LEVELS } from '../lib/levels';
import { COLLAGES } from '../lib/collages';
import { ref, update } from 'firebase/database';
import { db } from '../lib/firebase';
import clsx from 'clsx';
import { Timer } from 'lucide-react';

export default function Voting() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const localPlayerId = getLocalPlayerId();

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = subscribeToRoom(roomId, (data) => {
      setRoom(data);
    });
    return () => unsubscribe();
  }, [roomId]);

  const isHost = room?.hostId === localPlayerId;

  useEffect(() => {
    if (room?.state === 'playing') {
      navigate(`/game/${roomId}`);
    }
  }, [room?.state, roomId, navigate]);

  // Check if everyone voted to auto-start (Host only)
  useEffect(() => {
    if (isHost && room?.state === 'voting') {
      const players = Object.values(room.players);
      const playingPlayers = players.filter(p => !p.isHost || room.hostIsPlaying);
      const totalPlaying = playingPlayers.length;
      
      const votedCount = playingPlayers.filter(p => p.vote).length;
      
      // Auto-start if all players have voted
      if (totalPlaying > 0 && votedCount === totalPlaying) {
        handleEndVote();
      }
    }
  }, [room, isHost]);

  // Host manages the countdown
  useEffect(() => {
    if (isHost && room?.state === 'voting') {
      if (timeLeft <= 0) {
        handleEndVote();
        return;
      }
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isHost, room?.state, timeLeft]);

  const handleVote = async (puzzleId: string) => {
    if (!roomId || !room || (room.hostIsPlaying === false && isHost)) return;
    const roomRef = ref(db, `rooms/${roomId}/players/${localPlayerId}`);
    await update(roomRef, { vote: puzzleId });
  };

  const handleEndVote = async () => {
    if (!roomId || !room || room.state !== 'voting') return;
    
    // Tally votes
    const votes: Record<string, number> = {};
    (room.puzzleOptions || []).forEach(k => votes[k] = 0);
    
    Object.values(room.players).forEach(p => {
      if (p.vote) votes[p.vote] = (votes[p.vote] || 0) + 1;
    });

    let maxVotes = -1;
    let topPuzzles: string[] = [];

    for (const k in votes) {
      if (votes[k] > maxVotes) {
        maxVotes = votes[k];
        topPuzzles = [k];
      } else if (votes[k] === maxVotes) {
        topPuzzles.push(k);
      }
    }

    // Tie-breaker: random from topPuzzles
    const winningPuzzle = topPuzzles[Math.floor(Math.random() * topPuzzles.length)] || room.puzzleOptions?.[0] || 'level_1';

    const playedPuzzles = room.playedPuzzles || [];
    if (!playedPuzzles.includes(winningPuzzle)) {
      playedPuzzles.push(winningPuzzle);
    }

    const updates: Partial<RoomData> = {
      state: 'playing',
      currentPuzzleId: winningPuzzle,
      playedPuzzles,
      collageAssignments: {} // Reset assignments
    };

    // If it's a collage, assign sections to players
    const collage = COLLAGES.find(c => c.id === winningPuzzle);
    if (collage) {
      const playingPlayers = Object.values(room.players).filter(p => !p.isHost || room.hostIsPlaying);
      const assignments: Record<string, number> = {}; // playerId -> sectionIndex
      
      const numSections = collage.sections.length;
      
      // Shuffle players and assign each section circularly
      const shuffledPlayers = [...playingPlayers].sort(() => 0.5 - Math.random());
      
      shuffledPlayers.forEach((p, idx) => {
        // Wrap around if more players than sections
        assignments[p.id] = idx % numSections;
      });

      updates.collageAssignments = assignments;
    }

    const roomRef = ref(db, `rooms/${roomId}`);
    await update(roomRef, updates);
  };

  if (!room) return <div className="flex-1 flex items-center justify-center font-bold text-slate-500">Cargando...</div>;

  const playerVote = room.players[localPlayerId]?.vote;

  return (
    <div className="flex-1 flex flex-col items-center p-6 bg-slate-50 min-h-screen pt-12">
      <h2 className="text-4xl font-black text-center mb-2 text-indigo-600">¡Vota por el próximo puzle!</h2>
      <p className="text-slate-500 mb-8 font-bold text-center text-xl">Ronda <span className="text-indigo-500">{room.currentRound}</span> de {room.totalRounds}</p>
      
      {isHost && (
        <div className="flex items-center justify-center gap-2 mb-8 bg-white px-6 py-3 rounded-full shadow-md text-red-500 font-black text-2xl animate-pulse">
          <Timer />
          <span>{timeLeft}s</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {(room.puzzleOptions || []).map(key => {
          const normal = PREDEFINED_LEVELS.find(l => l.id === key);
          const collage = COLLAGES.find(c => c.id === key);
          const level = normal || collage;
          if (!level) return null;
          
          let voteCount = 0;
          Object.values(room.players).forEach(p => {
            if (p.vote === key) voteCount++;
          });

          return (
            <button 
              key={key}
              onClick={() => handleVote(key)}
              disabled={isHost && !room.hostIsPlaying}
              className={clsx(
                "bg-white border-4 rounded-3xl p-6 flex flex-col items-center transition transform shadow-sm hover:scale-105",
                playerVote === key ? "border-indigo-500 ring-4 ring-indigo-200" : "border-transparent hover:border-indigo-200"
              )}
            >
              <div className="text-xl font-black text-slate-700 mb-4">{level.name}</div>
              
              <div className="mt-4 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full font-black text-lg">
                {voteCount} Votos
              </div>
            </button>
          );
        })}
      </div>
      
      {!isHost && (
        <div className="mt-12 text-center p-4 text-slate-400 font-bold animate-pulse">
          Esperando a que el Host termine la votación...
        </div>
      )}
    </div>
  );
}
