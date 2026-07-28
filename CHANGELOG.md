# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

## [Unreleased]

### Added
- **Leistungsspange der Deutschen Jugendfeuerwehr** als zweiter Wettbewerb neben dem Bundeswettbewerb. Ein Umschalter über allen vier Tabs wechselt zwischen beiden; Aufstellung, Stoppuhr, Analyse und Wissensdatenbank zeigen jeweils die passenden Inhalte
  - Alle fünf Disziplinen mit der Wertungstabelle 0–4 Punkte: Schnelligkeitsübung und Staffellauf über die Stoppuhr, Kugelstoßen über die Gesamtweite, Löschangriff und Fragenbeantwortung als Bewertung durch die Wertungsrichter/-innen
  - Wettbewerbsform Gruppe (9) und Staffel (6) mit je eigenen Positionen, Zeiten und Weiten
  - Abhakbare Nullwertungsgründe je Disziplin — ein Häkchen setzt die Punktzahl auf 0
  - Wertungsbogen im Analyse-Tab: Punkte je Disziplin, Gesamteindruck je Wertungsrichter/-in mit Durchschnitt, Gesamtpunktzahl sowie Bestanden/Ausgeschieden inklusive Begründung und Hinweis auf eine mögliche Wiederholung
  - Wissensdatenbank mit Ablauf, Nullwertungen, Bekleidung und Wertungstabelle sowie den sieben Wissensgebieten der Fragenbeantwortung als Gesprächsleitfaden
  - Aufstellung aus dem A-Teil übernehmen; Beobachtungshilfe für den Löschangriff auf Basis des A-Teil-Katalogs ohne Hindernisse
  - Grundlage: DJF-Richtlinien zum Erwerb der Leistungsspange und Erläuterungen zur bundeseinheitlichen Durchführung, beide Stand 01.01.2024
- Unit-Tests mit Vitest (`npm test`) für die Wertungslogik, die Zustands-Normalisierung und die Sync-Zusammenführung; laufen in der CI vor dem Build
- Paralleler A- und B-Lauf in einer Instanz: ein Team misst den A-Teil, ein anderes gleichzeitig den B-Teil. Jedes Gerät wählt über den A/B-Umschalter lokal, welchen Lauf es bedient; ein „läuft"-Punkt und ein Parallel-Hinweis zeigen den jeweils anderen Lauf
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
- Der Stoppuhr-Modus (`mode`) ist nicht mehr auf A-/B-Teil beschränkt, sondern wird über eine Wettbewerbs-Registry aufgelöst. Bestehende Stände, Läufe und Aufstellungen bleiben unverändert; ältere Clients bleiben synchronisierbar, weil sie unbekannte Modus-Slots ignorieren
- CSV-Export um die Spalten „Wettbewerb" und „LSP-Punkte" ergänzt (hinten angehängt, bestehende Spalten unverändert)
- Positions-Matrix zeigt die Positionen des aktiven Wettbewerbs, statt alle Abschnitte nebeneinander
- Sync-Banner blendet sich bei stabiler Verbindung automatisch aus
- Barrierefreiheit verbessert (aria-Labels für Navigation, Timer, Wertung und Statusmeldungen)
- Wettkampf-Wertung jetzt im Team: Fehlerpunkte, Wertung (an/aus) und Vorgabezeit können alle Betreuer gemeinsam erfassen, während die Zeitnahme weiterhin nur auf dem startenden Gerät bedient wird (entspricht mehreren Wertungsrichtern je Position)

### Fixed
- Tippfehler „Trainingslaeufe" → „Trainingsläufe"
- Laufende Zeitnahme sprang auf dem zeitnehmenden Gerät nicht mehr, wenn ein anderer Betreuer einen Fehler erfasst (Sync übernimmt einen Lauf nur bei echt neuer Version und verankert die laufende Zeit dann am eigenen Takt)
- Zuletzt erfasster Fehler ging während eines laufenden Laufs nicht mehr verloren (nachlaufender Sync-Push garantiert die Übertragung des letzten Stands)
- Trainingsprotokoll wird per Lauf-ID zusammengeführt statt komplett überschrieben: speichern zwei Geräte (z. B. A- und B-Team) zeitgleich, geht kein Lauf mehr verloren. Notiz-Änderungen entscheidet der neuere Zeitstempel; gelöschte Läufe bleiben über Tombstones gelöscht und tauchen nicht wieder auf

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
