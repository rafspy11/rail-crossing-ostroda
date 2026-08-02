import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const TOKENS_FILE = path.join(DATA_DIR, "tokens.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getTokens(): string[] {
  ensureDir();
  try {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function addToken(token: string) {
  ensureDir();
  const tokens = getTokens();
  if (!tokens.includes(token)) {
    tokens.push(token);
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  }
}

export function removeToken(token: string) {
  ensureDir();
  fs.writeFileSync(
    TOKENS_FILE,
    JSON.stringify(
      getTokens().filter((t) => t !== token),
      null,
      2
    )
  );
}

// ==================
// TŁUMIENIE POWIADOMIEŃ SERWEROWYCH
// Urządzenie, które samo zaplanowało lokalne powiadomienie dla danej fali
// zamknięcia, zgłasza to tutaj — dzięki temu backend nie wyśle mu duplikatu
// push, ale wciąż powiadomi urządzenia, które appki tego dnia nie otwierały.
// Trzymane tylko w pamięci: strata przy restarcie backendu oznacza co najwyżej
// pojedynczy duplikat, nigdy brak powiadomienia.
// ==================
const suppressed = new Map<string, Set<string>>();

export function suppressForClosure(token: string, closureId: string) {
  if (!suppressed.has(closureId)) suppressed.set(closureId, new Set());
  suppressed.get(closureId)!.add(token);
}

export function isSuppressed(token: string, closureId: string): boolean {
  return suppressed.get(closureId)?.has(token) ?? false;
}
