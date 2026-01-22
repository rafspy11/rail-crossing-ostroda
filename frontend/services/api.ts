const API_URL = "http://localhost:3000/api/v1/crossing/status";

export async function getCrossingStatus() {
  const res = await fetch(API_URL);
  return res.json();
}
