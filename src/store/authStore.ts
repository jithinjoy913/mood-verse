import { create } from 'zustand';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth, saveUserData } from '../lib/firebase'; // Ensure saveUserData is imported

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, name: string, gender: string, contactNumber: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null });
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },
  signInWithGoogle: async () => {
    try {
      set({ loading: true, error: null });
      let userCredential;

      if (Capacitor.isNativePlatform()) {
        const nativeSignInResult = await FirebaseAuthentication.signInWithGoogle({
          useCredentialManager: false
        });
        const idToken = nativeSignInResult.credential?.idToken;
        const accessToken = nativeSignInResult.credential?.accessToken;

        if (!idToken && !accessToken) {
          throw new Error('Google sign-in did not return a usable token. Ensure SHA fingerprints are configured in Firebase.');
        }

        const googleCredential = GoogleAuthProvider.credential(idToken ?? undefined, accessToken ?? undefined);
        userCredential = await signInWithCredential(auth, googleCredential);
      } else {
        userCredential = await signInWithPopup(auth, googleProvider);
      }

      const googleUser = userCredential.user;

      if (googleUser) {
        await saveUserData(googleUser.uid, {
          name: googleUser.displayName ?? 'Google User',
          gender: 'Not specified',
          contactNumber: '',
          email: googleUser.email ?? ''
        });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },
  signUp: async (email, password, name, gender, contactNumber) => {
    try {
      set({ loading: true, error: null });
      console.log("Signing up user with email:", email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      console.log("User created with ID:", userId);
      await saveUserData(userId, { name, gender, contactNumber, email });
    } catch (error) {
      console.error("Error during signup:", error);
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },
  signOut: async () => {
    try {
      set({ loading: true, error: null });
      await firebaseSignOut(auth);
      if (Capacitor.isNativePlatform()) {
        await FirebaseAuthentication.signOut();
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },
  setUser: (user) => set({ user }),
}));
