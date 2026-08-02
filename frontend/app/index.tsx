import { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform, Pressable } from "react-native";
import { getCrossingStatus } from "../services/api";

// ==================
// KONFIGURACJA POWIADOMIEŃ
// ==================
const NOTIFY_BEFORE_MIN = 5; // powiadomienie X minut przed zamknięciem

// expo-notifications rejestruje push token jako efekt uboczny już przy imporcie modułu.
// Na webie (statyczny SSR w Node, bez prawdziwego localStorage) ten efekt crashuje cały
// proces Metro/Node — dlatego moduł ładujemy tylko na natywnych platformach.
const Notifications: typeof import("expo-notifications") | null =
  Platform.OS === "web" ? null : require("expo-notifications");

// Jak zachować się gdy powiadomienie przyjdzie gdy aplikacja jest otwarta
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ==================
// HELPERY POWIADOMIEŃ
// ==================
async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function scheduleNotifications(data: any) {
  if (!Notifications) return;

  // Anuluj wszystkie poprzednie zaplanowane powiadomienia
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!data.nextCloseAt) return;

  const closeAt = new Date(data.nextCloseAt).getTime();
  const now = Date.now();

  const trainNumbers = data.nextTrains
    ? data.nextTrains.map((t: any) => t.number).join(", ")
    : "—";

  // Powiadomienie 1: X minut przed zamknięciem
  const warningTime = closeAt - NOTIFY_BEFORE_MIN * 60_000;
  if (warningTime > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🚦 Zbliża się zamknięcie przejazdu",
        body: `Za ${NOTIFY_BEFORE_MIN} min — pociąg ${trainNumbers}`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(warningTime),
      },
    });
  }

  // Powiadomienie 2: dokładnie w momencie zamknięcia
  if (closeAt > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔴 Przejazd zamknięty",
        body: `Pociąg ${trainNumbers}`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(closeAt),
      },
    });
  }
}

// ==================
// KOMPONENT
// ==================
export default function App() {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsCountdown, setSecondsCountdown] = useState<number | null>(null);
  const [notificationsGranted, setNotificationsGranted] = useState<boolean>(false);

  const backgroundColor = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const fetchStatusRef = useRef<() => void>(() => {});

  // ==================
  // UPRAWNIENIA DO POWIADOMIEŃ
  // ==================
  useEffect(() => {
    requestNotificationPermission().then(setNotificationsGranted);
  }, []);

  // ==================
  // FETCH STATUS
  // ==================
  useEffect(() => {
    const fetchStatus = () => {
      getCrossingStatus()
        .then((data) => {
          setError(null);
          setStatus(data);

          let initialSeconds: number | null = null;
          if (data.closed && data.currentCloseEnd) {
            initialSeconds = Math.max(
              0,
              Math.floor((new Date(data.currentCloseEnd).getTime() - Date.now()) / 1000)
            );
          } else if (!data.closed && data.nextCloseAt) {
            initialSeconds = Math.max(
              0,
              Math.floor((new Date(data.nextCloseAt).getTime() - Date.now()) / 1000)
            );
          }
          setSecondsCountdown(initialSeconds);

          // Zaplanuj powiadomienia jeśli mamy uprawnienia
          if (notificationsGranted) {
            scheduleNotifications(data);
          }

          // Animacja tła
          Animated.timing(backgroundColor, {
            toValue: data.closed ? 1 : 0,
            duration: 500,
            useNativeDriver: false,
          }).start();

          // Miganie tytułu przy zamknięciu
          if (data.closed) {
            Animated.loop(
              Animated.sequence([
                Animated.timing(titleOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
                Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
              ])
            ).start();
          } else {
            titleOpacity.stopAnimation();
            titleOpacity.setValue(1);
          }
        })
        .catch((err) => {
          console.error(err);
          setError("Nie udało się pobrać danych o przejeździe.");
        });
    };

    fetchStatusRef.current = fetchStatus;
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [notificationsGranted]);

  // ==================
  // TIMER ODLICZANIA
  // ==================
  useEffect(() => {
    if (secondsCountdown === null) return;

    const timer = setInterval(() => {
      setSecondsCountdown((s) => (s !== null && s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsCountdown]);

  // ==================
  // INTERPOLACJA KOLORU TŁA
  // ==================
  const bgColor = backgroundColor.interpolate({
    inputRange: [0, 1],
    outputRange: ["#e0ffe0", "#ffcccc"],
  });

  if (!status && error) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: "#a00000" }]}>⚠️ Błąd połączenia</Text>
        <Text style={styles.text}>{error}</Text>
        <Text style={styles.textSmall}>Ponawiam automatycznie co 30 s.</Text>
        <Pressable style={styles.retryButton} onPress={() => fetchStatusRef.current()}>
          <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
        </Pressable>
      </View>
    );
  }

  if (!status) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Ładowanie...</Text>
      </View>
    );
  }

  // Odliczanie tekstowe
  let countdownText = "";
  if (status.closed && status.currentCloseEnd && secondsCountdown !== null) {
    const min = Math.floor(secondsCountdown / 60);
    const sec = secondsCountdown % 60;
    countdownText = `Do otwarcia: ${min} min ${sec} s`;
  } else if (!status.closed && secondsCountdown !== null) {
    const min = Math.floor(secondsCountdown / 60);
    const sec = secondsCountdown % 60;
    countdownText = `Najbliższe zamknięcie za: ${min} min ${sec} s`;
  }

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      <Animated.Text
        style={[styles.title, { color: status.closed ? "#a00000" : "#007700", opacity: titleOpacity }]}
      >
        {status.closed ? "🚦 PRZEJAZD ZAMKNIĘTY" : "✅ PRZEJAZD OTWARTY"}
      </Animated.Text>

      {countdownText !== "" && <Text style={styles.text}>{countdownText}</Text>}

      {status.nextDurationMin && (
        <Text style={styles.text}>Czas zamknięcia: {status.nextDurationMin} min</Text>
      )}

      {/* Pociągi aktualnie na przejeździe */}
      {status.currentTrains && status.currentTrains.map((t: any) => (
        <Text key={t.number} style={styles.text}>
          🚆 Pociąg nr {t.number} — odjazd {new Date(t.departure).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      ))}

      {/* Nadchodzące pociągi */}
      {!status.closed && status.nextTrains && status.nextTrains.map((t: any) => (
        <Text key={t.number} style={styles.text}>
          🚆 Pociąg nr {t.number} — odjazd {new Date(t.departure).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      ))}

      <Text style={styles.textSmall}>ℹ️ Informacja przybliżona, nie jest oficjalna.</Text>
      <Text style={styles.textSmall}>
        Sprawdzono: {new Date(status.checkedAt).toLocaleTimeString()}
      </Text>

      {/* Info o powiadomieniach */}
      {!notificationsGranted && (
        <Text style={styles.textSmall}>
          ⚠️ Powiadomienia wyłączone — włącz je w ustawieniach telefonu
        </Text>
      )}

      {/* Baner nieudanego odświeżenia — dane poniżej są ostatnimi znanymi */}
      {error && (
        <Text style={[styles.textSmall, { color: "#a00000" }]}>
          ⚠️ Nie udało się odświeżyć — pokazuję ostatnio znane dane.
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "flex-start", padding: 20 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 12 },
  text: { fontSize: 20, marginVertical: 2 },
  textSmall: { fontSize: 14, marginTop: 6, color: "#555" },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#a00000",
    borderRadius: 8,
  },
  retryButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});