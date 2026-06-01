# Deployment-Anleitung

## Voraussetzungen

- [Node.js](https://nodejs.org/) v20 oder neuer
- Firebase-Projekt eingerichtet → [FIREBASE_SETUP.md](../FIREBASE_SETUP.md)

---

## Schritt 1: Repository klonen und Abhängigkeiten installieren

```bash
git clone https://github.com/amgiparker/open-jf-coach.git
cd open-jf-coach
npm install
```

---

## Schritt 2: Umgebungsvariablen setzen

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

---

## Schritt 3: Lokal testen

```bash
npm run dev
```

App unter `http://localhost:5173` prüfen — Sync und Offline-Verhalten testen.

---

## Schritt 4: Build erstellen

```bash
npm run build
```

Das fertige `dist/`-Verzeichnis kann jetzt auf einen Hoster hochgeladen werden.

---

## Hosting

### Netlify (empfohlen)

**Option A — Automatisch via GitHub:**

1. Repository auf GitHub forken
2. [netlify.com](https://netlify.com) → "Add new site" → "Import an existing project"
3. GitHub-Repository verbinden
4. Build-Einstellungen werden automatisch aus `netlify.toml` übernommen
5. Unter **Site Settings → Environment Variables** alle `VITE_*`-Variablen eintragen
6. "Deploy site" klicken

Bei jedem Push auf `main` wird automatisch ein neuer Build ausgelöst.

**Option B — Manuell:**

```bash
npm run build
# dist/-Ordner per Drag & Drop im Netlify-Dashboard hochladen
```

---

### Vercel

1. Repository forken
2. Auf [vercel.com](https://vercel.com) importieren (Framework **Vite** wird automatisch erkannt)
3. Alle `VITE_*`-Variablen unter **Environment Variables** eintragen
4. Deploy

---

## Fehlerbehebung

| Problem | Lösung |
|---|---|
| „Konfiguration fehlt" | Eine oder mehrere `VITE_*`-Variablen fehlen. `.env`-Datei bzw. Hosting-Einstellungen prüfen. |
| Firebase-Fehler „permission-denied" | Sicherheitsregeln aus `firestore.rules` in die Firebase Console kopieren. |
| App lädt, Sync funktioniert nicht | In Firebase prüfen: **Authentication → Anmeldemethoden → Anonym** aktiviert? Außerdem Browser-Konsole auf Firebase-Fehlermeldungen prüfen. |
