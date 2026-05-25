import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirestoreDbSafe } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { recordFirestoreReadAttempt } from "@/lib/firestore/status";

export interface BuildStatus {
  phase: string;
  status: "Not Started" | "In Progress" | "Completed";
  notes: string;
  updatedAt: string;
}

const fallbackBuildStatus: BuildStatus = {
  phase: "Phase 3",
  status: "In Progress",
  notes: "Firestore foundation scaffold active with mock fallback.",
  updatedAt: new Date().toISOString(),
};

const BUILD_STATUS_DOC_ID = "phase-status";

export async function getBuildStatus() {
  const db = getFirestoreDbSafe();

  if (!db) {
    recordFirestoreReadAttempt(COLLECTIONS.buildStatus, false, "Firestore not initialized.");
    return { data: fallbackBuildStatus, source: "mock" as const };
  }

  try {
    const snapshot = await getDoc(doc(db, COLLECTIONS.buildStatus, BUILD_STATUS_DOC_ID));
    recordFirestoreReadAttempt(COLLECTIONS.buildStatus, true, "Build status loaded.");

    if (!snapshot.exists()) {
      return { data: fallbackBuildStatus, source: "mock" as const };
    }

    return { data: snapshot.data() as BuildStatus, source: "firestore" as const };
  } catch (error) {
    recordFirestoreReadAttempt(
      COLLECTIONS.buildStatus,
      false,
      error instanceof Error ? error.message : "Unknown build status read error.",
    );
    return { data: fallbackBuildStatus, source: "mock" as const };
  }
}

export async function updateBuildStatus(status: BuildStatus) {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, error: "Firestore not initialized." };
  }

  try {
    await setDoc(doc(db, COLLECTIONS.buildStatus, BUILD_STATUS_DOC_ID), status, {
      merge: true,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unknown build status update error.",
    };
  }
}
