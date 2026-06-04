import { useEffect, useState } from 'react';

// Steuert den "Als App installieren"-Hinweis.
//
// - Auf Chrome/Edge/Android liefert der Browser ein `beforeinstallprompt`-Event,
//   mit dem wir die native Installation direkt anstoßen können.
// - iOS/Safari bietet kein solches Event; dort blenden wir eine kurze Anleitung ein.
// - Läuft die App bereits installiert (standalone), wird nichts angezeigt.
// - Ein einmal weggeklickter Hinweis bleibt weg (im Browser gemerkt).

const DISMISS_KEY = 'jf-coach-install-dismissed';

function detectStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  );
}

function detectIos() {
  const ua = window.navigator.userAgent || '';
  // iPadOS 13+ gibt sich als "Macintosh" aus — über Touch erkennen.
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && 'ontouchend' in document);
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [isStandalone, setIsStandalone] = useState(() => detectStandalone());
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    function onBeforeInstall(event) {
      event.preventDefault();
      setPromptEvent(event);
    }
    function onInstalled() {
      setIsStandalone(true);
      setPromptEvent(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayModeChange = () => setIsStandalone(detectStandalone());
    mediaQuery?.addEventListener?.('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      mediaQuery?.removeEventListener?.('change', onDisplayModeChange);
    };
  }, []);

  async function promptInstall() {
    if (!promptEvent) {
      return;
    }
    promptEvent.prompt();
    try {
      await promptEvent.userChoice;
    } catch {
      // Auswahl abgebrochen — Event ist trotzdem verbraucht.
    }
    setPromptEvent(null);
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Browser ohne localStorage — Hinweis bleibt für diese Sitzung weg.
    }
  }

  const isIos = detectIos();
  const canPrompt = Boolean(promptEvent);
  // Sichtbar, wenn nicht installiert, nicht weggeklickt und entweder direkt
  // installierbar oder auf iOS (dort nur mit Anleitung).
  const shouldShow = !isStandalone && !dismissed && (canPrompt || isIos);

  return { shouldShow, canPrompt, isIos, isStandalone, promptInstall, dismiss };
}
