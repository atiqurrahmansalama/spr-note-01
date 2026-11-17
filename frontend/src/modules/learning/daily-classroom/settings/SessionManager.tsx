import React, { useCallback } from "react";
import CompactTaxonomyManager from "@/components/common/CompactTaxonomyManager";
import { SessionsIcon } from "@/components/ui/Icons";
import { StudySessionDrawerForm } from "./StudySessionDrawerForm";
import { fetchWithAuth } from "@/utils/authService";
import { 
  sessions as sessionStore, 
  isOnline, 
  mergeSessions 
} from "@/utils/localStore";
import { syncSessionsAndComments } from "@/utils/syncEngine";

export interface StudySessionItem {
  id: string | number;
  name: string;
  category?: 'QURAN' | 'BOOK';
  type?: string;
  _local?: boolean;
  is_active?: boolean;
}

export type SessionItem = StudySessionItem;

export const classroomSessionsSectionConfig = {
  id: "report-sessions",
  group: "Classroom Configuration",
  title: "Daily Progress Study Sessions",
  description: "Manage pre-configured classroom study session topics and lesson progress categories categorized by Quran and Book",
  icon: SessionsIcon,
};

export const STUDY_CATEGORY_OPTIONS = [
  { value: "QURAN", label: "Quran", color: "indigo" },
  { value: "BOOK", label: "Book", color: "emerald" },
];

// Helper to normalize session list with Quran & Book category support
function normalizeSessionList(rawList: any[]): StudySessionItem[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((s, idx) => {
    const rawCat = typeof s === "object" && s !== null ? (s.category || s.type || "QURAN") : "QURAN";
    const category: 'QURAN' | 'BOOK' = String(rawCat).toUpperCase() === "BOOK" ? "BOOK" : "QURAN";
    return {
      id: typeof s === "object" && s !== null ? (s.id || `sess-${idx}`) : `sess-${idx}`,
      name: typeof s === "object" && s !== null ? (s.name || s.session_name || s.label || String(s)) : String(s),
      category,
      type: category,
      _local: typeof s === "object" && s !== null ? !!s._local : false,
      is_active: true,
    };
  });
}

/**
 * Enterprise Daily Progress Study Sessions Manager
 * Manages pre-configured report/study session topics categorized by Quran and Book.
 * Powered by CompactTaxonomyManager with real-time local cache and server synchronization.
 */
export const SessionManager: React.FC = () => {
  const fetchSessions = useCallback(async () => {
    const localList = sessionStore.getAll();
    if (isOnline()) {
      try {
        const res = await fetchWithAuth("/sessions/");
        if (res.ok) {
          const data = await res.json();
          const serverList = Array.isArray(data)
            ? data
            : Array.isArray(data.results)
            ? data.results
            : [];
          const normalizedServer = normalizeSessionList(serverList);
          const merged = mergeSessions(localList, normalizedServer);
          sessionStore.saveAll(merged);
          return merged.map((s: any) => {
            const cat: 'QURAN' | 'BOOK' = String(s.category || s.type || 'QURAN').toUpperCase() === 'BOOK' ? 'BOOK' : 'QURAN';
            return {
              id: s.id,
              name: s.name,
              category: cat,
              type: cat,
              is_active: true,
            };
          });
        }
      } catch (err) {
        console.warn("[SessionManager] Server fetch sessions failed:", err);
      }
    }
    return normalizeSessionList(localList).map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category || 'QURAN',
      type: s.type || s.category || 'QURAN',
      is_active: true,
    }));
  }, []);

  const createSessionItem = useCallback(async (payload: any) => {
    const name = (payload.name || "").trim();
    if (!name) throw new Error("Session name is required");
    const rawCat = payload.type || payload.category || "QURAN";
    const category: 'QURAN' | 'BOOK' = String(rawCat).toUpperCase() === "BOOK" ? "BOOK" : "QURAN";

    if (isOnline()) {
      try {
        const res = await fetchWithAuth("/sessions/", {
          method: "POST",
          body: JSON.stringify({ name, category }),
        });
        if (res.ok) {
          const created = await res.json();
          sessionStore.add({ name, category });
          syncSessionsAndComments().catch(() => {});
          return {
            id: created.id || crypto.randomUUID(),
            name,
            category,
            type: category,
            is_active: true,
          };
        }
      } catch (err) {
        console.warn("[SessionManager] Online session create failed:", err);
      }
    }
    const result = sessionStore.add({ name, category });
    return result.newSession || { id: crypto.randomUUID(), name, category, type: category, is_active: true };
  }, []);

  const updateSessionItem = useCallback(async (id: any, payload: any) => {
    const name = (payload.name || "").trim();
    if (!name) throw new Error("Session name is required");
    const rawCat = payload.type || payload.category || "QURAN";
    const category: 'QURAN' | 'BOOK' = String(rawCat).toUpperCase() === "BOOK" ? "BOOK" : "QURAN";

    if (isOnline()) {
      try {
        const res = await fetchWithAuth(`/sessions/${id}/`, {
          method: "PUT",
          body: JSON.stringify({ name, category }),
        });
        if (res.ok) {
          const updated = await res.json();
          const all = sessionStore.getAll().map((s: any) =>
            s.id === id ? { ...s, name, category, type: category } : s
          );
          sessionStore.saveAll(all);
          syncSessionsAndComments().catch(() => {});
          return { id: updated.id || id, name, category, type: category, is_active: true };
        }
      } catch (err) {
        console.warn("[SessionManager] Online session update failed:", err);
      }
    }
    const all = sessionStore.getAll().map((s: any) =>
      s.id === id ? { ...s, name, category, type: category } : s
    );
    sessionStore.saveAll(all);
    return { id, name, category, type: category, is_active: true };
  }, []);

  const deleteSessionItem = useCallback(async (id: any) => {
    if (isOnline()) {
      try {
        await fetchWithAuth(`/sessions/${id}/`, { method: "DELETE" });
      } catch (err) {
        console.warn("[SessionManager] Online session delete failed:", err);
      }
    }
    sessionStore.remove(id);
    syncSessionsAndComments().catch(() => {});
    return true;
  }, []);

  return (
    <div className="w-full animate-fade-in text-left">
      <CompactTaxonomyManager
        title="Daily Progress Study Sessions"
        description="Manage pre-configured classroom study session topics and lesson progress categories categorized by Quran and Book."
        fetchItems={fetchSessions}
        createItem={createSessionItem}
        updateItem={updateSessionItem}
        deleteItem={deleteSessionItem}
        itemTypeName="Study Session"
        typeOptions={STUDY_CATEGORY_OPTIONS}
        typeLabel="Study Category"
        icon={SessionsIcon}
        hideStatus={true}
        hideCountBadge={true}
        customDrawerForm={StudySessionDrawerForm}
      />
    </div>
  );
};

export default SessionManager;
