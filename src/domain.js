import { LSP_DISZIPLIN_IDS } from './leistungsspange';

export const A_PART_POSITIONS = [
  { id: 'a-gruppenfuehrer', label: 'Gruppenführer (GF)', shortLabel: 'GF', section: 'A-Teil' },
  { id: 'a-melder', label: 'Melder (Me)', shortLabel: 'Me', section: 'A-Teil' },
  { id: 'a-maschinist', label: 'Maschinist (Ma)', shortLabel: 'Ma', section: 'A-Teil' },
  { id: 'a-angriffstruppfuehrer', label: 'Angriffstruppführer (ATF)', shortLabel: 'ATF', section: 'A-Teil' },
  { id: 'a-angriffstruppmann', label: 'Angriffstruppmann (ATM)', shortLabel: 'ATM', section: 'A-Teil' },
  { id: 'a-wassertruppfuehrer', label: 'Wassertruppführer (WTF)', shortLabel: 'WTF', section: 'A-Teil' },
  { id: 'a-wassertruppmann', label: 'Wassertruppmann (WTM)', shortLabel: 'WTM', section: 'A-Teil' },
  { id: 'a-schlauchtruppfuehrer', label: 'Schlauchtruppführer (STF)', shortLabel: 'STF', section: 'A-Teil' },
  { id: 'a-schlauchtruppmann', label: 'Schlauchtruppmann (STM)', shortLabel: 'STM', section: 'A-Teil' }
];

export const B_PART_POSITIONS = Array.from({ length: 9 }, (_, index) => ({
  id: `b-laeufer-${index + 1}`,
  label: `Läufer ${index + 1}`,
  shortLabel: `L${index + 1}`,
  section: 'B-Teil'
}));

// Leistungsspange: taktische Gliederung nach FwDV 3. Die Gruppe entspricht den
// Funktionen des A-Teils, die Staffel kommt ohne Melder/-in und Schlauchtrupp aus.
//
// Die Brusttuch-Nummern der Schnelligkeitsübung (1–8 bzw. 1–5, Einheitsführer/-in
// ohne Brusttuch) und der sportlichen Disziplinen (1–9 bzw. 1–6) werden bewusst
// nicht als eigene Positionen geführt: sie sind laut Richtlinie frei vergebbar und
// nicht an die taktische Funktion gebunden. Sie stehen als Ablaufhinweis in der
// Wissensdatenbank.
export const LSP_GRUPPE_POSITIONS = [
  { id: 'lsp-g-gruppenfuehrer', label: 'Gruppenführer (GF)', shortLabel: 'GF', section: 'LSP-Gruppe' },
  { id: 'lsp-g-melder', label: 'Melder (Me)', shortLabel: 'Me', section: 'LSP-Gruppe' },
  { id: 'lsp-g-maschinist', label: 'Maschinist (Ma)', shortLabel: 'Ma', section: 'LSP-Gruppe' },
  { id: 'lsp-g-angriffstruppfuehrer', label: 'Angriffstruppführer (ATF)', shortLabel: 'ATF', section: 'LSP-Gruppe' },
  { id: 'lsp-g-angriffstruppmann', label: 'Angriffstruppmann (ATM)', shortLabel: 'ATM', section: 'LSP-Gruppe' },
  { id: 'lsp-g-wassertruppfuehrer', label: 'Wassertruppführer (WTF)', shortLabel: 'WTF', section: 'LSP-Gruppe' },
  { id: 'lsp-g-wassertruppmann', label: 'Wassertruppmann (WTM)', shortLabel: 'WTM', section: 'LSP-Gruppe' },
  { id: 'lsp-g-schlauchtruppfuehrer', label: 'Schlauchtruppführer (STF)', shortLabel: 'STF', section: 'LSP-Gruppe' },
  { id: 'lsp-g-schlauchtruppmann', label: 'Schlauchtruppmann (STM)', shortLabel: 'STM', section: 'LSP-Gruppe' }
];

export const LSP_STAFFEL_POSITIONS = [
  { id: 'lsp-s-staffelfuehrer', label: 'Staffelführer (StF)', shortLabel: 'StF', section: 'LSP-Staffel' },
  { id: 'lsp-s-maschinist', label: 'Maschinist (Ma)', shortLabel: 'Ma', section: 'LSP-Staffel' },
  { id: 'lsp-s-angriffstruppfuehrer', label: 'Angriffstruppführer (ATF)', shortLabel: 'ATF', section: 'LSP-Staffel' },
  { id: 'lsp-s-angriffstruppmann', label: 'Angriffstruppmann (ATM)', shortLabel: 'ATM', section: 'LSP-Staffel' },
  { id: 'lsp-s-wassertruppfuehrer', label: 'Wassertruppführer (WTF)', shortLabel: 'WTF', section: 'LSP-Staffel' },
  { id: 'lsp-s-wassertruppmann', label: 'Wassertruppmann (WTM)', shortLabel: 'WTM', section: 'LSP-Staffel' }
];

// Zuordnung LSP-Gruppe → A-Teil, damit eine bestehende A-Teil-Aufstellung
// übernommen werden kann (die Funktionen sind deckungsgleich).
export const LSP_GRUPPE_VON_A_TEIL = {
  'lsp-g-gruppenfuehrer': 'a-gruppenfuehrer',
  'lsp-g-melder': 'a-melder',
  'lsp-g-maschinist': 'a-maschinist',
  'lsp-g-angriffstruppfuehrer': 'a-angriffstruppfuehrer',
  'lsp-g-angriffstruppmann': 'a-angriffstruppmann',
  'lsp-g-wassertruppfuehrer': 'a-wassertruppfuehrer',
  'lsp-g-wassertruppmann': 'a-wassertruppmann',
  'lsp-g-schlauchtruppfuehrer': 'a-schlauchtruppfuehrer',
  'lsp-g-schlauchtruppmann': 'a-schlauchtruppmann'
};

// Die Staffel kennt keinen Melder und keinen Schlauchtrupp; alles Übrige lässt
// sich aus dem A-Teil übernehmen.
export const LSP_STAFFEL_VON_A_TEIL = {
  'lsp-s-staffelfuehrer': 'a-gruppenfuehrer',
  'lsp-s-maschinist': 'a-maschinist',
  'lsp-s-angriffstruppfuehrer': 'a-angriffstruppfuehrer',
  'lsp-s-angriffstruppmann': 'a-angriffstruppmann',
  'lsp-s-wassertruppfuehrer': 'a-wassertruppfuehrer',
  'lsp-s-wassertruppmann': 'a-wassertruppmann'
};

export const ALL_POSITIONS = [
  ...A_PART_POSITIONS,
  ...B_PART_POSITIONS,
  ...LSP_GRUPPE_POSITIONS,
  ...LSP_STAFFEL_POSITIONS
];

// Modus-Kennungen der Stoppuhr-Drafts. Der Bundeswettbewerb behält 'a'/'b', die
// Leistungsspange bringt je Disziplin einen eigenen Slot mit.
export const BW_MODE_IDS = ['a', 'b'];
export const LSP_MODE_IDS = [...LSP_DISZIPLIN_IDS];
export const ALL_MODE_IDS = [...BW_MODE_IDS, ...LSP_MODE_IDS];

export const DEMO_MEMBERS = [
  'Leon',
  'Mia',
  'Jonas',
  'Sophie',
  'Felix',
  'Lukas',
  'Emma',
  'Hannah',
  'Paul',
  'Nele',
  'Clara',
  'Ben'
];

export const A_MODE_MARKERS = ['zu Wasser', 'Knoten Start'];
export const B_MODE_MARKERS = ['Schlauchrollen', 'L7/L8 Team', 'Anziehen'];

export const POCKET_ARTICLES = [
  {
    id: 'regel-uebertreten',
    title: 'Regelcheck: Übertreten',
    tags: ['regelwerk', 'a-teil', 'wertung'],
    content:
      'Merke: Übertreten ist erst dann relevant, wenn die markierte Grenze bewusst oder im Belastungsablauf regelwidrig verlassen wird. Für den Einsatz in der App lohnt sich eine kurze Schlagwortliste mit typischen Protestfragen.'
  },
  {
    id: 'regel-aufbaufolge',
    title: 'Ablaufhilfe: Aufbaufolge A-Teil',
    tags: ['ablauf', 'a-teil', 'spickzettel'],
    content:
      'Kurzfolge für den Trainingsplatz: Aufstellung prüfen, Startkommando, Verteiler setzen, Wasserentnahme, Leitungsaufbau, Wasser marsch, Zielgeräte kontrollieren. Diese Reihenfolge hilft beim schnellen Debriefing nach jedem Lauf.'
  },
  {
    id: 'knoten-mastwurf',
    title: 'Knoten: Mastwurf',
    tags: ['knoten', 'schrittfolge'],
    content:
      'Schritt 1: Eine Bucht bilden. Schritt 2: Zweite Bucht gegenläufig legen. Schritt 3: Beide Buchten übereinanderlegen und über das Zielobjekt stülpen. Danach Lastprobe und Sitz prüfen.'
  },
  {
    id: 'knoten-schotenstich',
    title: 'Knoten: Schotenstich',
    tags: ['knoten', 'schrittfolge'],
    content:
      'Schritt 1: Mit dem stärkeren Ende eine Bucht legen. Schritt 2: Das lose Ende von unten durch die Bucht führen. Schritt 3: Hinter beiden Parten entlang und unter sich selbst durchziehen. Festziehen und kontrollieren.'
  },
  {
    id: 'b-teil-hindernisse',
    title: 'Merkkarte: B-Teil Hindernisse',
    tags: ['b-teil', 'hindernis', 'spickzettel'],
    content:
      'Für die Trainingsanalyse genügen meist drei Zeitpunkte: Kleidung/Ausrüstung bei Läufer 3, Knoten bei Läufer 7 und Schlauchrollen bei Läufer 8. Damit trennt ihr Laufzeit und Aufgabenzeit besser.'
  }
];

export function buildEmptyAssignments() {
  return Object.fromEntries(ALL_POSITIONS.map((position) => [position.id, null]));
}

export function createEmptyStopwatchDraft(mode = 'a') {
  return {
    mode,
    stopwatchVersion: 0,
    controllerId: null,
    isRunning: false,
    startTimestamp: null,
    elapsedMs: 0,
    markers: [],
    knotStartElapsedMs: null,
    knotDurationMs: null,
    taskTimers: {},
    notes: '',
    scoringEnabled: false,
    targetSeconds: null,
    fehlerCounts: {},
    // Nur Leistungsspange: Gesamtweite beim Kugelstoßen (in Zentimetern),
    // Bewertung 0–4 bei Löschangriff und Fragenbeantwortung, angehakte
    // Nullwertungsgründe sowie die Wettbewerbsform, in der gemessen wurde.
    measuredCm: null,
    judgePoints: null,
    nullwertungIds: [],
    lspVariante: null
  };
}

// Jeder Modus hat seine eigene Stoppuhr und läuft unabhängig: im Bundeswettbewerb
// kann ein Team den A-Teil messen, während ein anderes gleichzeitig den B-Teil
// läuft; bei der Leistungsspange arbeiten die fünf Wertungsrichter/-innen parallel
// an ihren jeweiligen Disziplinen.
export function createEmptyStopwatchDrafts() {
  return Object.fromEntries(ALL_MODE_IDS.map((modeId) => [modeId, createEmptyStopwatchDraft(modeId)]));
}
