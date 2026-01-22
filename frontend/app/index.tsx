import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { getCrossingStatus } from "../services/api";

export default function App() {
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        getCrossingStatus().then(setStatus);
    }, []);

    if (!status) {
        return <Text>Ładowanie...</Text>;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {status.closed ? "🚦 PRZEJAZD ZAMKNIĘTY" : "✅ PRZEJAZD OTWARTY"}
            </Text>
            <Text style={styles.text}>
                Sprawdzono: {new Date(status.checkedAt).toLocaleTimeString()}
            </Text>
            {status.train && (
                <Text>
                    🚆 {status.train.number} ({status.train.relation})
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff"
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 12,
        color: "#000000"
    },
    text: {
        color: "#000000"
    }
});

