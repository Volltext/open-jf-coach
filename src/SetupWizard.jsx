import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { clearRuntimeConfig, readRuntimeConfig, saveRuntimeConfig } from './backendConfig';

// Idempotentes SQL: legt Tabelle, Zugriffsregel und Realtime an. Kann gefahrlos
// mehrfach ausgeführt werden.
const SETUP_SQL = `create table if not exists public.team_state (
  team_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.team_state enable row level security;

drop policy if exists "team_state_anon_rw" on public.team_state;
create policy "team_state_anon_rw" on public.team_state
  for all to anon using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.team_state;
exception when others then null; end $$;`;

function normaliseTeamId(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

const COLORS = {
  bg: '#1e2433',
  accent: '#f25c2b',
  text: '#f0f0f0',
  muted: '#9aa4b8',
  field: '#151a23',
  border: '#2c3446',
  error: '#fca5a5'
};

export default function SetupWizard({ onComplete }) {
  const existing = readRuntimeConfig();
  const [teamName, setTeamName] = useState(existing?.teamId ?? '');
  const [url, setUrl] = useState(existing?.supabase?.url ?? '');
  const [anonKey, setAnonKey] = useState(existing?.supabase?.anonKey ?? '');
  const [status, setStatus] = useState('idle'); // idle | testing | error
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const teamId = normaliseTeamId(teamName);
  const canSubmit = url.trim() && anonKey.trim() && teamId;

  async function copySql() {
    try {
      await navigator.clipboard.writeText(SETUP_SQL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard nicht verfügbar — Nutzer kann manuell markieren.
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setStatus('testing');
    setError('');

    try {
      const client = createClient(url.trim(), anonKey.trim(), {
        auth: { persistSession: false }
      });
      const { error: testError } = await client.from('team_state').select('team_id').limit(1);

      if (testError) {
        setStatus('error');
        setError(
          `Verbindung steht, aber die Tabelle "team_state" wurde nicht gefunden oder ist gesperrt. `
          + `Hast du das SQL aus Schritt 3 im Supabase-SQL-Editor ausgeführt? (Details: ${testError.message})`
        );
        return;
      }

      saveRuntimeConfig({
        provider: 'supabase',
        supabase: { url: url.trim(), anonKey: anonKey.trim() },
        teamId
      });
      onComplete();
    } catch (caught) {
      setStatus('error');
      setError(
        `Verbindung fehlgeschlagen. Bitte Projekt-URL und anon-Key prüfen. (Details: ${caught?.message ?? caught})`
      );
    }
  }

  function handleDisconnect() {
    clearRuntimeConfig();
    onComplete();
  }

  const fieldStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.6rem 0.75rem',
    marginTop: '0.35rem',
    background: COLORS.field,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontFamily: 'inherit'
  };

  const labelStyle = { display: 'block', marginTop: '1rem', fontSize: '0.9rem', color: COLORS.muted };

  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        maxWidth: '640px',
        margin: '2rem auto',
        padding: '2rem',
        background: COLORS.bg,
        color: COLORS.text,
        borderRadius: '12px',
        border: `1px solid ${COLORS.accent}`,
        lineHeight: 1.5
      }}
    >
      <h2 style={{ color: COLORS.accent, marginTop: 0 }}>🚒 JF-Coach einrichten</h2>
      <p>
        Damit deine Geräte synchron bleiben, braucht JF-Coach einen kostenlosen
        Datenspeicher bei <strong>Supabase</strong>. Die Einrichtung dauert ein paar Minuten —
        du machst sie nur einmal pro Jugendfeuerwehr.
      </p>

      <ol style={{ paddingLeft: '1.2rem', color: COLORS.muted }}>
        <li style={{ marginBottom: '0.5rem' }}>
          Kostenloses Konto auf{' '}
          <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: COLORS.accent }}>
            supabase.com
          </a>{' '}
          anlegen und ein neues Projekt erstellen (Region <strong>EU/Frankfurt</strong> empfohlen).
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          Im Projekt unter <strong>Settings → API</strong> die <strong>Project URL</strong> und den{' '}
          <strong>anon public</strong>-Key kopieren und unten eintragen.
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          Unter <strong>SQL Editor</strong> dieses SQL einfügen und ausführen:
          <div style={{ position: 'relative', marginTop: '0.5rem' }}>
            <pre
              style={{
                background: COLORS.field,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                padding: '0.75rem',
                overflowX: 'auto',
                fontSize: '0.8rem',
                color: COLORS.text,
                whiteSpace: 'pre'
              }}
            >
              {SETUP_SQL}
            </pre>
            <button
              type="button"
              onClick={copySql}
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                background: COLORS.accent,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.3rem 0.6rem',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              {copied ? 'Kopiert ✓' : 'Kopieren'}
            </button>
          </div>
        </li>
      </ol>

      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>
          Team-Name (eindeutig für deine Wehr)
          <input
            style={fieldStyle}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="z. B. jf-musterstadt"
            autoComplete="off"
          />
        </label>
        {teamId && teamId !== teamName && (
          <small style={{ color: COLORS.muted }}>Wird gespeichert als: <code>{teamId}</code></small>
        )}

        <label style={labelStyle}>
          Supabase Project URL
          <input
            style={fieldStyle}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xxxxx.supabase.co"
            autoComplete="off"
          />
        </label>

        <label style={labelStyle}>
          Supabase anon public Key
          <input
            style={fieldStyle}
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            placeholder="eyJhbGciOi..."
            autoComplete="off"
          />
        </label>

        {error && (
          <p style={{ color: COLORS.error, marginTop: '1rem', fontSize: '0.9rem' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || status === 'testing'}
          style={{
            marginTop: '1.5rem',
            width: '100%',
            padding: '0.8rem',
            background: canSubmit ? COLORS.accent : COLORS.border,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: canSubmit && status !== 'testing' ? 'pointer' : 'not-allowed'
          }}
        >
          {status === 'testing' ? 'Verbindung wird getestet…' : 'Verbinden & loslegen'}
        </button>
      </form>

      {existing && (
        <button
          type="button"
          onClick={handleDisconnect}
          style={{
            marginTop: '1rem',
            width: '100%',
            padding: '0.6rem',
            background: 'transparent',
            color: COLORS.muted,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Verbindung trennen
        </button>
      )}

      <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: COLORS.muted }}>
        Ausführliche Anleitung:{' '}
        <a
          href="https://github.com/amgiparker/open-jf-coach/blob/main/docs/supabase-setup.md"
          target="_blank"
          rel="noreferrer"
          style={{ color: COLORS.accent }}
        >
          docs/supabase-setup.md
        </a>
      </p>
    </div>
  );
}
