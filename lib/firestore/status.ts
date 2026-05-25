import {
  getFirebaseConfigStatus,
  getFirebaseInitError,
  getFirestoreClientStatus,
} from "@/lib/firebase/client";
import type { CollectionName } from "@/lib/firestore/collections";

export interface FirestoreReadAttemptStatus {
  collection: CollectionName;
  ok: boolean;
  at: string;
  message?: string;
}

export interface FirestoreStatusSummary {
  firebaseConfig: "Ready" | "Missing";
  firestoreClient: "Ready" | "Not Initialized";
  initError: string | null;
  lastReadAttempt: FirestoreReadAttemptStatus | null;
}

let lastReadAttempt: FirestoreReadAttemptStatus | null = null;

export function recordFirestoreReadAttempt(
  collection: CollectionName,
  ok: boolean,
  message?: string,
) {
  lastReadAttempt = {
    collection,
    ok,
    at: new Date().toISOString(),
    message,
  };
}

export function getFirestoreStatusSummary(): FirestoreStatusSummary {
  return {
    firebaseConfig: getFirebaseConfigStatus(),
    firestoreClient: getFirestoreClientStatus(),
    initError: getFirebaseInitError(),
    lastReadAttempt,
  };
}
