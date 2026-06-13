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

export const ALL_POSITIONS = [...A_PART_POSITIONS, ...B_PART_POSITIONS];

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
    fehlerCounts: {}
  };
}

// A- und B-Teil laufen als zwei unabhängige Stoppuhren parallel in derselben
// Instanz: ein Team kann den A-Teil messen, ein anderes gleichzeitig den B-Teil.
export function createEmptyStopwatchDrafts() {
  return {
    a: createEmptyStopwatchDraft('a'),
    b: createEmptyStopwatchDraft('b')
  };
}
