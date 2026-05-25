import { countryRiskErpData } from "@/lib/mock-reference-data";

export default function CountryRiskErpPage() {
  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Country Risk / ERP</h2>
        <p className="sectionSubheading">
          Placeholder detail page for country risk and ERP reference rows.
        </p>
      </div>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th>Code</th>
              <th>Sovereign Rating</th>
              <th>Country Risk Premium</th>
              <th>Equity Risk Premium</th>
              <th>As Of</th>
            </tr>
          </thead>
          <tbody>
            {countryRiskErpData.map((row) => (
              <tr key={row.countryCode}>
                <td>{row.country}</td>
                <td>{row.countryCode}</td>
                <td>{row.sovereignRating}</td>
                <td>{row.countryRiskPremium}</td>
                <td>{row.equityRiskPremium}</td>
                <td>{row.asOfDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
