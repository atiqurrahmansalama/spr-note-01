import { useState, useEffect, useCallback } from "react";
import { curriculumStore } from "../../../../utils/localStore";
import { learningStore } from "../../../../utils/stores/learningStore";
import {
  getDailyLessons as fetchDailyLessonsAPI,
  getLessonEvaluations as fetchLessonEvaluationsAPI,
} from "../../../../api/learning";

/**
 * useDailyClassroomData
 * Handles loading lessons, evaluations, and curriculum books
 * from the local store (instant render) + backend API (live sync).
 *
 * @param {string} tenantId - Active tenant ID
 * @param {string} selectedDate - Currently selected date filter
 */
export default function useDailyClassroomData(tenantId, selectedDate) {
  const [lessons, setLessons] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [curriculumBooks, setCurriculumBooks] = useState([]);

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
        const params = { page_size: 500 };
        if (selectedDate) params.date = selectedDate;
        const res = await fetchDailyLessonsAPI(params);
        const liveLessons = Array.isArray(res) ? res : (res?.results || []);

        if (liveLessons.length > 0) {
          const map = new Map();
          liveLessons.forEach((l) => map.set(String(l.id), l));
          localLessons.forEach((l) => {
            if (!map.has(String(l.id))) map.set(String(l.id), l);
          });
          setLessons(Array.from(map.values()));
        }
      } catch {
        // Backend offline — local store already populated above
      }

      try {
        const evalParams = { page_size: 500 };
        if (selectedDate) evalParams.date = selectedDate;
        const evalRes = await fetchLessonEvaluationsAPI(evalParams);
        const liveEvals = Array.isArray(evalRes) ? evalRes : (evalRes?.results || []);

        if (liveEvals.length > 0) {
          const map = new Map();
          liveEvals.forEach((e) => map.set(String(e.id), e));
          localEvals.forEach((e) => {
            if (!map.has(String(e.id))) map.set(String(e.id), e);
          });
          setEvaluations(Array.from(map.values()));
        }
      } catch {
        // Backend offline — local store already populated above
      }
    } catch (e) {
      console.warn("useDailyClassroomData load error:", e);
    }
  }, [tenantId, selectedDate]);

  // Initial load + listen for store update events
  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener("spr_learning_updated", handleUpdate);
    window.addEventListener("spr_curriculum_updated", handleUpdate);
    return () => {
      window.removeEventListener("spr_learning_updated", handleUpdate);
      window.removeEventListener("spr_curriculum_updated", handleUpdate);
    };
  }, [loadData]);

  return { lessons, evaluations, curriculumBooks, loadData };
}
