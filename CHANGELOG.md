# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

## [Unreleased]

### Added
- Open-Source-Veröffentlichung mit AGPL-3.0-Lizenz
- `.env.example` für einfache Konfiguration
- `netlify.toml` für One-Click-Deployment auf Netlify
- `firestore.rules` mit Sicherheitsregeln
- Fehlermeldung in der App wenn Umgebungsvariablen fehlen
- GitHub Actions CI-Workflow
- `FIREBASE_SETUP.md` mit Schritt-für-Schritt-Anleitung
- Issue-Templates für Bug Reports und Feature Requests
- `CONTRIBUTING.md` und `SECURITY.md`

## [0.1.0] - 2026-05-23

### Added
- Aufstellungsverwaltung für A-Teil und B-Teil
- Mitgliederverwaltung (hinzufügen, entfernen, Positionen zuweisen)
- Aufstellungs-Templates (speichern und laden)
- Stoppuhr mit Modus A und B, Knotentraining und Aufgaben-Timer
- Trainingsprotokoll mit Zeitstempeln und Aufstellungs-Snapshots
- Wissensdatenbank (Knoten, Regeln, Positionsguides)
- Echtzeit-Synchronisation über Firebase Firestore
- Offline-Unterstützung als PWA (Service Worker via Workbox)
- Bewertungs- und Fehlerauswertung
