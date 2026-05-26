import "server-only";
import {
  getCanonicalDamodaranIndustries,
  getDamodaranCoverageMatrix,
  refreshCanonicalDamodaranIndustryList,
} from "@/lib/firestore/repositories/damodaranDataRepository";
import {
  getBenchmarkEngineDefaults,
  type BenchmarkEngineDefaults,
} from "@/lib/data-hub/benchmarkEngineDefaultRules";
import type {
  DamodaranBenchmarkToIsmSectorRow,
  DamodaranDatasetCoverageRow,
  ISMSectorRow,
  SectorIndustryMappingRow,
} from "@/lib/types";

// v1.5 primary generator:
// This service feeds benchmark-first Industry Benchmark Config rows.
// ISM linkage generated here is display/support metadata only.
interface BenchmarkCandidateDefinition {
  defaultIsmSector: string | null;
  alternatives: string[];
  operatingCoStatus: DamodaranBenchmarkToIsmSectorRow["operatingCoStatus"];
  mappingConfidence: DamodaranBenchmarkToIsmSectorRow["mappingConfidence"];
  mappingReviewFlag: DamodaranBenchmarkToIsmSectorRow["mappingReviewFlag"];
  status: DamodaranBenchmarkToIsmSectorRow["status"];
  notes: string;
  relatedSecondaryBenchmarks?: string[];
  fallbackBenchmark?: string | null;
}

const SOURCE_BASIS = "Candidate logic";

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeList(values: string[]) {
  return values.filter(Boolean).map((value) => value.trim()).filter((value) => value.length > 0);
}

function validateBenchmarkList(values: string[], canonicalNames: Set<string>) {
  return normalizeList(values).filter((item) => canonicalNames.has(item));
}

function isFinancialLike(benchmark: string) {
  const n = normalize(benchmark);
  return (
    n.includes("bank") ||
    n.includes("insurance") ||
    n.includes("brokerage") ||
    n.includes("asset management") ||
    n.includes("investment banking") ||
    n.includes("reinsurance") ||
    n.includes("financial svcs")
  );
}

function isRealEstateLike(benchmark: string) {
  const n = normalize(benchmark);
  return n.includes("real estate") || n.includes("r.e.i.t") || n.includes("reit");
}

function inferAssetIntensity(benchmark: string): "Low" | "Medium" | "High" | "Review Required" {
  const n = normalize(benchmark);
  if (
    n.includes("utility") ||
    n.includes("power") ||
    n.includes("oil/gas") ||
    n.includes("transport") ||
    n.includes("steel") ||
    n.includes("metals")
  ) {
    return "High";
  }
  if (n.includes("software") || n.includes("information services") || n.includes("advertising")) {
    return "Low";
  }
  if (n.includes("total market") || n.includes("diversified")) {
    return "Review Required";
  }
  return "Medium";
}

function inferRegulatoryFlag(
  benchmark: string,
): "Regulated" | "Lightly Regulated" | "Not Regulated" | "Review Required" {
  const n = normalize(benchmark);
  if (n.includes("utility") || n.includes("power") || n.includes("telecom")) {
    return "Regulated";
  }
  if (n.includes("healthcare") || n.includes("drug") || n.includes("bank") || n.includes("insurance")) {
    return "Lightly Regulated";
  }
  if (n.includes("total market") || n.includes("diversified")) {
    return "Review Required";
  }
  return "Not Regulated";
}

function buildBenchmarkPullKeys(
  benchmark: string,
  coverage: DamodaranDatasetCoverageRow | undefined,
) {
  const hasCapexLike = Boolean(coverage?.capexAvailable || coverage?.fundgrEbAvailable);
  return {
    betaTableKey: coverage?.betaAvailable ? benchmark : null,
    marginTableKey: coverage?.marginAvailable ? benchmark : null,
    rocRoicTableKey: coverage?.fundgrEbAvailable ? benchmark : null,
    reinvestmentSalesToCapitalTableKey: hasCapexLike ? benchmark : null,
    workingCapitalTableKey: coverage?.workingCapitalAvailable ? benchmark : null,
    taxTableKey: coverage?.taxRateAvailable ? benchmark : null,
    waccCostOfCapitalSanityKey: coverage?.waccAvailable ? benchmark : null,
    multiplesSanityKey: coverage?.multiplesAvailable ? benchmark : null,
  };
}

const benchmarkCandidateInput: Partial<Record<string, BenchmarkCandidateDefinition>> = {
  Advertising: { defaultIsmSector: "Information", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Ready", status: "OK", notes: "Direct media/information linkage." },
  "Aerospace/Defense": { defaultIsmSector: "Transportation Equipment", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Transportation equipment anchor; defense mix review recommended." },
  "Air Transport": { defaultIsmSector: "Transportation & Warehousing", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Transport cycle sensitivity." },
  Apparel: { defaultIsmSector: "Apparel, Leather & Allied Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Consumer-cycle exposure." },
  "Auto & Truck": { defaultIsmSector: "Transportation Equipment", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Cyclical vehicle benchmark.", relatedSecondaryBenchmarks: ["Auto Parts", "Transportation"], fallbackBenchmark: "Total Market (without financials)" },
  "Auto Parts": { defaultIsmSector: "Transportation Equipment", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Auto supply-chain cyclicality." },
  "Beverage (Alcoholic)": { defaultIsmSector: "Food, Beverage & Tobacco Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Defensive with category review." },
  "Beverage (Soft)": { defaultIsmSector: "Food, Beverage & Tobacco Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Defensive with category review." },
  Broadcasting: { defaultIsmSector: "Information", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Information/media mapping." },
  "Building Materials": { defaultIsmSector: "Nonmetallic Mineral Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Construction-cycle review." },
  "Cable TV": { defaultIsmSector: "Information", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Information benchmark." },
  "Chemical (Basic)": { defaultIsmSector: "Chemical Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Commodity-sensitive chemicals." },
  "Chemical (Diversified)": { defaultIsmSector: "Chemical Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Diversified chemical mapping." },
  "Chemical (Specialty)": { defaultIsmSector: "Chemical Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Specialty chemical mapping." },
  "Computers/Peripherals": { defaultIsmSector: "Computer & Electronic Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Hardware-oriented benchmark." },
  Education: { defaultIsmSector: "Educational Services", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Ready", status: "OK", notes: "Narrow direct benchmark mapping." },
  "Electrical Equipment": { defaultIsmSector: "Electrical Equipment, Appliances & Components", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Industrial/electrical mix review." },
  "Electronics (Consumer & Office)": { defaultIsmSector: "Computer & Electronic Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Consumer vs enterprise mix review." },
  "Electronics (General)": { defaultIsmSector: "Computer & Electronic Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "General electronics benchmark." },
  "Engineering/Construction": { defaultIsmSector: "Construction", alternatives: [], operatingCoStatus: "Review Required", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Cyclical construction benchmark." },
  Entertainment: { defaultIsmSector: "Arts, Entertainment & Recreation", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Content/business-model review needed." },
  "Farming/Agriculture": { defaultIsmSector: "Agriculture, Forestry, Fishing & Hunting", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Commodity/weather exposure review." },
  "Food Processing": { defaultIsmSector: "Food, Beverage & Tobacco Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Direct food processing candidate." },
  "Food Wholesalers": { defaultIsmSector: "Wholesale Trade", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Wholesale distribution mapping." },
  "Furn/Home Furnishings": { defaultIsmSector: "Furniture & Related Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Ready", status: "OK", notes: "Narrow direct furnishings benchmark." },
  "Hotel/Gaming": { defaultIsmSector: "Accommodation & Food Services", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Travel/leisure cycle review." },
  "Information Services": { defaultIsmSector: "Information", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Ready", status: "OK", notes: "Direct information-services benchmark." },
  Machinery: { defaultIsmSector: "Machinery", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Ready", status: "OK", notes: "Narrow machinery benchmark." },
  "Oil/Gas (Integrated)": { defaultIsmSector: "Petroleum & Coal Products", alternatives: [], operatingCoStatus: "Review Required", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Commodity-cycle review.", relatedSecondaryBenchmarks: ["Oil/Gas (Production and Exploration)", "Oilfield Svcs/Equip."], fallbackBenchmark: "Total Market (without financials)" },
  "Oil/Gas (Production and Exploration)": { defaultIsmSector: "Petroleum & Coal Products", alternatives: [], operatingCoStatus: "Review Required", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Commodity-cycle review." },
  "Oilfield Svcs/Equip.": { defaultIsmSector: "Petroleum & Coal Products", alternatives: [], operatingCoStatus: "Review Required", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Energy capex cycle review." },
  Power: { defaultIsmSector: "Utilities", alternatives: [], operatingCoStatus: "Review Required", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Regulated utility review." },
  "Publishing & Newspapers": { defaultIsmSector: "Printing & Related Support Activities", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Print/media transition review." },
  "Restaurant/Dining": { defaultIsmSector: "Accommodation & Food Services", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Consumer discretionary sensitivity." },
  "Retail (Automotive)": { defaultIsmSector: "Retail Trade", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Retail subcategory mapping." },
  "Retail (Building Supply)": { defaultIsmSector: "Retail Trade", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Retail subcategory mapping." },
  "Retail (Distributors)": { defaultIsmSector: "Retail Trade", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Distribution-heavy retail mapping." },
  "Retail (General)": { defaultIsmSector: "Retail Trade", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Broadline retail mapping." },
  "Retail (Grocery and Food)": { defaultIsmSector: "Retail Trade", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Grocery retail mapping." },
  "Retail (Special Lines)": { defaultIsmSector: "Retail Trade", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Specialty retail mapping." },
  "Rubber& Tires": { defaultIsmSector: "Plastics & Rubber Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Manufacturing-cycle review." },
  Semiconductor: { defaultIsmSector: "Computer & Electronic Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Semiconductor cycle review." },
  "Semiconductor Equip": { defaultIsmSector: "Computer & Electronic Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Semi capex-cycle review." },
  "Shipbuilding & Marine": { defaultIsmSector: "Transportation Equipment", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Cyclical transport-equipment mapping." },
  Shoe: { defaultIsmSector: "Apparel, Leather & Allied Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Apparel/leather subgroup mapping." },
  "Software (Entertainment)": { defaultIsmSector: "Arts, Entertainment & Recreation", alternatives: ["Information"], operatingCoStatus: "Supported", mappingConfidence: "Medium", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Entertainment software can also fit Information depending model." },
  "Software (Internet)": { defaultIsmSector: "Information", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Internet software mapping." },
  "Software (System & Application)": { defaultIsmSector: "Information", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Primary information benchmark.", relatedSecondaryBenchmarks: ["Computer Services", "Software (Internet)"], fallbackBenchmark: "Information Services" },
  Steel: { defaultIsmSector: "Primary Metals", alternatives: ["Mining"], operatingCoStatus: "Review Required", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Commodity-cycle and upstream/downstream mix review." },
  "Telecom (Wireless)": { defaultIsmSector: "Information", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Telecom services under information classification." },
  "Telecom. Equipment": { defaultIsmSector: "Computer & Electronic Products", alternatives: ["Information"], operatingCoStatus: "Supported", mappingConfidence: "Medium", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Hardware/software boundary can vary." },
  "Telecom. Services": { defaultIsmSector: "Information", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Information/communications benchmark." },
  Tobacco: { defaultIsmSector: "Food, Beverage & Tobacco Products", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Subcategory-specific review still required." },
  Transportation: { defaultIsmSector: "Transportation & Warehousing", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Transport-cycle exposure." },
  "Transportation (Railroads)": { defaultIsmSector: "Transportation & Warehousing", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Rail-specific transport benchmark." },
  Trucking: { defaultIsmSector: "Transportation & Warehousing", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Freight-cycle sensitivity." },
  "Utility (General)": { defaultIsmSector: "Utilities", alternatives: [], operatingCoStatus: "Review Required", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Regulated utility profile review.", relatedSecondaryBenchmarks: ["Utility (Water)", "Power"], fallbackBenchmark: "Total Market (without financials)" },
  "Utility (Water)": { defaultIsmSector: "Utilities", alternatives: [], operatingCoStatus: "Review Required", mappingConfidence: "High", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Utility subgroup mapping." },
  "Business & Consumer Services": { defaultIsmSector: "Management of Companies & Support Services", alternatives: ["Professional, Scientific & Technical Services"], operatingCoStatus: "Review Required", mappingConfidence: "Review Required", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Broad category, requires analyst judgment." },
  "Computer Services": { defaultIsmSector: "Professional, Scientific & Technical Services", alternatives: ["Information"], operatingCoStatus: "Review Required", mappingConfidence: "Review Required", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Tech-service mix requires review." },
  "Coal & Related Energy": { defaultIsmSector: "Petroleum & Coal Products", alternatives: ["Mining"], operatingCoStatus: "Review Required", mappingConfidence: "Review Required", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Ambiguous energy/mining boundary." },
  "Construction Supplies": { defaultIsmSector: "Fabricated Metal Products", alternatives: ["Nonmetallic Mineral Products"], operatingCoStatus: "Review Required", mappingConfidence: "Review Required", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Material composition requires analyst review." },
  Diversified: { defaultIsmSector: "Custom / Other Operating Co", alternatives: ["Management of Companies & Support Services"], operatingCoStatus: "Review Required", mappingConfidence: "Low", mappingReviewFlag: "Mapping Required", status: "Mapping Required", notes: "Too broad for clean default mapping." },
  "Drugs (Biotechnology)": { defaultIsmSector: "Health Care & Social Assistance", alternatives: ["Chemical Products"], operatingCoStatus: "Review Required", mappingConfidence: "Low", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Biotech/pharma boundary requires review." },
  "Drugs (Pharmaceutical)": { defaultIsmSector: "Health Care & Social Assistance", alternatives: ["Chemical Products"], operatingCoStatus: "Review Required", mappingConfidence: "Low", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Pharma classification requires analyst review." },
  "Environmental & Waste Services": { defaultIsmSector: "Other Services", alternatives: ["Utilities"], operatingCoStatus: "Review Required", mappingConfidence: "Low", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Service vs utility overlap." },
  "Green & Renewable Energy": { defaultIsmSector: "Utilities", alternatives: ["Electrical Equipment, Appliances & Components"], operatingCoStatus: "Review Required", mappingConfidence: "Low", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Generation vs equipment split requires review." },
  "Healthcare Products": { defaultIsmSector: "Health Care & Social Assistance", alternatives: ["Miscellaneous Manufacturing"], operatingCoStatus: "Review Required", mappingConfidence: "Low", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Products/services split requires review." },
  "Healthcare Information and Technology": { defaultIsmSector: "Information", alternatives: ["Health Care & Social Assistance"], operatingCoStatus: "Review Required", mappingConfidence: "Low", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Cross-sector benchmark by business model." },
  "Household Products": { defaultIsmSector: "Chemical Products", alternatives: ["Miscellaneous Manufacturing"], operatingCoStatus: "Review Required", mappingConfidence: "Low", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Consumer staples vs manufacturing profile review." },
  "Metals & Mining": { defaultIsmSector: "Primary Metals", alternatives: ["Mining"], operatingCoStatus: "Review Required", mappingConfidence: "Review Required", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Commodity and extraction/processing mix." },
  "Office Equipment & Services": { defaultIsmSector: "Miscellaneous Manufacturing", alternatives: ["Business & Consumer Services"], operatingCoStatus: "Review Required", mappingConfidence: "Low", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Product/service mix ambiguity." },
  "Oil/Gas Distribution": { defaultIsmSector: "Transportation & Warehousing", alternatives: ["Utilities"], operatingCoStatus: "Review Required", mappingConfidence: "Low", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Distribution utility vs transport profile review." },
  "Packaging & Container": { defaultIsmSector: "Paper Products", alternatives: ["Fabricated Metal Products"], operatingCoStatus: "Review Required", mappingConfidence: "Low", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Material mix ambiguity." },
  "Paper/Forest Products": { defaultIsmSector: "Paper Products", alternatives: ["Wood Products"], operatingCoStatus: "Review Required", mappingConfidence: "Review Required", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Paper vs wood operations mix review." },
  "Precious Metals": { defaultIsmSector: "Mining", alternatives: ["Primary Metals"], operatingCoStatus: "Review Required", mappingConfidence: "Review Required", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Mining processing boundary review." },
  Recreation: { defaultIsmSector: "Arts, Entertainment & Recreation", alternatives: [], operatingCoStatus: "Supported", mappingConfidence: "Medium", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Business model heterogeneity." },
  "Total Market": { defaultIsmSector: "Custom / Other Operating Co", alternatives: [], operatingCoStatus: "Review Required", mappingConfidence: "Review Required", mappingReviewFlag: "Mapping Required", status: "Mapping Required", notes: "Reference aggregate only; not a direct operating benchmark." },
  "Total Market (without financials)": { defaultIsmSector: "Custom / Other Operating Co", alternatives: [], operatingCoStatus: "Review Required", mappingConfidence: "Review Required", mappingReviewFlag: "Mapping Required", status: "Mapping Required", notes: "Fallback/reference aggregate only." },
  "Retail (REITs)": { defaultIsmSector: "Real Estate, Rental & Leasing", alternatives: ["Retail Trade"], operatingCoStatus: "Excluded / Special Review", mappingConfidence: "Review Required", mappingReviewFlag: "Excluded / Special Review", status: "Excluded / Special Review", notes: "REIT/NAV profile not standard Operating Co." },
  "R.E.I.T.": { defaultIsmSector: "Real Estate, Rental & Leasing", alternatives: [], operatingCoStatus: "Excluded / Special Review", mappingConfidence: "Review Required", mappingReviewFlag: "Excluded / Special Review", status: "Excluded / Special Review", notes: "REIT/NAV profile not standard Operating Co." },
  "Real Estate (Development)": { defaultIsmSector: "Real Estate, Rental & Leasing", alternatives: [], operatingCoStatus: "Excluded / Special Review", mappingConfidence: "Review Required", mappingReviewFlag: "Excluded / Special Review", status: "Excluded / Special Review", notes: "Real estate development requires special review." },
  "Real Estate (General/Diversified)": { defaultIsmSector: "Real Estate, Rental & Leasing", alternatives: [], operatingCoStatus: "Excluded / Special Review", mappingConfidence: "Review Required", mappingReviewFlag: "Excluded / Special Review", status: "Excluded / Special Review", notes: "NAV-driven real estate outside normal template." },
  "Real Estate (Operations & Services)": { defaultIsmSector: "Real Estate, Rental & Leasing", alternatives: [], operatingCoStatus: "Review Required", mappingConfidence: "Low", mappingReviewFlag: "Review Required", status: "Review Required", notes: "Operational services may be exception cases; analyst review needed." },
  "Bank (Money Center)": { defaultIsmSector: "Finance & Insurance", alternatives: [], operatingCoStatus: "Excluded / Special Review", mappingConfidence: "High", mappingReviewFlag: "Excluded / Special Review", status: "Excluded / Special Review", notes: "Financial sector exclusion policy." },
  "Banks (Regional)": { defaultIsmSector: "Finance & Insurance", alternatives: [], operatingCoStatus: "Excluded / Special Review", mappingConfidence: "High", mappingReviewFlag: "Excluded / Special Review", status: "Excluded / Special Review", notes: "Financial sector exclusion policy." },
  "Brokerage & Investment Banking": { defaultIsmSector: "Finance & Insurance", alternatives: [], operatingCoStatus: "Excluded / Special Review", mappingConfidence: "High", mappingReviewFlag: "Excluded / Special Review", status: "Excluded / Special Review", notes: "Financial sector exclusion policy." },
  "Financial Svcs. (Non-bank & Insurance)": { defaultIsmSector: "Finance & Insurance", alternatives: [], operatingCoStatus: "Excluded / Special Review", mappingConfidence: "High", mappingReviewFlag: "Excluded / Special Review", status: "Excluded / Special Review", notes: "Financial sector exclusion policy." },
  "Insurance (General)": { defaultIsmSector: "Finance & Insurance", alternatives: [], operatingCoStatus: "Excluded / Special Review", mappingConfidence: "High", mappingReviewFlag: "Excluded / Special Review", status: "Excluded / Special Review", notes: "Financial sector exclusion policy." },
  "Insurance (Life)": { defaultIsmSector: "Finance & Insurance", alternatives: [], operatingCoStatus: "Excluded / Special Review", mappingConfidence: "High", mappingReviewFlag: "Excluded / Special Review", status: "Excluded / Special Review", notes: "Financial sector exclusion policy." },
  "Insurance (Prop/Cas.)": { defaultIsmSector: "Finance & Insurance", alternatives: [], operatingCoStatus: "Excluded / Special Review", mappingConfidence: "High", mappingReviewFlag: "Excluded / Special Review", status: "Excluded / Special Review", notes: "Financial sector exclusion policy." },
  "Investments & Asset Management": { defaultIsmSector: "Finance & Insurance", alternatives: [], operatingCoStatus: "Excluded / Special Review", mappingConfidence: "High", mappingReviewFlag: "Excluded / Special Review", status: "Excluded / Special Review", notes: "Financial sector exclusion policy." },
  Reinsurance: { defaultIsmSector: "Finance & Insurance", alternatives: [], operatingCoStatus: "Excluded / Special Review", mappingConfidence: "High", mappingReviewFlag: "Excluded / Special Review", status: "Excluded / Special Review", notes: "Financial sector exclusion policy." },
};

function pickCoverageStatus(
  benchmark: string,
  coverageMap: Map<string, DamodaranDatasetCoverageRow>,
): DamodaranBenchmarkToIsmSectorRow["benchmarkCoverageStatus"] {
  const coverage = coverageMap.get(benchmark);
  if (!coverage) {
    return "Unknown";
  }
  return coverage.coverageStatus;
}

export async function generateBenchmarkToIsmSectorCandidates(params: {
  ismRows: ISMSectorRow[];
  helperMappings: SectorIndustryMappingRow[];
  existingBenchmarkRows?: DamodaranBenchmarkToIsmSectorRow[];
  overwrite?: boolean;
}) {
  const overwrite = params.overwrite ?? false;
  const now = new Date().toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];

  await refreshCanonicalDamodaranIndustryList();
  const canonical = await getCanonicalDamodaranIndustries();
  const coverage = await getDamodaranCoverageMatrix();
  const canonicalOnly = canonical.data.filter((row) => row.isCanonical);
  const variantRows = canonical.data.filter((row) => !row.isCanonical);
  const canonicalBenchmarkNames = new Set(canonicalOnly.map((row) => row.industryName));

  const coverageMap = new Map(coverage.data.map((row) => [row.industryName, row]));
  const ismSet = new Set(params.ismRows.map((row) => row.ismSector));
  const existingByBenchmark = new Map(
    (params.existingBenchmarkRows ?? []).map((row) => [row.damodaranIndustrialBenchmark, row]),
  );
  const helperByPrimary = new Map<string, SectorIndustryMappingRow[]>();
  const helperByIsmSector = new Map<string, SectorIndustryMappingRow>();
  for (const helper of params.helperMappings) {
    helperByIsmSector.set(helper.ismSector, helper);
    if (!helper.primaryDamodaranIndustrialBenchmark) continue;
    const arr = helperByPrimary.get(helper.primaryDamodaranIndustrialBenchmark) ?? [];
    arr.push(helper);
    helperByPrimary.set(helper.primaryDamodaranIndustrialBenchmark, arr);
  }

  const rows: DamodaranBenchmarkToIsmSectorRow[] = [];
  let highConfidenceCount = 0;
  let mediumConfidenceCount = 0;
  let lowConfidenceCount = 0;
  let reviewRequiredCount = 0;
  let excludedSpecialReviewCount = 0;
  let unmappedCount = 0;
  let stageDefaultsPopulated = 0;
  let cyclicalityDefaultsPopulated = 0;
  let historyDefaultsPopulated = 0;

  for (const masterRow of canonicalOnly) {
    const benchmark = masterRow.industryName;
    const existing = existingByBenchmark.get(benchmark);
    const definition = benchmarkCandidateInput[benchmark];
    const helperCandidates = helperByPrimary.get(benchmark) ?? [];

    const fallbackFromHelper = helperCandidates[0]?.ismSector ?? null;
    const inferredDefinition: BenchmarkCandidateDefinition = definition ?? {
      defaultIsmSector: isFinancialLike(benchmark)
        ? "Finance & Insurance"
        : isRealEstateLike(benchmark)
          ? "Real Estate, Rental & Leasing"
          : fallbackFromHelper && ismSet.has(fallbackFromHelper)
            ? fallbackFromHelper
            : "Custom / Other Operating Co",
      alternatives: helperCandidates
        .slice(1)
        .map((item) => item.ismSector)
        .filter((sector, idx, arr) => arr.indexOf(sector) === idx),
      operatingCoStatus: isFinancialLike(benchmark)
        ? "Excluded / Special Review"
        : isRealEstateLike(benchmark)
          ? "Excluded / Special Review"
          : fallbackFromHelper
            ? "Review Required"
            : "Review Required",
      mappingConfidence: fallbackFromHelper ? "Low" : "Review Required",
      mappingReviewFlag:
        isFinancialLike(benchmark) || isRealEstateLike(benchmark)
          ? "Excluded / Special Review"
          : fallbackFromHelper
            ? "Review Required"
            : "Mapping Required",
      status:
        isFinancialLike(benchmark) || isRealEstateLike(benchmark)
          ? "Excluded / Special Review"
          : fallbackFromHelper
            ? "Review Required"
            : "Mapping Required",
      notes: "Generated from benchmark-first correction logic. Requires analyst validation.",
    };

    const candidateDefault = inferredDefinition.defaultIsmSector;
    const defaultIsmSector = candidateDefault && ismSet.has(candidateDefault) ? candidateDefault : null;
    const alternatives = inferredDefinition.alternatives.filter((item) => ismSet.has(item));
    const helperForDefaultIsm = defaultIsmSector ? helperByIsmSector.get(defaultIsmSector) : undefined;
    const engineDefaults: BenchmarkEngineDefaults = getBenchmarkEngineDefaults(benchmark);
    const coverageForBenchmark = coverageMap.get(benchmark);
    const pullKeys = buildBenchmarkPullKeys(benchmark, coverageForBenchmark);

    let status = inferredDefinition.status;
    let reviewFlag = inferredDefinition.mappingReviewFlag;
    if (!defaultIsmSector) {
      unmappedCount += 1;
      status = "Mapping Required";
      reviewFlag = "Mapping Required";
      warnings.push(`${benchmark}: no valid ISM-sector default candidate; mapped as review-required.`);
    }

    if (isFinancialLike(benchmark)) {
      status = "Excluded / Special Review";
      reviewFlag = "Excluded / Special Review";
    }
    if (isRealEstateLike(benchmark)) {
      status = inferredDefinition.status === "Review Required" ? "Review Required" : "Excluded / Special Review";
      reviewFlag = status === "Excluded / Special Review" ? "Excluded / Special Review" : "Review Required";
    }

    const row: DamodaranBenchmarkToIsmSectorRow = {
      id: `benchmark_to_ism_${normalize(benchmark).replace(/[^a-z0-9]+/g, "_")}`,
      damodaranIndustrialBenchmark: benchmark,
      damodaranIndustryBenchmark: benchmark,
      normalizedDamodaranIndustrialBenchmark: normalize(benchmark),
      normalizedBenchmarkName: normalize(benchmark),
      defaultIsmSector,
      alternativeIsmSectors: alternatives,
      ismDisplaySector: defaultIsmSector,
      ismDisplaySectorAlternatives: alternatives,
      operatingCoStatus:
        status === "Excluded / Special Review"
          ? "Excluded / Special Review"
          : inferredDefinition.operatingCoStatus,
      eligibilityStatus:
        status === "Excluded / Special Review"
          ? "Excluded / Special Review"
          : inferredDefinition.operatingCoStatus,
      mappingConfidence: inferredDefinition.mappingConfidence,
      mappingReviewFlag: reviewFlag,
      reviewFlag,
      status,
      benchmarkValid: true,
      benchmarkCoverageStatus: pickCoverageStatus(benchmark, coverageMap),
      defaultModelMode:
        status === "Excluded / Special Review"
          ? "Not Applicable"
          : engineDefaults.defaultStageType,
      historyRecommendation: engineDefaults.defaultHistoryRequirement,
      normalizationNeed: engineDefaults.defaultNormalizationNeed,
      assetIntensity: inferAssetIntensity(benchmark),
      regulatoryFlag: inferRegulatoryFlag(benchmark),
      benchmarkUse:
        "Primary benchmark anchor for risk/margin/ROC/reinvestment/tax/WACC sanity and dashboard industry display.",
      relatedSecondaryBenchmarks: validateBenchmarkList(
        [
          ...(inferredDefinition.relatedSecondaryBenchmarks ?? []),
          ...(helperForDefaultIsm?.secondaryDamodaranIndustrialBenchmark
            ? [helperForDefaultIsm.secondaryDamodaranIndustrialBenchmark]
            : []),
        ],
        canonicalBenchmarkNames,
      ),
      fallbackBenchmark: canonicalBenchmarkNames.has(
        inferredDefinition.fallbackBenchmark ??
          helperForDefaultIsm?.fallbackDamodaranIndustrialBenchmark ??
          "",
      )
        ? inferredDefinition.fallbackBenchmark ??
          helperForDefaultIsm?.fallbackDamodaranIndustrialBenchmark ??
          null
        : null,
      defaultStageType:
        helperForDefaultIsm?.defaultStageType && helperForDefaultIsm.defaultStageType.length > 0
          ? helperForDefaultIsm.defaultStageType
          : engineDefaults.defaultStageType,
      cyclicalityFlag:
        helperForDefaultIsm?.cyclicalityFlag && helperForDefaultIsm.cyclicalityFlag.length > 0
          ? helperForDefaultIsm.cyclicalityFlag
          : engineDefaults.cyclicalityFlag,
      defaultHistoryRequirement: engineDefaults.defaultHistoryRequirement,
      defaultNormalizationNeed: engineDefaults.defaultNormalizationNeed,
      defaultStableMarginRule:
        helperForDefaultIsm?.defaultStableMarginRule && helperForDefaultIsm.defaultStableMarginRule.length > 0
          ? helperForDefaultIsm.defaultStableMarginRule
          : engineDefaults.defaultStableMarginRule,
      defaultStableRocRule:
        helperForDefaultIsm?.defaultStableRocRule && helperForDefaultIsm.defaultStableRocRule.length > 0
          ? helperForDefaultIsm.defaultStableRocRule
          : engineDefaults.defaultStableRocRule,
      defaultSalesToCapitalRule:
        helperForDefaultIsm?.defaultSalesToCapitalRule &&
        helperForDefaultIsm.defaultSalesToCapitalRule.length > 0
          ? helperForDefaultIsm.defaultSalesToCapitalRule
          : engineDefaults.defaultSalesToCapitalRule,
      forecastFadeRuleHint: engineDefaults.forecastFadeRuleHint,
      terminalReadinessHint: engineDefaults.terminalReadinessHint,
      sectorWarning:
        helperForDefaultIsm?.sectorWarning && helperForDefaultIsm.sectorWarning.length > 0
          ? helperForDefaultIsm.sectorWarning
          : engineDefaults.sectorWarning,
      requiredReviewReason: engineDefaults.requiredReviewReason,
      engineDefaultSource: helperForDefaultIsm ? "ISM helper-derived" : engineDefaults.engineDefaultSource,
      ...pullKeys,
      pricingSanityOnly: true,
      sourceName: "Operating Co Template — Master Specification v1.5",
      sourceUrl: "internal://operating-co-template-master-spec-v1.5",
      sourceUpdateDate: "2026-05-26",
      sourceBasis: SOURCE_BASIS,
      importedLastUpdated: now,
      createdAt: now,
      updatedAt: now,
      mappingDirection: "BENCHMARK_TO_ISM_PRIMARY",
      notes: inferredDefinition.notes,
    };

    if (existing && !overwrite) {
      if (!masterRow.isCanonical && masterRow.possibleCanonicalMatch) {
        warnings.push(
          `${benchmark}: non-canonical benchmark variant should map to ${masterRow.possibleCanonicalMatch}.`,
        );
      }
      rows.push({
        ...row,
        damodaranIndustryBenchmark: existing.damodaranIndustryBenchmark ?? row.damodaranIndustryBenchmark,
        normalizedBenchmarkName: existing.normalizedBenchmarkName ?? row.normalizedBenchmarkName,
        ismDisplaySector: existing.ismDisplaySector ?? row.ismDisplaySector,
        ismDisplaySectorAlternatives:
          existing.ismDisplaySectorAlternatives && existing.ismDisplaySectorAlternatives.length > 0
            ? existing.ismDisplaySectorAlternatives
            : row.ismDisplaySectorAlternatives,
        defaultIsmSector: existing.defaultIsmSector ?? row.defaultIsmSector,
        alternativeIsmSectors:
          existing.alternativeIsmSectors.length > 0
            ? existing.alternativeIsmSectors
            : row.alternativeIsmSectors,
        operatingCoStatus: existing.operatingCoStatus,
        eligibilityStatus: existing.eligibilityStatus ?? row.eligibilityStatus,
        mappingConfidence: existing.mappingConfidence,
        mappingReviewFlag: existing.mappingReviewFlag,
        reviewFlag: existing.reviewFlag ?? row.reviewFlag,
        status: existing.status,
        defaultModelMode: existing.defaultModelMode ?? row.defaultModelMode,
        historyRecommendation: existing.historyRecommendation ?? row.historyRecommendation,
        normalizationNeed: existing.normalizationNeed ?? row.normalizationNeed,
        assetIntensity: existing.assetIntensity ?? row.assetIntensity,
        regulatoryFlag: existing.regulatoryFlag ?? row.regulatoryFlag,
        benchmarkUse: existing.benchmarkUse ?? row.benchmarkUse,
        relatedSecondaryBenchmarks:
          existing.relatedSecondaryBenchmarks && existing.relatedSecondaryBenchmarks.length > 0
            ? existing.relatedSecondaryBenchmarks
            : row.relatedSecondaryBenchmarks,
        fallbackBenchmark: existing.fallbackBenchmark ?? row.fallbackBenchmark ?? null,
        defaultStageType: existing.defaultStageType ?? row.defaultStageType,
        cyclicalityFlag: existing.cyclicalityFlag ?? row.cyclicalityFlag,
        defaultHistoryRequirement:
          existing.defaultHistoryRequirement ?? row.defaultHistoryRequirement,
        defaultNormalizationNeed:
          existing.defaultNormalizationNeed ?? row.defaultNormalizationNeed,
        defaultStableMarginRule:
          existing.defaultStableMarginRule ?? row.defaultStableMarginRule,
        defaultStableRocRule: existing.defaultStableRocRule ?? row.defaultStableRocRule,
        defaultSalesToCapitalRule:
          existing.defaultSalesToCapitalRule ?? row.defaultSalesToCapitalRule,
        forecastFadeRuleHint: existing.forecastFadeRuleHint ?? row.forecastFadeRuleHint,
        terminalReadinessHint: existing.terminalReadinessHint ?? row.terminalReadinessHint,
        sectorWarning: existing.sectorWarning ?? row.sectorWarning,
        requiredReviewReason: existing.requiredReviewReason ?? row.requiredReviewReason,
        engineDefaultSource: existing.engineDefaultSource ?? row.engineDefaultSource,
        betaTableKey: existing.betaTableKey ?? row.betaTableKey,
        marginTableKey: existing.marginTableKey ?? row.marginTableKey,
        rocRoicTableKey: existing.rocRoicTableKey ?? row.rocRoicTableKey,
        reinvestmentSalesToCapitalTableKey:
          existing.reinvestmentSalesToCapitalTableKey ?? row.reinvestmentSalesToCapitalTableKey,
        workingCapitalTableKey: existing.workingCapitalTableKey ?? row.workingCapitalTableKey,
        taxTableKey: existing.taxTableKey ?? row.taxTableKey,
        waccCostOfCapitalSanityKey:
          existing.waccCostOfCapitalSanityKey ?? row.waccCostOfCapitalSanityKey,
        multiplesSanityKey: existing.multiplesSanityKey ?? row.multiplesSanityKey,
        pricingSanityOnly: existing.pricingSanityOnly ?? row.pricingSanityOnly,
        sourceName: existing.sourceName ?? row.sourceName,
        sourceUrl: existing.sourceUrl ?? row.sourceUrl,
        sourceUpdateDate: existing.sourceUpdateDate ?? row.sourceUpdateDate,
        createdAt: existing.createdAt ?? row.createdAt,
        updatedAt: now,
        notes: existing.notes,
      });
    } else {
      rows.push(row);
    }

    const finalConfidence = rows[rows.length - 1].mappingConfidence;
    if (rows[rows.length - 1].status === "Excluded / Special Review") {
      excludedSpecialReviewCount += 1;
    } else if (rows[rows.length - 1].status === "Review Required") {
      reviewRequiredCount += 1;
    } else if (rows[rows.length - 1].status === "Mapping Required") {
      reviewRequiredCount += 1;
    }

    if (finalConfidence === "High") highConfidenceCount += 1;
    if (finalConfidence === "Medium") mediumConfidenceCount += 1;
    if (finalConfidence === "Low") lowConfidenceCount += 1;
    if (finalConfidence === "Review Required") reviewRequiredCount += 0;

    const finalRow = rows[rows.length - 1];
    if (finalRow.defaultStageType && finalRow.defaultStageType.length > 0) {
      stageDefaultsPopulated += 1;
    }
    if (finalRow.cyclicalityFlag && finalRow.cyclicalityFlag.length > 0) {
      cyclicalityDefaultsPopulated += 1;
    }
    if (finalRow.defaultHistoryRequirement && finalRow.defaultHistoryRequirement.length > 0) {
      historyDefaultsPopulated += 1;
    }
  }

  if (canonicalOnly.length === 0) {
    errors.push("Canonical Damodaran Industry list is empty; benchmark-first mapping cannot be generated.");
  }

  return {
    rows,
    summary: {
      success: errors.length === 0,
      rawIndustryCount: canonical.data.length,
      canonicalIndustryCount: canonicalOnly.length,
      variantsExcluded: variantRows.filter((row) => row.canonicalStatus === "Duplicate / Variant").length,
      nonIndustryExcluded: variantRows.filter(
        (row) => row.canonicalStatus === "Excluded Non-Industry",
      ).length,
      benchmarksEvaluated: canonicalOnly.length,
      mappingsGenerated: rows.length,
      highConfidenceCount,
      mediumConfidenceCount,
      lowConfidenceCount,
      stageDefaultsPopulated,
      cyclicalityDefaultsPopulated,
      historyDefaultsPopulated,
      reviewRequiredCount,
      excludedSpecialReviewCount,
      unmappedCount,
      warnings,
      errors,
    },
  };
}
