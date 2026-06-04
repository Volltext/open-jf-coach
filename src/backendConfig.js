// Zentrale Auflösung der Backend-Konfiguration.
//
// Es gibt zwei Wege, JF-Coach mit einem Backend zu verbinden:
//
//   1. Build-Zeit (Profi-Weg): Firebase-Werte werden als VITE_FIREBASE_*
//      Umgebungsvariablen beim Build hinterlegt. Das ist die bisherige Methode
//      und bleibt unverändert.
//   2. Laufzeit (einfacher Weg): Über den Einrichtungs-Assistenten in der App
//      trägt jede Wehr ihre eigenen Supabase-Werte ein. Diese werden im Browser
//      gespeichert, kein Build und kein Hosting nötig.
//
// Reihenfolge: Build-Zeit-Konfiguration hat Vorrang. Ist keine gesetzt, wird die
// im Browser gespeicherte Laufzeit-Konfiguration verwendet. Gibt es auch die
// nicht, zeigt die App den Einrichtungs-Assistenten.

const RUNTIME_CONFIG_KEY = 'jf-coach-backend-config';

// Liest die Firebase-Konfiguration aus den Build-Variablen. Nur vollständig
// gesetzte Konfigurationen zählen — sonst null.
export function getEnvBackendConfig() {
  const firebase = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
  const teamId = import.meta.env.VITE_FIREBASE_TEAM_ID;

  const complete = Object.values(firebase).every(Boolean) && Boolean(teamId);
  if (!complete) {
    return null;
  }

  return { provider: 'firebase', firebase, teamId };
}

// Liest die per Assistent gespeicherte Konfiguration aus dem Browser.
export function readRuntimeConfig() {
  try {
    const raw = localStorage.getItem(RUNTIME_CONFIG_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (
      parsed?.provider === 'supabase'
      && parsed.supabase?.url
      && parsed.supabase?.anonKey
      && parsed.teamId
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveRuntimeConfig(config) {
  localStorage.setItem(RUNTIME_CONFIG_KEY, JSON.stringify(config));
}

export function clearRuntimeConfig() {
  try {
    localStorage.removeItem(RUNTIME_CONFIG_KEY);
  } catch {
    // Browser ohne localStorage — ignorieren.
  }
}

// Welche Konfiguration soll die App tatsächlich verwenden?
export function resolveBackendConfig() {
  return getEnvBackendConfig() ?? readRuntimeConfig() ?? null;
}
