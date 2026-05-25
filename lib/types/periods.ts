export type ExtendedHistoricalPeriod =
  | "YEAR_MINUS_10"
  | "YEAR_MINUS_9"
  | "YEAR_MINUS_8"
  | "YEAR_MINUS_7"
  | "YEAR_MINUS_6"
  | "YEAR_MINUS_5";

export type CoreHistoricalPeriod =
  | "YEAR_MINUS_4"
  | "YEAR_MINUS_3"
  | "YEAR_MINUS_2"
  | "LATEST_FY"
  | "LTM";

export type HistoricalPeriod = ExtendedHistoricalPeriod | CoreHistoricalPeriod;

export type CoreForecastPeriod = "YEAR_PLUS_1" | "YEAR_PLUS_2" | "YEAR_PLUS_3";
export type OptionalForecastPeriod = "YEAR_PLUS_4" | "YEAR_PLUS_5";
export type ExtendedForecastPeriod =
  | "YEAR_PLUS_6"
  | "YEAR_PLUS_7"
  | "YEAR_PLUS_8"
  | "YEAR_PLUS_9"
  | "YEAR_PLUS_10"
  | "YEAR_PLUS_11"
  | "YEAR_PLUS_12"
  | "YEAR_PLUS_13"
  | "YEAR_PLUS_14"
  | "YEAR_PLUS_15";

export type ForecastPeriod =
  | CoreForecastPeriod
  | OptionalForecastPeriod
  | ExtendedForecastPeriod;

export type HistoricalPeriodValueMap<T> = Partial<
  Record<ExtendedHistoricalPeriod, T>
> &
  Record<CoreHistoricalPeriod, T>;

export type ForecastPeriodValueMap<T> = Record<CoreForecastPeriod, T> &
  Partial<Record<OptionalForecastPeriod | ExtendedForecastPeriod, T>>;
