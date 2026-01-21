import { Request, Response } from "express";
import { getSchedules } from "./plkApi";
import { getStations } from "./plkApi";
import { getStationsPage } from "./plkApi";

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

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function findStation(req: Request, res: Response) {
  const apiKey = process.env.PLK_API_KEY!;
  let page = 0;
  let found: any = null;

  while (!found) {
    const data: any = await getStationsPage(apiKey, page);

    found = data.content.find(
      (s: any) => normalize(s.name) === "ostroda"
    );

    if (found || data.last === true) break;
    page++;
  }

  if (!found) {
    return res.status(404).json({ error: "Station not found" });
  }

  res.json(found);
}

