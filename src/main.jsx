import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import SetupWizard from './SetupWizard';
import JoinPrompt from './JoinPrompt';
import { decodeJoinPayload, getEnvBackendConfig, readRuntimeConfig } from './backendConfig';
import './index.css';

// Gespeichertes Theme (Hell/Dunkel) möglichst früh setzen, damit beim Start
// nichts kurz im falschen Farbschema aufblitzt. Standard ist das dunkle Theme.
try {
  const savedTheme = localStorage.getItem('jf-coach-theme');
  document.documentElement.setAttribute('data-theme', savedTheme === 'light' ? 'light' : 'dark');
} catch {
  document.documentElement.setAttribute('data-theme', 'dark');
}

// Mit "?setup" in der Adresse lässt sich der Einrichtungs-Assistent jederzeit
// erneut öffnen, um z. B. das Team zu wechseln oder Werte zu korrigieren.
const forceSetup = /[?&#]setup\b/.test(window.location.search + window.location.hash);

// Demo-Modus: Wurde im Assistenten „ohne Einrichtung ansehen" gewählt, läuft die
// App ohne Backend (nur lokal). Die Auswahl gilt für die laufende Tab-Sitzung.
function isDemoSelected() {
  try {
    return sessionStorage.getItem('jf-coach-demo') === '1';
  } catch {
    return false;
  }
}

function startDemo() {
  try {
    sessionStorage.setItem('jf-coach-demo', '1');
  } catch {
    // sessionStorage nicht verfügbar — Demo gilt dann nur bis zum nächsten Render.
  }
  window.history.replaceState(null, '', window.location.pathname);
  window.location.reload();
}

// Beitritts-Link (#join=… oder ?join=…): erlaubt Kameraden den Beitritt ohne Setup.
function getJoinPayload() {
  const hash = window.location.hash.replace(/^#/, '');
  return new URLSearchParams(hash).get('join') || new URLSearchParams(window.location.search).get('join');
}

// Build-Zeit-Konfiguration (Firebase per .env) hat immer Vorrang und kann nicht
// über Assistent oder Beitritts-Link überschrieben werden — sie ist bewusst vom
// Betreiber gesetzt.
const envConfig = getEnvBackendConfig();
const runtimeConfig = readRuntimeConfig();
const joinPayload = getJoinPayload();
const joinConfig = joinPayload ? decodeJoinPayload(joinPayload) : null;

registerSW({ immediate: true });

const root = ReactDOM.createRoot(document.getElementById('root'));

function cleanUrlAndReload() {
  window.history.replaceState(null, '', window.location.pathname);
  window.location.reload();
}

if (!envConfig && joinConfig) {
  // Über einen Beitritts-Link geöffnet: zur Bestätigung anbieten.
  root.render(
    <React.StrictMode>
      <JoinPrompt config={joinConfig} onCancel={cleanUrlAndReload} />
    </React.StrictMode>
  );
} else if (!envConfig && !runtimeConfig && isDemoSelected() && !forceSetup) {
  // Demo-Modus gewählt: App ohne Backend starten (nur lokaler Speicher).
  root.render(
    <React.StrictMode>
      <App isDemo />
    </React.StrictMode>
  );
} else if (!envConfig && (forceSetup || !runtimeConfig)) {
  // Kein Backend konfiguriert (oder Neukonfiguration gewünscht): Assistent zeigen.
  root.render(
    <React.StrictMode>
      <SetupWizard
        onComplete={() => {
          // Adresse bereinigen und mit der frischen Konfiguration neu starten.
          window.history.replaceState(null, '', window.location.pathname);
          window.location.reload();
        }}
        onDemo={startDemo}
      />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
