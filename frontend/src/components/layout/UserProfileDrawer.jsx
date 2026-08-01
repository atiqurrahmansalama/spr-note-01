import { useState } from 'react';
import { fetchWithAuth } from "../../utils/authService";

export default function UserProfileDrawer({ isOpen, onClose, user, onLogout }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

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

      <aside className="fixed lg:static top-0 right-0 z-50 w-72 h-full bg-[#17181a] border-l border-slate-800 shrink-0 flex flex-col justify-between p-5 transition-all duration-300 shadow-2xl lg:shadow-none">
        <div>
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-800/80 mb-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Settings</span>
            <button 
              onClick={onClose} 
              className="text-slate-500 hover:text-slate-200 text-xs p-1 rounded transition-colors"
              title="Close Panel"
            >
              ✕
            </button>
          </div>

          {/* User Identity Info */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center shrink-0">
              {avatarChar}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-semibold text-white truncate">{fullName}</h4>
              <p className="text-[10px] text-slate-500 truncate">@{user.username}</p>
              <span className="inline-block mt-1 text-[9px] text-indigo-400 font-mono uppercase">
                {user.role || 'MEMBER'}
              </span>
            </div>
          </div>

          {/* Readonly Info */}
          <div className="space-y-2 mb-6 text-xs font-mono">
            <div className="bg-[#1c1d1f] px-3 py-2 rounded-md border border-slate-800 flex justify-between text-[11px]">
              <span className="text-slate-500">Email:</span>
              <span className="text-slate-300 truncate max-w-32">{user.email || 'N/A'}</span>
            </div>
            <div className="bg-[#1c1d1f] px-3 py-2 rounded-md border border-slate-800 flex justify-between text-[11px]">
              <span className="text-slate-500">Joined:</span>
              <span className="text-slate-300">{user.date_joined || 'N/A'}</span>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="border-t border-slate-800/80 pt-4">
            <h5 className="text-[11px] font-semibold text-slate-400 mb-3">Security & Password</h5>
            
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
                className="w-full bg-[#1c1d1f] border border-slate-800 text-slate-200 px-3 py-2 rounded-md text-xs focus:outline-none focus:border-slate-600"
              />
              <input
                type="password"
                placeholder="New Password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#1c1d1f] border border-slate-800 text-slate-200 px-3 py-2 rounded-md text-xs focus:outline-none focus:border-slate-600"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 rounded-md text-xs font-medium border border-slate-700 transition-colors"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800/80">
          <button
            onClick={onLogout}
            className="w-full bg-slate-800/60 hover:bg-red-950/30 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/40 py-2 rounded-md text-xs font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}