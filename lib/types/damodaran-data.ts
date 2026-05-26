export type DamodaranDatasetPriority =
  | "Core"
  | "Core Support"
  | "Strong Support"
  | "Pricing Sanity Only"
  | "Support"
  | "Optional"
  | "Advanced"
  | "Missing / Deferred";

export type DamodaranDatasetClassification =
  | "Core Required"
  | "Core Support"
  | "Strong Support"
  | "Pricing Sanity Only"
  | "Support"
  | "Optional"
  | "Advanced"
  | "Missing / Deferred";

export type DamodaranImportStatus =
  | "Not Imported"
  | "Imported"
  | "Missing Local File"
  | "Missing / Deferred"
  | "Import Error"
  | "Review"
  | "Stale";

export interface DamodaranDatasetRegisterRow {
  id: string;
  datasetName: string;
  workbookTableName: string;
  fileName: string;
  dataCategory: string;
  priority: DamodaranDatasetPriority;
  classification: DamodaranDatasetClassification;
  blocksCoreReadiness: boolean;
  pricingSanityOnly: boolean;
  usedBy: string;
  sourceName: string;
  sourceUrl: string;
  downloadUrl: string;
  sourceUpdateDate: string;
  importedLastUpdated: string | null;
  importStatus: DamodaranImportStatus;
  rowCount: number;
  industryCount: number;
  detectedColumns?: string[];
  notes: string;
  roicSupportNote?: string;
  isDeferredPlaceholder?: boolean;
}

export interface DamodaranRawDatasetRow {
  id: string;
  datasetId: string;
  datasetName: string;
  fileName: string;
  rowIndex: number;
  industryName: string;
  normalizedIndustryName: string;
  values: Record<string, string | number | null>;
  detectedColumns: string[];
  sourceName: string;
  sourceUrl: string;
  downloadUrl: string;
  sourceUpdateDate: string;
  importedLastUpdated: string;
  status: string;
  notes: string;
}

export interface DamodaranIndustryMasterRow {
  id: string;
  industryName: string;
  normalizedIndustryName: string;
  presentInDatasets: string[];
  missingCoreDatasets: string[];
  coverageStatus: "Complete" | "Partial" | "Missing Core Data" | "Review";
  sourceDatasetNames: string[];
  status: string;
  notes: string;
}

export interface DamodaranDatasetCoverageRow {
  industryName: string;
  betaAvailable: boolean;
  waccAvailable: boolean;
  marginAvailable: boolean;
  capexAvailable: boolean;
  workingCapitalAvailable: boolean;
  fundgrEbAvailable: boolean;
  taxRateAvailable: boolean;
  multiplesAvailable: boolean;
  coverageStatus: "Complete" | "Partial" | "Missing Core Data" | "Review";
  notes: string;
}

export interface CanonicalDamodaranIndustryRow {
  id: string;
  industryName: string;
  normalizedIndustryName: string;
  sourceDatasets: string[];
  presentInCoreDatasets: string[];
  missingCoreDatasets: string[];
  coverageStatus: "Complete" | "Partial" | "Missing Core Data" | "Review" | "Unknown";
  canonicalStatus:
    | "Canonical"
    | "Review"
    | "Duplicate / Variant"
    | "Excluded Non-Industry"
    | "Missing Core Coverage";
  isCanonical: boolean;
  isLineWrapVariant: boolean;
  possibleCanonicalMatch: string | null;
  notes: string;
}

export interface DamodaranImportSummary {
  success: boolean;
  startedAt: string;
  finishedAt: string;
  datasetsAttempted: number;
  datasetsImported: string[];
  datasetsMissing: string[];
  datasetsFailed: string[];
  rawRowsImported: number;
  industryCount: number;
  coverageMatrixRows: number;
  extraUnregisteredFiles: string[];
  warnings: string[];
  errors: string[];
}
