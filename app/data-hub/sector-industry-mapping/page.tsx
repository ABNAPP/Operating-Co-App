import {
  getISMSectorRows,
  getSectorIndustryMappings,
  getSectorMappingImportStatus,
  getSectorMappingReadiness,
  getSectorMappingRules,
  getSectorMappingStatusValues,
  getSectorMappingValidationValues,
} from "@/lib/firestore/repositories/sectorIndustryMappingRepository";
import { getDamodaranIndustryMasterList } from "@/lib/firestore/repositories/damodaranDataRepository";

export const dynamic = "force-dynamic";

export default async function SectorIndustryMappingPage() {
  const [ismRows, mappingRows, readinessRows, rules, statuses, validations, importStatus, industryMaster] =
    await Promise.all([
      getISMSectorRows(),
      getSectorIndustryMappings(),
      getSectorMappingReadiness(),
      getSectorMappingRules(),
      getSectorMappingStatusValues(),
      getSectorMappingValidationValues(),
      getSectorMappingImportStatus(),
      getDamodaranIndustryMasterList(),
    ]);

  const readinessBySector = new Map(readinessRows.data.map((row) => [row.ismSector, row]));

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Sector / Industry Mapping</h2>
        <p className="sectionSubheading">
          Foundation stage only. Mapping candidates are pending and benchmark fields are
          intentionally reviewable.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Source & Purpose</h3>
        <p className="cardMeta">
          Purpose: connect ISM-sector to Damodaran Industrial Benchmark and table-key mapping
          fields.
        </p>
        <p className="cardMeta">
          Rule: ISM-sector is internal taxonomy. Damodaran Industrial Benchmark is external
          reference taxonomy.
        </p>
        <p className="cardMeta">
          Mapping recommends context and does not force valuation assumptions.
        </p>
        <p className="cardMeta">Status: Foundation built / Mapping candidates pending.</p>
        <p className="cardMeta">
          Source: {importStatus.data.sourceName} ({importStatus.data.sourceUpdateDate})
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">ISM-sector List</h3>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>ISM-sector</th>
                <th>ISM Area</th>
                <th>Active?</th>
                <th>Operating Co Status</th>
                <th>Default Mapping Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {ismRows.data.map((row) => (
                <tr key={row.id}>
                  <td>{row.ismSector}</td>
                  <td>{row.ismArea}</td>
                  <td>{row.active ? "Yes" : "No"}</td>
                  <td>{row.operatingCoStatus}</td>
                  <td>{row.defaultMappingStatus}</td>
                  <td>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Sector Mapping Foundation Table</h3>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>ISM-sector</th>
                <th>Operating Co Status</th>
                <th>Primary Benchmark</th>
                <th>Secondary Benchmark</th>
                <th>Fallback Benchmark</th>
                <th>Mapping Review Flag</th>
                <th>Status</th>
                <th>Required Action</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {mappingRows.data.map((row) => {
                const readiness = readinessBySector.get(row.ismSector);
                return (
                  <tr key={row.id}>
                    <td>{row.ismSector}</td>
                    <td>{readiness?.operatingCoStatus ?? "Supported"}</td>
                    <td>{row.primaryDamodaranIndustrialBenchmark ?? "Mapping Required"}</td>
                    <td>{row.secondaryDamodaranIndustrialBenchmark ?? "Mapping Required"}</td>
                    <td>{row.fallbackDamodaranIndustrialBenchmark ?? "Mapping Required"}</td>
                    <td>{row.mappingReviewFlag}</td>
                    <td>{row.status}</td>
                    <td>{readiness?.requiredAction ?? "Assign mapping candidate in next phase."}</td>
                    <td>{row.notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Damodaran Industry Master List Check</h3>
        <p className="cardMeta">Industry count: {industryMaster.data.length}</p>
        <p className="cardMeta">
          Industry Master List available: {importStatus.data.industryMasterListAvailable ? "Yes" : "No"}
        </p>
        <p className="cardMeta">
          Coverage status: {importStatus.data.industryMasterListAvailable ? "Validation-enabled foundation" : "Validation degraded"}
        </p>
        <p className="cardMeta">
          Candidate mapping will be generated in Phase 4C-2B-2 using Damodaran Industry Master List
          and analyst-reviewed rules.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Rules / Status Values</h3>
        <details>
          <summary className="cardMeta">Open supporting definitions</summary>
          <h4 className="cardTitle" style={{ marginTop: "0.75rem" }}>
            Rules
          </h4>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Rule ID</th>
                  <th>Rule</th>
                  <th>Default Behavior</th>
                  <th>Review Condition</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rules.data.map((rule) => (
                  <tr key={rule.id}>
                    <td>{rule.ruleId}</td>
                    <td>{rule.rule}</td>
                    <td>{rule.defaultBehavior}</td>
                    <td>{rule.reviewCondition}</td>
                    <td>{rule.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h4 className="cardTitle" style={{ marginTop: "0.75rem" }}>
            Status Definitions
          </h4>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Meaning</th>
                  <th>Action Required</th>
                </tr>
              </thead>
              <tbody>
                {statuses.data.map((status) => (
                  <tr key={status.id}>
                    <td>{status.status}</td>
                    <td>{status.meaning}</td>
                    <td>{status.actionRequired}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h4 className="cardTitle" style={{ marginTop: "0.75rem" }}>
            Validation Values
          </h4>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Validation Type</th>
                  <th>Allowed Value</th>
                  <th>Active?</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {validations.data.map((value) => (
                  <tr key={value.id}>
                    <td>{value.validationType}</td>
                    <td>{value.allowedValue}</td>
                    <td>{value.active ? "Yes" : "No"}</td>
                    <td>{value.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Candidate Mapping Preview</h3>
        <p className="cardMeta">
          Candidate mapping will be built in Phase 4C-2B-2 using Damodaran Industry Master List,
          Master Specification and analyst-reviewed rules. The old Google Sheet logic is context
          only, not source of truth.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Seed Status</h3>
        <p className="cardMeta">ISM sectors: {importStatus.data.ismSectorCount}</p>
        <p className="cardMeta">Mapping rows: {importStatus.data.mappingRowsCount}</p>
        <p className="cardMeta">Mapping required: {importStatus.data.mappingRequiredCount}</p>
        <p className="cardMeta">
          Excluded / Special Review: {importStatus.data.excludedSpecialReviewCount}
        </p>
        <p className="cardMeta">Review required: {importStatus.data.reviewRequiredCount}</p>
        <p className="cardMeta">
          Last updated: {importStatus.data.importedLastUpdated ?? "Not seeded yet"}
        </p>
      </div>
      
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Warning</th>
            </tr>
          </thead>
          <tbody>
            {(importStatus.data.warnings.length > 0 ? importStatus.data.warnings : ["No warnings"]).map(
              (warning, index) => (
                <tr key={`${warning}-${index}`}>
                  <td>{warning}</td>
                </tr>
              ),
            )}
            {(importStatus.data.errors.length > 0 ? importStatus.data.errors : ["No errors"]).map(
              (error, index) => (
                <tr key={`${error}-${index}`}>
                  <td>{error}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <p className="cardMeta">
          Data source:{" "}
          {[
            ismRows.source,
            mappingRows.source,
            readinessRows.source,
            rules.source,
            statuses.source,
            validations.source,
            importStatus.source,
          ].includes("firestore")
            ? "Firestore / Local Cache Fallback"
            : "Mock"}
        </p>
      </div>
    </section>
  );
}
