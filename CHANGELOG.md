# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

## [Unreleased]

### Added
- Einfacher Einrichtungsweg über Supabase mit Assistent in der App (kein Build, kein Hosting nötig)
- Austauschbares Backend: Supabase oder Firebase
- Kameraden per Beitritts-Link und QR-Code einladen
- Toast-Rückmeldung beim Speichern und Löschen von Trainingsläufen
- Sicherheitsabfrage vor dem Löschen eines Trainingslaufs
- Einzelne A-Teil-Zwischenzeiten und B-Teil-Aufgaben-Timer korrigierbar (zurücksetzen ohne kompletten Reset)
- Open-Source-Veröffentlichung mit AGPL-3.0-Lizenz
- `.env.example` für einfache Konfiguration
- `netlify.toml` für One-Click-Deployment auf Netlify
- `firestore.rules` mit Sicherheitsregeln
- Fehlermeldung in der App wenn Umgebungsvariablen fehlen
- GitHub Actions CI-Workflow
- `FIREBASE_SETUP.md` mit Schritt-für-Schritt-Anleitung
- Issue-Templates für Bug Reports und Feature Requests
- `CONTRIBUTING.md` und `SECURITY.md`

### Changed
- Sync-Banner blendet sich bei stabiler Verbindung automatisch aus
- Barrierefreiheit verbessert (aria-Labels für Navigation, Timer, Wertung und Statusmeldungen)
- Wettkampf-Wertung jetzt im Team: Fehlerpunkte, Wertung (an/aus) und Vorgabezeit können alle Betreuer gemeinsam erfassen, während die Zeitnahme weiterhin nur auf dem startenden Gerät bedient wird (entspricht mehreren Wertungsrichtern je Position)

### Fixed
- Tippfehler „Trainingslaeufe" → „Trainingsläufe"
- Laufende Zeitnahme sprang auf dem zeitnehmenden Gerät nicht mehr, wenn ein anderer Betreuer einen Fehler erfasst (Neuverankerung jetzt anhand des schreibenden Geräts statt der Timer-Steuerung)
- Zuletzt erfasster Fehler ging während eines laufenden Laufs nicht mehr verloren (nachlaufender Sync-Push garantiert die Übertragung des letzten Stands)

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
