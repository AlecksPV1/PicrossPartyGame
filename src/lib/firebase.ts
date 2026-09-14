import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCnweC90ggMW87ZloYkq5iZRfQCby0fB9s",
  authDomain: "picrosspartygame.firebaseapp.com",
  projectId: "picrosspartygame",
  storageBucket: "picrosspartygame.firebasestorage.app",
  messagingSenderId: "810408314683",
  appId: "1:810408314683:web:3f7819eb36fd3a6ac0191e",
  measurementId: "G-GTK48PJ0V9",
  // Realtime Database URL
  databaseURL: "https://picrosspartygame-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
