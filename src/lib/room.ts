import { ref, set, get, onValue, update, remove, onDisconnect } from "firebase/database";
import { db } from "./firebase";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  finishedTime?: number;
}

export interface RoomData {
  id: string;
  state: 'lobby' | 'playing' | 'results';
  hostId: string;
  currentPuzzleId: string | null;
  players: Record<string, Player>;
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

export async function createRoom(roomId: string, hostId: string, hostName: string) {
  const roomRef = ref(db, `rooms/${roomId}`);
  
  const initialData: RoomData = {
    id: roomId,
    state: 'lobby',
    hostId: hostId,
    currentPuzzleId: null,
    players: {
      [hostId]: {
        id: hostId,
        name: hostName,
        isHost: true,
        isReady: true,
        score: 0
      }
    }
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

export async function submitPuzzle(roomId: string, playerId: string, finishedTime: number) {
  const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
  await update(playerRef, {
    finishedTime: finishedTime
  });
}
