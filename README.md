# 🚆 Przejazdy Kolejowe – Ostróda

Aplikacja mobilna informująca użytkowników w czasie rzeczywistym o statusie przejazdów kolejowych w Ostródzie — czy szlaban jest **zamknięty** czy **otwarty**.

---

## 📱 Jak to działa

Aplikacja odpytuje rozkład jazdy PKP PLK i na jego podstawie oblicza:

- czy przejazd jest **aktualnie zamknięty** (pociąg przejeżdża ±kilka minut)
- **które pociągi** aktualnie powodują zamknięcie (może być więcej niż jeden)
- **kiedy nastąpi kolejne zamknięcie**, ile minut potrwa i jakie pociągi je spowodują

Powiadomienia o zbliżającym się zamknięciu działają dwutorowo:
- **lokalnie** — telefon planuje powiadomienie sam, na podstawie danych pobranych przy ostatnim otwarciu appki,
- **serwerowo** — backend co minutę sprawdza rozkład i wysyła push przez Expo, niezależnie od tego czy appka była ostatnio otwierana. Urządzenia, które zaplanowały już powiadomienie lokalnie, nie dostają duplikatu.

> ℹ️ Informacja jest przybliżona i nie stanowi oficjalnego źródła danych.

---

## 🗂️ Struktura projektu
```
rail-crossing-ostroda/
├── backend/        # Serwer Node.js/Express — odpytuje API PLK, wysyła powiadomienia push
├── frontend/       # Aplikacja mobilna Expo/React Native
└── render.yaml      # Blueprint do wdrożenia backendu na Render
```

---

## ⚙️ Wymagania

- [Node.js](https://nodejs.org) (wersja LTS)
- Klucz API PLK (`PLK_API_KEY`) — uzyskaj na [pdp-api.plk-sa.pl](https://pdp-api.plk-sa.pl)
- Aplikacja **Expo Go** na telefonie (App Store / Google Play)
- Do powiadomień serwerowych: konto [Expo](https://expo.dev) powiązane z projektem (`eas login` + `eas init` w folderze `frontend/`) oraz darmowy zewnętrzny cron (np. [cron-job.org](https://cron-job.org)) odpytujący backend co minutę

---

## 🚀 Uruchomienie lokalnie

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

Domyślnie appka łączy się z produkcyjnym backendem na Render (patrz niżej). Żeby testować z lokalnym backendem zamiast produkcyjnego, usuń tymczasowo `extra.apiUrl` z `frontend/app.json` — wtedy zadziała fallback z `frontend/services/api.ts` (`http://localhost:3000`).

> ⚠️ Przy testowaniu z lokalnym backendem telefon i komputer muszą być w tej samej sieci Wi-Fi, a `localhost` w fallbacku trzeba zamienić na lokalny adres IP komputera, np. `192.168.1.x`.

---

## ☁️ Wdrożenie backendu (Render)

Backend jest wdrożony jako darmowa usługa na [Render](https://render.com) z konfiguracją w [`render.yaml`](render.yaml) (Blueprint):

1. Załóż konto na render.com (np. przez GitHub).
2. **New +** → **Blueprint** → wskaż to repozytorium.
3. Uzupełnij zmienne środowiskowe:
   - `PLK_API_KEY` — klucz do API PLK,
   - `NOTIFY_TICK_SECRET` (opcjonalnie) — sekret zabezpieczający endpoint `/notify-tick` przed przypadkowym wywołaniem z zewnątrz.
4. Po wdrożeniu adres usługi (`https://<nazwa>.onrender.com`) wpisz jako `extra.apiUrl` w `frontend/app.json` (z dopiskiem `/api/v1/crossing`).

Darmowy plan usypia serwer po 15 min bezczynności — pierwsze zapytanie po przerwie może potrwać do kilkudziesięciu sekund.

### Cykliczne powiadomienia push

Render (darmowy plan) nie ma własnego zegara działającego w tle, gdy nikt go nie odpytuje. Dlatego wysyłkę powiadomień wyzwala zewnętrzny, darmowy serwis cron:

1. Załóż konto na [cron-job.org](https://cron-job.org) (lub podobnym).
2. Utwórz zadanie odpytujące co **1 minutę**:
   `https://<twoj-backend>.onrender.com/api/v1/crossing/notify-tick?secret=<NOTIFY_TICK_SECRET>`
3. To samo zapytanie utrzymuje backend obudzony, więc dodatkowo skraca czas ładowania appki.

### Powiązanie projektu z Expo (wymagane do push)

Wysyłka prawdziwych powiadomień push wymaga `projectId` z konta Expo:

```bash
cd frontend
npx eas login
npx eas init
```

Bez tego appka nadal działa normalnie (status, lokalne powiadomienia) — po prostu pomija rejestrację tokena push i loguje ostrzeżenie w konsoli.

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

### `POST /api/v1/crossing/register-token`

Rejestruje token push urządzenia (`{ "token": "ExponentPushToken[...]" }`), żeby backend mógł wysyłać mu powiadomienia niezależnie od stanu appki.

### `POST /api/v1/crossing/suppress-notification`

Zgłasza, że dane urządzenie samo zaplanowało lokalne powiadomienie dla danej fali zamknięcia (`{ "token": "...", "closureId": "2026-03-03T15:04:00.000Z" }`) — backend pominie je przy wysyłce push dla tego `closureId`.

### `GET /api/v1/crossing/notify-tick`

Wyzwala sprawdzenie rozkładu i wysyłkę powiadomień push do zarejestrowanych urządzeń, którym jeszcze nie wysłano alertu dla danej fali zamknięcia. Przeznaczony do wywoływania przez zewnętrzny cron co ~1 minutę. Jeśli ustawiono `NOTIFY_TICK_SECRET`, wymaga pasującego parametru `?secret=`.

---

## 🛠️ Technologie

| Warstwa | Technologia |
|---|---|
| Backend | Node.js, Express, TypeScript, expo-server-sdk |
| Frontend | React Native, Expo, TypeScript |
| Hosting | Render (backend), cron-job.org (cykliczne powiadomienia) |
| Dane | API PKP PLK |

---

## 📄 Licencja

Projekt prywatny. Wszelkie prawa zastrzeżone.
