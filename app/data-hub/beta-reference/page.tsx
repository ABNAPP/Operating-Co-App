import { BackLink } from "@/components/back-link";
import { betaReferenceData } from "@/lib/mock-reference-data";

export default function BetaReferencePage() {
  return (
    <section className="pageSection">
      <BackLink href="/data-hub" label="Back to Data Hub" />
      <div>
        <h2 className="sectionHeading">Beta Reference</h2>
        <p className="sectionSubheading">
          Placeholder detail page for beta reference datasets.
        </p>
      </div>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Benchmark</th>
              <th>Industry</th>
              <th>Unlevered Beta</th>
              <th>Relevered Beta</th>
              <th>As Of</th>
            </tr>
          </thead>
          <tbody>
            {betaReferenceData.map((row) => (
              <tr key={`${row.benchmarkName}-${row.industry}`}>
                <td>{row.benchmarkName}</td>
                <td>{row.industry}</td>
                <td>{row.unleveredBeta}</td>
                <td>{row.releveredBeta}</td>
                <td>{row.asOfDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
