import React, { useCallback } from "react";
import CompactTaxonomyManager from "../../components/common/CompactTaxonomyManager";
import { SessionsIcon } from "../../components/ui/Icons";
import { fetchWithAuth } from "../../utils/authService";
import { 
  sessions as sessionStore, 
  isOnline, 
  mergeSessions 
} from "../../utils/localStore";
import { syncSessionsAndComments } from "../../utils/syncEngine";

// Helper to normalize session list
function normalizeSessionList(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((s, idx) => ({
    id: typeof s === "object" && s !== null ? (s.id || `sess-${idx}`) : `sess-${idx}`,
    name: typeof s === "object" && s !== null ? (s.name || s.session_name || s.label || String(s)) : String(s),
    _local: typeof s === "object" && s !== null ? !!s._local : false,
    is_active: true,
  }));
}

/**
 * Enterprise Report Sessions Manager
 * Manages pre-configured report session topics and lesson progress categories.
 * Powered by CompactTaxonomyManager with real-time local cache and server synchronization.
 */
export default function SessionManager() {
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
          return merged.map((s) => ({
            id: s.id,
            name: s.name,
            is_active: true,
          }));
        }
      } catch (err) {
        console.warn("[SessionManager] Server fetch sessions failed:", err);
      }
    }
    return normalizeSessionList(localList).map((s) => ({
      id: s.id,
      name: s.name,
      is_active: true,
    }));
  }, []);

  const createSessionItem = useCallback(async (payload) => {
    const name = (payload.name || "").trim();
    if (!name) throw new Error("Session name is required");

    if (isOnline()) {
      try {
        const res = await fetchWithAuth("/sessions/", {
          method: "POST",
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const created = await res.json();
          sessionStore.add(name);
          syncSessionsAndComments().catch(() => {});
          return { id: created.id || crypto.randomUUID(), name, is_active: true };
        }
      } catch (err) {
        console.warn("[SessionManager] Online session create failed:", err);
      }
    }
    const result = sessionStore.add(name);
    return result.newSession || { id: crypto.randomUUID(), name, is_active: true };
  }, []);

  const updateSessionItem = useCallback(async (id, payload) => {
    const name = (payload.name || "").trim();
    if (!name) throw new Error("Session name is required");

    if (isOnline()) {
      try {
        const res = await fetchWithAuth(`/sessions/${id}/`, {
          method: "PUT",
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const updated = await res.json();
          const all = sessionStore.getAll().map((s) => (s.id === id ? { ...s, name } : s));
          sessionStore.saveAll(all);
          syncSessionsAndComments().catch(() => {});
          return { id: updated.id || id, name, is_active: true };
        }
      } catch (err) {
        console.warn("[SessionManager] Online session update failed:", err);
      }
    }
    const all = sessionStore.getAll().map((s) => (s.id === id ? { ...s, name } : s));
    sessionStore.saveAll(all);
    return { id, name, is_active: true };
  }, []);

  const deleteSessionItem = useCallback(async (id) => {
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
        title="Report Sessions"
        description="Manage pre-configured report session topics and lesson progress categories (e.g. Sabaq, Saat Sabaq, Amukta, Hifz Revision, Nazira) available in report generation."
        fetchItems={fetchSessions}
        createItem={createSessionItem}
        updateItem={updateSessionItem}
        deleteItem={deleteSessionItem}
        itemTypeName="Report Session"
        icon={SessionsIcon}
        hideStatus={true}
      />
    </div>
  );
}
