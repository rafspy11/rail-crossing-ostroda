import { Request, Response } from "express";
import { getSchedules } from "./plkApi";

export async function getStatus(req: Request, res: Response) {
  const date = new Date().toISOString().slice(0, 10);
  const stationId = "TU_ID_STACJI_OSTRODA";
  const apiKey = process.env.PLK_API_KEY!;

  try {
    const data = await getSchedules(apiKey, stationId, date);
    res.json({ ok: true, raw: data });
  } catch (err) {
    res.status(500).json({ error: "PLK API error", details: String(err) });
  }
}
