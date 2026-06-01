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
- [Firebase](https://firebase.google.com/) (Firestore + Auth)
- [Workbox](https://developer.chrome.com/docs/workbox/) (PWA / Offline-Support)
- [lucide-react](https://lucide.dev/) (Icons)

---

## Eigene Instanz aufsetzen

### Schnellstart via Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/amgiparker/open-jf-coach)

Nach dem Klick auf "Deploy" musst du deine Firebase-Credentials als Umgebungsvariablen in Netlify eintragen. Die vollständige Anleitung findest du unter [docs/deployment.md](docs/deployment.md).

### Schritt-für-Schritt

1. **Firebase einrichten** → [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
2. **App deployen** → [docs/deployment.md](docs/deployment.md)

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

Jede Jugendfeuerwehr, die diese App betreibt, ist selbst verantwortlich für die Verarbeitung personenbezogener Daten ihrer Mitglieder gemäß DSGVO. Wir empfehlen, Firebase in einer EU-Region (z.B. `europe-west3` / Frankfurt) zu betreiben.

## Mitmachen

Beiträge sind willkommen! Bitte lies zuerst [CONTRIBUTING.md](CONTRIBUTING.md).

## Sicherheitslücken melden

Bitte lies [SECURITY.md](SECURITY.md).

## Lizenz

[AGPL-3.0](LICENSE) — Änderungen müssen ebenfalls open-source veröffentlicht werden.
