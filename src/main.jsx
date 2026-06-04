import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import SetupWizard from './SetupWizard';
import { getEnvBackendConfig, readRuntimeConfig } from './backendConfig';
import './index.css';

// Mit "?setup" in der Adresse lässt sich der Einrichtungs-Assistent jederzeit
// erneut öffnen, um z. B. das Team zu wechseln oder Werte zu korrigieren.
const forceSetup = /[?&#]setup\b/.test(window.location.search + window.location.hash);

// Build-Zeit-Konfiguration (Firebase per .env) hat immer Vorrang und kann nicht
// über den Assistenten überschrieben werden — sie ist bewusst vom Betreiber gesetzt.
const envConfig = getEnvBackendConfig();
const runtimeConfig = readRuntimeConfig();

registerSW({ immediate: true });

const root = ReactDOM.createRoot(document.getElementById('root'));

if (!envConfig && (forceSetup || !runtimeConfig)) {
  // Kein Backend konfiguriert (oder Neukonfiguration gewünscht): Assistent zeigen.
  root.render(
    <React.StrictMode>
      <SetupWizard
        onComplete={() => {
          // Adresse bereinigen und mit der frischen Konfiguration neu starten.
          window.history.replaceState(null, '', window.location.pathname);
          window.location.reload();
        }}
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
