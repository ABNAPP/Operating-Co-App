import { sectorIndustryMappings } from "@/lib/mock-reference-data";

export default function SectorIndustryMappingPage() {
  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Sector / Industry Mapping</h2>
        <p className="sectionSubheading">
          Placeholder detail page for sector to benchmark industry mapping.
        </p>
      </div>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>ISM Sector</th>
              <th>Internal Industry</th>
              <th>Damodaran Industry</th>
            </tr>
          </thead>
          <tbody>
            {sectorIndustryMappings.map((row) => (
              <tr key={`${row.ismSector}-${row.internalIndustryName}`}>
                <td>{row.ismSector}</td>
                <td>{row.internalIndustryName}</td>
                <td>{row.damodaranIndustry}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
