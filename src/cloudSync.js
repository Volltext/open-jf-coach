// Backend-unabhängige Sync-Schicht.
//
// `extractSyncStateFromApp` und `mergeRemoteStateIntoApp` formen nur den
// auszutauschenden Zustand und sind unabhängig vom konkreten Backend.
//
// `initCloudSync` wählt anhand der aufgelösten Konfiguration den passenden
// Adapter (Firebase oder Supabase), lädt ihn bei Bedarf nach und gibt die
// gewohnte Schnittstelle { pushState, dispose } zurück.

import { resolveBackendConfig } from './backendConfig';
import { STOPWATCH_MODE_IDS } from './competitions';

function isMeaningfulArray(value) {
  return Array.isArray(value);
}

function isMeaningfulObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

// Serialisiert einen Draft fürs Backend. While running, draft.elapsedMs stays
// frozen at the start value; we emit the live elapsed time (clock-independent) so
// other clients re-anchor the running timer to their own clock.
function serialiseDraft(draft) {
  if (!isMeaningfulObject(draft)) {
    return draft ?? null;
  }
  return draft.isRunning && draft.startTimestamp
    ? { ...draft, elapsedMs: Math.max(0, Date.now() - draft.startTimestamp) }
    : draft;
}

export function extractSyncStateFromApp(appState) {
  const drafts = appState.stopwatchDrafts ?? {};
  return {
    members: appState.members,
    lineups: appState.lineups,
    trainingLog: appState.trainingLog,
    deletedRuns: appState.deletedRuns ?? {},
    lsp: appState.lsp,
    stopwatchDrafts: Object.fromEntries(
      STOPWATCH_MODE_IDS.map((mode) => [mode, serialiseDraft(drafts[mode])])
    )
  };
}

function runTimestamp(run) {
  return run?.updatedAt ?? run?.createdAt ?? '';
}

function sameRunRefs(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

// Führt zwei Trainingsprotokolle per Lauf-ID zusammen, statt eines komplett zu
// überschreiben. So geht kein Lauf verloren, wenn zwei Geräte (z. B. A- und
// B-Team) zeitgleich speichern. Konflikte am selben Lauf entscheidet der neuere
// `updatedAt`-Stempel; gelöschte Läufe bleiben über Tombstones (`deletedRuns`)
// gelöscht und tauchen nicht wieder auf.
export function mergeTrainingLog(currentRuns, remoteRuns, currentTombstones, remoteTombstones) {
  const tombstones = { ...currentTombstones, ...remoteTombstones };

  const byId = new Map();
  const consider = (run) => {
    if (!run || !run.id) {
      return;
    }
    const existing = byId.get(run.id);
    // Aktuelle zuerst einlesen; Remote ersetzt nur bei *echt* neuerem Stempel →
    // unveränderte Echos behalten die bestehende Referenz (kein unnötiges Rendern).
    if (!existing || runTimestamp(run) > runTimestamp(existing)) {
      byId.set(run.id, run);
    }
  };
  currentRuns.forEach(consider);
  remoteRuns.forEach(consider);

  const merged = [...byId.values()]
    .filter((run) => !tombstones[run.id])
    .sort((a, b) => {
      const ca = a.createdAt ?? '';
      const cb = b.createdAt ?? '';
      if (ca === cb) {
        return 0;
      }
      return ca > cb ? -1 : 1;
    });

  const runsUnchanged = sameRunRefs(currentRuns, merged);
  const tombstonesUnchanged = Object.keys(tombstones).length === Object.keys(currentTombstones).length;

  return {
    trainingLog: runsUnchanged ? currentRuns : merged,
    deletedRuns: tombstonesUnchanged ? currentTombstones : tombstones
  };
}

// Liefert den eingehenden Draft eines Modus – berücksichtigt sowohl das neue
// Paar `stopwatchDrafts` als auch den alten Einzel-`stopwatchDraft` (Modus-Feld).
export function pickRemoteDraft(remoteData, mode) {
  const pair = remoteData?.stopwatchDrafts;
  if (isMeaningfulObject(pair) && isMeaningfulObject(pair[mode])) {
    return pair[mode];
  }
  const legacy = remoteData?.stopwatchDraft;
  if (isMeaningfulObject(legacy) && (legacy.mode === 'b' ? 'b' : 'a') === mode) {
    return legacy;
  }
  return null;
}

// Den Gesamteindruck bewerten fünf Wertungsrichter/-innen an fünf Geräten. Deshalb
// wird feldweise zusammengeführt: eine noch offene Wertung (null) von der Gegenseite
// löscht niemals eine bereits gesetzte. Nur wenn beide Seiten einen Wert haben,
// gewinnt der eingehende — dieselbe Regel wie bei der Aufstellung.
export function mergeGesamteindruck(currentWerte, remoteWerte) {
  const current = Array.isArray(currentWerte) ? currentWerte : [];
  if (!Array.isArray(remoteWerte)) {
    return current;
  }

  let changed = false;
  const merged = current.map((wert, index) => {
    const remote = remoteWerte[index];
    if (typeof remote !== 'number' || remote === wert) {
      return wert;
    }
    changed = true;
    return remote;
  });

  return changed ? merged : current;
}

function mergeLsp(currentLsp, remoteLsp) {
  if (!isMeaningfulObject(remoteLsp)) {
    return currentLsp;
  }

  const gesamteindruck = mergeGesamteindruck(currentLsp?.gesamteindruck, remoteLsp.gesamteindruck);
  const variante = typeof remoteLsp.variante === 'string' ? remoteLsp.variante : currentLsp?.variante;

  if (gesamteindruck === currentLsp?.gesamteindruck && variante === currentLsp?.variante) {
    return currentLsp;
  }
  return { ...currentLsp, variante, gesamteindruck };
}

// `reanchorDraft` darf einen frisch übernommenen, laufenden Draft auf die eigene
// Uhr umrechnen (Date.now lebt in App.jsx, damit diese Funktion rein bleibt).
//
// Wir übernehmen einen Remote-Draft nur bei *echt höherer* Version (`>`): eigene
// Echos und unveränderte Weiterleitungen des anderen Laufs tragen dieselbe Version
// und werden ignoriert – so springt eine laufende Zeitnahme nicht und ruckelt nicht.
export function mergeRemoteStateIntoApp(currentState, remoteData, reanchorDraft = (draft) => draft) {
  const mergeDraft = (mode) => {
    const remoteDraft = pickRemoteDraft(remoteData, mode);
    const currentDraft = currentState.stopwatchDrafts[mode];
    const currentVersion = typeof currentDraft?.stopwatchVersion === 'number' ? currentDraft.stopwatchVersion : 0;
    const remoteVersion = typeof remoteDraft?.stopwatchVersion === 'number' ? remoteDraft.stopwatchVersion : -1;
    return remoteDraft && remoteVersion > currentVersion ? reanchorDraft(remoteDraft) : currentDraft;
  };

  const remoteRuns = isMeaningfulArray(remoteData.trainingLog) ? remoteData.trainingLog : [];
  const remoteTombstones = isMeaningfulObject(remoteData.deletedRuns) ? remoteData.deletedRuns : {};
  const { trainingLog, deletedRuns } = mergeTrainingLog(
    currentState.trainingLog,
    remoteRuns,
    currentState.deletedRuns ?? {},
    remoteTombstones
  );

  return {
    ...currentState,
    members: isMeaningfulArray(remoteData.members) ? remoteData.members : currentState.members,
    lineups: isMeaningfulObject(remoteData.lineups) ? remoteData.lineups : currentState.lineups,
    trainingLog,
    deletedRuns,
    lsp: mergeLsp(currentState.lsp, remoteData.lsp),
    stopwatchDrafts: Object.fromEntries(
      STOPWATCH_MODE_IDS.map((mode) => [mode, mergeDraft(mode)])
    )
  };
}

export function initCloudSync(handlers) {
  const config = resolveBackendConfig();

  if (!config) {
    // Sollte nicht passieren — ohne Konfiguration zeigt die App den
    // Einrichtungs-Assistenten statt der App selbst. Defensiv abgesichert.
    handlers.onStatus?.('offline');
    return { pushState() {}, dispose() {} };
  }

  let sync = null;
  let disposed = false;
  let pendingState = null;
  let hasPending = false;

  async function start() {
    try {
      let backend;
      if (config.provider === 'firebase') {
        const { createFirebaseBackend } = await import('./backends/firebaseBackend');
        backend = createFirebaseBackend(config);
      } else {
        const { createSupabaseBackend } = await import('./backends/supabaseBackend');
        backend = createSupabaseBackend(config);
      }

      if (disposed) {
        return;
      }

      sync = backend.initSync(handlers);

      // Vor dem Laden des Adapters eingegangene Zustände nachreichen.
      if (hasPending) {
        sync.pushState(pendingState);
        hasPending = false;
        pendingState = null;
      }
    } catch (error) {
      handlers.onStatus?.('error');
      handlers.onError?.(error);
    }
  }

  start();

  return {
    pushState(syncState) {
      if (sync) {
        sync.pushState(syncState);
      } else {
        pendingState = syncState;
        hasPending = true;
      }
    },
    dispose() {
      disposed = true;
      sync?.dispose();
    }
  };
}
