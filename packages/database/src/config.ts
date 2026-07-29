import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyRalionOSRealApiKey2026",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ralion-os.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ralion-os",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ralion-os.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1001961763703",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1001961763703:web:ralionOSAppId2026"
};

export const cloudSqlConfig = {
  location: process.env.CLOUD_SQL_LOCATION || "us-east4",
  instance: process.env.CLOUD_SQL_INSTANCE || "ralion-os-instance",
  database: process.env.CLOUD_SQL_DATABASE || "ralion-os-database",
  connectionName: process.env.CLOUD_SQL_CONNECTION_NAME || "ralion-os:us-east4:ralion-os-instance"
};

export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
