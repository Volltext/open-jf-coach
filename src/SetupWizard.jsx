import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowRight, Check, Copy, Eye, Timer } from 'lucide-react';
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

// Demo-Auswahl auch ohne aktiven Demo-Modus sauber wieder entfernen.
function clearDemoFlag() {
  try {
    sessionStorage.removeItem('jf-coach-demo');
  } catch {
    // sessionStorage nicht verfügbar — nichts zu tun.
  }
}

export default function SetupWizard({ onComplete, onDemo }) {
  const existing = readRuntimeConfig();
  const [teamName, setTeamName] = useState(existing?.teamId ?? '');
  const [url, setUrl] = useState(existing?.supabase?.url ?? '');
  const [apiKey, setApiKey] = useState(existing?.supabase?.apiKey ?? '');
  const [status, setStatus] = useState('idle'); // idle | testing | error
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const teamId = normaliseTeamId(teamName);
  const canSubmit = url.trim() && apiKey.trim() && teamId;

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
      const client = createClient(url.trim(), apiKey.trim(), {
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
        supabase: { url: url.trim(), apiKey: apiKey.trim() },
        teamId
      });
      clearDemoFlag();
      onComplete();
    } catch (caught) {
      setStatus('error');
      setError(
        `Verbindung fehlgeschlagen. Bitte Projekt-URL und Publishable Key prüfen. (Details: ${caught?.message ?? caught})`
      );
    }
  }

  function handleDisconnect() {
    clearRuntimeConfig();
    clearDemoFlag();
    onComplete();
  }

  return (
    <div className="setup-page">
      <header className="setup-brand">
        <div className="setup-brand-badge" aria-hidden="true">
          <Timer size={26} />
        </div>
        <div>
          <h1>JF-Coach einrichten</h1>
          <p>Einmalige Einrichtung für deine Jugendfeuerwehr</p>
        </div>
      </header>

      <p className="setup-lead">
        Damit deine Geräte synchron bleiben, braucht JF-Coach einen kostenlosen
        Datenspeicher bei <strong>Supabase</strong>. Das dauert nur ein paar Minuten
        und du machst es <strong>einmal pro Wehr</strong>.
      </p>

      <article className="surface-card setup-card">
        <ol className="setup-steps">
          <li>
            Kostenloses Konto auf{' '}
            <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>{' '}
            anlegen und ein neues Projekt erstellen (Region <strong>EU/Frankfurt</strong> empfohlen).
          </li>
          <li>
            Oben im Dashboard auf <strong>Connect</strong> klicken (oder links{' '}
            <strong>Settings → API Keys</strong>). Dort findest du beides: die{' '}
            <strong>Project URL</strong> (z. B. <code>https://xxxxx.supabase.co</code>) und den{' '}
            <strong>Publishable Key</strong> (beginnt mit <code>sb_publishable_</code>). Beide unten eintragen.
          </li>
          <li>
            Unter <strong>SQL Editor</strong> dieses SQL einfügen und ausführen:
            <div className="setup-sql">
              <button type="button" className="setup-copy" onClick={copySql}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Kopiert' : 'Kopieren'}
              </button>
              <pre>{SETUP_SQL}</pre>
            </div>
          </li>
        </ol>
      </article>

      <form className="surface-card setup-card" onSubmit={handleSubmit}>
        <label className="setup-field">
          <span>Team-Name (eindeutig für deine Wehr)</span>
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="z. B. jf-musterstadt"
            autoComplete="off"
          />
          {teamId && teamId !== teamName && (
            <small className="setup-field-hint">Wird gespeichert als: <code>{teamId}</code></small>
          )}
        </label>

        <label className="setup-field">
          <span>Supabase Project URL</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xxxxx.supabase.co"
            autoComplete="off"
          />
        </label>

        <label className="setup-field">
          <span>Supabase Publishable Key</span>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sb_publishable_…"
            autoComplete="off"
          />
        </label>

        {error && <p className="setup-error">{error}</p>}

        <button type="submit" className="setup-submit" disabled={!canSubmit || status === 'testing'}>
          {status === 'testing' ? 'Verbindung wird getestet…' : (<>Verbinden &amp; loslegen <ArrowRight size={18} /></>)}
        </button>

        {existing && (
          <button type="button" className="secondary-btn full-width-btn" onClick={handleDisconnect}>
            Verbindung trennen
          </button>
        )}
      </form>

      {onDemo && (
        <>
          <div className="setup-divider">oder</div>
          <button type="button" className="secondary-btn full-width-btn" onClick={onDemo}>
            <Eye size={16} /> Erst mal ohne Einrichtung ansehen (Demo)
          </button>
          <p className="setup-footer-link">
            Im Demo-Modus läuft alles nur auf diesem Gerät — ohne Sync. Du kannst die Einrichtung jederzeit nachholen.
          </p>
        </>
      )}

      <p className="setup-footer-link">
        Ausführliche Anleitung:{' '}
        <a
          href="https://github.com/amgiparker/open-jf-coach/blob/main/docs/supabase-setup.md"
          target="_blank"
          rel="noreferrer"
        >
          docs/supabase-setup.md
        </a>
      </p>
    </div>
  );
}
