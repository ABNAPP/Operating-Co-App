import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Firestore, getFirestore } from "firebase/firestore";

interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

export type FirebaseConfigStatus = "Ready" | "Missing";
export type FirestoreClientStatus = "Ready" | "Not Initialized";

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let initError: string | null = null;

function getFirebaseClientConfig(): FirebaseClientConfig | null {
  const config: FirebaseClientConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
  };

  const hasRequiredConfig =
    Boolean(config.apiKey) &&
    Boolean(config.authDomain) &&
    Boolean(config.projectId) &&
    Boolean(config.storageBucket) &&
    Boolean(config.messagingSenderId) &&
    Boolean(config.appId);

  return hasRequiredConfig ? config : null;
}

export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  return getFirebaseClientConfig() ? "Ready" : "Missing";
}

export function getFirebaseAppSafe(): FirebaseApp | null {
  if (cachedApp) {
    return cachedApp;
  }

  const config = getFirebaseClientConfig();

  if (!config) {
    initError = "Missing NEXT_PUBLIC_FIREBASE_* config.";
    return null;
  }

  try {
    cachedApp = getApps().length > 0 ? getApp() : initializeApp(config);
    return cachedApp;
  } catch (error) {
    initError = error instanceof Error ? error.message : "Unknown Firebase init error.";
    return null;
  }
}

export function getFirestoreDbSafe(): Firestore | null {
  if (cachedDb) {
    return cachedDb;
  }

  const app = getFirebaseAppSafe();

  if (!app) {
    return null;
  }

  try {
    cachedDb = getFirestore(app);
    return cachedDb;
  } catch (error) {
    initError = error instanceof Error ? error.message : "Unknown Firestore init error.";
    return null;
  }
}

export function getFirestoreClientStatus(): FirestoreClientStatus {
  return getFirestoreDbSafe() ? "Ready" : "Not Initialized";
}

export function getFirebaseInitError() {
  return initError;
}
