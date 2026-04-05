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
// TYPY
// ==================
interface TrainEntry {
  number: string;
  departure: string;
}
 
interface ClosureWave {
  closeAt: Date;
  closeEnd: Date;
  trains: TrainEntry[];
}
 
// ==================
// HELPERY
// ==================
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
 
function buildDate(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr.slice(0, 10)}T${timeStr}`);
}
 
// ==================
// GRUPOWANIE POCIĄGÓW W FALE ZAMKNIĘCIA
// Scala nakładające się lub stykające okna zamknięcia w jedną falę.
// Np. dwa pociągi o 15:10 i 15:18 z buforem -6/+3 dają okna:
//   15:04–15:13 i 15:12–15:21 → nakładają się → jedna fala 15:04–15:21
// ==================
function buildClosureWaves(trains: any[], now: Date): ClosureWave[] {
  const waves: ClosureWave[] = [];
 
  for (const train of trains) {
    const dep = train.departureDateTime;
    const from = addMinutes(dep, -BUFFER_BEFORE_MIN);
    const to = addMinutes(dep, BUFFER_AFTER_MIN);
 
    // Pomiń pociągi których okno już minęło lub trwa teraz (obsługiwane osobno)
    if (to <= now) continue;
    if (from <= now) continue;
 
    const entry: TrainEntry = {
      number: train.trainNumber,
      departure: dep.toISOString(),
    };
 
    // Sprawdź czy nakłada się na ostatnią falę
    const last = waves[waves.length - 1];
    if (last && from <= last.closeEnd) {
      // Scal z istniejącą falą — rozszerz koniec jeśli potrzeba
      if (to > last.closeEnd) last.closeEnd = to;
      last.trains.push(entry);
    } else {
      // Nowa osobna fala
      waves.push({ closeAt: from, closeEnd: to, trains: [entry] });
    }
  }
 
  return waves;
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
    // WYCIĄGAMY POCIĄGI
    // Filtr po końcu okna zamknięcia (dep + BUFFER_AFTER_MIN), nie po czasie odjazdu —
    // żeby nie pominąć pociągu który odjechał chwilę temu ale szlaban jest jeszcze zamknięty.
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
          departureDateTime: buildDate(d, station.departureTime),
        }));
      })
      .filter(
        (t: any) =>
          t.category &&
          t.category !== "BUS" &&
          addMinutes(t.departureDateTime, BUFFER_AFTER_MIN).getTime() >= now.getTime()
      )
      .sort(
        (a: any, b: any) =>
          a.departureDateTime.getTime() - b.departureDateTime.getTime()
      );
 
    // ==================
    // AKTUALNE ZAMKNIĘCIE
    // Zbieramy wszystkie pociągi których okno obejmuje teraz.
    // currentCloseEnd = najpóźniejszy koniec spośród wszystkich aktualnych.
    // ==================
    let closed = false;
    let currentCloseEnd: Date | null = null;
    const currentTrains: TrainEntry[] = [];
 
    for (const train of trains) {
      const dep = train.departureDateTime;
      const from = addMinutes(dep, -BUFFER_BEFORE_MIN);
      const to = addMinutes(dep, BUFFER_AFTER_MIN);
 
      if (now >= from && now <= to) {
        closed = true;
        currentTrains.push({
          number: train.trainNumber,
          departure: dep.toISOString(),
        });
        if (!currentCloseEnd || to > currentCloseEnd) {
          currentCloseEnd = to;
        }
      }
    }
 
    // ==================
    // NADCHODZĄCE FALE ZAMKNIĘCIA
    // Scala nakładające się okna w jedną falę — obsługuje sytuację
    // gdy dwa pociągi jadą jeden po drugim w krótkim odstępie czasu.
    // ==================
    const upcomingWaves = buildClosureWaves(trains, now);
    const nextWave = upcomingWaves[0] ?? null;
 
    res.json({
      closed,
      checkedAt: now.toISOString(),
      // Aktualne zamknięcie
      currentTrains: currentTrains.length > 0 ? currentTrains : null,
      currentCloseEnd: currentCloseEnd?.toISOString() || null,
      // Następna fala
      nextCloseAt: nextWave?.closeAt.toISOString() || null,
      nextCloseEnd: nextWave?.closeEnd.toISOString() || null,
      nextDurationMin: nextWave
        ? Math.round(
            (nextWave.closeEnd.getTime() - nextWave.closeAt.getTime()) / 60_000
          )
        : null,
      nextTrains: nextWave?.trains || null,
    });
  } catch (err) {
    console.error("PLK API error:", err);
    res.status(500).json({
      error: "PLK API error",
      details: String(err),
    });
  }
}