import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

const firebaseConfig = firebaseApiKey && firebaseProjectId ? {
  apiKey: firebaseApiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || `${firebaseProjectId}.firebaseapp.com`,
  projectId: firebaseProjectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || `${firebaseProjectId}.appspot.com`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || ''
} : null;

export const cloudSqlConfig = {
  location: process.env.CLOUD_SQL_LOCATION || "us-east4",
  instance: process.env.CLOUD_SQL_INSTANCE || "ralion-os-instance",
  database: process.env.CLOUD_SQL_DATABASE || "ralion-os-database",
  connectionName: process.env.CLOUD_SQL_CONNECTION_NAME || "ralion-os:us-east4:ralion-os-instance"
};

function getOrInitApp(): FirebaseApp | null {
  if (getApps().length > 0) return getApp();
  if (firebaseConfig) return initializeApp(firebaseConfig);
  return null;
}

const safeApp = getOrInitApp();
export const app: FirebaseApp = safeApp as FirebaseApp;
export const auth: Auth = safeApp ? getAuth(safeApp) : (null as unknown as Auth);
export const db: Firestore = safeApp ? getFirestore(safeApp) : (null as unknown as Firestore);
export const storage: FirebaseStorage = safeApp ? getStorage(safeApp) : (null as unknown as FirebaseStorage);
