import Constants from "expo-constants";

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  "http://localhost:3000/api/v1/crossing";

export async function getCrossingStatus() {
  const res = await fetch(`${API_URL}/status`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

// Rejestracja tokena push do wysyłki powiadomień serwerowych.
// Best-effort — brak rejestracji nie powinien przeszkadzać w działaniu appki.
export async function registerPushToken(token: string) {
  try {
    await fetch(`${API_URL}/register-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    console.warn("Nie udało się zarejestrować tokena push:", err);
  }
}

// Informuje backend, że to urządzenie samo zaplanowało lokalne powiadomienie
// dla danej fali zamknięcia — serwer nie wyśle mu wtedy duplikatu.
export async function suppressServerNotification(token: string, closureId: string) {
  try {
    await fetch(`${API_URL}/suppress-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, closureId }),
    });
  } catch (err) {
    console.warn("Nie udało się zgłosić tłumienia powiadomienia:", err);
  }
}