import { ALL_MODE_IDS, ALL_POSITIONS, POCKET_ARTICLES, buildEmptyAssignments, createEmptyStopwatchDraft, createEmptyStopwatchDrafts } from './domain';
import { COMPETITION_IDS, DEFAULT_COMPETITION_ID, DEFAULT_MODE_ID, isKnownMode } from './competitions';
import { LSP_VARIANTE_IDS, LSP_WERTUNGSRICHTER } from './leistungsspange';

function createDefaultGesamteindruck() {
  return LSP_WERTUNGSRICHTER.map(() => null);
}

const DB_NAME = 'jf-trainings-tracker';
const STORE_NAME = 'app';
const STATE_KEY = 'state';
const FALLBACK_KEY = 'jf-trainings-tracker-fallback';

export function createDefaultState() {
  return {
    members: [],
    lineups: {
      assignments: buildEmptyAssignments(),
      templates: []
    },
    stopwatchDrafts: createEmptyStopwatchDrafts(),
    trainingLog: [],
    deletedRuns: {},
    pocketArticles: [...POCKET_ARTICLES],
    // Leistungsspange: die Wettbewerbsform und die fünf Einzelbeurteilungen des
    // Gesamteindrucks (je Wertungsrichter/-in eine, [R] 4.5 d).
    lsp: {
      variante: 'gruppe',
      gesamteindruck: createDefaultGesamteindruck()
    },
    preferences: {
      startScreen: 'stoppuhr',
      competition: DEFAULT_COMPETITION_ID
    }
  };
}

function mergeAssignments(candidateAssignments) {
  const defaults = buildEmptyAssignments();
  if (!candidateAssignments || typeof candidateAssignments !== 'object') {
    return defaults;
  }

  for (const position of ALL_POSITIONS) {
    const value = candidateAssignments[position.id];
    defaults[position.id] = typeof value === 'string' ? value : null;
  }

  return defaults;
}

function normaliseStopwatchDraft(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return createEmptyStopwatchDraft(DEFAULT_MODE_ID);
  }

  // Unbekannte Modi fallen auf den A-Teil zurück — so überlebt ein Stand, der von
  // einer neueren Version mit weiteren Disziplinen stammt, den Ladevorgang.
  const mode = isKnownMode(candidate.mode) ? candidate.mode : DEFAULT_MODE_ID;

  return {
    ...createEmptyStopwatchDraft(mode),
    ...candidate,
    mode,
    stopwatchVersion: typeof candidate.stopwatchVersion === 'number' ? candidate.stopwatchVersion : 0,
    controllerId: typeof candidate.controllerId === 'string' ? candidate.controllerId : null,
    isRunning: Boolean(candidate.isRunning),
    startTimestamp: typeof candidate.startTimestamp === 'number' ? candidate.startTimestamp : null,
    elapsedMs: typeof candidate.elapsedMs === 'number' ? candidate.elapsedMs : 0,
    markers: Array.isArray(candidate.markers) ? candidate.markers : [],
    knotStartElapsedMs: typeof candidate.knotStartElapsedMs === 'number' ? candidate.knotStartElapsedMs : null,
    knotDurationMs: typeof candidate.knotDurationMs === 'number' ? candidate.knotDurationMs : null,
    taskTimers: (candidate.taskTimers && typeof candidate.taskTimers === 'object' && !Array.isArray(candidate.taskTimers)) ? candidate.taskTimers : {},
    notes: typeof candidate.notes === 'string' ? candidate.notes : '',
    scoringEnabled: Boolean(candidate.scoringEnabled),
    targetSeconds: typeof candidate.targetSeconds === 'number' ? candidate.targetSeconds : null,
    fehlerCounts: (candidate.fehlerCounts && typeof candidate.fehlerCounts === 'object' && !Array.isArray(candidate.fehlerCounts)) ? candidate.fehlerCounts : {},
    measuredCm: typeof candidate.measuredCm === 'number' ? candidate.measuredCm : null,
    judgePoints: typeof candidate.judgePoints === 'number' ? candidate.judgePoints : null,
    nullwertungIds: Array.isArray(candidate.nullwertungIds) ? candidate.nullwertungIds.filter((id) => typeof id === 'string') : [],
    lspVariante: LSP_VARIANTE_IDS.includes(candidate.lspVariante) ? candidate.lspVariante : null
  };
}

// Stellt für jeden bekannten Modus einen Slot her. Migriert auch Altstände, die
// noch einen einzelnen `stopwatchDraft` gespeichert haben – dieser landet in
// seinem Modus-Slot.
function normaliseStopwatchDrafts(candidate) {
  const source = candidate?.stopwatchDrafts;
  const legacy = candidate?.stopwatchDraft;
  const legacyMode = legacy && typeof legacy === 'object' && isKnownMode(legacy.mode) ? legacy.mode : DEFAULT_MODE_ID;

  const build = (mode) => {
    let raw = null;
    if (source && typeof source === 'object' && source[mode] && typeof source[mode] === 'object') {
      raw = source[mode];
    } else if (legacy && typeof legacy === 'object' && legacyMode === mode) {
      raw = legacy;
    }
    return { ...normaliseStopwatchDraft(raw), mode };
  };

  return Object.fromEntries(ALL_MODE_IDS.map((modeId) => [modeId, build(modeId)]));
}

// Fünf Einzelbeurteilungen des Gesamteindrucks, jeweils 0–4 oder noch offen (null).
function normaliseGesamteindruck(candidate) {
  const source = Array.isArray(candidate) ? candidate : [];
  return LSP_WERTUNGSRICHTER.map((_, index) => {
    const value = source[index];
    return typeof value === 'number' && value >= 0 && value <= 4 ? Math.round(value) : null;
  });
}

function normaliseLsp(candidate, defaults) {
  if (!candidate || typeof candidate !== 'object') {
    return defaults;
  }

  return {
    variante: LSP_VARIANTE_IDS.includes(candidate.variante) ? candidate.variante : defaults.variante,
    gesamteindruck: normaliseGesamteindruck(candidate.gesamteindruck)
  };
}

export function normaliseState(candidate) {
  const defaults = createDefaultState();
  if (!candidate || typeof candidate !== 'object') {
    return defaults;
  }

  return {
    members: Array.isArray(candidate.members) ? candidate.members : defaults.members,
    lineups: {
      assignments: mergeAssignments(candidate.lineups?.assignments),
      templates: Array.isArray(candidate.lineups?.templates) ? candidate.lineups.templates : defaults.lineups.templates
    },
    stopwatchDrafts: normaliseStopwatchDrafts(candidate),
    trainingLog: Array.isArray(candidate.trainingLog) ? candidate.trainingLog : defaults.trainingLog,
    deletedRuns: (candidate.deletedRuns && typeof candidate.deletedRuns === 'object' && !Array.isArray(candidate.deletedRuns)) ? candidate.deletedRuns : defaults.deletedRuns,
    pocketArticles: Array.isArray(candidate.pocketArticles) && candidate.pocketArticles.length > 0 ? candidate.pocketArticles : defaults.pocketArticles,
    lsp: normaliseLsp(candidate.lsp, defaults.lsp),
    preferences: {
      startScreen: candidate.preferences?.startScreen === 'aufstellung' ? 'aufstellung' : defaults.preferences.startScreen,
      competition: COMPETITION_IDS.includes(candidate.preferences?.competition) ? candidate.preferences.competition : defaults.preferences.competition
    }
  };
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB.'));
  });
}

async function readIndexedState() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(STATE_KEY);

    request.onsuccess = () => {
      db.close();
      resolve(request.result ?? null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error ?? new Error('Could not read app state.'));
    };
  });
}

async function writeIndexedState(state) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Could not write app state.'));
    };

    store.put(state, STATE_KEY);
  });
}

export async function loadAppState() {
  try {
    const indexedState = await readIndexedState();
    if (indexedState) {
      return normaliseState(indexedState);
    }
  } catch {
  }

  try {
    const fallback = localStorage.getItem(FALLBACK_KEY);
    if (fallback) {
      return normaliseState(JSON.parse(fallback));
    }
  } catch {
  }

  return createDefaultState();
}

export async function saveAppState(state) {
  const normalised = normaliseState(state);

  try {
    await writeIndexedState(normalised);
  } catch {
  }

  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(normalised));
  } catch {
  }
}
