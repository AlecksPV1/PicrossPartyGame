import { ref, set, get, onValue, update, onDisconnect } from "firebase/database";
import { db } from "./firebase";
import { PREDEFINED_LEVELS } from "./levels";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  vote?: string | null;
  finishedTime?: number | null;
  roundPosition?: number;
}

export interface RoomData {
  hostId: string;
  state: 'lobby' | 'voting' | 'playing' | 'results' | 'final';
  totalRounds: number;
  currentRound: number;
  currentPuzzleId?: string | null;
  puzzleOptions?: string[];
  playedPuzzles?: string[];
  suddenDeathEndTime?: number | null;
  players: Record<string, Player>;
  hostIsPlaying: boolean;
}

export function createRoomId(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function generatePlayerId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Ensure the local player ID is persistent
export function getLocalPlayerId(): string {
  let pid = localStorage.getItem("playerId");
  if (!pid) {
    pid = generatePlayerId();
    localStorage.setItem("playerId", pid);
  }
  return pid;
}

export async function createRoom(roomId: string, hostId: string, hostName: string, hostIsPlaying: boolean, rounds: number) {
  const roomRef = ref(db, `rooms/${roomId}`);
  
  const players: Record<string, Player> = {};
  if (hostIsPlaying) {
    players[hostId] = {
      id: hostId,
      name: hostName,
      isHost: true,
      isReady: true,
      score: 0
    };
  }

  const initialData: RoomData = {
    hostId: hostId,
    state: 'lobby',
    totalRounds: rounds,
    currentRound: 1,
    hostIsPlaying,
    playedPuzzles: [],
    players
  };

  await set(roomRef, initialData);
  
  // Clean up if host disconnects
  onDisconnect(roomRef).remove();
}

export async function joinRoom(roomId: string, playerId: string, playerName: string) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  
  if (!snap.exists()) {
    throw new Error("Sala no encontrada");
  }

  const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
  
  await set(playerRef, {
    id: playerId,
    name: playerName,
    isHost: false,
    isReady: false,
    score: 0
  });

  // Remove player on disconnect
  onDisconnect(playerRef).remove();
}

export function subscribeToRoom(roomId: string, callback: (data: RoomData | null) => void) {
  const roomRef = ref(db, `rooms/${roomId}`);
  return onValue(roomRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() as RoomData : null);
  });
}

export async function startGame(roomId: string, puzzleId: string) {
  const roomRef = ref(db, `rooms/${roomId}`);
  await update(roomRef, {
    state: 'playing',
    currentPuzzleId: puzzleId
  });
}

export async function startVoting(roomId: string) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  
  if (!snap.exists()) return;
  const data = snap.val() as RoomData;
  const played = data.playedPuzzles || [];
  
  // Use actual level IDs from our levels list, excluding played if possible
  let keys = PREDEFINED_LEVELS.map(l => l.id).filter(id => !played.includes(id));
  
  // If we've played all available puzzles, just allow all of them again
  if (keys.length === 0) {
    keys = PREDEFINED_LEVELS.map(l => l.id);
  }
  
  const shuffled = keys.sort(() => 0.5 - Math.random());
  // Pick up to 3 options
  const options = shuffled.slice(0, 3);
  
  // Reset player votes
  const players = { ...data.players };
  for (const uid in players) {
    players[uid].vote = null;
    players[uid].finishedTime = null;
    players[uid].roundPosition = 0;
  }
  
  await update(roomRef, {
    state: 'voting',
    puzzleOptions: options,
    players,
    suddenDeathEndTime: null
  });
}

export async function submitPuzzle(roomId: string, playerId: string, finishedTime: number) {
  const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
  await update(playerRef, {
    finishedTime: finishedTime
  });
}
