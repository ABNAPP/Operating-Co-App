import Link from "next/link";
import { getReferenceDataSummary } from "@/lib/firestore/repositories/referenceDataRepository";
import { getFirestoreStatusSummary } from "@/lib/firestore/status";

export default async function DataHubPage() {
  const { data: referenceSummary, source } = await getReferenceDataSummary();
  const firestoreStatus = getFirestoreStatusSummary();
  const hubCards = [
    {
      title: "Riskfree Rates",
      description: "Valuation-currency mapped riskfree proxy rows and seed action.",
      count: referenceSummary.riskfreeRates,
      href: "/data-hub/riskfree-rates",
    },
    {
      title: "FX Rates",
      description: "Currency map and FX pair rates with same-currency = 1 policy.",
      count: referenceSummary.fxRates,
      href: "/data-hub/fx-rates",
    },
    {
      title: "Damodaran Data",
      description: "Placeholder sections and metadata for benchmark datasets.",
      count: referenceSummary.damodaranData,
      href: "/data-hub/damodaran-data",
    },
    {
      title: "Country Risk / ERP",
      description: "Country risk premium and ERP placeholder structure.",
      count: 2,
      href: "/data-hub/country-risk-erp",
    },
    {
      title: "Sector / Industry Mapping",
      description: "Internal sector mapping to Damodaran benchmark taxonomy.",
      count: referenceSummary.sectorIndustryMapping,
      href: "/data-hub/sector-industry-mapping",
    },
    {
      title: "Beta Reference",
      description: "Reference beta placeholders for sector/industry inputs.",
      count: referenceSummary.betaReferenceData,
      href: "/data-hub/beta-reference",
    },
    {
      title: "Forecast & Fade Rules",
      description: "Rule-set placeholders for forecast fade structure.",
      count: referenceSummary.forecastFadeRules,
      href: "/data-hub/forecast-fade-rules",
    },
    {
      title: "API Integrations",
      description: "Provider priority and configured yes/no status only.",
      count: referenceSummary.apiProviderConfigs,
      href: "/data-hub/api-integrations",
    },
    {
      title: "Refresh Status",
      description: "Daily cron refresh status, schedule, and warning/error summary.",
      count: 1,
      href: "/data-hub/refresh-status",
    },
  ];

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Data Hub</h2>
        <p className="sectionSubheading">
          Central hub for shared reference data, refresh orchestration, and integration
          readiness. Open a card to view detailed tables and actions.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Firestore / Data Hub Status</h3>
        <p className="cardMeta">Firebase Config: {firestoreStatus.firebaseConfig}</p>
        <p className="cardMeta">Firestore Client: {firestoreStatus.firestoreClient}</p>
        <p className="cardMeta">
          Reference Data Mode: {source === "firestore" ? "Firestore" : "Mock"}
        </p>
        <p className="cardMeta">Riskfree rows: {referenceSummary.riskfreeRates}</p>
        <p className="cardMeta">Currency map rows: {referenceSummary.currencyMap}</p>
        <p className="cardMeta">FX pair rows: {referenceSummary.fxRates}</p>
        {firestoreStatus.lastReadAttempt ? (
          <p className="cardMeta">
            Last Firestore Read: {firestoreStatus.lastReadAttempt.collection} (
            {firestoreStatus.lastReadAttempt.ok ? "OK" : "Failed"})
          </p>
        ) : null}
      </div>

      <div className="cardGrid">
        {hubCards.map((card) => (
          <article key={card.href} className="card">
            <h3 className="cardTitle">{card.title}</h3>
            <p className="cardMeta">{card.description}</p>
            <p className="cardMeta">Status/Count: {card.count}</p>
            <p style={{ marginTop: "0.65rem" }}>
              <Link href={card.href}>Open</Link>
            </p>
          </article>
        ))}
      </div>

      <div className="panel">
        <p className="cardMeta">
          Detailed riskfree, FX, provider and refresh pages are now separated from the hub
          overview for cleaner navigation.
        </p>
      </div>
    </section>
  );
}
