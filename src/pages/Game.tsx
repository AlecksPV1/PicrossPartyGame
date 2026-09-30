import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type RoomData, subscribeToRoom, getLocalPlayerId } from '../lib/room';
import { PREDEFINED_LEVELS } from '../lib/levels';
import { COLLAGES } from '../lib/collages';
import { type PicrossPuzzle, generateRandomPuzzle } from '../lib/picross';
import PicrossBoard from '../components/PicrossBoard';
import { ref, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { Timer, CheckCircle, PenTool, AlertTriangle, Trophy } from 'lucide-react';

type MasterpieceView = 'matrix' | 'zoomin' | 'playing' | 'zoomout';

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomData | null>(null);
  const localPlayerId = getLocalPlayerId();
  
  const [sdTimeLeft, setSdTimeLeft] = useState<number | null>(null);
  const [mpView, setMpView] = useState<MasterpieceView>('matrix');
  const [revealedSection, setRevealedSection] = useState<number | null>(null);

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
      const myScore = room.players?.[localPlayerId]?.score || 0;
      const completedCount = Math.floor(myScore / 10);
      const cappedCount = Math.min(completedCount, 11);
      
      const nextSize = 5 + Math.floor(cappedCount / 4) * 5;
      const nextColors = 1 + (cappedCount % 4);
      
      setFrenzyPuzzle(generateRandomPuzzle(nextSize, nextColors));
    }
  }, [room?.gameMode, frenzyPuzzle, room?.players, localPlayerId]);

  // Auto-start masterpiece zoom-in when player gets an assignment
  useEffect(() => {
    if (room?.gameMode === 'masterpiece' && mpView === 'matrix') {
      const myAssignment = room.collageProgress?.activeAssignments?.[localPlayerId];
      if (myAssignment !== undefined && myAssignment !== null) {
        // Short delay to show matrix, then zoom in
        const timer = setTimeout(() => {
          setMpView('zoomin');
          setTimeout(() => setMpView('playing'), 1500);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [room?.collageProgress?.activeAssignments, localPlayerId, mpView, room?.gameMode]);

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
      if (sectionIndex !== undefined && sectionIndex !== null) {
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
      // Player has no assignment but collage exists — show matrix only
      return { puzzle: null, collage: col };
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

    // Skip sudden death for masterpiece — the game ends when the artwork is complete
    if (room.gameMode === 'masterpiece') {
      // Check if all sections are done
      if (collage && isHost) {
        const completedCount = Object.keys(room.collageProgress?.completedSections || {}).length;
        if (completedCount >= collage.sections.length) {
          handleEndRound();
        }
      }
      return;
    }

    const players = Object.values(room.players);
    const playingPlayers = players.filter(p => p.id !== room.hostId || room.hostIsPlaying);
    const totalPlaying = playingPlayers.length;
    const finishedCount = playingPlayers.filter(p => p.finishedTime).length;
    
    // Check if we need to start sudden death (host only)
    if (!collage && isHost && !room.suddenDeathEndTime && totalPlaying > 0 && finishedCount >= Math.ceil(totalPlaying / 2)) {
      if (finishedCount < totalPlaying) {
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
    
    const players = Object.values(room.players);
    const updatedPlayers = { ...room.players };
    
    const POINTS = [100, 80, 60, 40];
    
    if (room.gameMode === 'masterpiece') {
      // In masterpiece, score is already tracked per-puzzle. No extra assignment needed.
    } else if (room.gameMode !== 'frenzy') {
      players.forEach(p => {
        if (p.finishedTime && p.roundPosition) {
          const pts = POINTS[p.roundPosition - 1] || 20;
          updatedPlayers[p.id].score += pts;
        } else if (!p.isHost || room.hostIsPlaying) {
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
      
      const completedCount = Math.floor(newScore / 10);
      const cappedCount = Math.min(completedCount, 11);
      
      const nextSize = 5 + Math.floor(cappedCount / 4) * 5;
      const nextColors = 1 + (cappedCount % 4);
      
      setFrenzyPuzzle(generateRandomPuzzle(nextSize, nextColors));
      return;
    }

    if (collage) {
      const currentSectionIndex = room.collageProgress?.activeAssignments?.[localPlayerId];
      if (currentSectionIndex === undefined) return;

      // Zoom out to reveal
      setRevealedSection(currentSectionIndex);
      setMpView('zoomout');

      const updates: Record<string, unknown> = {};
      const newScore = (room.players[localPlayerId]?.score || 0) + 1;
      updates[`rooms/${roomId}/players/${localPlayerId}/score`] = newScore;
      updates[`rooms/${roomId}/collageProgress/completedSections/${currentSectionIndex}`] = localPlayerId;
      
      // Clear current assignment
      updates[`rooms/${roomId}/collageProgress/activeAssignments/${localPlayerId}`] = null;
      updates[`rooms/${roomId}/players/${localPlayerId}/grid`] = null;

      // Find next available section
      const allSections = collage.sections.map((_, i) => i);
      const completed = Object.keys(room.collageProgress?.completedSections || {}).map(Number);
      const active = Object.values(room.collageProgress?.activeAssignments || {}).filter(val => val !== null) as number[];
      
      completed.push(currentSectionIndex);

      const available = allSections.filter(i => !completed.includes(i) && !active.includes(i));
      
      if (available.length > 0) {
        updates[`rooms/${roomId}/collageProgress/activeAssignments/${localPlayerId}`] = available[0];
      }

      await update(ref(db), updates);

      // After zoom-out animation, go back to matrix then zoom into next puzzle
      setTimeout(() => {
        setRevealedSection(null);
        setMpView('matrix');
      }, 2500);
      return;
    }

    const finishedCount = Object.values(room.players).filter(p => p.finishedTime).length;
    const position = finishedCount + 1;
    
    await update(ref(db), { [`rooms/${roomId}/players/${localPlayerId}/finishedTime`]: Date.now(), [`rooms/${roomId}/players/${localPlayerId}/roundPosition`]: position });
  };

  const handleGridChange = (grid: (string | null)[][]) => {
    if (!collage || !roomId) return;
    update(ref(db), { [`rooms/${roomId}/players/${localPlayerId}/grid`]: grid });
  };

  if (!room) return <div className="flex-1 flex items-center justify-center font-bold text-slate-500">Cargando partida...</div>;

  const myPlayer = room.players[localPlayerId];
  const amIFinished = myPlayer?.finishedTime != null;

  // ============ MASTERPIECE MATRIX RENDERER ============
  const renderMasterpieceMatrix = (pixelSize: number = 8, showScoreboard: boolean = false) => {
    if (!collage) return null;
    const completedSections = room.collageProgress?.completedSections || {};
    const mySection = room.collageProgress?.activeAssignments?.[localPlayerId];

    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <h3 className="text-xl font-black text-slate-700">{collage.name}</h3>
        <div 
          className="relative bg-slate-800 p-1 rounded-xl shadow-2xl overflow-hidden mx-auto"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${collage.modulesX}, 1fr)`,
            gap: '2px',
            maxWidth: `${collage.modulesX * collage.moduleSize * pixelSize + collage.modulesX * 2 + 2}px`
          }}
        >
          {collage.sections.map((section, sIdx) => {
            const isCompleted = completedSections[sIdx] !== undefined;
            const isMyTarget = mySection === sIdx;
            const justRevealed = revealedSection === sIdx;

            return (
              <div 
                key={sIdx}
                className={`relative transition-all duration-700 ${justRevealed ? 'ring-4 ring-yellow-400 scale-105 z-10' : ''} ${isMyTarget && mpView === 'zoomin' ? 'ring-4 ring-indigo-400 animate-pulse' : ''}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${collage.moduleSize}, ${pixelSize}px)`,
                  gridTemplateRows: `repeat(${collage.moduleSize}, ${pixelSize}px)`,
                }}
              >
                {section.solution.flat().map((color, pIdx) => (
                  <div 
                    key={pIdx}
                    className="transition-all duration-500"
                    style={{ 
                      backgroundColor: isCompleted || justRevealed ? (color || '#1e293b') : '#374151',
                      filter: isCompleted || justRevealed ? 'none' : 'blur(1px) brightness(0.4)',
                      width: pixelSize,
                      height: pixelSize,
                    }}
                  />
                ))}
                {!isCompleted && !justRevealed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white/30 text-xs font-bold">?</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Scoreboard */}
        {showScoreboard && (
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-4">
            <h4 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Trophy size={20} className="text-yellow-500" /> Marcador
            </h4>
            <div className="space-y-2">
              {Object.values(room.players)
                .sort((a, b) => b.score - a.score)
                .map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-800">{p.name}</span>
                    <span className="text-emerald-600 font-black">{p.score} puzles</span>
                  </div>
                ))}
            </div>
            <div className="mt-3 text-center text-sm text-slate-500 font-bold">
              {Object.keys(completedSections).length} / {collage.sections.length} secciones completadas
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============ HOST SPECTATOR ============
  if (isSpectatingHost) {
    return (
      <div className="flex-1 flex flex-col items-center p-6 bg-slate-50 min-h-screen pt-12">
        <h2 className="text-4xl font-black mb-8 text-indigo-600">
          {collage ? collage.name : room.gameMode === 'frenzy' ? 'Frenesí' : 'Ronda en Curso'}
        </h2>
        
        {sdTimeLeft !== null && (
          <div className="text-6xl font-black text-red-500 mb-8 animate-pulse flex items-center gap-4">
            <AlertTriangle size={64} />
            <span>{sdTimeLeft}s</span>
          </div>
        )}

        {collage ? (
          renderMasterpieceMatrix(12, true)
        ) : room.gameMode === 'frenzy' ? (
          <div className="w-full max-w-2xl bg-white p-6 rounded-3xl shadow-xl border-2 border-slate-100">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Frenesí - Marcador en Vivo</h3>
            <div className="space-y-3">
              {Object.values(room.players)
                .filter(p => !p.isHost)
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
                .filter(p => !p.isHost)
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

  // ============ PLAYER: MASTERPIECE VIEWS ============
  if (room.gameMode === 'masterpiece' && collage) {
    // No more sections available — player is done, waiting
    const myAssignment = room.collageProgress?.activeAssignments?.[localPlayerId];
    const noMoreSections = myAssignment === undefined || myAssignment === null;
    const allDone = Object.keys(room.collageProgress?.completedSections || {}).length >= collage.sections.length;

    if (allDone) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 min-h-screen gap-8">
          <h2 className="text-4xl font-black text-emerald-600">¡Obra Completada!</h2>
          {renderMasterpieceMatrix(10, true)}
          <p className="text-slate-500 font-bold animate-pulse">Esperando resultados...</p>
        </div>
      );
    }

    if (noMoreSections) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 min-h-screen gap-8">
          <h2 className="text-2xl font-black text-slate-700">Esperando secciones disponibles...</h2>
          {renderMasterpieceMatrix(8, true)}
        </div>
      );
    }

    if (mpView === 'matrix' || mpView === 'zoomin') {
      return (
        <div className={`flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 min-h-screen gap-6 transition-all duration-1000 ${mpView === 'zoomin' ? 'scale-110 opacity-0' : ''}`}>
          <h2 className="text-2xl font-black text-white/80">Tu siguiente sección...</h2>
          {renderMasterpieceMatrix(8, false)}
          <div className="text-white/50 font-bold text-sm animate-pulse">Preparando tu puzle...</div>
        </div>
      );
    }

    if (mpView === 'zoomout') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 min-h-screen gap-6 animate-in fade-in zoom-in-95 duration-700">
          <h2 className="text-2xl font-black text-yellow-400">¡Sección Revelada!</h2>
          {renderMasterpieceMatrix(8, true)}
        </div>
      );
    }

    // mpView === 'playing'
    if (!puzzle) return <div className="flex-1 flex items-center justify-center font-bold text-slate-500">Cargando puzle...</div>;

    return (
      <div className="flex-1 flex flex-col items-center pb-8 pt-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-4 text-center">
          <span className="text-sm font-bold text-indigo-500 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-200">
            🎨 {collage.name} — Tu puzle #{(room.players[localPlayerId]?.score || 0) + 1}
          </span>
        </div>
        <PicrossBoard 
          key={puzzle.id}
          puzzle={puzzle} 
          saveKey={`${roomId}_mp_${puzzle.id}`}
          onComplete={handleComplete} 
          onChange={handleGridChange} 
        />
      </div>
    );
  }

  // ============ PLAYER: CLASSIC / FRENZY ============
  if (!puzzle) return <div className="flex-1 flex items-center justify-center font-bold text-slate-500">Cargando partida...</div>;

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
          <PicrossBoard 
            key={puzzle.id}
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
