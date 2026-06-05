# JF-Coach

Mobile-first PWA für Aufstellung, Stoppuhr, Analyse und Wissensdatenbank im Jugendfeuerwehr-Training.

## Features

| Feature | Beschreibung |
|---|---|
| **Aufstellung** | Mitglieder verwalten und A-Teil/B-Teil Aufstellungen planen |
| **Stoppuhr** | Timer für Übungsabläufe und Knotentraining |
| **Trainingsprotokoll** | Aufzeichnung von Trainingseinheiten mit Zeitstempeln |
| **Wissensdatenbank** | Knoten, Regeln und Guides als Nachschlagewerk |
| **Offline-fähig** | Funktioniert auch ohne Internetverbindung (PWA) |
| **Echtzeit-Sync** | Änderungen werden live zwischen Geräten synchronisiert |

## Tech-Stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- Backend wahlweise [Supabase](https://supabase.com/) (Postgres + Realtime) oder [Firebase](https://firebase.google.com/) (Firestore + Auth)
- [Workbox](https://developer.chrome.com/docs/workbox/) (PWA / Offline-Support)
- [lucide-react](https://lucide.dev/) (Icons)

---

## Eigene Instanz aufsetzen

Es gibt **zwei Wege** — wähle den, der zu dir passt. Beide funktionieren parallel.

### 🟢 Einfacher Weg (ohne Technik) — Supabase

Für alle, die **nicht** selbst hosten oder bauen wollen. Du nutzt eine bereits
veröffentlichte JF-Coach-Adresse und verbindest sie über einen
**Einrichtungs-Assistenten** in der App mit deinem eigenen kostenlosen
Datenspeicher. Kein Terminal, kein Build, kein Hosting.

→ Anleitung: **[docs/supabase-setup.md](docs/supabase-setup.md)**

### 🔧 Profi-Weg — Firebase per Build

Für alle, die selbst bauen und hosten möchten. Die Firebase-Zugangsdaten werden
beim Build als Umgebungsvariablen hinterlegt.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/amgiparker/open-jf-coach)

1. **Firebase einrichten** → [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
2. **App deployen** → [docs/deployment.md](docs/deployment.md)

> **Hinweis für Betreiber:** Sind die `VITE_FIREBASE_*`-Variablen beim Build gesetzt,
> nutzt die App automatisch Firebase und der Supabase-Assistent erscheint nicht.
> Für eine öffentliche „Selbst-verbinden"-Instanz die Firebase-Variablen einfach
> **nicht** setzen.

---

## Lokale Entwicklung

```bash
git clone https://github.com/amgiparker/open-jf-coach.git
cd open-jf-coach
npm install
cp .env.example .env   # Firebase-Credentials eintragen (siehe FIREBASE_SETUP.md)
npm run dev
```

Die App ist dann unter `http://localhost:5173` erreichbar.

---

## Datenschutz (DSGVO)

Jede Jugendfeuerwehr, die diese App betreibt, ist selbst verantwortlich für die Verarbeitung personenbezogener Daten ihrer Mitglieder gemäß DSGVO. Wir empfehlen, das Backend in einer EU-Region zu betreiben (Firebase: `europe-west3` / Frankfurt, Supabase: Central EU / Frankfurt).

## Mitmachen

Beiträge sind willkommen! Bitte lies zuerst [CONTRIBUTING.md](CONTRIBUTING.md).

## Sicherheitslücken melden

Bitte lies [SECURITY.md](SECURITY.md).

## Lizenz

[AGPL-3.0](LICENSE) — Änderungen müssen ebenfalls open-source veröffentlicht werden.
