export const COLLECTIONS = {
  companies: "companies",
  companyInputs: "companyInputs",
  valuationResults: "valuationResults",
  dashboardRows: "dashboardRows",
  referenceData: "referenceData",
  currencyMap: "currencyMap",
  riskfreeRates: "riskfreeRates",
  fxRates: "fxRates",
  damodaranData: "damodaranData",
  sectorIndustryMapping: "sectorIndustryMapping",
  betaReferenceData: "betaReferenceData",
  forecastFadeRules: "forecastFadeRules",
  apiProviderConfigs: "apiProviderConfigs",
  settings: "settings",
  buildStatus: "buildStatus",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
