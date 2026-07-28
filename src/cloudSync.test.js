import { describe, expect, it } from 'vitest';
import { extractSyncStateFromApp, mergeGesamteindruck, mergeRemoteStateIntoApp } from './cloudSync';
import { createDefaultState } from './storage';

// Der Sync muss die Erweiterung um die Leistungsspange in beide Richtungen
// überstehen: ein alter Client sendet nur { a, b } und darf die lokalen
// LSP-Drafts nicht leeren.

function stateWith(overrides) {
  const base = createDefaultState();
  return { ...base, ...overrides };
}

describe('extractSyncStateFromApp', () => {
  it('überträgt jeden Modus-Slot und den Leistungsspangen-Zustand', () => {
    const sync = extractSyncStateFromApp(createDefaultState());
    expect(Object.keys(sync.stopwatchDrafts)).toContain('a');
    expect(Object.keys(sync.stopwatchDrafts)).toContain('lsp-staffellauf');
    expect(sync.lsp.variante).toBe('gruppe');
  });

  it('rechnet die laufende Zeit uhr-unabhängig aus', () => {
    const state = createDefaultState();
    state.stopwatchDrafts.a = {
      ...state.stopwatchDrafts.a,
      isRunning: true,
      startTimestamp: Date.now() - 5000,
      elapsedMs: 0
    };
    const sync = extractSyncStateFromApp(state);
    expect(sync.stopwatchDrafts.a.elapsedMs).toBeGreaterThanOrEqual(4900);
  });
});

describe('mergeRemoteStateIntoApp', () => {
  it('behält lokale LSP-Drafts, wenn die Gegenseite sie nicht kennt', () => {
    const current = createDefaultState();
    current.stopwatchDrafts['lsp-schnelligkeit'] = {
      ...current.stopwatchDrafts['lsp-schnelligkeit'],
      elapsedMs: 58000,
      stopwatchVersion: 4
    };

    // Ein alter Client sendet nur das Paar { a, b }.
    const merged = mergeRemoteStateIntoApp(current, {
      trainingLog: [],
      deletedRuns: {},
      stopwatchDrafts: {
        a: { mode: 'a', stopwatchVersion: 9, elapsedMs: 61000 },
        b: { mode: 'b', stopwatchVersion: 0, elapsedMs: 0 }
      }
    });

    expect(merged.stopwatchDrafts['lsp-schnelligkeit'].elapsedMs).toBe(58000);
    expect(merged.stopwatchDrafts.a.elapsedMs).toBe(61000);
  });

  it('übernimmt einen LSP-Draft mit höherer Version', () => {
    const current = createDefaultState();
    const merged = mergeRemoteStateIntoApp(current, {
      trainingLog: [],
      deletedRuns: {},
      stopwatchDrafts: {
        'lsp-kugelstossen': { mode: 'lsp-kugelstossen', stopwatchVersion: 3, measuredCm: 6200 }
      }
    });
    expect(merged.stopwatchDrafts['lsp-kugelstossen'].measuredCm).toBe(6200);
  });

  it('lässt den Zustand unangetastet, wenn nichts Neues kommt', () => {
    const current = createDefaultState();
    const merged = mergeRemoteStateIntoApp(current, { trainingLog: [], deletedRuns: {} });
    expect(merged.lsp).toBe(current.lsp);
    expect(merged.stopwatchDrafts.a).toBe(current.stopwatchDrafts.a);
  });

  it('führt die Läufe beider Wettbewerbe zusammen', () => {
    const current = stateWith({
      trainingLog: [{ id: 'r1', mode: 'a', createdAt: '2024-05-01T10:00:00.000Z', totalMs: 61000 }]
    });
    const merged = mergeRemoteStateIntoApp(current, {
      trainingLog: [{ id: 'r2', mode: 'lsp-staffellauf', createdAt: '2024-05-01T11:00:00.000Z', totalMs: 213000 }],
      deletedRuns: {}
    });
    expect(merged.trainingLog.map((run) => run.id).sort()).toEqual(['r1', 'r2']);
  });
});

describe('mergeGesamteindruck', () => {
  it('lässt eine offene Fremdwertung die eigene nicht löschen', () => {
    expect(mergeGesamteindruck([3, null, null, null, null], [null, null, null, null, null]))
      .toEqual([3, null, null, null, null]);
  });

  it('übernimmt Wertungen anderer Wertungsrichter', () => {
    expect(mergeGesamteindruck([3, null, null, null, null], [null, 2, null, null, null]))
      .toEqual([3, 2, null, null, null]);
  });

  it('gibt bei unveränderten Daten dieselbe Referenz zurück', () => {
    const current = [1, 2, null, null, null];
    expect(mergeGesamteindruck(current, [1, 2, null, null, null])).toBe(current);
  });
});
