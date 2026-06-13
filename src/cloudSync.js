// Backend-unabhängige Sync-Schicht.
//
// `extractSyncStateFromApp` und `mergeRemoteStateIntoApp` formen nur den
// auszutauschenden Zustand und sind unabhängig vom konkreten Backend.
//
// `initCloudSync` wählt anhand der aufgelösten Konfiguration den passenden
// Adapter (Firebase oder Supabase), lädt ihn bei Bedarf nach und gibt die
// gewohnte Schnittstelle { pushState, dispose } zurück.

import { resolveBackendConfig } from './backendConfig';

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
    stopwatchDrafts: {
      a: serialiseDraft(drafts.a),
      b: serialiseDraft(drafts.b)
    }
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

  return {
    ...currentState,
    members: isMeaningfulArray(remoteData.members) ? remoteData.members : currentState.members,
    lineups: isMeaningfulObject(remoteData.lineups) ? remoteData.lineups : currentState.lineups,
    trainingLog: isMeaningfulArray(remoteData.trainingLog) ? remoteData.trainingLog : currentState.trainingLog,
    stopwatchDrafts: {
      a: mergeDraft('a'),
      b: mergeDraft('b')
    }
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
