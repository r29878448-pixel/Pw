/**
 * Firebase Admin for API Routes (CommonJS)
 * Uses require() instead of import for Next.js API routes
 */

const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBvOelr7XJ-MTYRUaxMDakTGpQcmEumZNs",
  authDomain: "pw-missiontopper.firebaseapp.com",
  projectId: "pw-missiontopper",
  storageBucket: "pw-missiontopper.firebasestorage.app",
  messagingSenderId: "255162339734",
  appId: "1:255162339734:web:f49f464c93c63bc280cdb7",
  measurementId: "G-5YX2GJKD6B"
};

// Initialize Firebase (only once)
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

// Get API URL from Firebase Firestore
async function getApiUrlFromFirebase() {
  try {
    const docRef = doc(db, 'config', 'api');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const url = docSnap.data().baseUrl;
      console.log('✅ API URL from Firebase:', url);
      return url || 'https://adc.onrender.app';
    } else {
      console.log('⚠️ No API config in Firebase, using default');
      return 'https://adc.onrender.app';
    }
  } catch (error) {
    console.error('❌ Error loading API URL from Firebase:', error.message);
    return 'https://adc.onrender.app'; // Fallback
  }
}

module.exports = { db, getApiUrlFromFirebase };
