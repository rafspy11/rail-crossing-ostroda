import { Request, Response } from "express";
import { getSchedules } from "./plkApi";

// Stałe
const STATION_ID = "22004"; // Ostróda
const BUFFER_BEFORE_MIN = 6; // minut przed odjazdem
const BUFFER_AFTER_MIN = 3;  // minut po odjeździe

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

export async function getStatus(req: Request, res: Response) {
  const apiKey = process.env.PLK_API_KEY!;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const now = new Date();

  try {
    const data: any = await getSchedules(apiKey, STATION_ID, today);

    console.log("PLK raw data:", JSON.stringify(data, null, 2));

    // Filtrowanie i sortowanie pociągów osobowych
    const trains = (data.content || [])
      .filter((t: any) => t.category === "PASSENGER" && t.departureDateTime)
      .sort(
        (a: any, b: any) =>
          new Date(a.departureDateTime).getTime() -
          new Date(b.departureDateTime).getTime()
      );

    let closed = false;
    let reasonTrain: any = null;
    let nextCloseAt: Date | null = null;
    let nextDurationMin: number | null = null;

    for (const train of trains) {
      const depTime = new Date(train.departureDateTime);
      const from = addMinutes(depTime, -BUFFER_BEFORE_MIN);
      const to = addMinutes(depTime, BUFFER_AFTER_MIN);

      // Status TERAZ
      if (now >= from && now <= to) {
        closed = true;
        reasonTrain = {
          number: train.trainNumber,
          relation: train.relation
        };
        nextDurationMin = BUFFER_BEFORE_MIN + BUFFER_AFTER_MIN;
        break;
      }

      // Najbliższe zamknięcie
      if (from > now && (!nextCloseAt || from < nextCloseAt)) {
        nextCloseAt = from;
        nextDurationMin = BUFFER_BEFORE_MIN + BUFFER_AFTER_MIN;
      }
    }

    res.json({
      closed,
      checkedAt: now.toISOString(),
      reason: closed ? "train approaching or leaving station" : "no trains nearby",
      train: reasonTrain,
      nextCloseAt: nextCloseAt?.toISOString() || null,
      nextDurationMin
    });
  } catch (err) {
    res.status(500).json({
      error: "PLK API error",
      details: String(err)
    });
  }
}
