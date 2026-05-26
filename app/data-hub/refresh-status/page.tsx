import { BackLink } from "@/components/back-link";
import { getDailyRefreshStatus } from "@/lib/firestore/repositories/referenceDataRepository";

export default async function RefreshStatusPage() {
  const { data: refreshStatus, source } = await getDailyRefreshStatus();
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET);
  const firebaseAdminConfigured =
    Boolean(process.env.FIREBASE_PROJECT_ID) &&
    Boolean(process.env.FIREBASE_CLIENT_EMAIL) &&
    Boolean(process.env.FIREBASE_PRIVATE_KEY);

  return (
    <section className="pageSection">
      <BackLink href="/data-hub" label="Back to Data Hub" />
      <div>
        <h2 className="sectionHeading">Refresh Status</h2>
        <p className="sectionSubheading">
          Daily refresh status and cron configuration view. Source:{" "}
          {source === "firestore" ? "Firestore" : "Mock"}.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Cron Configuration</h3>
        <p className="cardMeta">Cron route: /api/cron/daily-data-refresh</p>
        <p className="cardMeta">Schedule: 0 6 * * *</p>
        <p className="cardMeta">Daily order: Riskfree refresh first, FX refresh second.</p>
        <p className="cardMeta">
          Riskfree + FX share the same daily cron route but keep separate statuses.
        </p>
        <p className="cardMeta">
          Manual endpoints remain separate: /api/data-hub/riskfree-rates/refresh and
          /api/data-hub/fx-rates/refresh.
        </p>
        <p className="cardMeta">CRON_SECRET configured: {cronSecretConfigured ? "Yes" : "No"}</p>
        <p className="cardMeta">
          Firebase Admin configured: {firebaseAdminConfigured ? "Yes" : "No"}
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Daily Refresh Status</h3>
        <p className="cardMeta">Last attempt: {refreshStatus.finishedAt}</p>
        <p className="cardMeta">
          Last successful refresh: {refreshStatus.lastSuccessfulRefreshAt ?? "N/A"}
        </p>
        <p className="cardMeta">Riskfree refresh status: {refreshStatus.riskfreeRefreshStatus}</p>
        <p className="cardMeta">FX refresh status: {refreshStatus.fxRefreshStatus}</p>
        <p className="cardMeta">Last FX refresh attempt: {refreshStatus.fxLastAttemptAt ?? "N/A"}</p>
        <p className="cardMeta">
          Last successful FX refresh: {refreshStatus.fxLastSuccessfulRefreshAt ?? "N/A"}
        </p>
        <p className="cardMeta">
          FX providers used: {refreshStatus.fxProvidersUsed?.join(", ") || "N/A"}
        </p>
        <p className="cardMeta">Primary FX provider used: {refreshStatus.fxProviderUsed ?? "N/A"}</p>
        <p className="cardMeta">
          FX provider attempts (external calls): {refreshStatus.fxProviderAttempts ?? 0}
        </p>
        <p className="cardMeta">FX updated rows: {refreshStatus.fxUpdatedCount ?? 0}</p>
        <p className="cardMeta">FX skipped rows: {refreshStatus.fxSkippedCount ?? 0}</p>
        <p className="cardMeta">
          FX stale-preserved rows: {refreshStatus.fxStalePreservedCount ?? 0}
        </p>
        <p className="cardMeta">
          FX manual-override rows: {refreshStatus.fxManualOverrideCount ?? 0}
        </p>
        <p className="cardMeta">
          FX same-currency normalized rows: {refreshStatus.fxSameCurrencyCount ?? 0}
        </p>
        <p className="cardMeta">
          FX inverse-derived rows: {refreshStatus.fxInverseDerivedCount ?? 0}
        </p>
        <p className="cardMeta">
          FX warning/error:{" "}
          {refreshStatus.fxErrors?.[0] ??
            refreshStatus.fxWarnings?.[0] ??
            "No recent FX warnings/errors."}
        </p>
        <p className="cardMeta">
          Last warning/error:{" "}
          {refreshStatus.errors[0] ?? refreshStatus.warnings[0] ?? "No recent warnings/errors."}
        </p>
      </div>
    </section>
  );
}
