import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";

export default function SessionManager() {
  const { showToast } = useToast();

  const [sessions, setSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚀 ১. ডাটাবেজ থেকে সেশন লোড করা
  const loadSessions = async () => {
    try {
      const res = await fetchWithAuth("/sessions/");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    fetchWithAuth("/sessions/")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted) setSessions(data);
      })
      .catch((err) => console.error("Failed to load sessions:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  // 🚀 ২. নতুন সেশন তৈরি করা
  const handleAddSession = async (e) => {
    e.preventDefault();
    if (!newSessionName.trim()) {
      showToast("Session name cannot be empty!", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth("/sessions/", {
        method: "POST",
        body: JSON.stringify({ name: newSessionName.trim() }),
      });

      if (res.ok) {
        showToast(`Session "${newSessionName}" added to database!`, "success");
        setNewSessionName("");
        await loadSessions();
      } else {
        const errData = await res.json();
        showToast(errData.name ? errData.name[0] : "Failed to add session", "error");
      }
    } catch (error) {
      showToast("Server Connection Error: " + error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚀 ৩. সেশন মুছে ফেলা
  const handleDeleteSession = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" permanently?`)) {
      return;
    }

    try {
      const res = await fetchWithAuth(`/sessions/${id}/`, {
        method: "DELETE",
      });

      if (res.ok || res.status === 204) {
        showToast(`Session "${name}" deleted!`, "success");
        await loadSessions();
      } else {
        showToast("Failed to delete session", "error");
      }
    } catch (error) {
      showToast("Delete Error: " + error.message, "error");
    }
  };

  return (
    <div className="space-y-1">
      <div className="pl-1 pr-1 py-2 space-y-3 theme-bg-sub rounded-xl my-1 border theme-border">
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

        {/* Database Sessions List */}
        <div className="space-y-1 max-h-48 overflow-y-auto px-2 custom-scrollbar">
          <span className="text-[10px] font-mono theme-text-secondary uppercase tracking-wider block mb-1">
            Database Sessions
          </span>
          {sessions.length === 0 ? (
            <p className="text-[11px] theme-text-secondary italic py-1 opacity-70">
              No sessions in database
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between group theme-bg-app hover:theme-bg-elevated px-2.5 py-1.5 rounded-lg border theme-border transition"
              >
                <span className="text-[11px] theme-text-primary font-medium truncate">
                  {s.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteSession(s.id, s.name)}
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