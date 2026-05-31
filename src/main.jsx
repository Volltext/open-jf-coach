import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_TEAM_ID',
];

const missing = REQUIRED_ENV_VARS.filter((key) => !import.meta.env[key]);

if (missing.length > 0) {
  document.getElementById('root').innerHTML = `
    <div style="font-family:sans-serif;max-width:600px;margin:4rem auto;padding:2rem;background:#1e2433;color:#f0f0f0;border-radius:12px;border:1px solid #f25c2b">
      <h2 style="color:#f25c2b;margin-top:0">⚠️ Konfiguration fehlt</h2>
      <p>Die folgenden Umgebungsvariablen sind nicht gesetzt:</p>
      <ul style="font-family:monospace;color:#fca5a5">${missing.map((k) => `<li>${k}</li>`).join('')}</ul>
      <p>Erstelle eine <code>.env</code>-Datei basierend auf <code>.env.example</code> und trage deine Firebase-Credentials ein.</p>
      <p>Anleitung: <a href="https://github.com/amgiparker/open-jf-coach/blob/main/FIREBASE_SETUP.md" style="color:#f25c2b">FIREBASE_SETUP.md</a></p>
    </div>
  `;
} else {
  registerSW({ immediate: true });

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
