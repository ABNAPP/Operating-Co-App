import { BackLink } from "@/components/back-link";
import { apiProviderConfigs } from "@/lib/mock-reference-data";

export default function ApiIntegrationsPage() {
  const env = process.env as Record<string, string | undefined>;
  const fredConfigured = Boolean(process.env.FRED_API_KEY);
  const firebaseAdminConfigured =
    Boolean(process.env.FIREBASE_PROJECT_ID) &&
    Boolean(process.env.FIREBASE_CLIENT_EMAIL) &&
    Boolean(process.env.FIREBASE_PRIVATE_KEY);
  const configuredByKey = apiProviderConfigs.map((provider) => ({
    provider: provider.provider,
    keyEnvVarName: provider.keyEnvVarName,
    configured: Boolean(env[provider.keyEnvVarName]),
    purpose: provider.purpose,
  }));
  const fxProviderConfigs = [
    { label: "EODHD-1", key: "EODHD_API_KEY_1" },
    { label: "EODHD-2", key: "EODHD_API_KEY_2" },
    { label: "FMP", key: "FMP_API_KEY" },
    { label: "Finnhub", key: "FINNHUB_API_KEY" },
    { label: "MarketStack", key: "MARKETSTACK_API_KEY" },
    { label: "Alpha Vantage-1", key: "ALPHA_VANTAGE_API_KEY_1" },
    { label: "Alpha Vantage-2", key: "ALPHA_VANTAGE_API_KEY_2" },
  ].map((item) => ({
    ...item,
    configured: Boolean(env[item.key]),
  }));

  return (
    <section className="pageSection">
      <BackLink href="/data-hub" label="Back to Data Hub" />
      <div>
        <h2 className="sectionHeading">API Integrations</h2>
        <p className="sectionSubheading">
          Provider priority and configuration readiness. Values are never shown, only yes/no.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Provider Policy</h3>
        <p className="cardMeta">Riskfree provider (Phase 4B): FRED only.</p>
        <p className="cardMeta">
          FX priority (Phase 4B): EODHD-1, EODHD-2, FMP, Finnhub, MarketStack, Alpha
          Vantage-1, Alpha Vantage-2, Manual Override / Cache.
        </p>
        <p className="cardMeta">
          Provider chain is sequential and stops at first success per pair to protect limited API
          quotas.
        </p>
        <p className="cardMeta">
          MarketStack is optional and may be skipped as unsupported for FX in this phase.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Configuration Status</h3>
        <p className="cardMeta">FRED_API_KEY configured: {fredConfigured ? "Yes" : "No"}</p>
        <p className="cardMeta">
          Firebase Admin configured: {firebaseAdminConfigured ? "Yes" : "No"}
        </p>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Env Var</th>
              <th>Configured</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {configuredByKey.map((row) => (
              <tr key={`${row.provider}-${row.keyEnvVarName}`}>
                <td>{row.provider}</td>
                <td>{row.keyEnvVarName}</td>
                <td>{row.configured ? "Yes" : "No"}</td>
                <td>{row.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>FX Provider</th>
              <th>Env Var</th>
              <th>Configured</th>
            </tr>
          </thead>
          <tbody>
            {fxProviderConfigs.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.key}</td>
                <td>{row.configured ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
