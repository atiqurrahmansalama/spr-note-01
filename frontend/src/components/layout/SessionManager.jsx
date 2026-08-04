import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { 
  sessions as sessionStore, 
  savedComments as commentStore, 
  isOnline, 
  mergeSessions 
} from "../../utils/localStore";
import { SessionsIcon, ChatIcon, TrashIcon, CopyIcon } from "../ui/Icons";

export default function SessionManager() {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("sessions"); // "sessions" | "comments"
  const [sessions, setSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Saved comments state
  const [comments, setComments] = useState(() => commentStore.getAll());
  const [newCommentText, setNewCommentText] = useState("");
  const [commentSearch, setCommentSearch] = useState("");

  const [offline, setOffline] = useState(!isOnline());

  // Monitor online status
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

  // Load Sessions
  const loadSessions = async () => {
    const cached = sessionStore.getAll();
    if (cached.length > 0) {
      setSessions(cached);
    }

    if (!isOnline()) return;

    try {
      const res = await fetchWithAuth("/sessions/");
      if (res.ok) {
        const apiData = await res.json();
        const formattedApi = (Array.isArray(apiData) ? apiData : []).map((s, idx) => ({
          id: typeof s === "object" ? (s.id || `api-${idx}`) : `api-${idx}`,
          name: typeof s === "object" ? (s.name || s.session_name || s.label || String(s)) : String(s),
        }));

        const localData = sessionStore.getAll();
        const merged = mergeSessions(formattedApi, localData);
        setSessions(merged);
      }
    } catch (err) {
      console.warn("[SessionManager] API fetch failed, using cache:", err.message);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save comment list changes
  useEffect(() => {
    commentStore.saveAll(comments);
  }, [comments]);

  // Handle Add Session
  const handleAddSession = async (e) => {
    if (e) e.preventDefault();
    const trimmedName = newSessionName.trim();
    if (!trimmedName) {
      showToast("Session name cannot be empty!", "warning");
      return;
    }

    setIsSubmitting(true);

    const { updated, newSession } = sessionStore.add(trimmedName);
    if (!newSession) {
      showToast(`Session "${trimmedName}" already exists!`, "warning");
      setIsSubmitting(false);
      return;
    }
    setSessions(updated);
    setNewSessionName("");
    showToast(`Session "${trimmedName}" saved!`, "success");

    if (isOnline()) {
      try {
        const res = await fetchWithAuth("/sessions/", {
          method: "POST",
          body: JSON.stringify({ name: trimmedName }),
        });

        if (res.ok) {
          await loadSessions();
        }
      } catch (err) {
        console.warn("[SessionManager] Online save error:", err.message);
      }
    }

    setIsSubmitting(false);
  };

  // Handle Delete Session
  const handleDeleteSession = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete session "${name}"?`)) {
      return;
    }

    const updated = sessionStore.remove(id);
    setSessions(updated);

    if (isOnline() && id && !String(id).startsWith("local-")) {
      try {
        const res = await fetchWithAuth(`/sessions/${id}/`, {
          method: "DELETE",
        });

        if (res.ok || res.status === 204) {
          showToast(`Session "${name}" deleted!`, "success");
        } else {
          showToast(`"${name}" removed locally.`, "info");
        }
      } catch {
        showToast(`"${name}" removed locally (offline).`, "info");
      }
    } else {
      showToast(`Session "${name}" deleted!`, "success");
    }
  };

  // Handle Add Saved Comment
  const handleAddComment = (e) => {
    e.preventDefault();
    const trimmed = newCommentText.trim();
    if (!trimmed) {
      showToast("Comment template text cannot be empty", "warning");
      return;
    }

    if (comments.includes(trimmed)) {
      showToast("Comment template already exists!", "warning");
      return;
    }

    const updated = commentStore.add(trimmed);
    setComments(updated);
    setNewCommentText("");
    showToast("New comment template saved!", "success");
  };

  // Handle Delete Comment
  const handleDeleteComment = (index) => {
    const updated = commentStore.remove(index);
    setComments(updated);
    showToast("Comment template deleted", "info");
  };

  // Filtered Sessions
  const filteredSessions = sessions.filter((s) =>
    (s.name || "").toLowerCase().includes(sessionSearch.toLowerCase())
  );

  // Filtered Comments
  const filteredComments = comments.filter((c) =>
    (c || "").toLowerCase().includes(commentSearch.toLowerCase())
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">
      {/* 1. Header Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent shrink-0">
            <SessionsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold theme-text-primary tracking-tight">
              Sessions & Comment Templates
            </h2>
            <p className="text-[11px] theme-text-secondary mt-0.5">
              Configure report session presets and reusable comment templates.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1.5 p-1 theme-bg-sub border theme-border rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "sessions"
                ? "theme-bg-accent theme-accent-text shadow-sm"
                : "theme-text-secondary hover:theme-text-primary"
            }`}
          >
            <SessionsIcon className="w-3.5 h-3.5" />
            <span>Sessions ({sessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "comments"
                ? "theme-bg-accent theme-accent-text shadow-sm"
                : "theme-text-secondary hover:theme-text-primary"
            }`}
          >
            <ChatIcon className="w-3.5 h-3.5" />
            <span>Comments ({comments.length})</span>
          </button>
        </div>
      </div>

      {/* Offline Alert Badge */}
      {offline && (
        <div className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span>Offline mode active — session and comment edits saved to LocalStorage.</span>
        </div>
      )}

      {/* 2. TAB CONTENT 1: SESSIONS */}
      {activeTab === "sessions" && (
        <div className="w-full space-y-4">
          {/* Add Session Form Card */}
          <div className="w-full theme-bg-surface border theme-border rounded-2xl p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              + Add New Session Preset
            </h3>
            <form onSubmit={handleAddSession} className="flex gap-2">
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Enter session name (e.g. Morning Session, Revision Hifz)..."
                className="flex-1 theme-bg-sub border theme-border theme-text-primary text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="theme-bg-accent hover:opacity-90 disabled:opacity-50 theme-accent-text text-xs px-4 py-2.5 rounded-xl font-semibold transition shrink-0 shadow cursor-pointer"
              >
                Add Session
              </button>
            </form>
          </div>

          {/* Session Search & List */}
          <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                placeholder="Search sessions..."
                className="flex-1 theme-bg-sub border theme-border theme-text-primary px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
              <span className="text-[11px] font-mono theme-text-secondary shrink-0">
                {filteredSessions.length} sessions
              </span>
            </div>

            {filteredSessions.length === 0 ? (
              <p className="text-xs theme-text-secondary italic text-center py-6">
                No sessions found. Add a new session preset above.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {filteredSessions.map((s) => (
                  <div
                    key={s.id || s.name}
                    className="theme-bg-sub border theme-border rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 hover:theme-bg-elevated transition group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {s._local && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                          title="Saved locally (pending server sync)"
                        />
                      )}
                      <span className="text-xs font-semibold theme-text-primary truncate">
                        {s.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSession(s.id || s.name, s.name)}
                      className="p-1 text-xs theme-text-secondary hover:text-rose-400 opacity-60 group-hover:opacity-100 transition rounded-lg hover:theme-bg-surface shrink-0"
                      title="Delete Session"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT 2: SAVED COMMENTS */}
      {activeTab === "comments" && (
        <div className="w-full space-y-4">
          {/* Add Comment Template Form Card */}
          <div className="w-full theme-bg-surface border theme-border rounded-2xl p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              + Add New Comment Template
            </h3>
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Enter comment template text..."
                className="flex-1 theme-bg-sub border theme-border theme-text-primary text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
              <button
                type="submit"
                className="theme-bg-accent hover:opacity-90 theme-accent-text text-xs px-4 py-2.5 rounded-xl font-semibold transition shrink-0 shadow cursor-pointer"
              >
                Add Template
              </button>
            </form>
          </div>

          {/* Comment Search & List */}
          <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={commentSearch}
                onChange={(e) => setCommentSearch(e.target.value)}
                placeholder="Search comment templates..."
                className="flex-1 theme-bg-sub border theme-border theme-text-primary px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
              <span className="text-[11px] font-mono theme-text-secondary shrink-0">
                {filteredComments.length} templates
              </span>
            </div>

            {filteredComments.length === 0 ? (
              <p className="text-xs theme-text-secondary italic text-center py-6">
                No comment templates found. Add a template above.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredComments.map((cmt, idx) => (
                  <div
                    key={idx}
                    className="theme-bg-sub border theme-border rounded-xl p-3 flex items-center justify-between gap-3 hover:theme-bg-elevated transition group"
                  >
                    <span className="text-xs theme-text-primary font-medium flex-1 truncate">
                      "{cmt}"
                    </span>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(cmt);
                          showToast("Comment template copied!", "info");
                        }}
                        className="p-1.5 text-xs theme-text-secondary hover:theme-accent rounded-lg hover:theme-bg-surface transition"
                        title="Copy Template Text"
                      >
                        <CopyIcon className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteComment(idx)}
                        className="p-1.5 text-xs theme-text-secondary hover:text-rose-400 rounded-lg hover:theme-bg-surface transition"
                        title="Delete Template"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}