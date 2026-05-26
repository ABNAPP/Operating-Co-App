"use client";

import { useState } from "react";
import { ExpandableCard } from "@/components/expandable-card";
import type {
  BenchmarkDataPullKeyRow,
  DamodaranIndustryUniverseRow,
  IndustryBenchmarkConfigTableRow,
  IndustryBenchmarkHeaderRow,
  IndustryBenchmarkRuleRow,
  IndustryBenchmarkStatusValueRow,
  IndustryISMDisplayMapTableRow,
} from "@/lib/types";

export type V15TableKey =
  | "tblIndustryBenchmarkHeader"
  | "tblDamodaranIndustryUniverse"
  | "tblIndustryBenchmarkConfig"
  | "tblBenchmarkDataPullKeys"
  | "tblIndustryISMDisplayMap"
  | "tblIndustryBenchmarkRules"
  | "tblIndustryBenchmarkStatusValues";

const TABLE_META: Array<{ id: V15TableKey; purpose: string; extraMeta?: string }> = [
  {
    id: "tblIndustryBenchmarkHeader",
    purpose: "Sheet identity, purpose, version and status.",
  },
  {
    id: "tblDamodaranIndustryUniverse",
    purpose: "Full Damodaran Industrial Benchmark universe.",
  },
  {
    id: "tblIndustryBenchmarkConfig",
    purpose:
      "Eligibility/status, model mode, cyclicality, asset intensity and benchmark-use notes.",
  },
  {
    id: "tblBenchmarkDataPullKeys",
    purpose:
      "Benchmark keys for beta, margin, ROC, reinvestment, working capital, tax and WACC sanity.",
  },
  {
    id: "tblIndustryISMDisplayMap",
    purpose: "Display-only Damodaran benchmark to ISM-sector map.",
    extraMeta:
      "Display-only. Must not drive valuation, WACC, forecast, fade, review or dashboard logic.",
  },
  {
    id: "tblIndustryBenchmarkRules",
    purpose: "Rules for how benchmark support may and may not be used.",
  },
  {
    id: "tblIndustryBenchmarkStatusValues",
    purpose: "Allowed statuses and meanings.",
  },
];

type IndustryBenchmarkConfigViewProps = {
  headerRows: IndustryBenchmarkHeaderRow[];
  universeRows: DamodaranIndustryUniverseRow[];
  benchmarkConfigRows: IndustryBenchmarkConfigTableRow[];
  pullKeyRows: BenchmarkDataPullKeyRow[];
  ismDisplayMapRows: IndustryISMDisplayMapTableRow[];
  benchmarkRuleRows: IndustryBenchmarkRuleRow[];
  benchmarkStatusRows: IndustryBenchmarkStatusValueRow[];
  parseErrors: string[];
  statusCounts: {
    tblDamodaranIndustryUniverse: number;
    tblIndustryBenchmarkConfig: number;
    tblBenchmarkDataPullKeys: number;
    tblIndustryISMDisplayMap: number;
    tblIndustryBenchmarkRules: number;
    tblIndustryBenchmarkStatusValues: number;
  };
  hasDisplayOnlyMarker: boolean;
  previewBenchmarks: string[];
};

function rowCountForTable(id: V15TableKey, props: IndustryBenchmarkConfigViewProps): number {
  switch (id) {
    case "tblIndustryBenchmarkHeader":
      return props.headerRows.length;
    case "tblDamodaranIndustryUniverse":
      return props.universeRows.length;
    case "tblIndustryBenchmarkConfig":
      return props.benchmarkConfigRows.length;
    case "tblBenchmarkDataPullKeys":
      return props.pullKeyRows.length;
    case "tblIndustryISMDisplayMap":
      return props.ismDisplayMapRows.length;
    case "tblIndustryBenchmarkRules":
      return props.benchmarkRuleRows.length;
    case "tblIndustryBenchmarkStatusValues":
      return props.benchmarkStatusRows.length;
    default:
      return 0;
  }
}

function EmptyTableWarning({ tableName }: { tableName: string }) {
  return (
    <p className="cardMeta" role="alert">
      <span className="badge badgeRed">Warning</span> {tableName} has zero parsed rows. Parse or
      source file may be incomplete.
    </p>
  );
}

function TableDetail({
  tableId,
  props,
}: {
  tableId: V15TableKey;
  props: IndustryBenchmarkConfigViewProps;
}) {
  const {
    headerRows,
    universeRows,
    benchmarkConfigRows,
    pullKeyRows,
    ismDisplayMapRows,
    benchmarkRuleRows,
    benchmarkStatusRows,
    hasDisplayOnlyMarker,
    previewBenchmarks,
  } = props;

  switch (tableId) {
    case "tblIndustryBenchmarkHeader":
      if (headerRows.length === 0) {
        return <EmptyTableWarning tableName={tableId} />;
      }
      return (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Sheet Name</th>
                <th>Purpose</th>
                <th>Version</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {headerRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.sheetName}</td>
                  <td>{row.purpose}</td>
                  <td>{row.version}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "tblDamodaranIndustryUniverse":
      if (universeRows.length === 0) {
        return <EmptyTableWarning tableName={tableId} />;
      }
      return (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Damodaran Industrial Benchmark</th>
              </tr>
            </thead>
            <tbody>
              {universeRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.damodaranIndustrialBenchmark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "tblIndustryBenchmarkConfig":
      if (benchmarkConfigRows.length === 0) {
        return <EmptyTableWarning tableName={tableId} />;
      }
      return (
        <>
          <p className="cardMeta">Sample benchmarks: {previewBenchmarks.join(", ")}</p>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Damodaran Industrial Benchmark</th>
                  <th>Template Status</th>
                  <th>Default Stage Recommendation</th>
                  <th>History Recommendation</th>
                  <th>Cyclicality Flag</th>
                  <th>Asset Intensity</th>
                  <th>Regulatory Flag</th>
                </tr>
              </thead>
              <tbody>
                {benchmarkConfigRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.damodaranIndustrialBenchmark}</td>
                    <td>{row.templateStatus}</td>
                    <td>{row.defaultStageRecommendation}</td>
                    <td>{row.historyRecommendation}</td>
                    <td>{row.cyclicalityFlag}</td>
                    <td>{row.assetIntensity}</td>
                    <td>{row.regulatoryFlag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );

    case "tblBenchmarkDataPullKeys":
      if (pullKeyRows.length === 0) {
        return <EmptyTableWarning tableName={tableId} />;
      }
      return (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Damodaran Industrial Benchmark</th>
                <th>Beta Table Key</th>
                <th>Margin Table Key</th>
                <th>Reinvestment Table Key</th>
                <th>Working Capital Table Key</th>
                <th>Growth / ROC Table Key</th>
                <th>Tax Table Key</th>
              </tr>
            </thead>
            <tbody>
              {pullKeyRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.damodaranIndustrialBenchmark}</td>
                  <td>{row.betaTableKey}</td>
                  <td>{row.marginTableKey}</td>
                  <td>{row.reinvestmentTableKey}</td>
                  <td>{row.workingCapitalTableKey}</td>
                  <td>{row.growthRocTableKey}</td>
                  <td>{row.taxTableKey}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "tblIndustryISMDisplayMap":
      if (ismDisplayMapRows.length === 0) {
        return <EmptyTableWarning tableName={tableId} />;
      }
      return (
        <>
          <p className="cardMeta" role="note">
            Display-only. Must not drive valuation, WACC, forecast, fade, review or dashboard logic.
          </p>
          <p className="cardMeta">
            Required marker present: {hasDisplayOnlyMarker ? "Yes" : "No"}
          </p>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Damodaran Industrial Benchmark</th>
                  <th>ISM-sector Display</th>
                  <th>Use</th>
                </tr>
              </thead>
              <tbody>
                {ismDisplayMapRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.damodaranIndustrialBenchmark}</td>
                    <td>{row.ismSectorDisplay}</td>
                    <td>{row.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );

    case "tblIndustryBenchmarkRules":
      if (benchmarkRuleRows.length === 0) {
        return <EmptyTableWarning tableName={tableId} />;
      }
      return (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Rule</th>
                <th>Required Behavior</th>
              </tr>
            </thead>
            <tbody>
              {benchmarkRuleRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.ruleId}</td>
                  <td>{row.rule}</td>
                  <td>{row.requiredBehavior}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "tblIndustryBenchmarkStatusValues":
      if (benchmarkStatusRows.length === 0) {
        return <EmptyTableWarning tableName={tableId} />;
      }
      return (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Template Status</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {benchmarkStatusRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.templateStatus}</td>
                  <td>{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}

function ParseStatusSummary({ statusCounts }: { statusCounts: IndustryBenchmarkConfigViewProps["statusCounts"] }) {
  return (
    <div className="panel">
      <h3 className="cardTitle">Parse/Seed Status Summary</h3>
      <p className="cardMeta">
        tblDamodaranIndustryUniverse rows: {statusCounts.tblDamodaranIndustryUniverse}
      </p>
      <p className="cardMeta">
        tblIndustryBenchmarkConfig rows: {statusCounts.tblIndustryBenchmarkConfig}
      </p>
      <p className="cardMeta">
        tblBenchmarkDataPullKeys rows: {statusCounts.tblBenchmarkDataPullKeys}
      </p>
      <p className="cardMeta">
        tblIndustryISMDisplayMap rows: {statusCounts.tblIndustryISMDisplayMap}
      </p>
      <p className="cardMeta">tblIndustryBenchmarkRules rows: {statusCounts.tblIndustryBenchmarkRules}</p>
      <p className="cardMeta">
        tblIndustryBenchmarkStatusValues rows: {statusCounts.tblIndustryBenchmarkStatusValues}
      </p>
    </div>
  );
}

export function IndustryBenchmarkConfigView(props: IndustryBenchmarkConfigViewProps) {
  const [expanded, setExpanded] = useState<V15TableKey | null>(null);
  const { parseErrors, statusCounts } = props;

  if (parseErrors.length > 0) {
    return (
      <>
        <ParseStatusSummary statusCounts={statusCounts} />
        <div className="panel">
          <h3 className="cardTitle">Parse failure</h3>
          <p className="cardMeta" role="alert">
            Exact v1.5 parse failed. Source-of-truth tables are not shown until parsing succeeds.
          </p>
          {parseErrors.map((error, index) => (
            <p key={`${error}-${index}`} className="cardMeta">
              {error}
            </p>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <ParseStatusSummary statusCounts={statusCounts} />

      <div className="cardGrid">
        {TABLE_META.map((meta) => (
          <ExpandableCard
            key={meta.id}
            id={meta.id}
            title={meta.id}
            purpose={meta.purpose}
            extraMeta={meta.extraMeta}
            rowCount={rowCountForTable(meta.id, props)}
            isSelected={expanded === meta.id}
            onSelect={(id) => setExpanded(id ? (id as V15TableKey) : null)}
          />
        ))}
      </div>

      {expanded ? (
        <div className="panel" id={`table-panel-${expanded}`}>
          <h3 className="cardTitle">{expanded}</h3>
          <TableDetail tableId={expanded} props={props} />
        </div>
      ) : null}

      <div className="panel">
        <p className="cardMeta">
          Data source: Exact v1.5 source file parse (primary source-of-truth tables).
        </p>
      </div>
    </>
  );
}
