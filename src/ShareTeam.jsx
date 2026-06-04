import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { encodeJoinPayload, readRuntimeConfig } from './backendConfig';

// Zeigt einen Beitritts-Link und QR-Code, mit dem Kameraden ohne eigenes Setup
// dem Team beitreten. Die QR-Bibliothek wird nur hier bei Bedarf nachgeladen.

export default function ShareTeam({ onClose }) {
  const config = readRuntimeConfig();
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  const joinUrl = useMemo(() => {
    if (!config) {
      return '';
    }
    const payload = encodeJoinPayload(config);
    return `${window.location.origin}${window.location.pathname}#join=${payload}`;
  }, [config]);

  useEffect(() => {
    if (!joinUrl) {
      return undefined;
    }
    let active = true;
    import('qrcode')
      .then((mod) => mod.toDataURL(joinUrl, { width: 240, margin: 1 }))
      .then((dataUrl) => {
        if (active) {
          setQr(dataUrl);
        }
      })
      .catch(() => {
        // QR optional — Link funktioniert trotzdem.
      });
    return () => {
      active = false;
    };
  }, [joinUrl]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard nicht verfügbar — Nutzer kann manuell markieren.
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'JF-Coach Team', text: 'Tritt unserem JF-Coach-Team bei:', url: joinUrl });
      } catch {
        // Teilen abgebrochen — ignorieren.
      }
    } else {
      copyLink();
    }
  }

  if (!config) {
    return null;
  }

  return (
    <div className="sheet-backdrop centered" onClick={onClose}>
      <div className="confirm-panel" onClick={(event) => event.stopPropagation()}>
        <div className="card-head">
          <h3>Kameraden einladen</h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Schließen">
            <X size={20} />
          </button>
        </div>

        <p className="settings-hint">
          Teile diesen Link oder QR-Code. Wer ihn öffnet, ist sofort mit dem Team
          „{config.teamId}" verbunden — ganz ohne eigenes Setup.
        </p>

        {qr && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0 1rem' }}>
            <img
              src={qr}
              alt="QR-Code zum Beitreten"
              style={{ width: 200, height: 200, borderRadius: 12, background: '#fff', padding: 8 }}
            />
          </div>
        )}

        <input className="share-link-input" type="text" readOnly value={joinUrl} onFocus={(e) => e.target.select()} />

        <div className="share-actions">
          <button type="button" className="secondary-btn full-width-btn" onClick={copyLink}>
            {copied ? 'Link kopiert ✓' : 'Link kopieren'}
          </button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button type="button" className="secondary-btn full-width-btn" onClick={shareLink}>
              Teilen…
            </button>
          )}
        </div>

        <p className="settings-hint" style={{ marginTop: '1rem' }}>
          ⚠️ Jeder mit diesem Link kann die Team-Daten sehen und bearbeiten. Teile ihn
          nur mit Personen, die Zugriff haben sollen.
        </p>
      </div>
    </div>
  );
}
