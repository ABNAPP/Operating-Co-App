import { getDailyRefreshStatus } from "@/lib/firestore/repositories/referenceDataRepository";

export default async function RefreshStatusPage() {
  const { data: refreshStatus, source } = await getDailyRefreshStatus();
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET);

  return (
    <section className="pageSection">
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
        <p className="cardMeta">CRON_SECRET configured: {cronSecretConfigured ? "Yes" : "No"}</p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Daily Refresh Status</h3>
        <p className="cardMeta">Last attempt: {refreshStatus.finishedAt}</p>
        <p className="cardMeta">
          Last successful refresh: {refreshStatus.lastSuccessfulRefreshAt ?? "N/A"}
        </p>
        <p className="cardMeta">Riskfree refresh status: {refreshStatus.riskfreeRefreshStatus}</p>
        <p className="cardMeta">FX refresh status: {refreshStatus.fxRefreshStatus}</p>
        <p className="cardMeta">
          Last warning/error:{" "}
          {refreshStatus.errors[0] ?? refreshStatus.warnings[0] ?? "No recent warnings/errors."}
        </p>
      </div>
    </section>
  );
}
