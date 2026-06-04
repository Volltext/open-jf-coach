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
      && parsed.supabase?.apiKey
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

// --- Beitritts-Link (Weg 2) ---
//
// Kodiert die Verbindungsdaten möglichst kompakt und URL-sicher, damit ein einmal
// eingerichtetes Team per Link/QR-Code geteilt werden kann. Kameraden müssen so
// das Supabase-Setup nicht selbst durchlaufen.
//
// Aufbau (neues, kurzes Format):  <url|ref>~<apiKey>~<teamId>
//   - Der apiKey ist bereits ein URL-sicheres base64url-JWT. Er wird bewusst
//     NICHT erneut base64-kodiert — das hatte den Link zuvor um ~33 % aufgebläht.
//   - Die kurzen Felder (URL/Projekt-Ref und Team-ID) werden base64url-kodiert,
//     damit Sonderzeichen den Trenner „~" nicht zerstören. „~" ist URL-sicher
//     (unreserviert) und kommt weder im base64url-Alphabet noch im JWT vor.
//   - Cloud-URLs (https://<ref>.supabase.co) werden auf die reine Projekt-Ref
//     verkürzt und beim Beitritt wieder expandiert.

function padBase64(value) {
  return value + '='.repeat((4 - (value.length % 4)) % 4);
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
  const base64 = padBase64(String(value).replace(/-/g, '+').replace(/_/g, '/'));
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// Cloud-URL auf die Projekt-Ref kürzen; alles andere (self-hosted) unverändert lassen.
function shortenSupabaseUrl(url) {
  const trimmed = String(url).replace(/\/+$/, '');
  const match = /^https:\/\/([a-z0-9]+)\.supabase\.co$/i.exec(trimmed);
  return match ? match[1] : trimmed;
}

function expandSupabaseUrl(value) {
  return value.includes('://') ? value : `https://${value}.supabase.co`;
}

export function encodeJoinPayload(config) {
  return [
    toBase64Url(shortenSupabaseUrl(config.supabase.url)),
    config.supabase.apiKey,
    toBase64Url(config.teamId)
  ].join('~');
}

export function decodeJoinPayload(encoded) {
  try {
    const value = String(encoded);

    // Neues, kompaktes Format: <url|ref>~<apiKey>~<teamId>
    if (value.includes('~')) {
      const [urlPart, apiKey, teamPart] = value.split('~');
      if (!urlPart || !apiKey || !teamPart) {
        return null;
      }
      const url = expandSupabaseUrl(fromBase64Url(urlPart));
      const teamId = fromBase64Url(teamPart);
      if (url && apiKey && teamId) {
        return { provider: 'supabase', supabase: { url, apiKey }, teamId };
      }
      return null;
    }

    // Altes Format (Rückwärtskompatibilität): btoa(encodeURIComponent(json)).
    const base64 = padBase64(value.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decodeURIComponent(atob(base64)));
    if (
      parsed?.provider === 'supabase'
      && parsed.supabase?.url
      && parsed.supabase?.apiKey
      && parsed.teamId
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
