import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const STATE_FILE = path.join(DATA_DIR, "notify-state.json");

export interface NotifyState {
  warnedCloseAt: string | null;
  closedNotifiedCloseAt: string | null;
}

const DEFAULT_STATE: NotifyState = { warnedCloseAt: null, closedNotifiedCloseAt: null };

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readNotifyState(): NotifyState {
  ensureDir();
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeNotifyState(state: NotifyState) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
