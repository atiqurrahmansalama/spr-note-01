import { useSyncExternalStore } from "react";
import { quranTrackingSession, type QuranSessionSnapshot } from "../quranRules";

const subscribe = (callback: () => void) => quranTrackingSession.subscribe(callback);
const getSnapshot = (): QuranSessionSnapshot => quranTrackingSession.getSnapshot();

export function useQuranTrackingSession() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  return {
    lastPage: snapshot.lastPage,
    lastAyah: snapshot.lastAyah,
    setLastPage: (val: string | number | null | undefined) => quranTrackingSession.setLastPage(val),
    setLastAyah: (val: string | number | null | undefined) => quranTrackingSession.setLastAyah(val),
    resetSession: () => quranTrackingSession.reset(),
  };
}

