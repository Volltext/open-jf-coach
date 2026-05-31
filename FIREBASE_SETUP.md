# Firebase Setup fuer JF-Coach

Diese Anleitung bereitet alles vor, damit ich anschliessend Cloud-Sync (Realtime fuer alle Betreuer) in die App implementieren kann.

## 1. Firebase Projekt anlegen
1. In der Firebase Console ein neues Projekt erstellen, z. B. `jf-coach`.
2. Google Analytics kann fuer den Start deaktiviert bleiben.

## 2. Web-App registrieren
1. Im Projekt auf "Web-App hinzufuegen" gehen.
2. App-Name z. B. `jf-coach-web`.
3. Die Firebase Config-Werte kopieren (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).

## 3. Firestore Datenbank aktivieren
1. In Firebase "Firestore Database" erstellen.
2. Modus fuer den Start: "Produktionsmodus" (empfohlen).
3. Standort auswaehlen (z. B. `europe-west3`).

## 4. Authentication aktivieren (anonym)
1. Unter "Authentication" die Methode "Anonym" einschalten.
2. Es ist kein manuelles Anlegen von Benutzerkonten notwendig.
3. Jeder Betreuer erhaelt beim ersten Start automatisch eine anonyme UID.

## 5. Sicherheitsregeln setzen (MVP)
Firestore Rules Beispiel fuer teambasierten Zugriff:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /teams/{teamId} {
      allow read, write: if request.auth != null;
    }

    match /teams/{teamId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Hinweis: Das ist ein Startpunkt. Fuer Produktion sollten wir Rollen/Team-Mitgliedschaft strenger pruefen.

## 6. Environment Variablen im Projekt anlegen
Im Projekt `JF-Trainings-Tracker` eine Datei `.env.local` erstellen:

```env
VITE_FIREBASE_API_KEY=Aiza...
VITE_FIREBASE_AUTH_DOMAIN=jf-coach-199bd.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=jf-coach-199bd
VITE_FIREBASE_STORAGE_BUCKET=jf-coach-199bd.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=52539021821
VITE_FIREBASE_APP_ID=1:52539021821:web:80abbc7d3015484ba56194
VITE_FIREBASE_TEAM_ID=jf-coach-main
```

Wichtig: `.env.local` nicht committen.

## 7. Teamstruktur in Firestore vorbereiten
Empfohlene Struktur:

- `teams/{teamId}`: Stammdaten Team
- `teams/{teamId}/members/{memberId}`: Jugendliche
- `teams/{teamId}/lineups/{lineupId}`: Vorlagen + letzte Aufstellung
- `teams/{teamId}/runs/{runId}`: Trainingslaeufe
- `teams/{teamId}/knowledge/{docId}`: optionale teaminterne Wissenseintraege

## 8. Was du mir danach geben musst
Damit ich es direkt implementieren kann, brauche ich von dir:
1. `teamId`, die wir verwenden sollen (z. B. `jf-hamburg-nord`).
2. Info, welche `teamId` die Betreuer gemeinsam nutzen sollen.
3. Bestaetigung, dass `.env.local` mit den Werten gesetzt ist.

## 9. Was ich dann implementiere
Sobald die Punkte oben stehen, baue ich:
1. Firebase Initialisierung und Auth-Flow.
2. Synchronisierung fuer Mitglieder, Aufstellungsvorlagen und Trainingslaeufe.
3. Offline-First mit lokalem Cache + automatischem Sync bei Verbindung.
4. Konfliktstrategie (Last write wins + Zeitstempel).
5. Sichtbarer Sync-Status in der App.
