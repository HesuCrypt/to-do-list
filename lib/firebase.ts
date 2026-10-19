import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  Firestore,
  Unsubscribe 
} from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const FIREBASE_CONFIG_STORAGE_KEY = 'dash_firebase_config';

export function getActiveFirebaseConfig(): FirebaseConfig | null {
  // 1. Check environment variables
  if (
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  ) {
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
  }

  // 2. Check browser localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.apiKey && parsed.projectId && parsed.appId) {
          return parsed as FirebaseConfig;
        }
      }
    } catch {}
  }

  return null;
}

export function saveFirebaseConfigToStorage(config: FirebaseConfig) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }
}

export function clearFirebaseConfigFromStorage() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
  }
}

export function getFirebaseApp(): FirebaseApp | null {
  const config = getActiveFirebaseConfig();
  if (!config) return null;

  if (getApps().length > 0) {
    return getApp();
  }

  try {
    return initializeApp(config);
  } catch (e) {
    console.error('Firebase initialization error:', e);
    return null;
  }
}

export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return getFirestore(app);
  } catch (e) {
    console.error('Firestore initialization error:', e);
    return null;
  }
}

/**
 * Subscribes to live real-time updates for the dashboard.
 * When data is changed on mobile, desktop updates instantly, and vice versa!
 */
export function subscribeToCloudDashboard(onData: (data: any) => void): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const docRef = doc(db, 'dashboards', 'user_dashboard');
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data());
      }
    }, (error) => {
      console.error('Firestore snapshot subscription error:', error);
    });
  } catch (e) {
    console.error('Failed to subscribe to Firestore:', e);
    return null;
  }
}

/**
 * Saves dashboard payload to Firestore cloud document.
 */
export async function saveToCloudDashboard(payload: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const docRef = doc(db, 'dashboards', 'user_dashboard');
    // Ensure all undefined fields are stripped for Firestore compatibility
    const cleanPayload = JSON.parse(JSON.stringify(payload));
    cleanPayload.lastCloudSync = new Date().toISOString();
    await setDoc(docRef, cleanPayload, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to save to Firestore:', error);
    return false;
  }
}
