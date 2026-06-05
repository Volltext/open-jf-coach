# Architektur

## Überblick

JF-Coach ist eine Single-Page-Application (SPA) auf Basis von React und Vite, die
als Progressive Web App (PWA) betrieben wird. Der geteilte Team-Zustand wird über
ein **austauschbares Backend** synchronisiert — wahlweise Supabase oder Firebase.

```
Browser
  └── React App (src/)
        ├── main.jsx          # Einstiegspunkt
        ├── App.jsx           # Gesamter UI-State und Komponenten
        ├── SetupWizard.jsx   # Einrichtungs-Assistent (Supabase-Weg)
        ├── JoinPrompt.jsx    # Beitritt per geteiltem Link / QR-Code
        ├── ShareTeam.jsx     # Einladungs-Link & QR-Code erzeugen
        ├── usePwaInstall.js  # PWA-Installations-Hinweis
        ├── domain.js         # Datenmodelle und Konstanten
        ├── knowledge.js      # Statische Wissensdatenbank-Inhalte
        ├── scoring.js        # Bewertungs- und Fehlerlogik
        ├── storage.js        # Lokaler Speicher (IndexedDB + localStorage)
        ├── backendConfig.js  # Backend-Konfiguration auflösen, Beitritts-Links
        ├── cloudSync.js      # Backend-unabhängige Sync-Schicht
        └── backends/
              ├── firebaseBackend.js   # Firebase-Adapter (Firestore + Auth)
              └── supabaseBackend.js   # Supabase-Adapter (Postgres + Realtime)

PWA-Layer (Workbox)
  └── Service Worker          # Offline-Caching aller Assets

Backend (eines von beiden)
  ├── Supabase
  │     ├── Postgres          # Tabelle team_state (eine Zeile pro Team)
  │     └── Realtime          # Echtzeit-Synchronisation
  └── Firebase
        ├── Firestore         # Dokument teams/<id>/state/shared
        └── Auth              # Anonyme Authentifizierung
```

## Backend-Auswahl

`backendConfig.js` entscheidet, welches Backend die App verwendet:

1. **Build-Zeit (Profi-Weg):** Sind die `VITE_FIREBASE_*`-Variablen beim Build
   vollständig gesetzt, nutzt die App Firebase.
2. **Laufzeit (einfacher Weg):** Andernfalls liest die App die per
   Einrichtungs-Assistent im Browser gespeicherte Supabase-Konfiguration.
3. Fehlt beides, zeigt die App den Einrichtungs-Assistenten (`SetupWizard.jsx`).

`cloudSync.js` ist backend-unabhängig: Es lädt anhand der aufgelösten
Konfiguration den passenden Adapter aus `src/backends/` nach. Beide Adapter
bieten dieselbe Schnittstelle (`initSync(handlers)` → `{ pushState, dispose }`).

## Datenhaltung

### Lokal (offline-first)
- **IndexedDB** (`jf-trainings-tracker`): Primärer lokaler Speicher für den App-State
- **localStorage** (`jf-trainings-tracker-fallback`): Fallback, wenn IndexedDB nicht verfügbar ist
- **localStorage** (`jf-coach-device-id`): Eindeutige Geräte-ID (UUID)
- **localStorage** (`jf-coach-backend-config`): Per Assistent gespeicherte Supabase-Konfiguration (nur einfacher Weg)

### Cloud-Sync
- **Synchronisierter State:** `members`, `lineups`, `trainingLog`, `stopwatchDraft`
- **Speicherort:**
  - Firebase: Dokument `teams/<teamId>/state/shared`
  - Supabase: eine Zeile der Tabelle `team_state` (`team_id`, `data` jsonb, `updated_at`)
- **Konfliktauflösung:** Stoppuhr-State per `stopwatchVersion`-Versionsnummer, der Rest durch „letzter gewinnt"
- **Authentifizierung:** Firebase meldet jedes Gerät automatisch anonym an; Supabase nutzt den öffentlichen Publishable-/anon-Key

## State-Flow

```
Nutzeraktion
  → App.jsx (React State)
  → storage.js (IndexedDB speichern)
  → cloudSync.js → Backend-Adapter (Remote pushen)
  ← cloudSync.js → Backend-Adapter (Remote-Änderungen empfangen)
  ← App.jsx (State mergen)
```

## PWA / Offline

Workbox cached alle statischen Assets (JS, CSS, HTML, SVG) bei der ersten
Installation. Die App funktioniert danach vollständig offline — Sync-Änderungen
werden gepuffert und beim nächsten Online-Sein übertragen.

## Umgebungsvariablen

Beim **Firebase-Weg** werden alle Konfigurationswerte zur Build-Zeit über
Vite-Umgebungsvariablen (`VITE_*`) injiziert. Es gibt keine server-seitige
Konfiguration. Beim **Supabase-Weg** trägt jede Wehr ihre Werte stattdessen zur
Laufzeit im Einrichtungs-Assistenten ein; es sind keine Build-Variablen nötig.

| Variable | Beschreibung |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API-Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth-Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Projekt-ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage-Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging-Sender-ID |
| `VITE_FIREBASE_APP_ID` | Firebase App-ID |
| `VITE_FIREBASE_TEAM_ID` | Team-ID (Firestore-Pfad) |
