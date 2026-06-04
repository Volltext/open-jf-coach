import { saveRuntimeConfig } from './backendConfig';

// Wird angezeigt, wenn die App über einen Beitritts-Link (#join=…) geöffnet wird.
// Bestätigt der Nutzer, übernimmt die App die mitgeschickte Verbindung und startet.

const COLORS = {
  bg: '#1e2433',
  accent: '#f25c2b',
  text: '#f0f0f0',
  muted: '#9aa4b8',
  border: '#2c3446'
};

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
    window.history.replaceState(null, '', window.location.pathname);
    window.location.reload();
  }

  const buttonBase = {
    width: '100%',
    padding: '0.8rem',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer'
  };

  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        maxWidth: '460px',
        margin: '3rem auto',
        padding: '2rem',
        background: COLORS.bg,
        color: COLORS.text,
        borderRadius: '12px',
        border: `1px solid ${COLORS.accent}`,
        lineHeight: 1.5
      }}
    >
      <h2 style={{ color: COLORS.accent, marginTop: 0 }}>🚒 Team beitreten</h2>
      <p>
        Du wurdest eingeladen, JF-Coach mit folgendem Team zu nutzen:
      </p>
      <div
        style={{
          margin: '1rem 0',
          padding: '0.9rem 1rem',
          background: '#151a23',
          border: `1px solid ${COLORS.border}`,
          borderRadius: '8px'
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{config.teamId}</div>
        <div style={{ color: COLORS.muted, fontSize: '0.85rem', marginTop: '0.2rem' }}>
          Datenspeicher: {safeHost(config.supabase.url)}
        </div>
      </div>
      <p style={{ color: COLORS.muted, fontSize: '0.85rem' }}>
        Danach bist du sofort mit den anderen Geräten dieses Teams synchron — kein
        weiteres Setup nötig.
      </p>

      <button
        type="button"
        onClick={join}
        style={{ ...buttonBase, marginTop: '1rem', background: COLORS.accent, color: '#fff' }}
      >
        Beitreten
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          ...buttonBase,
          marginTop: '0.75rem',
          background: 'transparent',
          color: COLORS.muted,
          border: `1px solid ${COLORS.border}`
        }}
      >
        Abbrechen
      </button>
    </div>
  );
}
