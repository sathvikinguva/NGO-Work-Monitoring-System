import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDP9Le0svfZXI4jbLwZhJ0Hkfvq1j6RBSM",
  authDomain: "ngoworkmonitoring.firebaseapp.com",
  projectId: "ngoworkmonitoring",
  storageBucket: "ngoworkmonitoring.firebasestorage.app",
  messagingSenderId: "64558946601",
  appId: "1:64558946601:web:c038ca0c57e9fbf1e37f38",
  measurementId: "G-06TK8S1G1Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;