import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCu4-qBECAiA2Bqgzt0JB52dBx3d4WKsFo",
  authDomain: "returnneosiam.firebaseapp.com",
  databaseURL: "https://returnneosiam-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "returnneosiam",
  storageBucket: "returnneosiam.firebasestorage.app",
  messagingSenderId: "46662606762",
  appId: "1:46662606762:web:29d41bf680226753f4d5d3",
  measurementId: "G-38PCJ8VXLS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Analytics removed as unused

console.log("✅ Firebase App Initialized (RTDB):", app.name);

// Initialize Realtime Database and get a reference to the service
export const db = getDatabase(app);
export const auth = getAuth(app);