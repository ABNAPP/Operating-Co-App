import {
  getBenchmarkDataPullKeysTable,
  getDamodaranIndustryUniverse,
  getIndustryBenchmarkConfigTable,
  getIndustryBenchmarkHeader,
  getIndustryBenchmarkRules,
  getIndustryBenchmarkStatusValues,
  getIndustryISMDisplayMapTable,
} from "@/lib/firestore/repositories/sectorIndustryMappingRepository";
import { IndustryBenchmarkConfigView } from "@/components/industry-benchmark-config-view";

export const dynamic = "force-dynamic";

export default async function SectorIndustryMappingPage() {
  const [
    headerRows,
    universeRows,
    benchmarkConfigRows,
    pullKeyRows,
    ismDisplayMapRows,
    benchmarkRuleRows,
    benchmarkStatusRows,
  ] = await Promise.all([
    getIndustryBenchmarkHeader(),
    getDamodaranIndustryUniverse(),
    getIndustryBenchmarkConfigTable(),
    getBenchmarkDataPullKeysTable(),
    getIndustryISMDisplayMapTable(),
    getIndustryBenchmarkRules(),
    getIndustryBenchmarkStatusValues(),
  ]);

  const previewBenchmarks = benchmarkConfigRows.data
    .filter((row) =>
      [
        "Advertising",
        "Aerospace/Defense",
        "Air Transport",
        "Software (System & Application)",
        "Utility (General)",
        "Total Market",
      ].includes(row.damodaranIndustrialBenchmark),
    )
    .map((row) => row.damodaranIndustrialBenchmark);
  const hasDisplayOnlyMarker = ismDisplayMapRows.data.some((row) =>
    row.use.includes("Display only - no model-driving effect"),
  );
  const parseErrors = [
    headerRows.error,
    universeRows.error,
    benchmarkConfigRows.error,
    pullKeyRows.error,
    ismDisplayMapRows.error,
    benchmarkRuleRows.error,
    benchmarkStatusRows.error,
  ].filter((value): value is string => Boolean(value));

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Industry Benchmark Config</h2>
        <p className="sectionSubheading">
          Exact v1.5 source-of-truth tables. Generated candidate logic is not source of truth.
        </p>
      </div>

      <IndustryBenchmarkConfigView
        headerRows={headerRows.data}
        universeRows={universeRows.data}
        benchmarkConfigRows={benchmarkConfigRows.data}
        pullKeyRows={pullKeyRows.data}
        ismDisplayMapRows={ismDisplayMapRows.data}
        benchmarkRuleRows={benchmarkRuleRows.data}
        benchmarkStatusRows={benchmarkStatusRows.data}
        parseErrors={parseErrors}
        statusCounts={{
          tblDamodaranIndustryUniverse: universeRows.data.length,
          tblIndustryBenchmarkConfig: benchmarkConfigRows.data.length,
          tblBenchmarkDataPullKeys: pullKeyRows.data.length,
          tblIndustryISMDisplayMap: ismDisplayMapRows.data.length,
          tblIndustryBenchmarkRules: benchmarkRuleRows.data.length,
          tblIndustryBenchmarkStatusValues: benchmarkStatusRows.data.length,
        }}
        hasDisplayOnlyMarker={hasDisplayOnlyMarker}
        previewBenchmarks={previewBenchmarks}
      />
    </section>
  );
}
