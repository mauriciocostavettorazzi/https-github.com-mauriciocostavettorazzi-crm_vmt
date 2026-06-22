import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0704624289",
  appId: "1:672733901482:web:1236966b4cf1ea800b16d3",
  apiKey: "AIzaSyC2v6oyH3q11KosJVBapihtbA1bg_LDa1U",
  authDomain: "gen-lang-client-0704624289.firebaseapp.com",
  storageBucket: "gen-lang-client-0704624289.firebasestorage.app",
  messagingSenderId: "672733901482"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
