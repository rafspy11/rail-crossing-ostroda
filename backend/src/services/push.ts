import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { getTokens, removeToken, isSuppressed } from "./subscribers";

const expo = new Expo();

export async function sendPushToSubscribers(
  closureId: string,
  title: string,
  body: string,
  data: Record<string, unknown>
) {
  const tokens = getTokens().filter(
    (t) => Expo.isExpoPushToken(t) && !isSuppressed(t, closureId)
  );
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens.map((to) => ({
    to,
    sound: "default",
    title,
    body,
    data,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          removeToken(chunk[i].to as string);
        }
      });
    } catch (err) {
      console.error("Push send error:", err);
    }
  }
}
