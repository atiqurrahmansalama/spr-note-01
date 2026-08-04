import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { sessions as sessionStore, isOnline } from "../../utils/localStore";

export default function SessionManager() {
  const { showToast } = useToast();

  const [sessions, setSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offline, setOffline] = useState(!isOnline());

  // 🌐 Online/offline status monitor
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      loadSessions();
    };
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * সেশন লোড করার ফাংশন
   * 1. LocalStorage থেকে instantly দেখাও
   * 2. API থেকে fresh data আনার চেষ্টা করো
   * 3. API সফল → LocalStorage cache আপডেট
   * 4. API ব্যর্থ → LocalStorage ডেটাই ব্যবহার
   */
  const loadSessions = async () => {
    // Step 1: cached ডেটা তাৎক্ষণিকভাবে দেখাও
    const cached = sessionStore.getAll();
    if (cached.length > 0) {
      setSessions(cached);
    }

    // Step 2: অনলাইনে থাকলে API থেকে আনো
    if (!isOnline()) return;

    try {
      const res = await fetchWithAuth("/sessions/");
      if (res.ok) {
        const data = await res.json();
        sessionStore.saveAll(data); // ✅ cache আপডেট
        setSessions(data);
      }
    } catch (err) {
      console.warn("[SessionManager] API unreachable, using cache:", err.message);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 🚀 নতুন সেশন তৈরি করা
  const handleAddSession = async (e) => {
    e.preventDefault();
    const trimmedName = newSessionName.trim();
    if (!trimmedName) {
      showToast("Session name cannot be empty!", "warning");
      return;
    }

    setIsSubmitting(true);

    // 💾 LocalStorage-এ সেভ করো (offline-first)
    const { updated, newSession } = sessionStore.add(trimmedName);
    if (!newSession) {
      showToast(`Session "${trimmedName}" already exists!`, "warning");
      setIsSubmitting(false);
      return;
    }
    setSessions(updated);
    setNewSessionName("");

    // 🌐 অনলাইনে থাকলে API-তেও পাঠাও
    if (isOnline()) {
      try {
        const res = await fetchWithAuth("/sessions/", {
          method: "POST",
          body: JSON.stringify({ name: trimmedName }),
        });

        if (res.ok) {
          showToast(`Session "${trimmedName}" added to database!`, "success");
          // API-assigned ID দিয়ে cache re-sync করো
          await loadSessions();
        } else {
          const errData = await res.json();
          showToast(errData.name ? errData.name[0] : `"${trimmedName}" saved locally.`, "info");
        }
      } catch {
        showToast(`"${trimmedName}" saved locally (offline).`, "info");
      }
    } else {
      showToast(`"${trimmedName}" saved locally (offline).`, "info");
    }

    setIsSubmitting(false);
  };

  // 🚀 সেশন মুছে ফেলা
  const handleDeleteSession = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" permanently?`)) {
      return;
    }

    // 💾 LocalStorage থেকে মুছো (offline-first)
    const updated = sessionStore.remove(id);
    setSessions(updated);

    // 🌐 অনলাইনে থাকলে API থেকেও ডিলিট করো
    if (isOnline() && id && !String(id).startsWith("local-")) {
      try {
        const res = await fetchWithAuth(`/sessions/${id}/`, {
          method: "DELETE",
        });

        if (res.ok || res.status === 204) {
          showToast(`Session "${name}" deleted!`, "success");
        } else {
          showToast(`"${name}" removed locally. Database sync may be needed.`, "info");
        }
      } catch {
        showToast(`"${name}" removed locally (offline).`, "info");
      }
    } else {
      showToast(`Session "${name}" deleted!`, "success");
    }
  };

  return (
    <div className="space-y-1">
      <div className="pl-1 pr-1 py-2 space-y-3 theme-bg-sub rounded-xl my-1 border theme-border">
        
        {/* Offline Badge */}
        {offline && (
          <div className="mx-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="text-[10px] font-semibold">Offline — changes saved locally</span>
          </div>
        )}

        {/* Add Form */}
        <form onSubmit={handleAddSession} className="flex gap-1.5 px-2">
          <input
            type="text"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="New session name..."
            className="flex-1 theme-bg-app border theme-border theme-text-primary text-[11px] px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="theme-bg-accent hover:opacity-90 disabled:opacity-50 theme-accent-text text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition shrink-0 shadow"
          >
            Add
          </button>
        </form>

        {/* Sessions List */}
        <div className="space-y-1 max-h-48 overflow-y-auto px-2 custom-scrollbar">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono theme-text-secondary uppercase tracking-wider">
              {offline ? "Cached Sessions" : "Sessions"}
            </span>
            <span className="text-[10px] font-mono theme-text-secondary">
              {sessions.length} total
            </span>
          </div>
          {sessions.length === 0 ? (
            <p className="text-[11px] theme-text-secondary italic py-1 opacity-70">
              No sessions yet
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id || s.name}
                className="flex items-center justify-between group theme-bg-app hover:theme-bg-elevated px-2.5 py-1.5 rounded-lg border theme-border transition"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {s._local && (
                    <span
                      title="Saved locally — will sync when online"
                      className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                    />
                  )}
                  <span className="text-[11px] theme-text-primary font-medium truncate">
                    {s.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSession(s.id || s.name, s.name)}
                  className="theme-text-secondary hover:text-rose-400 text-[11px] opacity-0 group-hover:opacity-100 transition px-1"
                  title="Delete permanently"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}