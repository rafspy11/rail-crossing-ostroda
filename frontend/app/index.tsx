import { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from "react-native";
import { getCrossingStatus } from "../services/api";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function App() {
  const [status, setStatus] = useState<any>(null);
  const [secondsCountdown, setSecondsCountdown] = useState<number | null>(null);

  const backgroundColor = useRef(new Animated.Value(0)).current; // tło: open/closed
  const trainAnim = useRef(new Animated.Value(0)).current; // pozycja pociągu
  const titleOpacity = useRef(new Animated.Value(1)).current; // miganie tytułu

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
            useNativeDriver: false
          }).start();

          // miganie tytułu przy zamknięciu
          if (data.closed) {
            Animated.loop(
              Animated.sequence([
                Animated.timing(titleOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
                Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true })
              ])
            ).start();
          } else {
            titleOpacity.setValue(1);
          }
        })
        .catch(console.error);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000); // odświeżanie statusu
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
  // ANIMACJA POCIĄGU NA TORZE
  // ==================
  useEffect(() => {
    if (!status || secondsCountdown === null) return;

    const interval = setInterval(() => {
      let progress = 0; // 0 = daleko, 1 = przy przejeździe

      if (!status.closed && status.nextCloseAt) {
        const total = Math.max(
          1,
          Math.floor((new Date(status.nextCloseAt).getTime() - Date.now()) / 1000) + secondsCountdown
        );
        progress = 1 - secondsCountdown / total;
      } else if (status.closed && status.currentCloseEnd) {
        progress = 1; // przy przejeździe
      }

      trainAnim.setValue(SCREEN_WIDTH * Math.min(Math.max(progress, 0), 1));
    }, 500);

    return () => clearInterval(interval);
  }, [status, secondsCountdown]);

  // ==================
  // INTERPOLACJA KOLORU TŁA
  // ==================
  const bgColor = backgroundColor.interpolate({
    inputRange: [0, 1],
    outputRange: ["#e0ffe0", "#ffcccc"]
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

  // kolor ikony pociągu: zielony → pomarańcz → czerwony
  const trainColor = trainAnim.interpolate({
    inputRange: [0, SCREEN_WIDTH * 0.5, SCREEN_WIDTH],
    outputRange: ["#007700", "#ffaa00", "#a00000"]
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      <Animated.Text
        style={[styles.title, { color: status.closed ? "#a00000" : "#007700", opacity: titleOpacity }]}
      >
        {status.closed ? "🚦 PRZEJAZD ZAMKNIĘTY" : "✅ PRZEJAZD OTWARTY"}
      </Animated.Text>

      {countdownText !== "" && <Text style={styles.text}>{countdownText}</Text>}

      {status.nextDurationMin && <Text style={styles.text}>Czas zamknięcia: {status.nextDurationMin} min</Text>}

      {status.train && (
        <Text style={styles.text}>
          🚆 {status.train.number} ({status.train.relation || "Brak danych o relacji"})
        </Text>
      )}

      <Text style={styles.textSmall}>ℹ️ Informacja przybliżona, nie jest oficjalna.</Text>
      <Text style={styles.textSmall}>Sprawdzono: {new Date(status.checkedAt).toLocaleTimeString()}</Text>

      {/* ================== */}
      {/* PASEK TORU + IKONA POCIĄGU */}
      {/* ================== */}
      <View style={styles.trackContainer}>
        {/* pasek toru */}
        <View style={styles.trackBackground} />
        {/* pociąg animowany po torze */}
        <Animated.Text
          style={[
            styles.train,
            {
              transform: [{ translateX: trainAnim }],
              color: trainColor
            }
          ]}
        >
          🚆
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "flex-start", padding: 20 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 12 },
  text: { fontSize: 20, marginVertical: 2 },
  textSmall: { fontSize: 14, marginTop: 6, color: "#555" },

  // tor
  trackContainer: {
    position: "absolute",
    bottom: 100,
    width: "100%",
    height: 40,
    justifyContent: "center"
  },
  trackBackground: {
    position: "absolute",
    width: "100%",
    height: 6,
    backgroundColor: "#ccc",
    borderRadius: 3
  },
  train: {
    fontSize: 30,
    position: "absolute",
    top: -12
  }
});
