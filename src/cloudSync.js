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

export function extractSyncStateFromApp(appState, lastWriterId = null) {
  const draft = appState.stopwatchDraft;
  // While running, draft.elapsedMs stays frozen at the start value; serialize the
  // live elapsed time so other clients (and our own echo) re-anchor correctly.
  // `lastWriterId` stamps which device produced this snapshot so the receiver can
  // tell its own echo apart from a peer's edit and re-anchor the running timer to
  // its own clock — independent of who happens to control (own) the stopwatch.
  const liveDraft = draft?.isRunning && draft.startTimestamp
    ? { ...draft, elapsedMs: Math.max(0, Date.now() - draft.startTimestamp) }
    : draft;
  const stopwatchDraft = liveDraft ? { ...liveDraft, lastWriterId } : liveDraft;

  return {
    members: appState.members,
    lineups: appState.lineups,
    trainingLog: appState.trainingLog,
    stopwatchDraft
  };
}

export function mergeRemoteStateIntoApp(currentState, remoteData) {
  const remoteStopwatch = isMeaningfulObject(remoteData.stopwatchDraft) ? remoteData.stopwatchDraft : null;
  const currentStopwatchVersion = typeof currentState.stopwatchDraft?.stopwatchVersion === 'number' ? currentState.stopwatchDraft.stopwatchVersion : 0;
  const remoteStopwatchVersion = typeof remoteStopwatch?.stopwatchVersion === 'number' ? remoteStopwatch.stopwatchVersion : -1;

  return {
    ...currentState,
    members: isMeaningfulArray(remoteData.members) ? remoteData.members : currentState.members,
    lineups: isMeaningfulObject(remoteData.lineups) ? remoteData.lineups : currentState.lineups,
    trainingLog: isMeaningfulArray(remoteData.trainingLog) ? remoteData.trainingLog : currentState.trainingLog,
    stopwatchDraft: remoteStopwatchVersion >= currentStopwatchVersion ? remoteStopwatch : currentState.stopwatchDraft
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
