import { Request, Response } from "express";
import { getSchedules } from "./plkApi";

const STATION_ID = "22004"; // Ostróda
const BUFFER_BEFORE_MIN = 6;
const BUFFER_AFTER_MIN = 3;

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

export async function getStatus(req: Request, res: Response) {
  const apiKey = process.env.PLK_API_KEY!;
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  try {
    const data: any = await getSchedules(apiKey, STATION_ID, today);

    const trains = data.content || [];

    let closed = false;
    let reasonTrain: any = null;

    for (const train of trains) {
      if (train.category !== "PASSENGER") continue;

      const times = [
        train.arrivalTime,
        train.departureTime
      ].filter(Boolean);

      for (const t of times) {
        const eventTime = new Date(t);
        const from = addMinutes(eventTime, -BUFFER_BEFORE_MIN);
        const to = addMinutes(eventTime, BUFFER_AFTER_MIN);

        if (now >= from && now <= to) {
          closed = true;
          reasonTrain = {
            number: train.trainNumber,
            relation: train.relation
          };
          break;
        }
      }
      if (closed) break;
    }

    res.json({
      closed,
      checkedAt: now.toISOString(),
      reason: closed ? "train approaching or leaving station" : "no trains nearby",
      train: reasonTrain
    });

  } catch (err) {
    res.status(500).json({
      error: "PLK API error",
      details: String(err)
    });
  }
}