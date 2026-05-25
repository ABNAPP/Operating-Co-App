import { apiProviderConfigs } from "@/lib/mock-reference-data";

export default function ApiIntegrationsPage() {
  const env = process.env as Record<string, string | undefined>;
  const configuredByKey = apiProviderConfigs.map((provider) => ({
    provider: provider.provider,
    keyEnvVarName: provider.keyEnvVarName,
    configured: Boolean(env[provider.keyEnvVarName]),
    purpose: provider.purpose,
  }));

  return (
    <section className="pageSection">
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
    </section>
  );
}
