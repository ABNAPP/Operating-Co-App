import { revalidatePath } from "next/cache";
import { runDailyDataRefresh } from "@/lib/data-hub/dailyRefreshService";
import { seedMockCompanies } from "@/lib/firestore/repositories/companiesRepository";
import {
  seedMockDashboardRows,
} from "@/lib/firestore/repositories/dashboardRepository";
import {
  getDailyRefreshStatus,
  seedMockReferenceData,
} from "@/lib/firestore/repositories/referenceDataRepository";
import {
  getBuildStatus,
  updateBuildStatus,
} from "@/lib/firestore/repositories/buildStatusRepository";
import { getFirestoreStatusSummary } from "@/lib/firestore/status";

export default async function SettingsPage() {
  const firestoreStatus = getFirestoreStatusSummary();
  const buildStatus = await getBuildStatus();
  const refreshStatus = await getDailyRefreshStatus();
  const canSeed =
    process.env.NODE_ENV === "development" &&
    firestoreStatus.firestoreClient === "Ready";
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET);

  async function manualRefreshAction() {
    "use server";

    if (process.env.NODE_ENV !== "development") {
      return;
    }

    await runDailyDataRefresh();
    revalidatePath("/data-hub");
    revalidatePath("/settings");
  }

  async function seedMockDataAction() {
    "use server";

    if (process.env.NODE_ENV !== "development") {
      return;
    }

    await seedMockCompanies();
    await seedMockDashboardRows();
    await seedMockReferenceData();
    await updateBuildStatus({
      phase: "Phase 3",
      status: "In Progress",
      notes: "Mock seed executed for Firestore scaffold.",
      updatedAt: new Date().toISOString(),
    });

    revalidatePath("/");
    revalidatePath("/companies");
    revalidatePath("/company-workspace");
    revalidatePath("/data-hub");
    revalidatePath("/settings");
  }

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Settings</h2>
        <p className="sectionSubheading">
          Application-level settings, Firestore readiness, and development helpers.
        </p>
      </div>

      <div className="cardGrid">
        <article className="card">
          <h3 className="cardTitle">Environment Variables</h3>
          <p className="cardMeta">
            Variable names are prepared in `.env.example` for future integrations.
          </p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Firebase / Firestore</h3>
          <p className="cardMeta">
            Firebase config: {firestoreStatus.firebaseConfig}
          </p>
          <p className="cardMeta">
            Firestore client: {firestoreStatus.firestoreClient}
          </p>
          <p className="cardMeta">
            Last build status source: {buildStatus.source === "firestore" ? "Firestore" : "Mock"}
          </p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Security</h3>
          <p className="cardMeta">
            Secret provider keys remain server-side only and must not use
            `NEXT_PUBLIC_`.
          </p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Cron / Refresh</h3>
          <p className="cardMeta">
            Daily refresh enabled: {cronSecretConfigured ? "yes" : "no"}
          </p>
          <p className="cardMeta">Cron route: /api/cron/daily-data-refresh</p>
          <p className="cardMeta">Schedule: 0 6 * * *</p>
          <p className="cardMeta">
            CRON_SECRET configured: {cronSecretConfigured ? "yes" : "no"}
          </p>
          <p className="cardMeta">
            Last refresh status: {refreshStatus.data.status} ({refreshStatus.data.finishedAt})
          </p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Development-only Seed</h3>
          <p className="cardMeta">
            Seeds Microsoft, Disney and Volvo data into Firestore using deterministic IDs.
          </p>
          <p className="cardMeta">
            This action does not run automatically on page load.
          </p>
          <form action={seedMockDataAction} style={{ marginTop: "0.75rem" }}>
            <button
              type="submit"
              disabled={!canSeed}
              className="navLink"
              aria-disabled={!canSeed}
            >
              Seed Mock Data to Firestore
            </button>
          </form>
          {!canSeed ? (
            <p className="cardMeta" style={{ marginTop: "0.5rem" }}>
              Available only in development with initialized Firestore client config.
            </p>
          ) : null}
          <form action={manualRefreshAction} style={{ marginTop: "0.75rem" }}>
            <button
              type="submit"
              disabled={!canSeed}
              className="navLink"
              aria-disabled={!canSeed}
            >
              Manual Refresh (Support/Dev)
            </button>
          </form>
          <p className="cardMeta" style={{ marginTop: "0.5rem" }}>
            Daily auto-refresh runs via Vercel Cron, not via page loads.
          </p>
        </article>
      </div>
    </section>
  );
}
