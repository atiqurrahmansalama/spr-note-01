import { useState, useEffect, useCallback } from 'react';
import { curriculumStore, learningStore } from '@/stores';
import {
  getDailyLessons as fetchDailyLessonsAPI,
  getLessonEvaluations as fetchLessonEvaluationsAPI,
} from '@/api/learning';

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
 */
export default function useDailyClassroomData(tenantId: string = 'default', selectedDate?: string): UseDailyClassroomDataReturn {
  const [lessons, setLessons] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [curriculumBooks, setCurriculumBooks] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      // 1. Synchronous render from local store
      const localLessons = learningStore.getDailyLessons(tenantId) || [];
      const localEvals = learningStore.getEvaluations(tenantId) || [];
      const localBooks = curriculumStore.getItems(tenantId) || [];

      setLessons(localLessons);
      setEvaluations(localEvals);
      setCurriculumBooks(localBooks);

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
        }
      } catch {
        // Backend offline — local store already populated above
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
        }
      } catch {
        // Backend offline — local store already populated above
      }
    } catch (e) {
      console.warn('useDailyClassroomData load error:', e);
    }
  }, [tenantId, selectedDate]);

  // Initial load + listen for store update events
  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('spr_learning_updated', handleUpdate);
    window.addEventListener('spr_curriculum_updated', handleUpdate);
    return () => {
      window.removeEventListener('spr_learning_updated', handleUpdate);
      window.removeEventListener('spr_curriculum_updated', handleUpdate);
    };
  }, [loadData]);

  return { lessons, evaluations, curriculumBooks, loadData };
}

export { useDailyClassroomData as useLearningClassroomData };
