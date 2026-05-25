import "server-only";

export interface FredObservationResult {
  ok: boolean;
  seriesId: string;
  observationDate?: string;
  rawValue?: string;
  decimalValue?: number;
  sourceUrl?: string;
  sourceName: "FRED";
  error?: string;
}

interface FredObservation {
  date: string;
  value: string;
}

interface FredObservationResponse {
  observations?: FredObservation[];
}

export async function fetchLatestFredObservation(
  seriesId: string,
): Promise<FredObservationResult> {
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      seriesId,
      sourceName: "FRED",
      error: "FRED_API_KEY is not configured.",
    };
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    sort_order: "desc",
    limit: "10",
  });

  const sourceUrl = `https://fred.stlouisfed.org/series/${seriesId}`;
  const endpoint = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        seriesId,
        sourceName: "FRED",
        sourceUrl,
        error: `FRED request failed with status ${response.status}.`,
      };
    }

    const data = (await response.json()) as FredObservationResponse;
    const observations = data.observations ?? [];

    const validObservation = observations.find((observation) => {
      if (observation.value === ".") {
        return false;
      }
      const numeric = Number(observation.value);
      return Number.isFinite(numeric);
    });

    if (!validObservation) {
      return {
        ok: false,
        seriesId,
        sourceName: "FRED",
        sourceUrl,
        error: "No valid numeric observation available from FRED.",
      };
    }

    const rawValue = validObservation.value;
    const decimalValue = Number(rawValue) / 100;

    if (!Number.isFinite(decimalValue)) {
      return {
        ok: false,
        seriesId,
        sourceName: "FRED",
        sourceUrl,
        error: "FRED value conversion failed.",
      };
    }

    return {
      ok: true,
      seriesId,
      observationDate: validObservation.date,
      rawValue,
      decimalValue,
      sourceUrl,
      sourceName: "FRED",
    };
  } catch (error) {
    return {
      ok: false,
      seriesId,
      sourceName: "FRED",
      sourceUrl,
      error: error instanceof Error ? error.message : "Unknown FRED client error.",
    };
  }
}
