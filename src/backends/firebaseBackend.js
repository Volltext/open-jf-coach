// Firebase-Backend-Adapter.
//
// Kapselt die ursprüngliche Firestore-Sync-Logik hinter der gemeinsamen
// Backend-Schnittstelle: createFirebaseBackend(config).initSync(handlers)
// liefert { pushState, dispose }.

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getFirestore, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

export function createFirebaseBackend(config) {
  // Mehrfaches initializeApp mit derselben Default-App vermeiden
  // (z. B. unter React StrictMode im Dev-Modus).
  const app = getApps().length ? getApp() : initializeApp(config.firebase);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const stateDocRef = doc(db, 'teams', config.teamId, 'state', 'shared');

  function initSync({ onRemoteState, onStatus, onReady, onError }) {
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
            onRemoteState?.(snapshot.data());
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

  return { initSync };
}
