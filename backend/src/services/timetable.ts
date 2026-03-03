import { Request, Response } from "express";
import { getSchedules } from "./plkApi";

// ==================
// KONFIGURACJA
// ==================
const STATION_ID = 22004; // Ostróda
const BUFFER_BEFORE_MIN = 6;
const BUFFER_AFTER_MIN = 3;

// ==================
// CACHE
// ==================
let cachedData: any = null;
let lastFetch: number = 0;
const CACHE_TTL = 60_000; // 1 minuta w ms

// ==================
// HELPERY
// ==================
function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function buildDate(dateStr: string, timeStr: string) {
  return new Date(`${dateStr.slice(0, 10)}T${timeStr}`);
}

// ==================
// ENDPOINT
// ==================
export async function getStatus(req: Request, res: Response) {
  const now = new Date();
  const apiKey = process.env.PLK_API_KEY!;
  const today = now.toISOString().slice(0, 10);

  try {
    // ==================
    // SPRAWDZAMY CACHE
    // ==================
    if (!cachedData || Date.now() - lastFetch > CACHE_TTL) {
      const data: any = await getSchedules(apiKey, STATION_ID.toString(), today);
      cachedData = data;
      lastFetch = Date.now();
    }

    const routes = cachedData.routes || [];

    // ==================
    // WYCIĄGAMY POCIĄGI OSOBOWE
    // ==================
    const trains = routes
      .flatMap((r: any) => {
        if (!r.stations || !r.operatingDates) return [];

        const station = r.stations.find(
          (s: any) => s.stationId === STATION_ID && s.departureTime
        );
        if (!station) return [];

        return r.operatingDates.map((d: string) => ({
          trainNumber: r.nationalNumber,
          category: r.commercialCategorySymbol,
          departureDateTime: buildDate(d, station.departureTime)
        }));
      })
      .filter(
        (t: any) =>
          t.category &&
          t.category !== "BUS" &&
          t.departureDateTime.getTime() >= now.getTime()
      )
      .sort(
        (a: any, b: any) =>
          a.departureDateTime.getTime() - b.departureDateTime.getTime()
      );

    // ==================
    // LOGIKA ZAMKNIĘCIA
    // ==================
    let closed = false;
    let reasonTrain: any = null;
    let nextCloseAt: Date | null = null;
    let nextDurationMin: number | null = null;

    for (const train of trains) {
      const dep = train.departureDateTime;
      const from = addMinutes(dep, -BUFFER_BEFORE_MIN);
      const to = addMinutes(dep, BUFFER_AFTER_MIN);

      if (now >= from && now <= to) {
        closed = true;
        reasonTrain = { number: train.trainNumber };
        nextDurationMin = BUFFER_BEFORE_MIN + BUFFER_AFTER_MIN;
        break;
      }

      if (from > now && (!nextCloseAt || from < nextCloseAt)) {
        nextCloseAt = from;
        nextDurationMin = BUFFER_BEFORE_MIN + BUFFER_AFTER_MIN;
      }
    }

    res.json({
      closed,
      checkedAt: now.toISOString(),
      train: reasonTrain,
      nextCloseAt: nextCloseAt?.toISOString() || null,
      nextDurationMin
    });
  } catch (err) {
    console.error("PLK API error:", err);
    res.status(500).json({
      error: "PLK API error",
      details: String(err)
    });
  }
}
