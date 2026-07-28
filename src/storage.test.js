import { describe, expect, it } from 'vitest';
import { createDefaultState, normaliseState } from './storage';
import { ALL_MODE_IDS } from './domain';

// `normaliseState` ist die einzige Schemaprüfung der App: Jeder geladene und
// gespeicherte Stand läuft hier durch. Diese Tests sichern vor allem ab, dass
// Altstände die Erweiterung um die Leistungsspange unbeschadet überstehen.

describe('normaliseState', () => {
  it('legt für jeden bekannten Modus einen Stoppuhr-Slot an', () => {
    const state = normaliseState({});
    expect(Object.keys(state.stopwatchDrafts).sort()).toEqual([...ALL_MODE_IDS].sort());
    for (const mode of ALL_MODE_IDS) {
      expect(state.stopwatchDrafts[mode].mode).toBe(mode);
    }
  });

  it('behält A- und B-Teil eines Altstands mit allen Werten', () => {
    const alt = {
      members: [{ id: 'm1', name: 'Mia' }],
      stopwatchDrafts: {
        a: { mode: 'a', elapsedMs: 61000, markers: [{ id: 's1', label: 'zu Wasser', elapsedMs: 30000 }], knotDurationMs: 12000 },
        b: { mode: 'b', elapsedMs: 48000, taskTimers: { Anziehen: { startElapsedMs: 1000, endElapsedMs: 4000 } } }
      },
      trainingLog: [{ id: 'r1', mode: 'a', totalMs: 61000, createdAt: '2024-05-01T10:00:00.000Z' }]
    };

    const state = normaliseState(alt);
    expect(state.stopwatchDrafts.a.elapsedMs).toBe(61000);
    expect(state.stopwatchDrafts.a.markers).toHaveLength(1);
    expect(state.stopwatchDrafts.a.knotDurationMs).toBe(12000);
    expect(state.stopwatchDrafts.b.taskTimers.Anziehen.endElapsedMs).toBe(4000);
    expect(state.trainingLog).toHaveLength(1);
    expect(state.members).toEqual([{ id: 'm1', name: 'Mia' }]);
  });

  it('migriert einen einzelnen Legacy-Draft in seinen Modus-Slot', () => {
    const state = normaliseState({ stopwatchDraft: { mode: 'b', elapsedMs: 42000 } });
    expect(state.stopwatchDrafts.b.elapsedMs).toBe(42000);
    expect(state.stopwatchDrafts.a.elapsedMs).toBe(0);
  });

  it('fällt bei unbekanntem Modus auf den A-Teil zurück', () => {
    const state = normaliseState({ stopwatchDrafts: { a: { mode: 'irgendwas-neues', elapsedMs: 5000 } } });
    expect(state.stopwatchDrafts.a.mode).toBe('a');
  });

  it('ergänzt die neuen Leistungsspangen-Felder mit neutralen Werten', () => {
    const draft = normaliseState({}).stopwatchDrafts['lsp-kugelstossen'];
    expect(draft.measuredCm).toBeNull();
    expect(draft.judgePoints).toBeNull();
    expect(draft.nullwertungIds).toEqual([]);
    expect(draft.lspVariante).toBeNull();
  });

  it('behält gesetzte Leistungsspangen-Werte und säubert kaputte', () => {
    const state = normaliseState({
      stopwatchDrafts: {
        'lsp-kugelstossen': {
          mode: 'lsp-kugelstossen',
          measuredCm: 6120,
          judgePoints: 'drei',
          nullwertungIds: ['lsp-kugelstossen-nw-weite', 42],
          lspVariante: 'staffel'
        }
      }
    });
    const draft = state.stopwatchDrafts['lsp-kugelstossen'];
    expect(draft.measuredCm).toBe(6120);
    expect(draft.judgePoints).toBeNull();
    expect(draft.nullwertungIds).toEqual(['lsp-kugelstossen-nw-weite']);
    expect(draft.lspVariante).toBe('staffel');
  });

  it('setzt Standardwerte für den Leistungsspangen-Zustand', () => {
    const state = normaliseState({});
    expect(state.lsp.variante).toBe('gruppe');
    expect(state.lsp.gesamteindruck).toEqual([null, null, null, null, null]);
    expect(state.preferences.competition).toBe('bw');
  });

  it('prüft Wettbewerb, Wettbewerbsform und Gesamteindruck gegen gültige Werte', () => {
    const state = normaliseState({
      lsp: { variante: 'quatsch', gesamteindruck: [2, 9, 'x', null, 4] },
      preferences: { competition: 'olympia', startScreen: 'aufstellung' }
    });
    expect(state.lsp.variante).toBe('gruppe');
    expect(state.lsp.gesamteindruck).toEqual([2, null, null, null, 4]);
    expect(state.preferences.competition).toBe('bw');
    // Die bestehende Einstellung darf davon unberührt bleiben.
    expect(state.preferences.startScreen).toBe('aufstellung');
  });

  it('lässt eine gültige Leistungsspangen-Auswahl unverändert', () => {
    const state = normaliseState({
      lsp: { variante: 'staffel', gesamteindruck: [1, 2, 3, 4, 0] },
      preferences: { competition: 'lsp' }
    });
    expect(state.lsp.variante).toBe('staffel');
    expect(state.lsp.gesamteindruck).toEqual([1, 2, 3, 4, 0]);
    expect(state.preferences.competition).toBe('lsp');
  });

  it('erzeugt einen vollständigen Standardzustand', () => {
    const defaults = createDefaultState();
    expect(normaliseState(defaults)).toEqual(defaults);
  });
});
