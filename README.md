# 🚆 Przejazdy Kolejowe – Ostróda

Aplikacja mobilna informująca użytkowników w czasie rzeczywistym o statusie przejazdów kolejowych w Ostródzie — czy szlaban jest **zamknięty** czy **otwarty**.

---

## 📱 Jak to działa

Aplikacja odpytuje rozkład jazdy PKP PLK i na jego podstawie oblicza:

- czy przejazd jest **aktualnie zamknięty** (pociąg przejeżdża ±kilka minut)
- **kiedy nastąpi kolejne zamknięcie** i ile minut potrwa
- animowany pociąg na torze zbliżający się do przejazdu

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

**Przykładowa odpowiedź:**

```json
{
  "closed": true,
  "checkedAt": "2026-03-03T14:25:00.000Z",
  "currentCloseEnd": "2026-03-03T14:28:00.000Z",
  "nextCloseAt": null,
  "nextDurationMin": 9,
  "train": {
    "number": "12345"
  }
}
```

| Pole | Opis |
|---|---|
| `closed` | `true` jeśli szlaban jest teraz zamknięty |
| `currentCloseEnd` | Czas otwarcia szlabanu (tylko gdy `closed: true`) |
| `nextCloseAt` | Czas następnego zamknięcia (tylko gdy `closed: false`) |
| `nextDurationMin` | Szacowany czas zamknięcia w minutach |
| `train.number` | Numer pociągu powodującego zamknięcie |

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
