import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB7emkY7yQjWf7rWt_vblXe_VcHCHskNmc",
  authDomain: "gen-lang-client-0654376496.firebaseapp.com",
  projectId: "gen-lang-client-0654376496",
  storageBucket: "gen-lang-client-0654376496.firebasestorage.app",
  messagingSenderId: "959237168719",
  appId: "1:959237168719:web:728bb043a779a43a8c943a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId
export const db = initializeFirestore(app, {}, "ai-studio-curtaininstallat-e5963261-7e07-4669-8660-d8889e574727");
