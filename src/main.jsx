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
  // Fehler-Banner per DOM-API aufbauen (kein innerHTML), damit dynamische
  // Werte garantiert als Text und nicht als Markup interpretiert werden.
  const root = document.getElementById('root');
  root.textContent = '';

  const panel = document.createElement('div');
  panel.style.cssText =
    'font-family:sans-serif;max-width:600px;margin:4rem auto;padding:2rem;background:#1e2433;color:#f0f0f0;border-radius:12px;border:1px solid #f25c2b';

  const heading = document.createElement('h2');
  heading.style.cssText = 'color:#f25c2b;margin-top:0';
  heading.textContent = '⚠️ Konfiguration fehlt';

  const intro = document.createElement('p');
  intro.textContent = 'Die folgenden Umgebungsvariablen sind nicht gesetzt:';

  const list = document.createElement('ul');
  list.style.cssText = 'font-family:monospace;color:#fca5a5';
  for (const key of missing) {
    const item = document.createElement('li');
    item.textContent = key;
    list.appendChild(item);
  }

  const hint = document.createElement('p');
  hint.append('Erstelle eine ');
  const envCode = document.createElement('code');
  envCode.textContent = '.env';
  hint.append(envCode, '-Datei basierend auf ');
  const exampleCode = document.createElement('code');
  exampleCode.textContent = '.env.example';
  hint.append(exampleCode, ' und trage deine Firebase-Credentials ein.');

  const link = document.createElement('p');
  link.append('Anleitung: ');
  const anchor = document.createElement('a');
  anchor.href = 'https://github.com/amgiparker/open-jf-coach/blob/main/FIREBASE_SETUP.md';
  anchor.style.color = '#f25c2b';
  anchor.textContent = 'FIREBASE_SETUP.md';
  link.appendChild(anchor);

  panel.append(heading, intro, list, hint, link);
  root.appendChild(panel);
} else {
  registerSW({ immediate: true });

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
