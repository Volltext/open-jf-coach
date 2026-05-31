# Deployment-Anleitung

## Voraussetzungen

- [Node.js](https://nodejs.org/) v20 oder neuer
- Ein [Firebase-Konto](https://firebase.google.com/) (kostenlos)
- Ein Hosting-Anbieter (Netlify, Vercel oder eigener Server)

---

## Schritt 1: Firebase einrichten

Folge der Anleitung in [FIREBASE_SETUP.md](../FIREBASE_SETUP.md), um ein eigenes Firebase-Projekt anzulegen.

Am Ende hast du folgende Werte:
- `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`
- Eine selbst gewählte Team-ID (z.B. `jf-musterstadt`)

---

## Schritt 2: Repository klonen

```bash
git clone https://github.com/amgiparker/open-jf-coach.git
cd open-jf-coach
npm install
```

---

## Schritt 3: Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
```

Öffne `.env` und trage deine Firebase-Werte ein:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=mein-projekt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mein-projekt
VITE_FIREBASE_STORAGE_BUCKET=mein-projekt.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_TEAM_ID=jf-musterstadt
```

> **Hinweis zur Team-ID:** Diese ID wird als Pfad in der Firestore-Datenbank verwendet (`teams/<team-id>/state/shared`). Wähle eine eindeutige, beschreibende ID für deine Wehr. Kleinbuchstaben und Bindestriche empfohlen.

---

## Schritt 4: Lokal testen

```bash
npm run dev
```

Die App ist dann unter `http://localhost:5173` erreichbar.

---

## Schritt 5: Build erstellen

```bash
npm run build
```

Das `dist/`-Verzeichnis enthält die fertige App.

---

## Deployment auf Netlify (empfohlen)

### Option A: Per GitHub-Verknüpfung (automatisch)

1. Forke dieses Repository auf GitHub
2. Gehe zu [netlify.com](https://netlify.com) → "Add new site" → "Import an existing project"
3. Verbinde dein GitHub-Repository
4. Build-Einstellungen werden automatisch aus `netlify.toml` gelesen
5. Trage unter **Site Settings → Environment Variables** alle `VITE_*`-Variablen ein
6. Klicke "Deploy site"

Bei jedem Push auf `main` wird automatisch ein neuer Build gestartet.

### Option B: Manuelles Upload

```bash
npm run build
# dist/ Ordner auf Netlify hochladen (Drag & Drop im Dashboard)
```

---

## Deployment auf Vercel

1. Forke dieses Repository
2. Importiere es auf [vercel.com](https://vercel.com)
3. Framework: **Vite** (wird automatisch erkannt)
4. Trage alle `VITE_*`-Variablen unter Environment Variables ein
5. Deploy

---

## Firestore Sicherheitsregeln

Damit nur Nutzer deiner App auf die Daten zugreifen können, kopiere den Inhalt von [`firestore.rules`](../firestore.rules) in die Firebase Console unter **Firestore → Regeln**.

---

## Häufige Probleme

### App zeigt "Konfiguration fehlt"
Eine oder mehrere Umgebungsvariablen sind nicht gesetzt. Prüfe deine `.env`-Datei (lokal) bzw. die Environment Variables in Netlify/Vercel.

### Firebase-Fehler "permission-denied"
Die Firestore-Sicherheitsregeln sind noch auf "Testmodus" (alle dürfen alles). Kopiere die Regeln aus `firestore.rules` in die Firebase Console.

### App lädt, aber Sync funktioniert nicht
- Prüfe ob Anonymous Authentication in Firebase aktiviert ist (Authentication → Sign-in method → Anonym)
- Prüfe die Browser-Konsole auf Firebase-Fehlermeldungen
