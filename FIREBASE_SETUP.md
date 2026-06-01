# Firebase einrichten

Diese Anleitung führt dich durch die Einrichtung eines eigenen Firebase-Projekts für JF-Coach.

> **Voraussetzung:** Ein kostenloses [Firebase-Konto](https://firebase.google.com/).

---

## 1. Projekt anlegen

1. Öffne die [Firebase Console](https://console.firebase.google.com/) und klicke auf **"Projekt hinzufügen"**.
2. Gib dem Projekt einen Namen, z.B. `jf-coach`.
3. Google Analytics kann deaktiviert bleiben.

---

## 2. Web-App registrieren

1. Im Projekt auf **"Web-App hinzufügen"** klicken (Symbol `</>`).
2. App-Name vergeben, z.B. `jf-coach-web`.
3. Die angezeigten **Firebase-Config-Werte** notieren — du brauchst sie gleich:

```
apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
```

---

## 3. Firestore-Datenbank aktivieren

1. Im linken Menü auf **"Firestore Database"** → **"Datenbank erstellen"**.
2. Modus: **Produktionsmodus** (empfohlen).
3. Standort: **`europe-west3`** (Frankfurt) für DSGVO-Konformität.

---

## 4. Anonyme Authentifizierung aktivieren

1. Im linken Menü auf **"Authentication"** → **"Anmeldemethoden"**.
2. **"Anonym"** aktivieren.

Jeder Betreuer erhält beim ersten App-Start automatisch eine anonyme UID — es müssen keine Konten manuell angelegt werden.

---

## 5. Sicherheitsregeln setzen

Kopiere den Inhalt der Datei [`firestore.rules`](firestore.rules) in die Firebase Console unter **Firestore → Regeln**.

Zur Orientierung — das ist der Inhalt der Datei:

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

> **Hinweis:** Diese Regeln erlauben allen authentifizierten Nutzern den Zugriff auf alle Teams. Für eine produktive Umgebung mit mehreren Wehren sollten die Regeln um eine Team-Mitgliedschaftsprüfung erweitert werden.

---

## 6. Umgebungsvariablen konfigurieren

Lege im Projektordner eine Datei `.env` an (Vorlage: `.env.example`) und trage deine Firebase-Werte ein:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=mein-projekt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mein-projekt
VITE_FIREBASE_STORAGE_BUCKET=mein-projekt.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_TEAM_ID=jf-musterstadt
```

**Zur Team-ID:** Diese ID dient als Pfad in der Firestore-Datenbank (`teams/<team-id>/...`). Wähle eine eindeutige ID für deine Wehr — Kleinbuchstaben und Bindestriche empfohlen, z.B. `jf-hamburg-nord`.

> `.env` nicht in Git committen — sie ist bereits in `.gitignore` eingetragen.

---

## Datenbankstruktur

JF-Coach verwendet folgende Firestore-Struktur:

```
teams/{teamId}/                    # Team-Stammdaten
teams/{teamId}/members/{id}        # Mitglieder
teams/{teamId}/lineups/{id}        # Aufstellungsvorlagen
teams/{teamId}/runs/{id}           # Trainingsläufe
teams/{teamId}/knowledge/{id}      # Teaminterne Wissenseinträge (optional)
```

---

Weiter mit der **[Deployment-Anleitung](docs/deployment.md)**.
