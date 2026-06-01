import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart2,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Download,
  Link as LinkIcon,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  Timer,
  Trash2,
  Users,
  X,
  XCircle
} from 'lucide-react';
import {
  ALL_POSITIONS,
  A_MODE_MARKERS,
  A_PART_POSITIONS,
  B_MODE_MARKERS,
  B_PART_POSITIONS,
  DEMO_MEMBERS,
  buildEmptyAssignments,
  createEmptyStopwatchDraft
} from './domain';
import { KNOT_GUIDES, POSITION_GUIDES, RULE_ENTRIES } from './knowledge';
import { computeScore, getScoringConfig, resolveFehlerList, sumFehlerpunkte } from './scoring';
import { extractSyncStateFromApp, initCloudSync, mergeRemoteStateIntoApp } from './cloudSync';
import { createDefaultState, loadAppState, saveAppState, normaliseState } from './storage';

const DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

const DEVICE_ID_STORAGE_KEY = 'jf-coach-device-id';

function getOrCreateDeviceId() {
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) {
      return existing;
    }
    const created = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

// Schützt CSV-Zellen vor Formel-Injektion (Excel/Sheets führen führende
// = + @ - bzw. Tab/CR als Formel aus) und maskiert Anführungszeichen.
function escapeCsvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDuration(ms) {
  const totalMs = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const deciseconds = Math.floor((totalMs % 1000) / 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${deciseconds}`;
}

function parseTargetToSeconds(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes(':')) {
    const [minutePart, secondPart] = trimmed.split(':');
    const minutes = Number.parseInt(minutePart, 10) || 0;
    const seconds = Number.parseInt(secondPart, 10) || 0;
    return minutes * 60 + seconds;
  }
  const asSeconds = Number.parseInt(trimmed, 10);
  return Number.isFinite(asSeconds) ? asSeconds : null;
}

function formatSecondsToInput(seconds) {
  if (typeof seconds !== 'number') {
    return '';
  }
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

// Numerische Tastaturen bieten keinen Doppelpunkt. Wir maskieren die reine
// Zifferneingabe zu mm:ss, sodass die letzten zwei Ziffern immer die Sekunden
// sind (Uhrzeit-Logik): "230" -> "2:30", "50" -> "50", "1230" -> "12:30".
function maskTimeInput(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, -2)}:${digits.slice(-2)}`;
}

function getDisplayName(memberId, memberMap, record) {
  if (!memberId) {
    return 'Nicht besetzt';
  }

  return memberMap[memberId]?.name ?? record?.lineupSnapshot?.memberNames?.[memberId] ?? 'Unbekannt';
}

function App() {
  const [appState, setAppState] = useState(() => createDefaultState());
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('stopwatch');
  const [lineupTab, setLineupTab] = useState('A');
  const [analysisView, setAnalysisView] = useState('history');
  const [knowledgeView, setKnowledgeView] = useState('positions');
  const [positionKnowledgeTab, setPositionKnowledgeTab] = useState('A');
  const [knowledgeQuery, setKnowledgeQuery] = useState('');
  const [showMemberManager, setShowMemberManager] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState(null);
  const [swapSourceId, setSwapSourceId] = useState(null);
  const [expandedGuideId, setExpandedGuideId] = useState(null);
  const [memberDraft, setMemberDraft] = useState('');
  const [templateDraft, setTemplateDraft] = useState('');
  const [now, setNow] = useState(Date.now());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState(null);
  const [editingRunNotes, setEditingRunNotes] = useState(null);
  const [syncStatus, setSyncStatus] = useState('offline');
  const [fehlerSearch, setFehlerSearch] = useState('');
  const [expandedFehlerGroup, setExpandedFehlerGroup] = useState(null);
  const [targetInput, setTargetInput] = useState('');
  const [toast, setToast] = useState(null);
  const [pendingDeleteRunId, setPendingDeleteRunId] = useState(null);
  const [syncBannerCollapsed, setSyncBannerCollapsed] = useState(false);

  const cloudRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const cloudReadyRef = useRef(false);
  const suppressNextCloudPushRef = useRef(false);
  const lastCloudPushAtRef = useRef(0);
  const deviceIdRef = useRef(getOrCreateDeviceId());

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      const loadedState = await loadAppState();
      if (cancelled) {
        return;
      }

      setAppState(loadedState);
      if (loadedState.preferences?.startScreen === 'aufstellung') {
        setActiveTab('lineup');
      }
      setIsLoaded(true);
    }

    initialise();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    saveAppState(appState);

    if (!cloudReadyRef.current || !cloudRef.current?.pushState) {
      return;
    }

    if (suppressNextCloudPushRef.current) {
      suppressNextCloudPushRef.current = false;
      return;
    }

    const nowTs = Date.now();
    if (appState.stopwatchDraft.isRunning && nowTs - lastCloudPushAtRef.current < 350) {
      return;
    }

    lastCloudPushAtRef.current = nowTs;

    cloudRef.current.pushState(extractSyncStateFromApp(appState));
  }, [appState, isLoaded]);

  useEffect(() => {
    if (!isLoaded) {
      return undefined;
    }

    const cloud = initCloudSync({
      onStatus: (status) => setSyncStatus(status),
      onReady: () => {
        cloudReadyRef.current = true;
      },
      onRemoteState: (remoteData) => {
        suppressNextCloudPushRef.current = true;

        const remoteStopwatch = remoteData?.stopwatchDraft;
        // Our own echo carries our authoritative startTimestamp (same clock) — re-anchoring
        // it would reset the running timer. Only re-anchor timers driven by other devices.
        const controlledByThisDevice = Boolean(remoteStopwatch?.controllerId)
          && remoteStopwatch.controllerId === deviceIdRef.current;
        const patchedRemoteData = (remoteStopwatch && remoteStopwatch.isRunning
          && typeof remoteStopwatch.elapsedMs === 'number' && !controlledByThisDevice)
          ? {
              ...remoteData,
              stopwatchDraft: {
                ...remoteStopwatch,
                // Re-anchor on each other client to avoid cross-device clock skew.
                startTimestamp: Date.now() - remoteStopwatch.elapsedMs
              }
            }
          : remoteData;

        setAppState((currentState) => {
          const merged = mergeRemoteStateIntoApp(currentState, patchedRemoteData);
          if (
            merged.members === currentState.members
            && merged.lineups === currentState.lineups
            && merged.trainingLog === currentState.trainingLog
            && merged.stopwatchDraft === currentState.stopwatchDraft
          ) {
            return currentState;
          }
          return merged;
        });
      },
      onError: () => {
        setSyncStatus('error');
      }
    });

    cloudRef.current = cloud;

    return () => {
      cloud.dispose();
      cloudRef.current = null;
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!appState.stopwatchDraft.isRunning) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 50);

    return () => {
      window.clearInterval(timerId);
    };
  }, [appState.stopwatchDraft.isRunning]);

  useEffect(() => {
    if (!appState.stopwatchDraft.isRunning || !navigator.wakeLock) {
      return undefined;
    }

    let wakeLock = null;
    navigator.wakeLock.request('screen').then((lock) => {
      wakeLock = lock;
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.wakeLock) {
        navigator.wakeLock.request('screen').then((lock) => {
          wakeLock = lock;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLock?.release();
    };
  }, [appState.stopwatchDraft.isRunning]);

  useEffect(() => {
    const target = appState.stopwatchDraft.targetSeconds;
    setTargetInput((current) => {
      if (parseTargetToSeconds(current) === target) {
        return current;
      }
      return target === null ? '' : formatSecondsToInput(target);
    });
  }, [appState.stopwatchDraft.targetSeconds]);

  // Sync-Banner bei stabiler Verbindung nach kurzer Zeit einklappen, damit es im
  // Normalbetrieb keinen Platz belegt. Fehler/Offline/Verbinden bleiben sichtbar.
  useEffect(() => {
    if (syncStatus !== 'connected') {
      setSyncBannerCollapsed(false);
      return undefined;
    }
    const timerId = window.setTimeout(() => setSyncBannerCollapsed(true), 2500);
    return () => window.clearTimeout(timerId);
  }, [syncStatus]);

  useEffect(() => () => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
  }, []);

  function showToast(message) {
    setToast(message);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2600);
  }

  const memberMap = useMemo(
    () => Object.fromEntries(appState.members.map((member) => [member.id, member])),
    [appState.members]
  );

  const currentPositions = lineupTab === 'A' ? A_PART_POSITIONS : B_PART_POSITIONS;
  const selectedPosition = currentPositions.find((position) => position.id === selectedPositionId) ?? null;
  const stopwatchDraft = appState.stopwatchDraft;
  const elapsedMs = stopwatchDraft.isRunning && stopwatchDraft.startTimestamp
    ? Math.max(0, now - stopwatchDraft.startTimestamp)
    : stopwatchDraft.elapsedMs;
  const isTimerControlledByOther = stopwatchDraft.isRunning
    && Boolean(stopwatchDraft.controllerId)
    && stopwatchDraft.controllerId !== deviceIdRef.current;

  const liveKnotDurationMs = stopwatchDraft.mode === 'a' && stopwatchDraft.knotStartElapsedMs !== null
    ? Math.max(0, elapsedMs - stopwatchDraft.knotStartElapsedMs)
    : stopwatchDraft.knotDurationMs;

  const markerButtons = stopwatchDraft.mode === 'a'
    ? [
        { label: A_MODE_MARKERS[0], icon: LinkIcon },
        { label: A_MODE_MARKERS[1], icon: Shield }
      ]
    : [
        { label: B_MODE_MARKERS[0], icon: Shield },
        { label: B_MODE_MARKERS[1], icon: LinkIcon },
        { label: B_MODE_MARKERS[2], icon: CircleDashed }
      ];

  const scoringConfig = getScoringConfig(stopwatchDraft.mode);
  const fehlerpunkte = sumFehlerpunkte(stopwatchDraft.mode, stopwatchDraft.fehlerCounts);
  const score = computeScore(stopwatchDraft.mode, elapsedMs, stopwatchDraft.targetSeconds, fehlerpunkte);
  const resolvedFehler = resolveFehlerList(stopwatchDraft.mode, stopwatchDraft.fehlerCounts);
  const fehlerQuery = fehlerSearch.trim().toLowerCase();
  const filteredFehlerGroups = fehlerQuery
    ? scoringConfig.groups
        .map((group) => ({ ...group, errors: group.errors.filter((entry) => entry.label.toLowerCase().includes(fehlerQuery)) }))
        .filter((group) => group.errors.length > 0)
    : scoringConfig.groups;

  const runs = appState.trainingLog;

  const matrix = useMemo(() => {
    const result = {};

    for (const member of appState.members) {
      result[member.id] = Object.fromEntries(ALL_POSITIONS.map((position) => [position.id, 0]));
    }

    for (const run of runs) {
      const lineup = run.lineupSnapshot?.assignments ?? {};
      for (const [positionId, memberId] of Object.entries(lineup)) {
        if (memberId && result[memberId] && typeof result[memberId][positionId] === 'number') {
          result[memberId][positionId] += 1;
        }
      }
    }

    return result;
  }, [appState.members, runs]);

  const maxMatrixCount = useMemo(() => {
    let maxCount = 0;
    for (const counts of Object.values(matrix)) {
      for (const count of Object.values(counts)) {
        if (count > maxCount) {
          maxCount = count;
        }
      }
    }
    return maxCount || 1;
  }, [matrix]);

  const filteredRules = useMemo(() => {
    const query = knowledgeQuery.trim().toLowerCase();
    if (!query) {
      return RULE_ENTRIES;
    }

    return RULE_ENTRIES.filter((entry) => {
      const haystack = `${entry.title} ${entry.category} ${entry.summary} ${entry.details.join(' ')} ${entry.keywords.join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [knowledgeQuery]);

  const filteredGuides = useMemo(() => {
    const query = knowledgeQuery.trim().toLowerCase();
    const source = POSITION_GUIDES.filter((guide) => guide.section === (positionKnowledgeTab === 'A' ? 'A-Teil' : 'B-Teil'));

    if (!query) {
      return source;
    }

    return source.filter((guide) => {
      const haystack = `${guide.title} ${guide.shortLabel} ${guide.section} ${guide.duties.join(' ')} ${guide.watchouts.join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [knowledgeQuery, positionKnowledgeTab]);

  const filteredKnots = useMemo(() => {
    const query = knowledgeQuery.trim().toLowerCase();
    if (!query) {
      return KNOT_GUIDES;
    }

    return KNOT_GUIDES.filter((knot) => {
      const haystack = `${knot.title} ${knot.steps.join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [knowledgeQuery]);

  function updateState(updater) {
    setAppState((currentState) => updater(currentState));
  }

  function updateAssignments(updater) {
    updateState((currentState) => ({
      ...currentState,
      lineups: {
        ...currentState.lineups,
        assignments: updater(currentState.lineups.assignments)
      }
    }));
  }

  function addMember() {
    const trimmedName = memberDraft.trim();
    if (!trimmedName) {
      return;
    }

    updateState((currentState) => ({
      ...currentState,
      members: [...currentState.members, { id: crypto.randomUUID(), name: trimmedName }]
    }));
    setMemberDraft('');
  }

  function removeMember(memberId) {
    updateState((currentState) => ({
      ...currentState,
      members: currentState.members.filter((member) => member.id !== memberId),
      lineups: {
        assignments: Object.fromEntries(
          Object.entries(currentState.lineups.assignments).map(([positionId, assignedMemberId]) => [
            positionId,
            assignedMemberId === memberId ? null : assignedMemberId
          ])
        ),
        templates: currentState.lineups.templates.map((template) => ({
          ...template,
          assignments: Object.fromEntries(
            Object.entries(template.assignments).map(([positionId, assignedMemberId]) => [
              positionId,
              assignedMemberId === memberId ? null : assignedMemberId
            ])
          )
        }))
      }
    }));
  }

  function handlePositionTap(positionId) {
    const memberId = appState.lineups.assignments[positionId];

    if (swapSourceId === positionId) {
      setSwapSourceId(null);
      return;
    }

    if (swapSourceId && swapSourceId !== positionId) {
      updateAssignments((currentAssignments) => {
        const nextAssignments = { ...currentAssignments };
        const firstId = nextAssignments[swapSourceId];
        nextAssignments[swapSourceId] = nextAssignments[positionId];
        nextAssignments[positionId] = firstId;
        return nextAssignments;
      });
      setSwapSourceId(null);
      setSelectedPositionId(null);
      return;
    }

    if (memberId) {
      setSwapSourceId(positionId);
      return;
    }

    setSelectedPositionId(positionId);
  }

  function assignMemberToPosition(positionId, memberId) {
    const positionGroup = currentPositions.map((position) => position.id);

    updateAssignments((currentAssignments) => {
      const nextAssignments = { ...currentAssignments };
      for (const id of positionGroup) {
        if (nextAssignments[id] === memberId) {
          nextAssignments[id] = null;
        }
      }
      nextAssignments[positionId] = memberId;
      return nextAssignments;
    });

    setSelectedPositionId(null);
    setSwapSourceId(null);
  }

  function clearAssignment(positionId) {
    updateAssignments((currentAssignments) => ({
      ...currentAssignments,
      [positionId]: null
    }));
    setSelectedPositionId(null);
    setSwapSourceId(null);
  }

  function saveTemplate() {
    const trimmedName = templateDraft.trim();
    if (!trimmedName) {
      return;
    }

    updateState((currentState) => ({
      ...currentState,
      lineups: {
        ...currentState.lineups,
        templates: [
          {
            id: crypto.randomUUID(),
            name: trimmedName,
            createdAt: new Date().toISOString(),
            assignments: { ...currentState.lineups.assignments }
          },
          ...currentState.lineups.templates
        ]
      }
    }));
    setTemplateDraft('');
  }

  function applyTemplate(template) {
    updateAssignments(() => ({ ...buildEmptyAssignments(), ...template.assignments }));
  }

  function updateStopwatchDraft(updater) {
    updateState((currentState) => ({
      ...currentState,
      stopwatchDraft: updater(currentState.stopwatchDraft)
    }));
  }

  function stopMainTimer() {
    if (isTimerControlledByOther) {
      return;
    }

    updateStopwatchDraft((currentDraft) => ({
      ...currentDraft,
      stopwatchVersion: (currentDraft.stopwatchVersion ?? 0) + 1,
      controllerId: null,
      isRunning: false,
      startTimestamp: null,
      elapsedMs,
      knotDurationMs:
        currentDraft.mode === 'a' && currentDraft.knotStartElapsedMs !== null
          ? Math.max(0, elapsedMs - currentDraft.knotStartElapsedMs)
          : currentDraft.knotDurationMs
    }));
  }

  function toggleTimer() {
    if (stopwatchDraft.isRunning) {
      stopMainTimer();
      return;
    }

    const startTimestamp = Date.now() - elapsedMs;
    setNow(Date.now());
    updateStopwatchDraft((currentDraft) => ({
      ...currentDraft,
      stopwatchVersion: (currentDraft.stopwatchVersion ?? 0) + 1,
      controllerId: deviceIdRef.current,
      isRunning: true,
      startTimestamp
    }));
  }

  function requestResetTimer() {
    if (isTimerControlledByOther) {
      return;
    }

    const hasTaskTimers = stopwatchDraft.taskTimers && Object.values(stopwatchDraft.taskTimers).some((t) => t !== null);
    const hasFehler = stopwatchDraft.fehlerCounts && Object.values(stopwatchDraft.fehlerCounts).some((count) => count > 0);
    const hasData = elapsedMs > 0 || stopwatchDraft.markers.length > 0 || stopwatchDraft.knotDurationMs !== null || stopwatchDraft.knotStartElapsedMs !== null || hasTaskTimers || hasFehler;
    if (!hasData) {
      updateStopwatchDraft((currentDraft) => ({
        ...createEmptyStopwatchDraft(currentDraft.mode),
        scoringEnabled: currentDraft.scoringEnabled,
        targetSeconds: currentDraft.targetSeconds,
        stopwatchVersion: (currentDraft.stopwatchVersion ?? 0) + 1
      }));
      return;
    }
    setShowResetConfirm(true);
  }

  function confirmResetTimer() {
    if (isTimerControlledByOther) {
      return;
    }

    updateStopwatchDraft((currentDraft) => ({
      ...createEmptyStopwatchDraft(currentDraft.mode),
      scoringEnabled: currentDraft.scoringEnabled,
      targetSeconds: currentDraft.targetSeconds,
      stopwatchVersion: (currentDraft.stopwatchVersion ?? 0) + 1
    }));
    setShowResetConfirm(false);
  }

  function setTimerMode(mode) {
    if (stopwatchDraft.isRunning || isTimerControlledByOther) {
      return;
    }
    updateStopwatchDraft((currentDraft) => ({
      ...createEmptyStopwatchDraft(mode),
      scoringEnabled: currentDraft.scoringEnabled,
      stopwatchVersion: (currentDraft.stopwatchVersion ?? 0) + 1
    }));
    setShowResetConfirm(false);
  }

  function addSplit(label) {
    if (!stopwatchDraft.isRunning || isTimerControlledByOther) {
      return;
    }

    // B-Teil: each button is a mini-timer (start on first tap, stop on second)
    if (stopwatchDraft.mode === 'b') {
      updateStopwatchDraft((d) => {
        const existing = d.taskTimers?.[label];
        if (!existing) {
          return {
            ...d,
            stopwatchVersion: (d.stopwatchVersion ?? 0) + 1,
            taskTimers: { ...d.taskTimers, [label]: { startElapsedMs: elapsedMs, endElapsedMs: null } }
          };
        }
        if (existing.endElapsedMs === null) {
          return {
            ...d,
            stopwatchVersion: (d.stopwatchVersion ?? 0) + 1,
            taskTimers: { ...d.taskTimers, [label]: { ...existing, endElapsedMs: elapsedMs } }
          };
        }
        return d;
      });
      return;
    }

    // A-Teil
    if (label === 'Knoten Start') {
      if (stopwatchDraft.knotStartElapsedMs !== null) {
        return;
      }

      updateStopwatchDraft((currentDraft) => ({
        ...currentDraft,
        stopwatchVersion: (currentDraft.stopwatchVersion ?? 0) + 1,
        knotStartElapsedMs: elapsedMs,
        markers: [{ id: crypto.randomUUID(), label, elapsedMs }, ...currentDraft.markers]
      }));
      return;
    }

    updateStopwatchDraft((currentDraft) => ({
      ...currentDraft,
      stopwatchVersion: (currentDraft.stopwatchVersion ?? 0) + 1,
      markers: [{ id: crypto.randomUUID(), label, elapsedMs }, ...currentDraft.markers]
    }));
  }

  // Einzelne A-Teil-Zwischenzeit entfernen (z. B. nach Fehltipp). Wird der
  // "Knoten Start"-Marker entfernt, muss auch die laufende Knotenmessung zurück.
  function removeMarker(markerId) {
    if (isTimerControlledByOther) {
      return;
    }
    updateStopwatchDraft((currentDraft) => {
      const target = currentDraft.markers.find((marker) => marker.id === markerId);
      if (!target) {
        return currentDraft;
      }
      const isKnotStart = target.label === 'Knoten Start';
      return {
        ...currentDraft,
        stopwatchVersion: (currentDraft.stopwatchVersion ?? 0) + 1,
        markers: currentDraft.markers.filter((marker) => marker.id !== markerId),
        knotStartElapsedMs: isKnotStart ? null : currentDraft.knotStartElapsedMs,
        knotDurationMs: isKnotStart ? null : currentDraft.knotDurationMs
      };
    });
  }

  // B-Teil-Aufgabentimer zurücksetzen, damit eine versehentlich gestoppte
  // Aufgabe erneut gemessen werden kann.
  function resetTaskTimer(label) {
    if (isTimerControlledByOther) {
      return;
    }
    updateStopwatchDraft((currentDraft) => {
      if (!currentDraft.taskTimers?.[label]) {
        return currentDraft;
      }
      const nextTimers = { ...currentDraft.taskTimers };
      delete nextTimers[label];
      return {
        ...currentDraft,
        stopwatchVersion: (currentDraft.stopwatchVersion ?? 0) + 1,
        taskTimers: nextTimers
      };
    });
  }

  function toggleScoring() {
    if (isTimerControlledByOther) {
      return;
    }
    updateStopwatchDraft((currentDraft) => ({
      ...currentDraft,
      stopwatchVersion: (currentDraft.stopwatchVersion ?? 0) + 1,
      scoringEnabled: !currentDraft.scoringEnabled
    }));
  }

  function handleTargetInput(raw) {
    const masked = maskTimeInput(raw);
    setTargetInput(masked);
    if (isTimerControlledByOther) {
      return;
    }
    const seconds = parseTargetToSeconds(masked);
    updateStopwatchDraft((currentDraft) => ({
      ...currentDraft,
      stopwatchVersion: (currentDraft.stopwatchVersion ?? 0) + 1,
      targetSeconds: seconds
    }));
  }

  function addFehler(errorId) {
    if (isTimerControlledByOther) {
      return;
    }
    updateStopwatchDraft((currentDraft) => ({
      ...currentDraft,
      stopwatchVersion: (currentDraft.stopwatchVersion ?? 0) + 1,
      fehlerCounts: {
        ...currentDraft.fehlerCounts,
        [errorId]: (currentDraft.fehlerCounts?.[errorId] ?? 0) + 1
      }
    }));
  }

  function removeFehler(errorId) {
    if (isTimerControlledByOther) {
      return;
    }
    updateStopwatchDraft((currentDraft) => {
      const current = currentDraft.fehlerCounts?.[errorId] ?? 0;
      if (current <= 0) {
        return currentDraft;
      }
      const nextCounts = { ...currentDraft.fehlerCounts };
      if (current - 1 <= 0) {
        delete nextCounts[errorId];
      } else {
        nextCounts[errorId] = current - 1;
      }
      return {
        ...currentDraft,
        stopwatchVersion: (currentDraft.stopwatchVersion ?? 0) + 1,
        fehlerCounts: nextCounts
      };
    });
  }

  function saveRun() {
    if (isTimerControlledByOther) {
      return;
    }

    if (stopwatchDraft.isRunning || elapsedMs <= 0) {
      return;
    }

    const memberNames = Object.fromEntries(appState.members.map((member) => [member.id, member.name]));
    const scoring = stopwatchDraft.scoringEnabled ? { ...score, fehler: resolvedFehler } : null;

    updateState((currentState) => ({
      ...currentState,
      trainingLog: [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          mode: currentState.stopwatchDraft.mode,
          totalMs: elapsedMs,
          markers: currentState.stopwatchDraft.markers,
          knotDurationMs: currentState.stopwatchDraft.knotDurationMs,
          taskTimers: currentState.stopwatchDraft.taskTimers ?? {},
          notes: currentState.stopwatchDraft.notes,
          scoring,
          lineupSnapshot: {
            assignments: { ...currentState.lineups.assignments },
            memberNames
          }
        },
        ...currentState.trainingLog
      ],
      stopwatchDraft: {
        ...createEmptyStopwatchDraft(currentState.stopwatchDraft.mode),
        scoringEnabled: currentState.stopwatchDraft.scoringEnabled,
        targetSeconds: currentState.stopwatchDraft.targetSeconds,
        stopwatchVersion: (currentState.stopwatchDraft.stopwatchVersion ?? 0) + 1
      }
    }));

    showToast('Lauf gespeichert ✓');
  }

  function toggleGuide(guideId) {
    setExpandedGuideId((current) => (current === guideId ? null : guideId));
  }

  function deleteRun(runId) {
    updateState((currentState) => ({
      ...currentState,
      trainingLog: currentState.trainingLog.filter((run) => run.id !== runId)
    }));
    setExpandedRunId(null);
    setPendingDeleteRunId(null);
    showToast('Eintrag gelöscht');
  }

  function updateRunNotes(runId, notes) {
    updateState((currentState) => ({
      ...currentState,
      trainingLog: currentState.trainingLog.map((run) => run.id === runId ? { ...run, notes } : run)
    }));
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jf-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.members)) {
          // Backup-Inhalt vor der Übernahme validieren/reparieren, damit
          // ungültige oder manipulierte Felder auf sichere Defaults fallen.
          updateState(() => normaliseState(parsed));
        } else {
          alert('Ungültige Backup-Datei.');
        }
      } catch {
        alert('Fehler beim Lesen der Backup-Datei.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function loadDemoMembers() {
    updateState((currentState) => {
      const existingNames = new Set(currentState.members.map((m) => m.name));
      const toAdd = DEMO_MEMBERS.filter((name) => !existingNames.has(name)).map((name) => ({ id: crypto.randomUUID(), name }));
      return { ...currentState, members: [...currentState.members, ...toAdd] };
    });
  }

  function exportTrainingLogCSV() {
    const rows = [['Datum', 'Modus', 'Zeit (s)', 'Wertung', 'Vorgabe', 'Fehlerpunkte', 'Notizen', 'Aufstellung']];

    for (const run of appState.trainingLog) {
      const date = new Date(run.createdAt).toLocaleString('de-DE');
      const mode = run.mode === 'a' ? 'A-Teil' : 'B-Teil';
      const totalSec = (run.totalMs / 1000).toFixed(2);
      const scoring = run.scoring?.total ?? '';
      const vorgabe = run.scoring?.vorgabe ?? '';
      const fehler = run.scoring?.fehlerpunkte ?? '';
      const notes = run.notes ?? '';
      const lineup = Object.entries(run.lineupSnapshot?.assignments ?? {})
        .filter(([, id]) => Boolean(id))
        .map(([posId, memberId]) => {
          const pos = ALL_POSITIONS.find((p) => p.id === posId);
          const name = getDisplayName(memberId, memberMap, run);
          return `${pos?.shortLabel ?? posId}:${name}`;
        })
        .join(' ');
      rows.push([date, mode, totalSec, scoring, vorgabe, fehler, notes, lineup]);
    }

    const csv = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jf-coach-protokoll-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mockup-app-shell">
      <main className="app-main">
        <div className={`sync-banner ${syncStatus} ${syncBannerCollapsed ? 'collapsed' : ''}`} role="status" aria-live="polite">
          <strong>Sync:</strong>{' '}
          {syncStatus === 'connected' && 'Verbunden'}
          {syncStatus === 'syncing' && 'Synchronisiert...'}
          {syncStatus === 'connecting' && 'Verbinde...'}
          {syncStatus === 'error' && 'Fehler'}
          {syncStatus === 'offline' && 'Offline'}
        </div>

        {activeTab === 'lineup' && (
          <section className="tab-screen">
            <div className="section-head">
              <h2>Aufstellung</h2>
              <button type="button" className="icon-button" onClick={() => setShowMemberManager((current) => !current)}>
                <Users size={22} />
              </button>
            </div>

            {showMemberManager && (
              <article className="surface-card stacked-card">
                <div className="card-head">
                  <h3>Mitglieder verwalten</h3>
                </div>
                <div className="add-member-row">
                  <input
                    type="text"
                    value={memberDraft}
                    onChange={(event) => setMemberDraft(event.target.value)}
                    placeholder="Neuer Name"
                  />
                  <button type="button" className="accent-square" onClick={addMember}>
                    <Plus size={18} />
                  </button>
                </div>
                <div className="member-pill-wrap">
                  {appState.members.map((member) => (
                    <div key={member.id} className="member-pill">
                      <span>{member.name}</span>
                      <button type="button" onClick={() => removeMember(member.id)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {appState.members.length === 0 && (
                  <button type="button" className="secondary-btn full-width-btn" onClick={loadDemoMembers}>
                    Demo-Mitglieder laden
                  </button>
                )}
              </article>
            )}

            <div className="segmented-bar">
              <button type="button" className={lineupTab === 'A' ? 'active' : ''} onClick={() => setLineupTab('A')}>
                A-Teil
              </button>
              <button type="button" className={lineupTab === 'B' ? 'active' : ''} onClick={() => setLineupTab('B')}>
                B-Teil
              </button>
            </div>

            {swapSourceId ? (
              <div className="info-banner warning">Tausch aktiv. Tippe jetzt eine zweite Position an.</div>
            ) : (
              <div className="info-banner">Freie Positionen öffnen die Namensliste. Besetzte Positionen starten einen Schnelltausch.</div>
            )}

            <div className="position-list">
              {currentPositions.map((position) => {
                const assignedMemberId = appState.lineups.assignments[position.id];
                const assignedMember = assignedMemberId ? memberMap[assignedMemberId] : null;
                const isL7 = lineupTab === 'B' && position.id === 'b-laeufer-7';
                const isTeamMember = lineupTab === 'B' && (position.id === 'b-laeufer-7' || position.id === 'b-laeufer-8');
                return (
                  <Fragment key={position.id}>
                    {isL7 && <div className="position-section-label">Team-Aufgabe</div>}
                    <button
                      type="button"
                      className={`position-row ${assignedMember ? 'filled' : 'empty'} ${swapSourceId === position.id ? 'selected' : ''} ${isTeamMember ? 'team-member-row' : ''}`}
                      onClick={() => handlePositionTap(position.id)}
                    >
                      <div className="position-row-main">
                        <div className={`role-badge ${assignedMember ? 'active' : ''}`}>{position.shortLabel}</div>
                        <div>
                          <span className="role-title">{position.label}</span>
                          <strong>{assignedMember ? assignedMember.name : 'Nicht besetzt'}</strong>
                        </div>
                      </div>
                      {assignedMember ? (
                        <span
                          className="remove-link"
                          onClick={(event) => {
                            event.stopPropagation();
                            clearAssignment(position.id);
                          }}
                        >
                          <XCircle size={18} />
                        </span>
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>
                  </Fragment>
                );
              })}
            </div>

            <article className="surface-card stacked-card">
              <div className="card-head">
                <h3>Vorlagen</h3>
                <span className="soft-count">{appState.lineups.templates.length}</span>
              </div>
              <div className="add-member-row">
                <input
                  type="text"
                  value={templateDraft}
                  onChange={(event) => setTemplateDraft(event.target.value)}
                  placeholder="Vorlagenname"
                />
                <button type="button" className="accent-square" onClick={saveTemplate}>
                  <Save size={18} />
                </button>
              </div>
              <div className="template-stack">
                {appState.lineups.templates.length === 0 && <p className="empty-copy">Noch keine Vorlage gespeichert.</p>}
                {appState.lineups.templates.map((template) => (
                  <div key={template.id} className="template-row">
                    <div>
                      <strong>{template.name}</strong>
                      <p>{DATE_FORMATTER.format(new Date(template.createdAt))}</p>
                    </div>
                    <button type="button" className="chip-action" onClick={() => applyTemplate(template)}>
                      Laden
                    </button>
                  </div>
                ))}
              </div>
            </article>

            <article className="surface-card stacked-card">
              <h3>Einstellungen &amp; Daten</h3>
              <div className="settings-row">
                <span>Startseite</span>
                <div className="segmented-compact">
                  <button
                    type="button"
                    className={appState.preferences?.startScreen !== 'aufstellung' ? 'active' : ''}
                    onClick={() => updateState((s) => ({ ...s, preferences: { ...s.preferences, startScreen: 'stoppuhr' } }))}
                  >Stoppuhr</button>
                  <button
                    type="button"
                    className={appState.preferences?.startScreen === 'aufstellung' ? 'active' : ''}
                    onClick={() => updateState((s) => ({ ...s, preferences: { ...s.preferences, startScreen: 'aufstellung' } }))}
                  >Aufstellung</button>
                </div>
              </div>
              <div className="settings-action-row">
                <button type="button" className="secondary-btn" onClick={exportBackup}>
                  <Download size={15} /> Backup exportieren
                </button>
                <label className="secondary-btn backup-import-label">
                  <Download size={15} style={{ transform: 'rotate(180deg)' }} /> Backup importieren
                  <input type="file" accept=".json" style={{ display: 'none' }} onChange={importBackup} />
                </label>
              </div>
            </article>
          </section>
        )}

        {activeTab === 'stopwatch' && (
          <section className="tab-screen">
            <div className="section-head">
              <h2>Stoppuhr</h2>
              <div className="segmented-compact">
                <button type="button" className={stopwatchDraft.mode === 'a' ? 'active' : ''} onClick={() => setTimerMode('a')}>
                  A
                </button>
                <button type="button" className={stopwatchDraft.mode === 'b' ? 'active' : ''} onClick={() => setTimerMode('b')}>
                  B
                </button>
              </div>
            </div>

            <article className="surface-card timer-display-card">
              <p className="timer-title">{stopwatchDraft.mode === 'a' ? 'A-Teil Lauf' : 'B-Teil Lauf'}</p>
              <div className="timer-value" role="timer" aria-label={`Laufzeit ${formatDuration(elapsedMs)}`}>{formatDuration(elapsedMs)}</div>
              {stopwatchDraft.mode === 'a' && (
                <div className="knot-status-band">
                  <span>Knotenzeit</span>
                  <strong>{liveKnotDurationMs !== null ? formatDuration(liveKnotDurationMs) : '--:--,-'}</strong>
                  {stopwatchDraft.knotStartElapsedMs !== null && stopwatchDraft.isRunning && <em>läuft</em>}
                </div>
              )}
            </article>

            <div className="timer-actions-grid">
              <button
                type="button"
                className={`huge-action ${stopwatchDraft.isRunning ? 'stop' : 'start'}`}
                onClick={toggleTimer}
                disabled={isTimerControlledByOther}
              >
                {stopwatchDraft.isRunning ? 'STOPP' : 'START'}
              </button>
              <div className="secondary-actions">
                <button type="button" className="secondary-action" onClick={requestResetTimer} disabled={isTimerControlledByOther}>
                  <RotateCcw size={16} /> Reset
                </button>
                <button
                  type="button"
                  className="secondary-action save"
                  onClick={saveRun}
                  disabled={elapsedMs === 0 || stopwatchDraft.isRunning || isTimerControlledByOther}
                >
                  <Save size={16} /> Speichern
                </button>
              </div>
            </div>

            {isTimerControlledByOther && (
              <div className="info-banner warning">Timer wird auf einem anderen Gerät gesteuert.</div>
            )}

            <article className="surface-card stacked-card">
              <h3>{stopwatchDraft.mode === 'a' ? 'Zwischenzeiten' : 'Sonderaufgaben B-Teil'}</h3>

              <div className={`split-button-grid ${stopwatchDraft.mode === 'b' ? 'b-part' : ''}`}>
                {markerButtons.map((button) => {
                  const Icon = button.icon;

                  if (stopwatchDraft.mode === 'b') {
                    const taskTimer = stopwatchDraft.taskTimers?.[button.label];
                    const isTaskRunning = Boolean(taskTimer && taskTimer.endElapsedMs === null);
                    const isTaskDone = Boolean(taskTimer && taskTimer.endElapsedMs !== null);
                    const taskDurationMs = isTaskRunning
                      ? elapsedMs - taskTimer.startElapsedMs
                      : isTaskDone
                      ? taskTimer.endElapsedMs - taskTimer.startElapsedMs
                      : null;
                    return (
                      <button
                        key={button.label}
                        type="button"
                        className={`split-button ${isTaskRunning ? 'task-running' : ''} ${isTaskDone ? 'task-done' : ''}`}
                        onClick={() => addSplit(button.label)}
                        disabled={isTaskDone || isTimerControlledByOther}
                      >
                        <Icon size={18} />
                        <span>{button.label}</span>
                        {taskDurationMs !== null && (
                          <em className="task-timer-value">{formatDuration(taskDurationMs)}</em>
                        )}
                      </button>
                    );
                  }

                  const isKnotButton = button.label === 'Knoten Start';
                  const knotAlreadyRunning = isKnotButton && stopwatchDraft.knotStartElapsedMs !== null;
                  return (
                    <button
                      key={button.label}
                      type="button"
                      className={`split-button ${knotAlreadyRunning ? 'active-knot' : ''}`}
                      onClick={() => addSplit(button.label)}
                      disabled={knotAlreadyRunning || isTimerControlledByOther}
                    >
                      <Icon size={18} />
                      <span>{button.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="split-list">
                {stopwatchDraft.mode === 'b' ? (
                  Object.entries(stopwatchDraft.taskTimers ?? {}).filter(([, t]) => t && t.endElapsedMs !== null).length === 0
                    ? <p className="empty-copy">Tippe auf einen Button um die Aufgabe zu stoppen.</p>
                    : Object.entries(stopwatchDraft.taskTimers ?? {})
                        .filter(([, t]) => t && t.endElapsedMs !== null)
                        .map(([label, t]) => (
                          <div key={label} className="split-row">
                            <span>{label}</span>
                            <div className="split-row-right">
                              <strong>{formatDuration(t.endElapsedMs - t.startElapsedMs)}</strong>
                              <button
                                type="button"
                                className="split-row-remove"
                                onClick={() => resetTaskTimer(label)}
                                disabled={isTimerControlledByOther}
                                aria-label={`Aufgabe ${label} zurücksetzen`}
                              >
                                <RotateCcw size={15} />
                              </button>
                            </div>
                          </div>
                        ))
                ) : (
                  <>
                    {stopwatchDraft.markers.length === 0 && <p className="empty-copy">Noch keine Zwischenzeiten erfasst.</p>}
                    {stopwatchDraft.markers.map((split) => (
                      <div key={split.id} className="split-row">
                        <span>{split.label}</span>
                        <div className="split-row-right">
                          <strong>{formatDuration(split.elapsedMs)}</strong>
                          <button
                            type="button"
                            className="split-row-remove"
                            onClick={() => removeMarker(split.id)}
                            disabled={isTimerControlledByOther}
                            aria-label={`Zwischenzeit ${split.label} entfernen`}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {stopwatchDraft.knotDurationMs !== null && (
                      <div className="split-row emphasis-row">
                        <span>Knotenzeit gesamt</span>
                        <strong>{formatDuration(stopwatchDraft.knotDurationMs)}</strong>
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>

            <article className="surface-card stacked-card">
              <h3>Notizen zum Lauf</h3>
              <textarea
                className="run-notes-input"
                placeholder="Beobachtungen, Besonderheiten, Verbesserungen…"
                rows={3}
                value={stopwatchDraft.notes}
                disabled={isTimerControlledByOther}
                onChange={(e) => updateStopwatchDraft((d) => ({ ...d, notes: e.target.value }))}
              />
            </article>

            <article className="surface-card stacked-card scoring-card">
              <div className="scoring-head">
                <h3><Award size={16} /> Wettkampf-Wertung</h3>
                <button
                  type="button"
                  className={`scoring-switch ${stopwatchDraft.scoringEnabled ? 'on' : ''}`}
                  onClick={toggleScoring}
                  disabled={isTimerControlledByOther}
                  aria-pressed={stopwatchDraft.scoringEnabled}
                >
                  <span className="scoring-switch-knob" />
                </button>
              </div>

              {stopwatchDraft.scoringEnabled && (
                <>
                  <div className="score-summary" aria-live="polite">
                    <div className="score-total">
                      <strong>{score.total}</strong>
                      <span>von {score.vorgabe} Punkten</span>
                    </div>
                    <div className="score-breakdown">
                      <span>{score.vorgabe} Vorgabe</span>
                      <span className="neg">− {score.fehlerpunkte} Fehler</span>
                      {score.targetSeconds !== null && (
                        <span className={score.timeAdjust >= 0 ? 'pos' : 'neg'}>
                          {score.timeAdjust >= 0 ? '+ ' : '− '}{Math.abs(score.timeAdjust)} Zeit
                        </span>
                      )}
                    </div>
                  </div>

                  <label className="target-time-row">
                    <span>{stopwatchDraft.mode === 'a' ? 'Vorgabezeit' : 'Soll-Zeit'} (mm:ss)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="z. B. 230 → 2:30"
                      value={targetInput}
                      onChange={(event) => handleTargetInput(event.target.value)}
                      disabled={isTimerControlledByOther}
                      aria-label={`${stopwatchDraft.mode === 'a' ? 'Vorgabezeit' : 'Soll-Zeit'} in Minuten und Sekunden, nur Ziffern eingeben`}
                    />
                  </label>

                  <div className="scoring-subhead">Schnellzugriff</div>
                  <div className="quick-fehler-grid">
                    {scoringConfig.quick.map((entry) => {
                      const count = stopwatchDraft.fehlerCounts?.[entry.id] ?? 0;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          className={`quick-fehler ${count > 0 ? 'active' : ''}`}
                          onClick={() => addFehler(entry.id)}
                          disabled={isTimerControlledByOther}
                        >
                          {count > 0 && <span className="fehler-badge">{count}</span>}
                          <span className="quick-fehler-label">{entry.label}</span>
                          <em>{entry.points} P.</em>
                        </button>
                      );
                    })}
                  </div>

                  <div className="fehler-search">
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Alle Fehler durchsuchen…"
                      value={fehlerSearch}
                      onChange={(event) => setFehlerSearch(event.target.value)}
                    />
                  </div>

                  <div className="fehler-groups">
                    {filteredFehlerGroups.length === 0 && <p className="empty-copy">Kein Fehler gefunden.</p>}
                    {filteredFehlerGroups.map((group) => {
                      const isOpen = Boolean(fehlerQuery) || expandedFehlerGroup === group.id;
                      return (
                        <div key={group.id} className="fehler-group">
                          <button
                            type="button"
                            className={`fehler-group-head ${isOpen ? 'open' : ''}`}
                            onClick={() => setExpandedFehlerGroup((current) => (current === group.id ? null : group.id))}
                          >
                            <span>{group.title}</span>
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          {isOpen && (
                            <div className="fehler-list">
                              {group.errors.map((entry) => {
                                const count = stopwatchDraft.fehlerCounts?.[entry.id] ?? 0;
                                return (
                                  <div key={entry.id} className={`fehler-row ${count > 0 ? 'active' : ''}`}>
                                    <button
                                      type="button"
                                      className="fehler-row-main"
                                      onClick={() => addFehler(entry.id)}
                                      disabled={isTimerControlledByOther}
                                    >
                                      <span>{entry.label}{entry.perCase ? ' · je Fall' : ''}</span>
                                      <em>{entry.points} P.</em>
                                    </button>
                                    <div className="fehler-stepper">
                                      <button type="button" onClick={() => removeFehler(entry.id)} disabled={count === 0 || isTimerControlledByOther} aria-label="weniger">
                                        <Minus size={14} />
                                      </button>
                                      <strong>{count}</strong>
                                      <button type="button" onClick={() => addFehler(entry.id)} disabled={isTimerControlledByOther} aria-label="mehr">
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {resolvedFehler.length > 0 && (
                    <div className="recorded-fehler">
                      <div className="scoring-subhead">Erfasste Fehler · {score.fehlerpunkte} P.</div>
                      {resolvedFehler.map((entry) => (
                        <div key={entry.id} className="recorded-row">
                          <span>{entry.count > 1 ? `${entry.count}× ` : ''}{entry.label}</span>
                          <div className="recorded-right">
                            <strong>{entry.total} P.</strong>
                            <button type="button" onClick={() => removeFehler(entry.id)} disabled={isTimerControlledByOther} aria-label="entfernen">
                              <Minus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </article>
          </section>
        )}

        {activeTab === 'analysis' && (
          <section className="tab-screen">
            <div className="section-head">
              <h2>Analyse</h2>
            </div>

            <div className="segmented-bar">
              <button type="button" className={analysisView === 'history' ? 'active' : ''} onClick={() => setAnalysisView('history')}>
                Tagebuch
              </button>
              <button type="button" className={analysisView === 'matrix' ? 'active' : ''} onClick={() => setAnalysisView('matrix')}>
                Positions-Matrix
              </button>
            </div>

            {analysisView === 'history' ? (
              <div className="history-stack">
                {runs.length > 0 && (() => {
                  const aRuns = runs.filter((r) => r.mode === 'a');
                  const bRuns = runs.filter((r) => r.mode === 'b');
                  const avg = (arr) => arr.length === 0 ? null : Math.round(arr.reduce((s, r) => s + r.totalMs, 0) / arr.length);
                  const best = (arr) => arr.length === 0 ? null : Math.min(...arr.map((r) => r.totalMs));
                  return (
                    <article className="surface-card stacked-card stats-summary-card">
                      <h3>Übersicht</h3>
                      <div className="stats-grid">
                        {aRuns.length > 0 && <>
                          <div className="stats-cell"><span>A-Teil Läufe</span><strong>{aRuns.length}</strong></div>
                          <div className="stats-cell"><span>Ø A-Teil</span><strong>{formatDuration(avg(aRuns))}</strong></div>
                          <div className="stats-cell"><span>Beste A-Zeit</span><strong>{formatDuration(best(aRuns))}</strong></div>
                        </>}
                        {bRuns.length > 0 && <>
                          <div className="stats-cell"><span>B-Teil Läufe</span><strong>{bRuns.length}</strong></div>
                          <div className="stats-cell"><span>Ø B-Teil</span><strong>{formatDuration(avg(bRuns))}</strong></div>
                          <div className="stats-cell"><span>Beste B-Zeit</span><strong>{formatDuration(best(bRuns))}</strong></div>
                        </>}
                      </div>
                      <button type="button" className="secondary-btn" onClick={exportTrainingLogCSV}>
                        <Download size={15} /> Protokoll als CSV exportieren
                      </button>
                    </article>
                  );
                })()}
                {runs.length === 0 && <p className="empty-copy large">Noch keine Trainingsläufe gespeichert.</p>}
                {runs.map((run) => {
                  const isExpanded = expandedRunId === run.id;
                  return (
                    <article key={run.id} className="surface-card history-card history-accordion-card">
                      <button
                        type="button"
                        className={`history-summary-row ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => setExpandedRunId((current) => (current === run.id ? null : run.id))}
                      >
                        <div className="history-summary-left">
                          <span className={`mode-pill ${run.mode === 'a' ? 'a' : 'b'}`}>{run.mode === 'a' ? 'A-Teil' : 'B-Teil'}</span>
                          <p>{DATE_FORMATTER.format(new Date(run.createdAt))}</p>
                        </div>
                        <div className="history-summary-right">
                          {run.scoring && <span className="score-pill">{run.scoring.total} P.</span>}
                          <strong>{formatDuration(run.totalMs)}</strong>
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="history-details">
                          {run.markers?.length > 0 && (
                            <div className="split-list compact">
                              {run.markers.map((split) => (
                                <div key={split.id} className="split-row">
                                  <span>{split.label}</span>
                                  <strong>{formatDuration(split.elapsedMs)}</strong>
                                </div>
                              ))}
                            </div>
                          )}
                          {run.mode === 'b' && run.taskTimers && Object.values(run.taskTimers).some((t) => t?.endElapsedMs !== null) && (
                            <div className="split-list compact">
                              {Object.entries(run.taskTimers)
                                .filter(([, t]) => t && t.endElapsedMs !== null)
                                .map(([label, t]) => (
                                  <div key={label} className="split-row">
                                    <span>{label}</span>
                                    <strong>{formatDuration(t.endElapsedMs - t.startElapsedMs)}</strong>
                                  </div>
                                ))}
                            </div>
                          )}
                          {run.mode === 'a' && run.knotDurationMs !== null && (
                            <div className="split-row emphasis-row compact-top">
                              <span>Knotenzeit gesamt</span>
                              <strong>{formatDuration(run.knotDurationMs)}</strong>
                            </div>
                          )}
                          {run.scoring && (
                            <div className="history-scoring">
                              <div className="score-line">
                                <span>Geschätzte Wertung</span>
                                <strong>{run.scoring.total} / {run.scoring.vorgabe} P.</strong>
                              </div>
                              <div className="score-sub">
                                {run.scoring.vorgabe} Vorgabe − {run.scoring.fehlerpunkte} Fehler
                                {run.scoring.targetSeconds !== null && (run.scoring.timeAdjust >= 0
                                  ? ` + ${run.scoring.timeAdjust} Zeit`
                                  : ` − ${Math.abs(run.scoring.timeAdjust)} Zeit`)}
                              </div>
                              {run.scoring.fehler?.length > 0 && (
                                <div className="split-list compact">
                                  {run.scoring.fehler.map((entry) => (
                                    <div key={entry.id} className="split-row">
                                      <span>{entry.count > 1 ? `${entry.count}× ` : ''}{entry.label}</span>
                                      <strong>{entry.total} P.</strong>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="history-lineup">
                            {Object.entries(run.lineupSnapshot?.assignments ?? {})
                              .filter(([, memberId]) => Boolean(memberId))
                              .map(([positionId, memberId]) => {
                                const position = ALL_POSITIONS.find((entry) => entry.id === positionId);
                                return (
                                  <span key={positionId} className="mini-pill">
                                    {position?.shortLabel ?? position?.label}: {getDisplayName(memberId, memberMap, run)}
                                  </span>
                                );
                              })}
                          </div>
                          <div className="history-notes-edit">
                            {editingRunNotes === run.id ? (
                              <>
                                <textarea
                                  className="run-notes-input"
                                  rows={3}
                                  autoFocus
                                  defaultValue={run.notes ?? ''}
                                  onChange={(e) => updateRunNotes(run.id, e.target.value)}
                                />
                                <button type="button" className="secondary-btn" onClick={(e) => { e.stopPropagation(); setEditingRunNotes(null); }}>
                                  Fertig
                                </button>
                              </>
                            ) : (
                              <button type="button" className="secondary-btn" onClick={(e) => { e.stopPropagation(); setEditingRunNotes(run.id); }}>
                                {run.notes ? `Notiz: ${run.notes.slice(0, 40)}${run.notes.length > 40 ? '…' : ''}` : 'Notiz hinzufügen'}
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            className="history-delete-btn"
                            onClick={(e) => { e.stopPropagation(); setPendingDeleteRunId(run.id); }}
                          >
                            <Trash2 size={14} /> Eintrag löschen
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <article className="surface-card matrix-card">
                <div className="matrix-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        {A_PART_POSITIONS.map((position) => <th key={position.id}>{position.shortLabel}</th>)}
                        {B_PART_POSITIONS.map((position) => <th key={position.id}>{position.shortLabel}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {appState.members.map((member) => (
                        <tr key={member.id}>
                          <th>{member.name}</th>
                          {ALL_POSITIONS.map((position) => {
                            const count = matrix[member.id]?.[position.id] ?? 0;
                            const opacity = count === 0 ? 0 : Math.max(0.2, count / maxMatrixCount);
                            return (
                              <td key={position.id}>
                                <div className="heat-cell" style={{ opacity }} />
                                <span>{count > 0 ? count : '-'}</span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="matrix-caption">Je stärker die Fläche, desto häufiger wurde die Position im Training belegt.</p>
              </article>
            )}
          </section>
        )}

        {activeTab === 'knowledge' && (
          <section className="tab-screen">
            <div className="section-head">
              <h2>Wissensdatenbank</h2>
            </div>

            <label className="search-shell">
              <Search size={18} />
              <input
                type="search"
                value={knowledgeQuery}
                onChange={(event) => setKnowledgeQuery(event.target.value)}
                placeholder="Regeln, Knoten oder Positionen suchen"
              />
            </label>

            <div className="segmented-bar knowledge-tabs">
              <button type="button" className={knowledgeView === 'rules' ? 'active' : ''} onClick={() => setKnowledgeView('rules')}>
                Regeln
              </button>
              <button type="button" className={knowledgeView === 'positions' ? 'active' : ''} onClick={() => setKnowledgeView('positions')}>
                Positionen
              </button>
              <button type="button" className={knowledgeView === 'knots' ? 'active' : ''} onClick={() => setKnowledgeView('knots')}>
                Knoten
              </button>
            </div>

            {knowledgeView === 'rules' && (
              <div className="knowledge-stack">
                {filteredRules.map((rule) => (
                  <article key={rule.id} className="surface-card rule-card">
                    <div className="card-head align-start">
                      <div>
                        <span className="category-label">{rule.category}</span>
                        <h3>{rule.title}</h3>
                      </div>
                      <AlertTriangle size={18} className="warning-icon" />
                    </div>
                    <p className="rule-summary">{rule.summary}</p>
                    <ul className="detail-list">
                      {rule.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}

            {knowledgeView === 'positions' && (
              <div className="knowledge-stack">
                <div className="segmented-bar">
                  <button type="button" className={positionKnowledgeTab === 'A' ? 'active' : ''} onClick={() => setPositionKnowledgeTab('A')}>
                    A-Teil
                  </button>
                  <button type="button" className={positionKnowledgeTab === 'B' ? 'active' : ''} onClick={() => setPositionKnowledgeTab('B')}>
                    B-Teil
                  </button>
                </div>
                {filteredGuides.map((guide) => {
                  const isExpanded = expandedGuideId === guide.id;
                  return (
                    <article key={guide.id} className="surface-card guide-accordion-card">
                      <button type="button" className={`guide-accordion-trigger ${isExpanded ? 'expanded' : ''}`} onClick={() => toggleGuide(guide.id)}>
                        <div>
                          <span className="category-label">{guide.section}</span>
                          <h3>{guide.title}</h3>
                        </div>
                        <div className="guide-trigger-meta">
                          <span className="guide-short-pill">{guide.shortLabel}</span>
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="guide-accordion-content">
                          <div className="detail-block">
                            <h4>Aufgaben</h4>
                            <ul className="detail-list">
                              {guide.duties.map((duty) => (
                                <li key={duty}>{duty}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="detail-block">
                            <h4>Typische Fehlerbilder</h4>
                            <div className="warning-pill-wrap">
                              {guide.watchouts.map((item) => (
                                <span key={item} className="mini-pill warning">{item}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            {knowledgeView === 'knots' && (
              <div className="knowledge-stack">
                {filteredKnots.map((knot) => (
                  <article key={knot.id} className="surface-card knot-card">
                    <div className="card-head align-start">
                      <div>
                        <span className="category-label">Knoten</span>
                        <h3>{knot.title}</h3>
                      </div>
                      <LinkIcon size={18} />
                    </div>
                    <ol className="detail-list numbered">
                      {knot.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <nav className="bottom-navigation" aria-label="Hauptnavigation">
        <button type="button" className={activeTab === 'lineup' ? 'active' : ''} aria-current={activeTab === 'lineup' ? 'page' : undefined} onClick={() => setActiveTab('lineup')}>
          <Users size={22} />
          <span>Aufstellung</span>
        </button>
        <button type="button" className={activeTab === 'stopwatch' ? 'active' : ''} aria-current={activeTab === 'stopwatch' ? 'page' : undefined} onClick={() => setActiveTab('stopwatch')}>
          <Timer size={22} />
          <span>Stoppuhr</span>
        </button>
        <button type="button" className={activeTab === 'analysis' ? 'active' : ''} aria-current={activeTab === 'analysis' ? 'page' : undefined} onClick={() => setActiveTab('analysis')}>
          <BarChart2 size={22} />
          <span>Analyse</span>
        </button>
        <button type="button" className={activeTab === 'knowledge' ? 'active' : ''} aria-current={activeTab === 'knowledge' ? 'page' : undefined} onClick={() => setActiveTab('knowledge')}>
          <BookOpen size={22} />
          <span>Wissen</span>
        </button>
      </nav>

      {selectedPosition && (
        <div className="sheet-backdrop" onClick={() => setSelectedPositionId(null)}>
          <aside className="sheet-panel" onClick={(event) => event.stopPropagation()}>
            <div className="card-head">
              <div>
                <h3>Wer macht das?</h3>
                <p>{selectedPosition.label}</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedPositionId(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="sheet-grid">
              {appState.members.map((member) => {
                const alreadyAssigned = currentPositions.some(
                  (position) => appState.lineups.assignments[position.id] === member.id && position.id !== selectedPosition.id
                );
                return (
                  <button
                    key={member.id}
                    type="button"
                    className={`sheet-member-button ${alreadyAssigned ? 'disabled' : ''}`}
                    onClick={() => assignMemberToPosition(selectedPosition.id, member.id)}
                    disabled={alreadyAssigned}
                  >
                    <span>{member.name}</span>
                    {alreadyAssigned ? <AlertCircle size={16} /> : <ChevronRight size={16} />}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      )}

      {showResetConfirm && (
        <div className="sheet-backdrop centered" onClick={() => setShowResetConfirm(false)}>
          <div className="confirm-panel" onClick={(event) => event.stopPropagation()}>
            <h3>Stoppuhr wirklich zurücksetzen?</h3>
            <p>Die aktuelle Zeit und alle Zwischenzeiten gehen dabei verloren.</p>
            <div className="confirm-actions">
              <button type="button" className="secondary-action" onClick={() => setShowResetConfirm(false)}>
                Abbrechen
              </button>
              <button type="button" className="secondary-action danger-action" onClick={confirmResetTimer}>
                Reset bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteRunId && (
        <div className="sheet-backdrop centered" onClick={() => setPendingDeleteRunId(null)}>
          <div className="confirm-panel" onClick={(event) => event.stopPropagation()}>
            <h3>Eintrag wirklich löschen?</h3>
            <p>Dieser Trainingslauf wird dauerhaft entfernt. Das kann nicht rückgängig gemacht werden.</p>
            <div className="confirm-actions">
              <button type="button" className="secondary-action" onClick={() => setPendingDeleteRunId(null)}>
                Abbrechen
              </button>
              <button type="button" className="secondary-action danger-action" onClick={() => deleteRun(pendingDeleteRunId)}>
                Löschen bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
