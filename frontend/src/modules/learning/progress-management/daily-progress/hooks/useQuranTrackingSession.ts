import { useState, useEffect } from "react";
import { quranTrackingSession } from "../quranRules";

export function useQuranTrackingSession() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return quranTrackingSession.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  return {
    lastPage: quranTrackingSession.getLastPage(),
    lastAyah: quranTrackingSession.getLastAyah(),
    setLastPage: (val: string | number | null | undefined) => quranTrackingSession.setLastPage(val),
    setLastAyah: (val: string | number | null | undefined) => quranTrackingSession.setLastAyah(val),
    resetSession: () => quranTrackingSession.reset(),
  };
}
