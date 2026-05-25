export type ReviewSeverity =
  | "Info"
  | "Watch"
  | "Review Required"
  | "Not Ready"
  | "Excluded / Special Review";

export type ReviewCategory =
  | "Forecast Quality"
  | "Fade Quality"
  | "Terminal Readiness"
  | "Financial Health"
  | "Business Quality"
  | "Share Count Review"
  | "SBC Dilution Review"
  | "Currency Review"
  | "Data Completeness"
  | "Governance";

export interface ReviewFlag {
  category: ReviewCategory;
  severity: ReviewSeverity;
  note: string;
  isOverride?: boolean;
}

export type CategoryReviewStatus = Record<ReviewCategory, ReviewSeverity>;

export interface WorstFlagWinsResult {
  worstSeverity: ReviewSeverity;
  contributingCategories: ReviewCategory[];
  categoryStatuses: CategoryReviewStatus;
  note: string;
}
