import { getApps, initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { createFirebaseRepository } from '../src/adapters/firebase.js';
const appName = 'model-hotspot-editor-demo';
export async function createDemoFirebase() {
  const env = import.meta.env;
  if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID || !env.VITE_FIREBASE_STORAGE_BUCKET) throw new Error('Configura le variabili VITE_FIREBASE_* in .env e riavvia Vite.');
  const existing = getApps().find(app => app.name === appName);
  const app = existing ?? initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID, storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    appId: env.VITE_FIREBASE_APP_ID
  }, appName);
  const auth = getAuth(app); const firestore = getFirestore(app); const storage = getStorage(app);
  if (!existing && env.VITE_FIREBASE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
  await auth.authStateReady();
  return {
    repository: createFirebaseRepository({ firestore, storage, getUserId: () => auth.currentUser?.uid }),
    userEmail: () => auth.currentUser?.email ?? '',
    signedIn: () => !!auth.currentUser,
    login: (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth)
  };
}
export type DemoFirebase = Awaited<ReturnType<typeof createDemoFirebase>>;
