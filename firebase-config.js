import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    signInWithCustomToken,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    addDoc,
    updateDoc,    // NEW
    deleteDoc,
    deleteField,  // NEW
    arrayUnion,   // NEW
    arrayRemove,  // NEW
    onSnapshot,
    collection, 
    getDocs, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyB8qLWOiC3csqPnucbj3XOtireOgPjjL_k",
  authDomain: "v20-character-creator.firebaseapp.com",
  projectId: "v20-character-creator",
  storageBucket: "v20-character-creator.firebasestorage.app",
  messagingSenderId: "110220382386",
  appId: "1:110220382386:web:81b5d203c2bc4f81f5b9ab",
  measurementId: "G-RWPX9139HB"
};

// INITIALIZE APP
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'v20-neonate-sheet';
const googleProvider = new GoogleAuthProvider();

// EXPORT SERVICES AND FUNCTIONS
export { 
    app, 
    auth, 
    db, 
    appId,
    signInAnonymously, 
    onAuthStateChanged, 
    signInWithCustomToken, 
    signInWithRedirect,
    getRedirectResult,
    signOut,
    googleProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    
    // FIRESTORE FUNCTIONS
    doc, 
    setDoc, 
    getDoc,
    addDoc,
    updateDoc,    // Exported
    deleteDoc,
    deleteField,  // Exported
    arrayUnion,   // Exported
    arrayRemove,  // Exported
    onSnapshot,
    collection, 
    getDocs, 
    query, 
    where
};
