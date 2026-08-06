import { useState, useEffect } from 'react';
import { fetchWithAuth } from "../../utils/authService";
import { fetchUserActivitySummary } from "../../utils/activityTracker";

export default function UserProfileDrawer({ isOpen, onClose, user, onLogout }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [activitySummary, setActivitySummary] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserActivitySummary().then((data) => {
        if (data) setActivitySummary(data);
      });
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const avatarChar = user.first_name ? user.first_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase();
  const fullName = user.first_name ? `${user.first_name} ${user.last_name}` : user.username;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });

    try {
      const response = await fetchWithAuth('/api/change-password/', {
        method: 'POST',
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });

      if (response.ok) {
        setMsg({ type: 'success', text: 'Password updated successfully' });
        setOldPassword('');
        setNewPassword('');
      } else {
        const data = await response.json();
        setMsg({ type: 'error', text: data.old_password?.[0] || 'Failed to update' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Connection failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Layer */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      ></div>

      <aside className="fixed lg:static top-0 right-0 z-50 w-80 h-full theme-bg-sub border-l theme-border shrink-0 flex flex-col justify-between p-5 transition-all duration-300 shadow-2xl lg:shadow-none overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b theme-border mb-5">
            <span className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">User Account & Activity</span>
            <button 
              onClick={onClose} 
              className="theme-text-secondary hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
              title="Close Panel"
            >
              ✕
            </button>
          </div>

          {/* User Identity Info */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-10 h-10 rounded-full theme-bg-accent theme-accent-text font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
              {avatarChar}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold theme-text-primary truncate">{fullName}</h4>
              <p className="text-[10px] theme-text-secondary truncate">@{user.username}</p>
              <span className="inline-block mt-0.5 text-[9px] theme-accent font-mono uppercase font-semibold">
                {user.role || 'MEMBER'}
              </span>
            </div>
          </div>

          {/* Activity & Usage Tracking Metrics Card */}
          <div className="space-y-2 mb-5 text-xs font-mono">
            <div className="theme-bg-surface px-3 py-2 rounded-xl border theme-border flex justify-between items-center text-[11px]">
              <span className="theme-text-secondary">Unique Key:</span>
              <span className="theme-accent font-bold">{activitySummary?.unique_key || (user.id ? `USR-${String(user.id).padStart(4, '0')}` : '--')}</span>
            </div>

            <div className="theme-bg-surface px-3 py-2 rounded-xl border theme-border flex justify-between items-center text-[11px]">
              <span className="theme-text-secondary">Created At:</span>
              <span className="theme-text-primary">{activitySummary?.formatted_created_at || user.date_joined || '--'}</span>
            </div>

            <div className="theme-bg-surface px-3 py-2 rounded-xl border theme-border flex justify-between items-center text-[11px]">
              <span className="theme-text-secondary">Total Active Time:</span>
              <span className="text-emerald-400 font-bold">{activitySummary?.total_lifetime_activity || '--'}</span>
            </div>

            {activitySummary?.recent_login_logs && activitySummary.recent_login_logs.length > 0 && (
              <div className="theme-bg-surface p-3 rounded-xl border theme-border space-y-1.5 text-[10px]">
                <span className="theme-text-secondary block font-semibold uppercase tracking-wider text-[9px] mb-1">Recent Activity Log</span>
                {activitySummary.recent_login_logs.slice(0, 3).map((log) => (
                  <div key={log.id} className="flex items-center justify-between border-b theme-border/40 pb-1 last:border-0 last:pb-0">
                    <span className={`font-bold ${log.status === 'LOGIN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {log.status}
                    </span>
                    <span className="theme-text-secondary font-mono">{log.timestamp_formatted}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Change Password Form */}
          <div className="border-t theme-border pt-4">
            <h5 className="text-[11px] font-semibold theme-text-secondary mb-3">Security & Password</h5>
            
            {msg.text && (
              <div className={`text-[11px] p-2 rounded mb-3 border ${
                msg.type === 'success' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50' : 'bg-red-950/20 text-red-400 border-red-900/50'
              }`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-2.5">
              <input
                type="password"
                placeholder="Current Password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full theme-bg-surface border theme-border theme-text-primary px-3 py-2 rounded-md text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
              <input
                type="password"
                placeholder="New Password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full theme-bg-surface border theme-border theme-text-primary px-3 py-2 rounded-md text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full theme-bg-accent hover:opacity-90 theme-accent-text py-1.5 rounded-md text-xs font-semibold shadow transition-colors"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t theme-border">
          <button
            onClick={onLogout}
            className="w-full theme-bg-elevated hover:bg-red-950/30 theme-text-secondary hover:text-red-400 border theme-border hover:border-red-900/40 py-2 rounded-md text-xs font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}