# Architektur

## Überblick

JF-Coach ist eine Single-Page-Application (SPA) auf Basis von React und Vite, die als Progressive Web App (PWA) betrieben wird.

```
Browser
  └── React App (src/)
        ├── App.jsx          # Gesamter UI-State und Komponenten
        ├── domain.js        # Datenmodelle und Konstanten
        ├── knowledge.js     # Statische Wissensdatenbank-Inhalte
        ├── scoring.js       # Bewertungs- und Fehlerlogik
        ├── storage.js       # Lokaler Speicher (IndexedDB + localStorage)
        └── cloudSync.js     # Firebase Firestore Sync

PWA-Layer (Workbox)
  └── Service Worker          # Offline-Caching aller Assets

Backend
  └── Firebase
        ├── Firestore         # Echtzeit-Datenbank (teams/<id>/state/shared)
        └── Auth              # Anonyme Authentifizierung
```

## Datenhaltung

### Lokal (offline-first)
- **IndexedDB** (`jf-trainings-tracker`): Primärer lokaler Speicher für den App-State
- **localStorage** (Fallback): Wird verwendet wenn IndexedDB nicht verfügbar ist
- **localStorage** (`jf-coach-device-id`): Eindeutige Geräte-ID (UUID)

### Cloud-Sync
- **Firestore-Dokument:** `teams/<VITE_FIREBASE_TEAM_ID>/state/shared`
- Synchronisierter State: `members`, `lineups`, `trainingLog`, `stopwatchDraft`
- Konfliktauflösung: Stoppuhr-State per `stopwatchVersion`-Versionsnummer, Rest durch "letzter gewinnt"
- Anonyme Firebase Auth: Jedes Gerät meldet sich automatisch anonym an

## State-Flow

```
Nutzeraktion
  → App.jsx (React State)
  → storage.js (IndexedDB speichern)
  → cloudSync.js (Firestore pushen)
  ← cloudSync.js (Remote-Änderungen empfangen)
  ← App.jsx (State mergen)
```

## PWA / Offline

Workbox cached alle statischen Assets (JS, CSS, HTML, SVG) bei der ersten Installation. Die App funktioniert danach vollständig offline — Sync-Änderungen werden gepuffert und beim nächsten Online-Sein übertragen.

## Umgebungsvariablen

Alle Konfigurationswerte werden zur Build-Zeit über Vite-Umgebungsvariablen (`VITE_*`) injiziert. Es gibt keine Server-seitige Konfiguration.

| Variable | Beschreibung |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API-Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth-Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Projekt-ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage-Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging-Sender-ID |
| `VITE_FIREBASE_APP_ID` | Firebase App-ID |
| `VITE_FIREBASE_TEAM_ID` | Team-ID (Firestore-Pfad) |
