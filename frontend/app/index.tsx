import { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { getCrossingStatus } from "../services/api";

export default function App() {
  const [status, setStatus] = useState<any>(null);
  const [secondsCountdown, setSecondsCountdown] = useState<number | null>(null);

  const backgroundColor = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;

  // ==================
  // FETCH STATUS
  // ==================
  useEffect(() => {
    const fetchStatus = () => {
      getCrossingStatus()
        .then((data) => {
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

          // animacja tła
          Animated.timing(backgroundColor, {
            toValue: data.closed ? 1 : 0,
            duration: 500,
            useNativeDriver: false,
          }).start();

          // miganie tytułu przy zamknięciu
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
        .catch(console.error);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, []);

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

  if (!status) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Ładowanie...</Text>
      </View>
    );
  }

  // odliczanie tekstowe
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "flex-start", padding: 20 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 12 },
  text: { fontSize: 20, marginVertical: 2 },
  textSmall: { fontSize: 14, marginTop: 6, color: "#555" },
});