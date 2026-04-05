import Constants from "expo-constants";

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  "http://localhost:3000/api/v1/crossing";

export async function getCrossingStatus() {
  const res = await fetch(`${API_URL}/status`);
  return res.json();
}