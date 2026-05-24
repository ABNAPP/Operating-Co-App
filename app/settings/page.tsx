export default function SettingsPage() {
  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Settings</h2>
        <p className="sectionSubheading">
          Application-level settings and environment readiness placeholders.
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
            No live Firestore writes/reads in this phase unless existing setup is
            available.
          </p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Security</h3>
          <p className="cardMeta">
            Secret provider keys remain server-side only and must not use
            `NEXT_PUBLIC_`.
          </p>
        </article>
      </div>
    </section>
  );
}
