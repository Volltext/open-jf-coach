import { Database, Users } from 'lucide-react';
import { saveRuntimeConfig } from './backendConfig';

// Wird angezeigt, wenn die App über einen Beitritts-Link (#join=…) geöffnet wird.
// Bestätigt der Nutzer, übernimmt die App die mitgeschickte Verbindung und startet.

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default function JoinPrompt({ config, onCancel }) {
  function join() {
    saveRuntimeConfig(config);
    try {
      sessionStorage.removeItem('jf-coach-demo');
    } catch {
      // sessionStorage nicht verfügbar — nichts zu tun.
    }
    window.history.replaceState(null, '', window.location.pathname);
    window.location.reload();
  }

  return (
    <div className="setup-page">
      <header className="setup-brand">
        <div className="setup-brand-badge" aria-hidden="true">
          <Users size={26} />
        </div>
        <div>
          <h1>Team beitreten</h1>
          <p>Du wurdest zu einem JF-Coach-Team eingeladen</p>
        </div>
      </header>

      <article className="surface-card setup-card">
        <div className="setup-field">
          <span>Team</span>
          <strong style={{ fontSize: '1.1rem' }}>{config.teamId}</strong>
        </div>
        <div className="setup-field">
          <span>Datenspeicher</span>
          <span className="setup-field-hint">
            <Database size={13} style={{ verticalAlign: '-2px', marginRight: '0.3rem' }} />
            {safeHost(config.supabase.url)}
          </span>
        </div>

        <p className="setup-lead" style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          Nach dem Beitritt bist du sofort mit den anderen Geräten dieses Teams
          synchron — kein weiteres Setup nötig.
        </p>

        <button type="button" className="setup-submit" onClick={join}>
          Beitreten
        </button>
        <button type="button" className="secondary-btn full-width-btn" onClick={onCancel}>
          Abbrechen
        </button>
      </article>
    </div>
  );
}
