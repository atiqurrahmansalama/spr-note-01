import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { 
  sessions as sessionStore, 
  savedComments as commentStore, 
  isOnline, 
  mergeSessions 
} from "../../utils/localStore";
import { SessionsIcon, ChatIcon, TrashIcon, CopyIcon, EditIcon } from "../../components/ui/Icons";
import { syncSessionsAndComments } from "../../utils/syncEngine";

// Helper to normalize any comment structure into a clean array of objects
function normalizeCommentList(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((c) => {
      if (!c) return null;
      if (typeof c === "string") return { id: crypto.randomUUID(), text: c };
      if (typeof c === "object") {
        return {
          id: c.id || c.uniq_id || crypto.randomUUID(),
          text: c.text || c.comment || "",
          _local: !!c._local
        };
      }
      return null;
    })
    .filter((c) => c !== null && typeof c.text === "string" && c.text.trim().length > 0);
}

// Helper to normalize session structure
function normalizeSessionList(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((s, idx) => ({
    id: typeof s === "object" && s !== null ? (s.id || `sess-${idx}`) : `sess-${idx}`,
    name: typeof s === "object" && s !== null ? (s.name || s.session_name || s.label || String(s)) : String(s),
    _local: typeof s === "object" && s !== null ? !!s._local : false,
  }));
}

export default function SessionManager() {
  const { showToast } = useToast();

  const [sessions, setSessions] = useState(() => normalizeSessionList(sessionStore.getAll()));
  const [newSessionName, setNewSessionName] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Saved comments state (Strict Array of Strings)
  const [comments, setComments] = useState(() => normalizeCommentList(commentStore.getAll()));
  const [newCommentText, setNewCommentText] = useState("");
  const [commentSearch, setCommentSearch] = useState("");

  const [offline, setOffline] = useState(!isOnline());

  // Editing states
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editSessionNameInput, setEditSessionNameInput] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentTextInput, setEditCommentTextInput] = useState("");

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      loadSessionsAndComments();
    };
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save comment list changes locally
  useEffect(() => {
    commentStore.saveAll(comments);
  }, [comments]);

  // Load Sessions and Comments
  const loadSessionsAndComments = async () => {
    const cached = sessionStore.getAll();
    if (cached.length > 0) {
      setSessions(normalizeSessionList(cached));
    }
    const cachedComments = commentStore.getAll();
    const normalizedCached = normalizeCommentList(cachedComments);
    if (normalizedCached.length > 0) {
      setComments(normalizedCached);
    }

    if (!isOnline()) return;

    try {
      // Trigger local sync in background non-blocking
      syncSessionsAndComments().catch(() => {});

      const [sessRes, msgRes] = await Promise.allSettled([
        fetchWithAuth("/sessions/"),
        fetchWithAuth("/messages/"),
      ]);

      if (sessRes.status === "fulfilled" && sessRes.value.ok) {
        const rawSess = await sessRes.value.json();
        const serverSessions = Array.isArray(rawSess)
          ? rawSess
          : Array.isArray(rawSess.results)
          ? rawSess.results
          : [];
        const normalized = normalizeSessionList(serverSessions);
        const merged = mergeSessions(sessionStore.getAll(), normalized);
        setSessions(normalizeSessionList(merged));
        sessionStore.saveAll(merged);
      }

      if (msgRes.status === "fulfilled" && msgRes.value.ok) {
        const rawMsgs = await msgRes.value.json();
        const serverComments = Array.isArray(rawMsgs)
          ? rawMsgs
          : Array.isArray(rawMsgs.results)
          ? rawMsgs.results
          : [];
        const normalized = normalizeCommentList(serverComments);
        setComments(normalized);
        commentStore.saveAll(normalized);
      }
    } catch (err) {
      console.warn("[SessionManager] Sync error:", err.message);
    }
  };

  useEffect(() => {
    loadSessionsAndComments();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Add Session
  const handleAddSession = async (e) => {
    e.preventDefault();
    const trimmed = newSessionName.trim();
    if (!trimmed) return;

    const currentSessions = normalizeSessionList(sessions);
    if (currentSessions.some((s) => (s.name || "").toLowerCase() === trimmed.toLowerCase())) {
      showToast("Session already exists!", "error");
      return;
    }

    setIsSubmitting(true);

    if (isOnline()) {
      try {
        const res = await fetchWithAuth("/sessions/", {
          method: "POST",
          body: JSON.stringify({ name: trimmed }),
        });
        if (res.ok) {
          await loadSessionsAndComments();
          setNewSessionName("");
          showToast("Session added!", "success");
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.warn("[SessionManager] Online session add error:", err.message);
      }
    }

    const localSession = { id: `local-${Date.now()}`, name: trimmed, _local: true };
    const updated = [...normalizeSessionList(sessions), localSession];
    setSessions(updated);
    sessionStore.saveAll(updated);
    setNewSessionName("");
    showToast("Session saved locally!", "info");
    setIsSubmitting(false);
  };

  // Start edit session
  const startEditSession = (s) => {
    setEditingSessionId(s.id);
    setEditSessionNameInput(s.name);
  };

  // Save edited session
  const handleSaveEditSession = async (s) => {
    const trimmed = editSessionNameInput.trim();
    if (!trimmed) {
      showToast("Session name cannot be empty!", "error");
      return;
    }

    const currentSessions = normalizeSessionList(sessions);
    const updated = currentSessions.map((sess) =>
      sess.id === s.id ? { ...sess, name: trimmed, _local: true } : sess
    );
    setSessions(updated);
    sessionStore.saveAll(updated);
    setEditingSessionId(null);
    showToast("Session updated locally!", "success");

    const isDbId = s.id && /^\d+$/.test(String(s.id));
    if (isOnline() && isDbId) {
      try {
        const res = await fetchWithAuth(`/sessions/${s.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ name: trimmed }),
        });
        if (res.ok) {
          await loadSessionsAndComments();
          showToast("Session updated!", "success");
        }
      } catch (err) {
        console.warn("[SessionManager] Online session edit error:", err.message);
      }
    }
  };

  // Delete Session
  const handleDeleteSession = async (id, name) => {
    const currentSessions = normalizeSessionList(sessions);
    const updated = currentSessions.filter((s) => s.id !== id);
    setSessions(updated);
    sessionStore.saveAll(updated);
    showToast("Session deleted", "info");

    const isDbId = id && /^\d+$/.test(String(id));
    if (isOnline() && isDbId) {
      try {
        await fetchWithAuth(`/sessions/${id}/`, { method: "DELETE" });
      } catch (err) {
        console.warn("[SessionManager] Online session delete error:", err.message);
      }
    }
  };

  // Add Comment Template
  const handleAddComment = async (e) => {
    e.preventDefault();
    const trimmed = newCommentText.trim();
    if (!trimmed) return;

    const currentComments = normalizeCommentList(comments);
    if (currentComments.some((c) => (c.text || "").toLowerCase() === trimmed.toLowerCase())) {
      showToast("Comment template already exists!", "error");
      return;
    }

    if (isOnline()) {
      try {
        const postRes = await fetchWithAuth("/messages/", {
          method: "POST",
          body: JSON.stringify({ text: trimmed }),
        });
        if (postRes.ok) {
          await loadSessionsAndComments();
          setNewCommentText("");
          showToast("Comment template added!", "success");
          return;
        }
      } catch (err) {
        console.warn("[SessionManager] Online comment save error:", err.message);
      }
    }
  };

  // Start edit comment template
  const startEditComment = (commentId, text) => {
    setEditingCommentId(commentId);
    setEditCommentTextInput(text);
  };

  // Save edited comment template
  const handleSaveEditComment = async (commentId, oldText) => {
    const trimmed = editCommentTextInput.trim();
    if (!trimmed) {
      showToast("Comment template text cannot be empty!", "error");
      return;
    }

    const currentComments = normalizeCommentList(comments);
    const updated = currentComments.map((c) => 
      c.id === commentId ? { ...c, text: trimmed, _local: true } : c
    );
    setComments(updated);
    commentStore.saveAll(updated);
    setEditingCommentId(null);
    showToast("Comment template updated locally!", "success");

    const isDbId = commentId && /^\d+$/.test(String(commentId));
    if (isOnline() && isDbId) {
      try {
        const res = await fetchWithAuth(`/messages/${commentId}/`, {
          method: "PATCH",
          body: JSON.stringify({ text: trimmed }),
        });
        if (res.ok) {
          await loadSessionsAndComments();
          showToast("Comment template updated!", "success");
        }
      } catch (err) {
        console.warn("[SessionManager] Online comment edit error:", err.message);
      }
    }
  };

  // Delete Comment Template
  const handleDeleteComment = async (commentId) => {
    const currentComments = normalizeCommentList(comments);
    const updated = currentComments.filter((c) => c.id !== commentId);
    setComments(updated);
    commentStore.saveAll(updated);
    showToast("Comment template deleted", "info");

    const isDbId = commentId && /^\d+$/.test(String(commentId));
    if (isOnline() && isDbId) {
      try {
        await fetchWithAuth(`/messages/${commentId}/`, {
          method: "DELETE",
        });
      } catch (err) {
        console.warn("Failed to delete comment from server:", err.message);
      }
    }
  };

  // Filtered and sorted Sessions (A-Z)
  const safeSessions = normalizeSessionList(sessions);
  const filteredSessions = safeSessions
    .filter((s) => (s.name || "").toLowerCase().includes(sessionSearch.toLowerCase()))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // Filtered and sorted Comments (A-Z)
  const safeComments = normalizeCommentList(comments);
  const filteredComments = safeComments
    .filter((c) => (c.text || "").toLowerCase().includes(commentSearch.toLowerCase()))
    .sort((a, b) => (a.text || "").localeCompare(b.text || ""));

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">

      {/* Offline Badge */}
      {offline && (
        <div className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span>Offline mode — changes will sync when back online.</span>
        </div>
      )}

      {/* ─── CARD 1: SESSIONS PRESET ─────────────────────────── */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl shadow-xl overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b theme-border bg-gradient-to-r from-[var(--accent-main)]/8 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 theme-bg-accent-soft rounded-xl theme-accent shrink-0">
              <SessionsIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold theme-text-primary tracking-tight">Sessions Preset</h2>
              <p className="text-[11px] theme-text-secondary mt-0.5">Add reusable session names for daily reports</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full theme-bg-app theme-accent font-bold border theme-border">
            {filteredSessions.length}
          </span>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-4">
          {/* Add Session Form */}
          <form onSubmit={handleAddSession} className="flex gap-2">
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="e.g. Sabaq, Sabqi, Nazera, Hifz..."
              className="flex-1 theme-bg-sub border theme-border theme-text-primary text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="theme-bg-accent hover:opacity-90 disabled:opacity-50 theme-accent-text text-xs px-4 py-2.5 rounded-xl font-semibold transition shrink-0 cursor-pointer"
            >
              Add
            </button>
          </form>

          {/* Session Search */}
          {safeSessions.length > 4 && (
            <input
              type="text"
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              placeholder="Search sessions..."
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
            />
          )}

          {/* Sessions List */}
          <div className="max-h-64 overflow-y-auto pr-0.5 space-y-1.5" style={{ scrollbarGutter: "stable" }}>
            {filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 theme-text-secondary text-xs gap-2">
                <SessionsIcon className="w-6 h-6 opacity-30" />
                <span>No sessions yet. Add your first session above.</span>
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isEditing = editingSessionId === s.id;

                if (isEditing) {
                  return (
                    <div key={s.id || s.name} className="theme-bg-sub border theme-border rounded-xl p-3 space-y-2 shadow-sm animate-fade-in">
                      <input
                        type="text"
                        value={editSessionNameInput}
                        onChange={(e) => setEditSessionNameInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditSession(s); }}
                        autoFocus
                        className="w-full theme-bg-app border theme-border theme-text-primary px-2.5 py-1 rounded-md text-xs focus:outline-none"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingSessionId(null)}
                          className="px-2 py-0.5 text-[10px] font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditSession(s)}
                          className="px-2.5 py-0.5 text-[10px] font-semibold theme-accent-text theme-bg-accent rounded-md cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={s.id || s.name}
                    className="theme-bg-sub border theme-border rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 hover:theme-bg-elevated transition group select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {s._local && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pending sync" />
                      )}
                      <span className="text-xs font-semibold theme-text-primary truncate">{s.name}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => startEditSession(s)}
                        className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-app transition cursor-pointer"
                        title="Edit Session Name"
                      >
                        <EditIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSession(s.id, s.name)}
                        className="p-1.5 rounded-lg theme-text-secondary hover:text-red-400 hover:theme-bg-app transition cursor-pointer"
                        title="Delete Session"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── CARD 2: SAVED COMMENT TEMPLATES ─────────────────── */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl shadow-xl overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b theme-border bg-gradient-to-r from-[var(--accent-main)]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 theme-bg-accent-soft rounded-xl theme-accent shrink-0">
              <ChatIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold theme-text-primary tracking-tight">Saved Comment Templates</h2>
              <p className="text-[11px] theme-text-secondary mt-0.5">Quick-insert reusable comment phrases</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full theme-bg-app theme-accent font-bold border theme-border">
            {filteredComments.length}
          </span>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-4">
          {/* Add Comment Template Form */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="e.g. Excellent recitation progress today..."
              className="flex-1 theme-bg-sub border theme-border theme-text-primary text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
            />
            <button
              type="submit"
              className="theme-bg-accent hover:opacity-90 theme-accent-text text-xs px-4 py-2.5 rounded-xl font-semibold transition shrink-0 cursor-pointer"
            >
              Add
            </button>
          </form>

          {/* Comment Search */}
          {safeComments.length > 4 && (
            <input
              type="text"
              value={commentSearch}
              onChange={(e) => setCommentSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
            />
          )}

          {/* Comments List */}
          <div className="max-h-64 overflow-y-auto pr-0.5 space-y-1.5" style={{ scrollbarGutter: "stable" }}>
            {filteredComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 theme-text-secondary text-xs gap-2">
                <ChatIcon className="w-6 h-6 opacity-30" />
                <span>No templates yet. Save frequently used comments above.</span>
              </div>
            ) : (
              filteredComments.map((msg) => {
                const isEditing = editingCommentId === msg.id;

                if (isEditing) {
                  return (
                    <div key={msg.id} className="theme-bg-sub border theme-border rounded-xl p-3 space-y-2 shadow-sm animate-fade-in">
                      <input
                        type="text"
                        value={editCommentTextInput}
                        onChange={(e) => setEditCommentTextInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditComment(msg.id, msg.text); }}
                        autoFocus
                        className="w-full theme-bg-app border theme-border theme-text-primary px-2.5 py-1 rounded-md text-xs focus:outline-none"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingCommentId(null)}
                          className="px-2 py-0.5 text-[10px] font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditComment(msg.id, msg.text)}
                          className="px-2.5 py-0.5 text-[10px] font-semibold text-white theme-bg-accent rounded-md cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className="theme-bg-sub border theme-border rounded-xl px-3.5 py-2.5 flex items-start justify-between gap-3 hover:theme-bg-elevated transition group select-none"
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {msg._local && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" title="Pending sync" />
                      )}
                      <span className="text-xs theme-text-primary break-words leading-relaxed flex-1 whitespace-pre-wrap">{msg.text}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition shrink-0 mt-0.5">
                      <button
                        type="button"
                        onClick={() => startEditComment(msg.id, msg.text)}
                        className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-app transition cursor-pointer"
                        title="Edit Template"
                      >
                        <EditIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(msg.id)}
                        className="p-1.5 rounded-lg theme-text-secondary hover:text-red-400 hover:theme-bg-app transition cursor-pointer"
                        title="Delete Template"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
