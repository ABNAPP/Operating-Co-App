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
  industryMasterListAvailable: boolean;
  warnings: string[];
  errors: string[];
}
