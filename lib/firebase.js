// Firebase configuration for PW App
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBvOelr7XJ-MTYRUaxMDakTGpQcmEumZNs",
  authDomain: "pw-missiontopper.firebaseapp.com",
  projectId: "pw-missiontopper",
  storageBucket: "pw-missiontopper.firebasestorage.app",
  messagingSenderId: "255162339734",
  appId: "1:255162339734:web:f49f464c93c63bc280cdb7",
  measurementId: "G-5YX2GJKD6B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics (only in browser)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };

// Admin email
export const ADMIN_EMAIL = 'adityaghoghari01@gmail.com';
export const ADMIN_PASSWORD = 'aditya-ghoghari1234';

// Check if user is admin
export const isAdmin = (email) => {
  return email === ADMIN_EMAIL;
};
