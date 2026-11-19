import { useState, useEffect, useCallback } from 'react';
import { curriculumStore, learningStore } from '@/stores';
import {
  getDailyLessons as fetchDailyLessonsAPI,
  getLessonEvaluations as fetchLessonEvaluationsAPI,
} from '@/api/learning';

export interface UseDailyClassroomDataOptions {
  enabled?: boolean;
}

export interface UseDailyClassroomDataReturn {
  lessons: any[];
  evaluations: any[];
  curriculumBooks: any[];
  loadData: () => Promise<void>;
}

/**
 * useDailyClassroomData (also useLearningClassroomData)
 * Handles loading lessons, evaluations, and curriculum books
 * from the local store (instant render) + backend API (live sync).
 * Supports options.enabled to avoid unnecessary API overhead on inactive views.
 */
export default function useDailyClassroomData(
  tenantId: string = 'default',
  selectedDate?: string,
  options: UseDailyClassroomDataOptions = {}
): UseDailyClassroomDataReturn {
  const { enabled = true } = options;
  const [lessons, setLessons] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [curriculumBooks, setCurriculumBooks] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!enabled) return;

    try {
      // 1. Synchronous render from local store + IndexedDB fallback
      const localLessons = learningStore.getDailyLessons(tenantId) || [];
      const localEvals = learningStore.getEvaluations(tenantId) || [];
      const localBooks = curriculumStore.getItems(tenantId) || [];

      setLessons(localLessons);
      setEvaluations(localEvals);
      setCurriculumBooks(localBooks);

      // IndexedDB fallback if local storage had no records
      if (localLessons.length === 0) {
        import('@/offline').then(({ lessonsRepository }) => {
          lessonsRepository.list().then((idbLessons) => {
            if (idbLessons.length > 0) {
              setLessons((prev) => (prev.length === 0 ? idbLessons : prev));
            }
          }).catch(() => {});
        }).catch(() => {});
      }

      // 2. Async fetch from backend and merge (live sync)
      try {
        const params: any = { page_size: 500 };
        if (selectedDate) params.date = selectedDate;
        const res = await fetchDailyLessonsAPI(params);
        const liveLessons = Array.isArray(res) ? res : (res?.results || []);

        if (liveLessons.length > 0) {
          const map = new Map();
          liveLessons.forEach((l: any) => map.set(String(l.id), l));
          localLessons.forEach((l: any) => {
            if (!map.has(String(l.id))) map.set(String(l.id), l);
          });
          setLessons(Array.from(map.values()));

          // Persist fresh server records into IndexedDB cache for offline access
          import('@/offline').then(({ lessonsRepository }) => {
            lessonsRepository.bulkHydrate(liveLessons).catch(() => {});
          }).catch(() => {});
        }
      } catch {
        // Backend offline — local store / IndexedDB already populated above
      }

      try {
        const evalParams: any = { page_size: 500 };
        if (selectedDate) evalParams.date = selectedDate;
        const evalRes = await fetchLessonEvaluationsAPI(evalParams);
        const liveEvals = Array.isArray(evalRes) ? evalRes : (evalRes?.results || []);

        if (liveEvals.length > 0) {
          const map = new Map();
          liveEvals.forEach((e: any) => map.set(String(e.id), e));
          localEvals.forEach((e: any) => {
            if (!map.has(String(e.id))) map.set(String(e.id), e);
          });
          setEvaluations(Array.from(map.values()));

          // Persist evaluations to IndexedDB
          import('@/offline').then(({ evaluationsRepository }) => {
            evaluationsRepository.bulkHydrate(liveEvals).catch(() => {});
          }).catch(() => {});
        }
      } catch {
        // Backend offline — local store already populated above
      }
    } catch (e) {
      console.warn('useDailyClassroomData load error:', e);
    }
  }, [tenantId, selectedDate, enabled]);

  // Initial load + listen for store update events (only if enabled)
  useEffect(() => {
    if (!enabled) return;

    loadData();

    const handleUpdate = () => loadData();
    const handlePurged = () => {
      setLessons([]);
      setEvaluations([]);
      setCurriculumBooks([]);
    };

    window.addEventListener('spr_learning_updated', handleUpdate);
    window.addEventListener('spr_curriculum_updated', handleUpdate);
    window.addEventListener('spr_tenant_changed', handleUpdate);
    window.addEventListener('spr_offline_purged', handlePurged);
    return () => {
      window.removeEventListener('spr_learning_updated', handleUpdate);
      window.removeEventListener('spr_curriculum_updated', handleUpdate);
      window.removeEventListener('spr_tenant_changed', handleUpdate);
      window.removeEventListener('spr_offline_purged', handlePurged);
    };
  }, [loadData, enabled]);

  return { lessons, evaluations, curriculumBooks, loadData };
}

export { useDailyClassroomData as useLearningClassroomData };
