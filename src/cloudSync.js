import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getFirestore, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const teamId = import.meta.env.VITE_FIREBASE_TEAM_ID;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const stateDocRef = doc(db, 'teams', teamId, 'state', 'shared');

function isMeaningfulArray(value) {
  return Array.isArray(value);
}

function isMeaningfulObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export function extractSyncStateFromApp(appState) {
  const draft = appState.stopwatchDraft;
  // While running, draft.elapsedMs stays frozen at the start value; serialize the
  // live elapsed time so other clients (and our own echo) re-anchor correctly.
  const stopwatchDraft = draft?.isRunning && draft.startTimestamp
    ? { ...draft, elapsedMs: Math.max(0, Date.now() - draft.startTimestamp) }
    : draft;

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

export function initCloudSync({ onRemoteState, onStatus, onReady, onError }) {
  let unsubscribeSnapshot = null;
  let readySent = false;

  function markReady() {
    if (readySent) {
      return;
    }
    readySent = true;
    onReady?.();
  }

  async function ensureSignedIn() {
    if (auth.currentUser) {
      return auth.currentUser;
    }
    const credential = await signInAnonymously(auth);
    return credential.user;
  }

  function attachSnapshotListener() {
    unsubscribeSnapshot = onSnapshot(
      stateDocRef,
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) {
          return;
        }
        onStatus?.('connected');
        if (snapshot.exists()) {
          const data = snapshot.data();
          onRemoteState?.(data);
        }
        markReady();
      },
      (error) => {
        onStatus?.('error');
        onError?.(error);
      }
    );
  }

  const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    try {
      onStatus?.('connecting');
      const activeUser = user ?? (await ensureSignedIn());
      if (!activeUser) {
        return;
      }
      if (!unsubscribeSnapshot) {
        attachSnapshotListener();
      }
    } catch (error) {
      onStatus?.('error');
      onError?.(error);
    }
  });

  async function pushState(syncState) {
    try {
      const activeUser = auth.currentUser ?? (await ensureSignedIn());
      onStatus?.('syncing');
      await setDoc(
        stateDocRef,
        {
          ...syncState,
          updatedAt: serverTimestamp(),
          updatedBy: activeUser.uid
        },
        { merge: true }
      );
      onStatus?.('connected');
      markReady();
    } catch (error) {
      onStatus?.('error');
      onError?.(error);
    }
  }

  return {
    pushState,
    dispose() {
      unsubscribeSnapshot?.();
      unsubscribeAuth?.();
    }
  };
}
