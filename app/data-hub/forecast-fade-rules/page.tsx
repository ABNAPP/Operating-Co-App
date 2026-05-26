import { BackLink } from "@/components/back-link";
import { forecastFadeRules } from "@/lib/mock-reference-data";

export default function ForecastFadeRulesPage() {
  return (
    <section className="pageSection">
      <BackLink href="/data-hub" label="Back to Data Hub" />
      <div>
        <h2 className="sectionHeading">Forecast & Fade Rules</h2>
        <p className="sectionSubheading">
          Placeholder detail page for forecast and fade rule sets.
        </p>
      </div>
      <div className="cardGrid">
        {forecastFadeRules.map((rule) => (
          <article key={rule.ruleSetName} className="card">
            <h3 className="cardTitle">{rule.ruleSetName}</h3>
            <p className="cardMeta">Fade start year: {rule.fadeStartYear}</p>
            <p className="cardMeta">Fade end year: {rule.fadeEndYear}</p>
            <p className="cardMeta">{rule.targetMarginConvergence}</p>
            <p className="cardMeta">{rule.targetGrowthConvergence}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
