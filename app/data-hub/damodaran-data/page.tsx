import { damodaranDataSections } from "@/lib/mock-reference-data";

export default function DamodaranDataPage() {
  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Damodaran Data</h2>
        <p className="sectionSubheading">
          Placeholder detail page for Damodaran reference sections (no live import in this
          phase).
        </p>
      </div>
      <div className="cardGrid">
        {damodaranDataSections.map((item) => (
          <article key={item.sectionName} className="card">
            <h3 className="cardTitle">{item.sectionName}</h3>
            <p className="cardMeta">Version: {item.versionTag}</p>
            <p className="cardMeta">As of: {item.asOfDate}</p>
            <p className="cardMeta">{item.notes}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
