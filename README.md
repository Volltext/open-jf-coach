# JF-Coach

Mobile-first PWA für Aufstellung, Stoppuhr, Analyse und Wissensdatenbank im Jugendfeuerwehr-Training.

## Features

- **Aufstellung** — Mitglieder verwalten und A-Teil/B-Teil Aufstellungen planen
- **Stoppuhr** — Timer für Übungsabläufe und Knotentraining
- **Trainingsprotokoll** — Aufzeichnung von Trainingseinheiten mit Zeitstempeln
- **Wissensdatenbank** — Knoten, Regeln und Guides als Nachschlagewerk
- **Offline-fähig** — funktioniert auch ohne Internetverbindung (PWA)
- **Echtzeit-Sync** — Änderungen werden live zwischen Geräten synchronisiert

## Tech-Stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Firebase](https://firebase.google.com/) (Firestore + Auth)
- [Workbox](https://developer.chrome.com/docs/workbox/) (PWA / Offline-Support)
- [lucide-react](https://lucide.dev/) (Icons)

## Lokale Entwicklung

```bash
# 1. Repository klonen
git clone https://github.com/amgiparker/open-jf-coach.git
cd open-jf-coach

# 2. Abhängigkeiten installieren
npm install

# 3. Umgebungsvariablen konfigurieren
cp .env.example .env
# .env mit eigenen Firebase-Credentials befüllen (siehe FIREBASE_SETUP.md)

# 4. Dev-Server starten
npm run dev
```

## Eigene Instanz deployen

### 1. Firebase einrichten
Folge der Anleitung in [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

### 2. Umgebungsvariablen setzen
Kopiere `.env.example` nach `.env` und trage deine Firebase-Credentials ein:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_TEAM_ID=meine-jf-musterstadt
```

### 3. Build erstellen

```bash
npm run build
```

Das `dist/`-Verzeichnis kann anschließend auf Netlify, Vercel oder einem beliebigen Static-Hoster deployed werden.

### Netlify
Bei Netlify die Umgebungsvariablen unter **Site Settings → Environment Variables** eintragen — dann werden sie beim Build automatisch verwendet.

## Datenschutz (DSGVO)

Jede Jugendfeuerwehr, die diese App betreibt, ist selbst verantwortlich für die Verarbeitung personenbezogener Daten ihrer Mitglieder gemäß DSGVO. Wir empfehlen, Firebase in einer EU-Region (z.B. `europe-west3` / Frankfurt) zu betreiben.

## Mitmachen

Beiträge sind willkommen! Bitte lies zuerst [CONTRIBUTING.md](CONTRIBUTING.md).

## Sicherheitslücken melden

Bitte lies [SECURITY.md](SECURITY.md).

## Lizenz

[AGPL-3.0](LICENSE) — Änderungen müssen ebenfalls open-source veröffentlicht werden.
