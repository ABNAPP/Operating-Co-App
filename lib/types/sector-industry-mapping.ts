export type IsmArea = "Manufacturing" | "Services" | "Custom" | "Other";

export type OperatingCoStatus =
  | "Supported"
  | "Review Required"
  | "Excluded / Special Review";

export type MappingFoundationStatus =
  | "Mapping Required"
  | "Review Required"
  | "Excluded / Special Review"
  | "OK";

export interface ISMSectorRow {
  id: string;
  ismSector: string;
  ismArea: IsmArea;
  active: boolean;
  operatingCoStatus: OperatingCoStatus;
  defaultMappingStatus: "Mapping Required";
  notes: string;
}

export interface SectorIndustryMappingRow {
  id: string;
  ismSector: string;
  businessDescription: string;
  primaryDamodaranIndustrialBenchmark: string | null;
  secondaryDamodaranIndustrialBenchmark: string | null;
  fallbackDamodaranIndustrialBenchmark: string | null;
  betaTableKey: string | null;
  marginTableKey: string | null;
  reinvestmentTableKey: string | null;
  workingCapitalTableKey: string | null;
  growthRocTableKey: string | null;
  multiplesTableKey: string | null;
  defaultStageType: string;
  cyclicalityFlag: string;
  defaultStableMarginRule: string;
  defaultStableRocRule: string;
  defaultSalesToCapitalRule: string;
  sectorWarning: string;
  mappingReviewFlag: "Mapping Required" | "Review Required" | "Ready" | "Excluded / Special Review";
  status: MappingFoundationStatus;
  sourceName: string;
  sourceUrl: string;
  sourceUpdateDate: string;
  importedLastUpdated: string | null;
  mappingDirection?: "ISM_TO_BENCHMARK_HELPER" | "BENCHMARK_TO_ISM_PRIMARY";
  notes: string;
}

export interface SectorMappingRule {
  id: string;
  ruleId: string;
  rule: string;
  defaultBehavior: string;
  reviewCondition: string;
  status: string;
  notes: string;
}

export interface SectorMappingValidationValue {
  id: string;
  validationType: string;
  allowedValue: string;
  active: boolean;
  notes: string;
}

export interface SectorMappingStatusValue {
  id: string;
  status: MappingFoundationStatus | string;
  meaning: string;
  actionRequired: string;
}

export interface SectorMappingReadinessRow {
  id: string;
  ismSector: string;
  operatingCoStatus: OperatingCoStatus;
  primaryBenchmark: string | null;
  primaryBenchmarkValid: boolean;
  secondaryBenchmark: string | null;
  secondaryBenchmarkValid: boolean;
  fallbackBenchmark: string | null;
  fallbackBenchmarkValid: boolean;
  currentMappingReviewFlag: string;
  currentStatus: string;
  readinessStatus: "Mapping Required" | "Review Required" | "Excluded / Special Review" | "OK";
  requiredAction: string;
  importedLastUpdated: string | null;
  notes: string;
}

export interface SectorMappingCandidateGuideRow {
  id: string;
  ismSector: string;
  candidatePrimaryBenchmark: string | null;
  candidateSecondaryBenchmark: string | null;
  candidateFallbackBenchmark: string | null;
  suggestedPrimaryBenchmark: string | null;
  defaultStatus: MappingFoundationStatus;
  reason: string;
  sourceBasis: string;
  notes: string;
  importedLastUpdated: string | null;
}

export interface DamodaranBenchmarkToIsmSectorRow {
  id: string;
  damodaranIndustrialBenchmark: string;
  normalizedDamodaranIndustrialBenchmark: string;
  damodaranIndustryBenchmark?: string;
  normalizedBenchmarkName?: string;
  defaultIsmSector: string | null;
  alternativeIsmSectors: string[];
  ismDisplaySector?: string | null;
  ismDisplaySectorAlternatives?: string[];
  operatingCoStatus: OperatingCoStatus;
  eligibilityStatus?: OperatingCoStatus;
  mappingConfidence: "High" | "Medium" | "Low" | "Review Required";
  mappingReviewFlag: "Mapping Required" | "Review Required" | "Ready" | "Excluded / Special Review";
  reviewFlag?: "Mapping Required" | "Review Required" | "Ready" | "Excluded / Special Review";
  status: "OK" | "Watch" | "Review Required" | "Mapping Required" | "Excluded / Special Review";
  benchmarkValid: boolean;
  benchmarkCoverageStatus: "Complete" | "Partial" | "Missing Core Data" | "Review" | "Unknown";
  defaultModelMode?: string;
  historyRecommendation?: string;
  normalizationNeed?: string;
  assetIntensity?: "Low" | "Medium" | "High" | "Review Required";
  regulatoryFlag?: "Regulated" | "Lightly Regulated" | "Not Regulated" | "Review Required";
  benchmarkUse?: string;
  relatedSecondaryBenchmarks?: string[];
  fallbackBenchmark?: string | null;
  defaultStageType?: string;
  cyclicalityFlag?: string;
  defaultHistoryRequirement?: string;
  defaultNormalizationNeed?:
    | "None"
    | "Watch"
    | "Required"
    | "Cyclical normalization"
    | "Commodity normalization"
    | "Review Required";
  defaultStableMarginRule?: string;
  defaultStableRocRule?: string;
  defaultSalesToCapitalRule?: string;
  forecastFadeRuleHint?: string;
  terminalReadinessHint?: string;
  sectorWarning?: string;
  requiredReviewReason?: string;
  engineDefaultSource?: "Benchmark candidate logic" | "ISM helper-derived" | "Manual review required";
  betaTableKey?: string | null;
  marginTableKey?: string | null;
  rocRoicTableKey?: string | null;
  reinvestmentSalesToCapitalTableKey?: string | null;
  workingCapitalTableKey?: string | null;
  taxTableKey?: string | null;
  waccCostOfCapitalSanityKey?: string | null;
  multiplesSanityKey?: string | null;
  pricingSanityOnly?: boolean;
  sourceName?: string;
  sourceUrl?: string;
  sourceUpdateDate?: string;
  sourceBasis:
    | "Damodaran Industry Master List"
    | "Master Specification"
    | "Candidate logic"
    | "User review input"
    | "Business classification judgment";
  importedLastUpdated: string | null;
  createdAt?: string;
  updatedAt?: string;
  mappingDirection: "BENCHMARK_TO_ISM_PRIMARY";
  notes: string;
}

export interface IndustryBenchmarkConfigRow {
  id: string;
  damodaranIndustryBenchmark: string;
  normalizedBenchmarkName: string;
  operatingCoStatus: OperatingCoStatus;
  eligibilityStatus: OperatingCoStatus;
  ismDisplaySector: string | null;
  ismDisplaySectorAlternatives: string[];
  defaultModelMode: string;
  defaultStageType: string;
  cyclicalityFlag: string;
  historyRecommendation: string;
  normalizationNeed: string;
  assetIntensity: "Low" | "Medium" | "High" | "Review Required";
  regulatoryFlag: "Regulated" | "Lightly Regulated" | "Not Regulated" | "Review Required";
  benchmarkUse: string;
  defaultStableMarginRule: string;
  defaultStableRocRule: string;
  defaultSalesToCapitalRule: string;
  betaTableKey: string | null;
  marginTableKey: string | null;
  rocRoicTableKey: string | null;
  reinvestmentSalesToCapitalTableKey: string | null;
  workingCapitalTableKey: string | null;
  taxTableKey: string | null;
  waccCostOfCapitalSanityKey: string | null;
  multiplesSanityKey: string | null;
  pricingSanityOnly: boolean;
  mappingReviewFlag: "Mapping Required" | "Review Required" | "Ready" | "Excluded / Special Review";
  reviewFlag: "Mapping Required" | "Review Required" | "Ready" | "Excluded / Special Review";
  status: "OK" | "Watch" | "Review Required" | "Mapping Required" | "Excluded / Special Review";
  notes: string;
  sourceName: string;
  sourceUrl: string;
  sourceUpdateDate: string;
  importedLastUpdated: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IndustryBenchmarkHeaderRow {
  id: string;
  tableName: "tblIndustryBenchmarkHeader";
  sheetName: string;
  purpose: string;
  version: string;
  status: string;
}

export interface DamodaranIndustryUniverseRow {
  id: string;
  tableName: "tblDamodaranIndustryUniverse";
  damodaranIndustrialBenchmark: string;
}

export interface IndustryBenchmarkConfigTableRow {
  id: string;
  tableName: "tblIndustryBenchmarkConfig";
  damodaranIndustrialBenchmark: string;
  templateStatus: string;
  defaultStageRecommendation: string;
  historyRecommendation: string;
  cyclicalityFlag: string;
  assetIntensity: string;
  regulatoryFlag: string;
}

export interface BenchmarkDataPullKeyRow {
  id: string;
  tableName: "tblBenchmarkDataPullKeys";
  damodaranIndustrialBenchmark: string;
  betaTableKey: string;
  marginTableKey: string;
  reinvestmentTableKey: string;
  workingCapitalTableKey: string;
  growthRocTableKey: string;
  taxTableKey: string;
}

export interface IndustryISMDisplayMapTableRow {
  id: string;
  tableName: "tblIndustryISMDisplayMap";
  damodaranIndustrialBenchmark: string;
  ismSectorDisplay: string;
  use: string;
}

export interface IndustryBenchmarkRuleRow {
  id: string;
  tableName: "tblIndustryBenchmarkRules";
  ruleId: string;
  rule: string;
  requiredBehavior: string;
}

export interface IndustryBenchmarkStatusValueRow {
  id: string;
  tableName: "tblIndustryBenchmarkStatusValues";
  templateStatus: string;
  meaning: string;
}

export interface IndustryBenchmarkConfigV15Tables {
  header: IndustryBenchmarkHeaderRow[];
  universe: DamodaranIndustryUniverseRow[];
  config: IndustryBenchmarkConfigTableRow[];
  pullKeys: BenchmarkDataPullKeyRow[];
  ismDisplayMap: IndustryISMDisplayMapTableRow[];
  rules: IndustryBenchmarkRuleRow[];
  statusValues: IndustryBenchmarkStatusValueRow[];
  sourceFilePath: string;
}

export interface IndustryISMDisplayMapRow {
  id: string;
  damodaranIndustryBenchmark: string;
  ismSector: string;
  ismDisplayGroup: string;
  displayOnly: true;
  status: "Active" | "Review Required" | "Excluded / Special Review";
  notes: string;
  sourceName: string;
  sourceUpdateDate: string;
  importedLastUpdated: string | null;
}

export interface SectorMappingImportStatus {
  id: string;
  sourceName: string;
  sourceUrl: string;
  sourceUpdateDate: string;
  importedLastUpdated: string | null;
  status: string;
  ismSectorCount: number;
  mappingRowsCount: number;
  mappingRequiredCount: number;
  excludedSpecialReviewCount: number;
  reviewRequiredCount: number;
  okCount: number;
  rowsEvaluated: number;
  candidatesGenerated: number;
  primaryValidCount: number;
  primaryInvalidCount: number;
  lastCandidateGeneratedAt: string | null;
  benchmarksEvaluated?: number;
  benchmarkMappingsGenerated?: number;
  highConfidenceCount?: number;
  mediumConfidenceCount?: number;
  lowConfidenceCount?: number;
  benchmarkReviewRequiredCount?: number;
  unmappedCount?: number;
  lastBenchmarkFirstGeneratedAt?: string | null;
  rawIndustryCount?: number;
  canonicalIndustryCount?: number;
  variantsExcluded?: number;
  nonIndustryExcluded?: number;
  stageDefaultsPopulated?: number;
  cyclicalityDefaultsPopulated?: number;
  historyDefaultsPopulated?: number;
  industryMasterListAvailable: boolean;
  warnings: string[];
  errors: string[];
}
