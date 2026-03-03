import { Request, Response } from "express";
import { getSchedules } from "./plkApi";

const STATION_ID = 22004;
const BUFFER_BEFORE_MIN = 6;
const BUFFER_AFTER_MIN = 3;

let cachedData: any = null;
let lastFetch: number = 0;
const CACHE_TTL = 60_000;

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function buildDate(dateStr: string, timeStr: string) {
  return new Date(`${dateStr.slice(0, 10)}T${timeStr}`);
}

export async function getStatus(req: Request, res: Response) {
  const now = new Date();
  const apiKey = process.env.PLK_API_KEY!;
  const today = now.toISOString().slice(0, 10);

  try {
    if (!cachedData || Date.now() - lastFetch > CACHE_TTL) {
      const data: any = await getSchedules(apiKey, STATION_ID.toString(), today);
      cachedData = data;
      lastFetch = Date.now();
    }

    const routes = cachedData.routes || [];

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
          departureDateTime: buildDate(d, station.departureTime),
        }));
      })
      .filter((t: any) => t.category && t.category !== "BUS")
      .sort((a: any, b: any) => a.departureDateTime.getTime() - b.departureDateTime.getTime());

    let closed = false;
    let currentCloseEnd: Date | null = null;
    const currentTrains: { number: string; departure: string }[] = [];

    let nextCloseAt: Date | null = null;
    let nextDurationMin: number | null = null;
    const nextTrains: { number: string; departure: string }[] = [];

    for (const train of trains) {
      const dep = train.departureDateTime;
      const from = addMinutes(dep, -BUFFER_BEFORE_MIN);
      const to = addMinutes(dep, BUFFER_AFTER_MIN);

      if (now >= from && now <= to) {
        closed = true;
        currentTrains.push({ number: train.trainNumber, departure: dep.toISOString() });
        if (!currentCloseEnd || to > currentCloseEnd) currentCloseEnd = to;
      } else if (from > now) {
        if (!nextCloseAt) {
          nextCloseAt = from;
          nextDurationMin = BUFFER_BEFORE_MIN + BUFFER_AFTER_MIN;
        }
        if (from <= addMinutes(nextCloseAt, BUFFER_BEFORE_MIN + BUFFER_AFTER_MIN)) {
          nextTrains.push({ number: train.trainNumber, departure: dep.toISOString() });
        }
      }
    }

    res.json({
      closed,
      checkedAt: now.toISOString(),
      currentTrains: currentTrains.length > 0 ? currentTrains : null,
      currentCloseEnd: currentCloseEnd?.toISOString() || null,
      nextCloseAt: nextCloseAt?.toISOString() || null,
      nextDurationMin,
      nextTrains: nextTrains.length > 0 ? nextTrains : null,
    });
  } catch (err) {
    console.error("PLK API error:", err);
    res.status(500).json({ error: "PLK API error", details: String(err) });
  }
}