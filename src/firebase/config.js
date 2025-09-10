// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAWTCcDPawamZ8_dVHGVWNARkhXBCoR57Q",
  authDomain: "soccer-stat-tracker-7ecd2.firebaseapp.com",
  projectId: "soccer-stat-tracker-7ecd2",
  storageBucket: "soccer-stat-tracker-7ecd2.firebasestorage.app",
  messagingSenderId: "325735032267",
  appId: "1:325735032267:web:cfc14cff982c149ae8c24e",
  measurementId: "G-824J89R2NF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (connects directly to cloud)
export const db = getFirestore(app);

// Initialize Auth (optional - for user-specific saves)
export const auth = getAuth(app);

export default app;