import { computeSchedule } from "./timetable";
import { sendPushToSubscribers } from "./push";
import { readNotifyState, writeNotifyState } from "./notifyState";

const NOTIFY_BEFORE_MIN = 5;

// ==================
// CYKLICZNE SPRAWDZENIE — wywoływane przez zewnętrzny cron (np. cron-job.org)
// co ok. 1 minutę, niezależnie od tego czy ktoś ma otwartą appkę.
// Pilnuje żeby dla danej fali zamknięcia (closureId = ISO czasu jej początku)
// wysłać każdy etap powiadomienia (warning/closed) tylko raz.
// ==================
export async function runNotifyTick(): Promise<{ checkedAt: string; sent: string[] }> {
  const now = new Date();
  const snapshot = await computeSchedule(now);
  const state = readNotifyState();
  const sent: string[] = [];

  const { nextWave } = snapshot;
  if (nextWave) {
    const closureId = nextWave.closeAt.toISOString();
    const warnAt = new Date(nextWave.closeAt.getTime() - NOTIFY_BEFORE_MIN * 60_000);

    if (now >= warnAt && now < nextWave.closeAt && state.warnedCloseAt !== closureId) {
      const trainNumbers = nextWave.trains.map((t) => t.number).join(", ");
      await sendPushToSubscribers(
        closureId,
        "🚦 Zbliża się zamknięcie przejazdu",
        `Za ${NOTIFY_BEFORE_MIN} min — pociąg ${trainNumbers}`,
        { closureId, type: "warning" }
      );
      state.warnedCloseAt = closureId;
      writeNotifyState(state);
      sent.push("warning");
    }
  }

  if (snapshot.closed && snapshot.currentCloseAt && snapshot.currentTrains) {
    const closureId = snapshot.currentCloseAt.toISOString();

    if (state.closedNotifiedCloseAt !== closureId) {
      const trainNumbers = snapshot.currentTrains.map((t) => t.number).join(", ");
      await sendPushToSubscribers(
        closureId,
        "🔴 Przejazd zamknięty",
        `Pociąg ${trainNumbers}`,
        { closureId, type: "closed" }
      );
      state.closedNotifiedCloseAt = closureId;
      writeNotifyState(state);
      sent.push("closed");
    }
  }

  return { checkedAt: now.toISOString(), sent };
}
