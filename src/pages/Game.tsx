import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type RoomData, subscribeToRoom, getLocalPlayerId } from '../lib/room';
import { PREDEFINED_LEVELS } from '../lib/levels';
import { COLLAGES } from '../lib/collages';
import { type PicrossPuzzle, generateRandomPuzzle } from '../lib/picross';
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

  const [frenzyPuzzle, setFrenzyPuzzle] = useState<PicrossPuzzle | null>(null);
  
  useEffect(() => {
    if (room?.gameMode === 'frenzy' && !frenzyPuzzle) {
      setFrenzyPuzzle(generateRandomPuzzle(5, 2));
    }
  }, [room?.gameMode, frenzyPuzzle]);

  const { puzzle, collage } = useMemo(() => {
    if (room?.gameMode === 'frenzy') {
      return { puzzle: frenzyPuzzle, collage: null };
    }

    if (!room?.currentPuzzleId) return { puzzle: null, collage: null };
    
    const normal = PREDEFINED_LEVELS.find(l => l.id === room.currentPuzzleId);
    if (normal) return { puzzle: normal, collage: null };

    const col = COLLAGES.find(c => c.id === room.currentPuzzleId);
    if (col) {
      const sectionIndex = room.collageProgress?.activeAssignments?.[localPlayerId];
      if (sectionIndex !== undefined) {
        const section = col.sections[sectionIndex];
        if (section) {
          const p = {
            id: `${col.id}_${section.row}_${section.col}`,
            name: `${col.name} (Parte ${sectionIndex + 1})`,
            width: col.moduleSize,
            height: col.moduleSize,
            solution: section.solution,
            rowClues: section.rowClues,
            colClues: section.colClues
          };
          return { puzzle: p, collage: col };
        }
      }
    }
    return { puzzle: null, collage: null };
  }, [room?.currentPuzzleId, room?.collageProgress?.activeAssignments, room?.gameMode, localPlayerId, frenzyPuzzle]);

  const isHost = room?.hostId === localPlayerId;
  const isSpectatingHost = isHost && !room?.hostIsPlaying;

  // Sudden Death & Frenzy Timer & Auto End
  useEffect(() => {
    if (!room || !roomId || room.state !== 'playing') return;

    if (room.gameMode === 'frenzy') {
      if (room.frenzyEndTime) {
        const interval = setInterval(() => {
          const remaining = Math.max(0, Math.ceil((room.frenzyEndTime! - Date.now()) / 1000));
          setSdTimeLeft(remaining);
          
          if (remaining <= 0 && isHost) {
            clearInterval(interval);
            handleEndRound();
          }
        }, 1000);
        return () => clearInterval(interval);
      }
      return;
    }

    const players = Object.values(room.players);
    const playingPlayers = players.filter(p => p.id !== room.hostId || room.hostIsPlaying);
    const totalPlaying = playingPlayers.length;
    const finishedCount = playingPlayers.filter(p => p.finishedTime).length;
    
    // Check if we need to start sudden death (host only) - Disabled in Collage Mode
    if (!collage && isHost && !room.suddenDeathEndTime && totalPlaying > 0 && finishedCount >= Math.ceil(totalPlaying / 2)) {
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
  }, [room, roomId, isHost, collage]);

  const handleEndRound = async () => {
    if (!roomId || !room) return;
    
    // Assign points
    const players = Object.values(room.players);
    const updatedPlayers = { ...room.players };
    
    // Normal Mode Points
    const POINTS = [100, 80, 60, 40];
    
    if (room.gameMode !== 'frenzy') {
      players.forEach(p => {
        if (p.finishedTime && p.roundPosition) {
          let pts = POINTS[p.roundPosition - 1] || 20;
          if (collage) pts = 100; // Co-op: everyone gets 100

          updatedPlayers[p.id].score += pts;
        } else if (!p.isHost || room.hostIsPlaying) {
          // Played but didn't finish
          updatedPlayers[p.id].score += 10;
        }
      });
    }

    const roomRef = ref(db, `rooms/${roomId}`);
    await update(roomRef, {
      state: 'results',
      players: updatedPlayers,
      suddenDeathEndTime: null,
      frenzyEndTime: null
    });
  };

  const handleComplete = async () => {
    if (!roomId || !room) return;
    
    if (room.gameMode === 'frenzy') {
      const newScore = (room.players[localPlayerId]?.score || 0) + 10;
      await update(ref(db), { [`rooms/${roomId}/players/${localPlayerId}/score`]: newScore });
      
      const curSize = frenzyPuzzle?.width || 5;
      const nextSize = curSize < 15 ? curSize + 5 : 15;
      setFrenzyPuzzle(generateRandomPuzzle(nextSize, nextSize === 5 ? 2 : nextSize === 10 ? 3 : 4));
      return;
    }

    if (collage) {
      // Complete current section
      const currentSectionIndex = room.collageProgress?.activeAssignments?.[localPlayerId];
      if (currentSectionIndex === undefined) return; // shouldn't happen

      const updates: any = {};
      const newScore = (room.players[localPlayerId]?.score || 0) + 10;
      updates[`rooms/${roomId}/players/${localPlayerId}/score`] = newScore;
      updates[`rooms/${roomId}/collageProgress/completedSections/${currentSectionIndex}`] = localPlayerId;
      
      // Clear current assignment
      updates[`rooms/${roomId}/collageProgress/activeAssignments/${localPlayerId}`] = null;
      // Also clear their grid so next person's minimap logic doesn't see old grid
      updates[`rooms/${roomId}/players/${localPlayerId}/grid`] = null;

      // Find next available section
      const allSections = collage.sections.map((_, i) => i);
      const completed = Object.keys(room.collageProgress?.completedSections || {}).map(Number);
      const active = Object.values(room.collageProgress?.activeAssignments || {}).filter(val => val !== null);
      
      // Include currentSectionIndex in completed since we just finished it
      completed.push(currentSectionIndex);

      const available = allSections.filter(i => !completed.includes(i) && !active.includes(i));
      
      if (available.length > 0) {
        // Assign next available
        updates[`rooms/${roomId}/collageProgress/activeAssignments/${localPlayerId}`] = available[0];
      } else {
        // No more sections! Player is actually finished
        const finishedCount = Object.values(room.players).filter(p => p.finishedTime).length;
        updates[`rooms/${roomId}/players/${localPlayerId}/finishedTime`] = Date.now();
        updates[`rooms/${roomId}/players/${localPlayerId}/roundPosition`] = finishedCount + 1;
      }

      await update(ref(db), updates);
      return;
    }

    const finishedCount = Object.values(room.players).filter(p => p.finishedTime).length;
    const position = finishedCount + 1;
    
    await update(ref(db), { [`rooms/${roomId}/players/${localPlayerId}/finishedTime`]: Date.now(), [`rooms/${roomId}/players/${localPlayerId}/roundPosition`]: position });
  };

  const handleGridChange = (grid: (string | null)[][]) => {
    if (!collage || !roomId || amIFinished) return;
    // Only sync if it's a collage, so we don't spam for normal mode
    update(ref(db), { [`rooms/${roomId}/players/${localPlayerId}/grid`]: grid });
  };

  if (!room || !puzzle) return <div className="flex-1 flex items-center justify-center font-bold text-slate-500">Cargando partida...</div>;

  const myPlayer = room.players[localPlayerId];
  const amIFinished = myPlayer?.finishedTime != null;

  // Render Host Spectator Dashboard
  if (isSpectatingHost) {
    return (
      <div className="flex-1 flex flex-col items-center p-6 bg-slate-50 min-h-screen pt-12">
        <h2 className="text-4xl font-black mb-8 text-indigo-600">{collage ? 'Collage en Vivo' : 'Ronda en Curso'}</h2>
        
        {sdTimeLeft !== null && (
          <div className="text-6xl font-black text-red-500 mb-8 animate-pulse flex items-center gap-4">
            <AlertTriangle size={64} />
            <span>{sdTimeLeft}s</span>
          </div>
        )}

        {collage ? (
          <div className="w-full max-w-2xl bg-white p-6 rounded-3xl shadow-xl border-2 border-slate-100 flex flex-col items-center">
            <h3 className="text-xl font-bold mb-6 text-slate-800">Progreso Global</h3>
            <div 
              className="bg-slate-300 gap-px p-1"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${collage.modulesX * collage.moduleSize}, 24px)`,
                gridTemplateRows: `repeat(${collage.modulesY * collage.moduleSize}, 24px)`
              }}
            >
              {Array.from({ length: collage.modulesY * collage.moduleSize * collage.modulesX * collage.moduleSize }).map((_, i) => {
                const totalCols = collage.modulesX * collage.moduleSize;
                const R = Math.floor(i / totalCols);
                const C = i % totalCols;

                const sR = Math.floor(R / collage.moduleSize);
                const sC = Math.floor(C / collage.moduleSize);
                const lR = R % collage.moduleSize;
                const lC = C % collage.moduleSize;

                const sectionIndex = collage.sections.findIndex(s => s.row === sR && s.col === sC);
                
                // Find who is doing or did this section
                const isCompleted = room.collageProgress?.completedSections?.[sectionIndex] !== undefined;
                let color = null;
                
                if (isCompleted) {
                  color = collage.sections[sectionIndex].solution[lR][lC];
                } else {
                  let assignedPlayer = null;
                  for (const uid in room.collageProgress?.activeAssignments) {
                    if (room.collageProgress.activeAssignments[uid] === sectionIndex) {
                      assignedPlayer = room.players[uid];
                      break;
                    }
                  }

                  if (assignedPlayer && assignedPlayer.grid?.[lR]?.[lC]) {
                    color = assignedPlayer.grid[lR][lC];
                  }
                }

                return (
                  <div 
                    key={i} 
                    className="w-full h-full bg-white transition-colors duration-300"
                    style={{ backgroundColor: color || 'white' }}
                  />
                );
              })}
            </div>
          </div>
        ) : room.gameMode === 'frenzy' ? (
          <div className="w-full max-w-2xl bg-white p-6 rounded-3xl shadow-xl border-2 border-slate-100">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Frenesí - Marcador en Vivo</h3>
            <div className="space-y-3">
              {Object.values(room.players)
                .filter(p => !p.isHost) // Only show actual players
                .sort((a, b) => b.score - a.score)
                .map(p => (
                <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-xl text-slate-800">{p.name}</span>
                  <span className="text-orange-500 font-black text-2xl">{p.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
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
        )}
        
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
            {collage ? (
              <p className="font-bold text-xl text-green-600">¡Módulo completado!</p>
            ) : (
              <p className="font-bold text-xl text-green-600">Llegaste en la posición #{myPlayer.roundPosition}</p>
            )}
            <p className="mt-4 text-green-600/70 font-bold">Esperando a que los demás terminen...</p>
          </div>
        </div>
      ) : (
        <>
          <PicrossBoard 
            puzzle={puzzle} 
            saveKey={`${roomId}_${room.currentRound}_${puzzle.id}`}
            onComplete={handleComplete} 
            onChange={handleGridChange} 
          />
        </>
      )}
    </div>
  );
}
