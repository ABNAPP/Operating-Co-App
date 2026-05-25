export interface CountryErpRow {
  id: string;
  countryName: string;
  countryCode: string | null;
  moodysRating: string;
  adjustedDefaultSpread: number | null;
  countryRiskPremium: number | null;
  totalEquityRiskPremium: number | null;
  corporateTaxRate: number | null;
  sovereignCds: number | null;
  erpBasedOnSovereignCds: number | null;
  sourceName: string;
  sourceUrl: string;
  sourceUpdateDate: string;
  importedLastUpdated: string | null;
  status: string;
  notes: string;
}

export interface RegionalErpRow {
  id: string;
  regionName: string;
  regionType: string;
  totalEquityRiskPremium: number | null;
  adjustedDefaultSpread: number | null;
  countryRiskPremium: number | null;
  corporateTaxRate: number | null;
  countryCount: number;
  activeMappingCount: number;
  dataCoveragePct: number;
  calculationMethod: string;
  sourceName: string;
  sourceUrl: string;
  sourceUpdateDate: string;
  importedLastUpdated: string | null;
  status: string;
  notes: string;
}

export interface CountryRegionalGroupMapRow {
  id: string;
  countryName: string;
  countryCode: string | null;
  regionalGroup: string;
  regionType: string;
  active: boolean;
  sourceMethod: string;
  status: string;
  notes: string;
}

export interface RegionalGroupDefinition {
  id: string;
  regionalGroup: string;
  regionType: string;
  defaultSourceMethod: string;
  calculationMethod: string;
  minimumCountryCount: number;
  active: boolean;
  status: string;
  notes: string;
}

export interface CountryRiskErpSourceNote {
  id: string;
  sourceName: string;
  sourceUrl: string;
  downloadUrl: string;
  purpose: string;
  updateFrequency: string;
  importUpdateMethod: string;
  sourceUpdateDate: string;
  importedLastUpdated: string | null;
  status: string;
  notes: string;
}

export interface ErpUsageRule {
  id: string;
  ruleId: string;
  rule: string;
  defaultBehavior: string;
  reviewCondition: string;
  notes: string;
}

export interface WeightedErpFormulaGuide {
  id: string;
  formulaComponent: string;
  formulaLogic: string;
  notes: string;
}

export interface RevenueExposureRow {
  companyId: string;
  countryOrRegion: string;
  countryCode: string | null;
  regionName: string | null;
  exposureWeight: number;
  sourceType: "country" | "region" | "manual";
  selectedErp: number | null;
  status: string;
  notes: string;
}

export interface WeightedErpResult {
  companyId: string;
  selectedErp: number | null;
  source: string;
  exposureWeightTotal: number;
  missingExposure: number;
  missingErpRows: string[];
  regionalFallbackUsed: boolean;
  reviewFlag: string;
  notes: string;
}

export interface CountryRiskErpImportStatus {
  id: string;
  sourceName: string;
  sourceUrl: string;
  downloadUrl: string;
  sourceUpdateDate: string;
  importedLastUpdated: string | null;
  status: string;
  stale: boolean;
  rowsImported: number;
  rowsSkipped: number;
  warnings: string[];
  errors: string[];
}
