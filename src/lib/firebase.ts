import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAb3uyZYrGlNHKDMIcdumty_Pc5t8kjD_Q",
  authDomain: "moodverse-c27ec.firebaseapp.com",
  projectId: "moodverse-c27ec",
  storageBucket: "moodverse-c27ec.firebasestorage.app",
  messagingSenderId: "688460385973",
  appId: "1:688460385973:web:1a241715094d87435238fc",
  measurementId: "G-ZM4VPVN9YP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export const saveUserData = async (userId: string, userData: { name: string; gender: string; contactNumber: string; email: string; }) => {
  try {
    await setDoc(doc(db, 'users', userId), userData);
    console.log("User data saved successfully:", userData);
  } catch (error) {
    console.error("Error saving user data: ", error);
  }
};
