# 🚆 Przejazdy Kolejowe – Ostróda

Aplikacja mobilna informująca użytkowników w czasie rzeczywistym o statusie przejazdów kolejowych w Ostródzie — czy szlaban jest **zamknięty** czy **otwarty**.

---

## 📱 Jak to działa

Aplikacja odpytuje rozkład jazdy PKP PLK i na jego podstawie oblicza:

- czy przejazd jest **aktualnie zamknięty** (pociąg przejeżdża ±kilka minut)
- **które pociągi** aktualnie powodują zamknięcie (może być więcej niż jeden)
- **kiedy nastąpi kolejne zamknięcie**, ile minut potrwa i jakie pociągi je spowodują

> ℹ️ Informacja jest przybliżona i nie stanowi oficjalnego źródła danych.

---

## 🗂️ Struktura projektu
```
rail-crossing-ostroda/
├── backend/        # Serwer Node.js/Express — odpytuje API PLK
└── frontend/       # Aplikacja mobilna Expo/React Native
```

---

## ⚙️ Wymagania

- [Node.js](https://nodejs.org) (wersja LTS)
- Klucz API PLK (`PLK_API_KEY`) — uzyskaj na [pdp-api.plk-sa.pl](https://pdp-api.plk-sa.pl)
- Aplikacja **Expo Go** na telefonie (App Store / Google Play)

---

## 🚀 Uruchomienie

### 1. Backend
```bash
cd backend
npm install
```

Utwórz plik `.env` w folderze `backend/`:
```env
PLK_API_KEY=twój_klucz_api
```

Uruchom serwer:
```bash
npm run dev
```

Serwer będzie dostępny pod adresem `http://localhost:3000`.

---

### 2. Frontend

W nowym oknie terminala:
```bash
cd frontend
npm install
npm start
```

Zeskanuj wyświetlony kod QR aplikacją **Expo Go** na telefonie.

> ⚠️ Telefon i komputer muszą być w tej samej sieci Wi-Fi.  
> W pliku `frontend/services/api.ts` zmień `localhost` na lokalny adres IP swojego komputera, np. `192.168.1.x`.

---

## 🔌 API

### `GET /api/v1/crossing/status`

Zwraca aktualny status przejazdu.

**Przykład — szlaban zamknięty:**
```json
{
  "closed": true,
  "checkedAt": "2026-03-03T14:25:00.000Z",
  "currentTrains": [
    { "number": "12345", "departure": "2026-03-03T14:26:00.000Z" },
    { "number": "67890", "departure": "2026-03-03T14:27:00.000Z" }
  ],
  "currentCloseEnd": "2026-03-03T14:30:00.000Z",
  "nextCloseAt": null,
  "nextDurationMin": 9,
  "nextTrains": null
}
```

**Przykład — szlaban otwarty:**
```json
{
  "closed": false,
  "checkedAt": "2026-03-03T14:25:00.000Z",
  "currentTrains": null,
  "currentCloseEnd": null,
  "nextCloseAt": "2026-03-03T15:10:00.000Z",
  "nextDurationMin": 9,
  "nextTrains": [
    { "number": "12345", "departure": "2026-03-03T15:16:00.000Z" }
  ]
}
```

| Pole | Opis |
|---|---|
| `closed` | `true` jeśli szlaban jest teraz zamknięty |
| `currentTrains` | Lista pociągów aktualnie na przejeździe (lub `null`) |
| `currentCloseEnd` | Szacowany czas otwarcia szlabanu (tylko gdy `closed: true`) |
| `nextCloseAt` | Czas następnego zamknięcia (tylko gdy `closed: false`) |
| `nextDurationMin` | Szacowany czas zamknięcia w minutach |
| `nextTrains` | Lista pociągów nadchodzącego zamknięcia (lub `null`) |

---

## 🛠️ Technologie

| Warstwa | Technologia |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Frontend | React Native, Expo, TypeScript |
| Dane | API PKP PLK |

---

## 📄 Licencja

Projekt prywatny. Wszelkie prawa zastrzeżone.