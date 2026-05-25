import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export function isFirebaseAdminConfigured() {
  return Boolean(getAdminConfig());
}

function getAdminApp() {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const config = getAdminConfig();

  if (!config) {
    return null;
  }

  return initializeApp({
    credential: cert(config),
    projectId: config.projectId,
  });
}

export function getAdminDb() {
  const app = getAdminApp();

  if (!app) {
    return null;
  }

  try {
    return getFirestore(app);
  } catch {
    return null;
  }
}
