import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyB9IBn1FBEg2lnFE2tEz9uM33x2C0T4WT8",
  authDomain: "mood-verse.firebaseapp.com",
  projectId: "mood-verse",
  storageBucket: "mood-verse.firebasestorage.app",
  messagingSenderId: "287540087572",
  appId: "1:287540087572:web:251f8691ba9094db9f1001",
  measurementId: "G-FP8T26YYV2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);