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
import { trackEvent } from '../services/analytics';

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

function mapAuthError(error: unknown): string {
  const message = (error as { message?: string })?.message ?? 'Authentication failed. Please try again.';
  if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
    return 'Invalid email or password. Please check your credentials and retry.';
  }
  if (message.includes('auth/user-not-found')) {
    return 'No account found for this email. Please sign up first.';
  }
  if (message.includes('auth/popup-closed-by-user')) {
    return 'Google sign-in was cancelled before completion.';
  }
  if (message.includes('auth/network-request-failed')) {
    return 'Network issue detected. Check your internet connection and retry.';
  }
  if (message.includes('auth/email-already-in-use')) {
    return 'This email is already registered. Try signing in instead.';
  }
  if (message.includes('SHA fingerprints')) {
    return 'Google sign-in setup is incomplete. Add SHA-1 and SHA-256 for this Android app in Firebase.';
  }
  return message;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null });
      await signInWithEmailAndPassword(auth, email, password);
      trackEvent('auth_email_signin_success');
    } catch (error) {
      trackEvent('auth_email_signin_error', { reason: mapAuthError(error) });
      set({ error: mapAuthError(error) });
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
          useCredentialManager: true
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
      trackEvent('auth_google_signin_success', { platform: Capacitor.getPlatform() });
    } catch (error) {
      trackEvent('auth_google_signin_error', { reason: mapAuthError(error), platform: Capacitor.getPlatform() });
      set({ error: mapAuthError(error) });
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
      trackEvent('auth_signup_success');
    } catch (error) {
      console.error("Error during signup:", error);
      trackEvent('auth_signup_error', { reason: mapAuthError(error) });
      set({ error: mapAuthError(error) });
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
      trackEvent('auth_signout_success');
    } catch (error) {
      trackEvent('auth_signout_error', { reason: mapAuthError(error) });
      set({ error: mapAuthError(error) });
    } finally {
      set({ loading: false });
    }
  },
  setUser: (user) => set({ user }),
}));
