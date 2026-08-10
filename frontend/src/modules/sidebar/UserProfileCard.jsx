import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth as authStore } from "../../utils/localStore";

export default function UserProfileCard({ onCloseSidebar }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => authStore.getUser());

  useEffect(() => {
    const handleAuthUpdate = () => setUser(authStore.getUser());
    window.addEventListener("storage", handleAuthUpdate);
    window.addEventListener("spr_auth_updated", handleAuthUpdate);
    return () => {
      window.removeEventListener("storage", handleAuthUpdate);
      window.removeEventListener("spr_auth_updated", handleAuthUpdate);
    };
  }, []);

  const avatarChar = user
    ? user.first_name
      ? user.first_name.charAt(0).toUpperCase()
      : user.username ? user.username.charAt(0).toUpperCase() : "U"
    : "S";

  const handleProfileClick = () => {
    navigate("/profile-settings");
    if (onCloseSidebar) onCloseSidebar();
  };

  return (
    <div className="p-3 border-t theme-border theme-bg-sub shrink-0">
      <div
        onClick={handleProfileClick}
        className="flex items-center gap-3 p-2 rounded-xl hover:theme-bg-elevated cursor-pointer transition-colors"
        title="Open Profile Settings"
      >
        <div className="w-8 h-8 rounded-lg theme-bg-elevated border theme-border theme-accent flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm overflow-hidden">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            avatarChar
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          <div>
            <p className="text-xs font-semibold theme-text-primary truncate">
              {user ? (user.first_name ? `${user.first_name} ${user.last_name || ""}` : user.username) : "Profile Settings"}
            </p>
            <p className="text-[10px] theme-accent font-mono truncate">
              {user ? (user.role || "MEMBER") : "Tap to open profile →"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

