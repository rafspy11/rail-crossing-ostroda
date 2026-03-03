import fetch from "node-fetch";

const BASE_URL = "https://pdp-api.plk-sa.pl/api/v1";

export async function getStations(apiKey: string) {
  const res = await fetch(`${BASE_URL}/dictionaries/stations`, {
    headers: { "X-API-Key": apiKey }
  });
  return res.json();
}

export async function getSchedules(apiKey: string, stationId: string, date: string) {
  const url = `${BASE_URL}/schedules?dateFrom=${date}&dateTo=${date}&stations=${stationId}`;
  const res = await fetch(url, {
    headers: { "X-API-Key": apiKey }
  });
  return res.json();
}
