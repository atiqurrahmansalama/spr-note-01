import { useState } from "react";
import LoginModal from "../auth/LoginModal";
import { auth as authStore } from "../../utils/localStore";

export default function UserProfileCard({ isProfileOpen, setIsProfileOpen }) {
  const [user, setUser] = useState(() => authStore.getUser());

  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const avatarChar = user
    ? user.first_name
      ? user.first_name.charAt(0).toUpperCase()
      : user.username.charAt(0).toUpperCase()
    : "S";

  return (
    <>
      <div className="p-3 border-t theme-border theme-bg-sub">
        <div
          onClick={() => (user ? setIsProfileOpen(!isProfileOpen) : setIsLoginOpen(true))}
          className="flex items-center gap-3 p-2 rounded-xl hover:theme-bg-elevated cursor-pointer transition-colors"
        >
          <div className="w-8 h-8 rounded-lg theme-bg-elevated border theme-border theme-accent flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm">
            {avatarChar}
          </div>

          <div className="flex-1 overflow-hidden">
            {user ? (
              <div>
                <p className="text-xs font-semibold theme-text-primary truncate">
                  {user.first_name ? `${user.first_name} ${user.last_name || ""}` : user.username}
                </p>
                <p className="text-[10px] theme-text-secondary uppercase font-mono">
                  {user.role || "MEMBER"}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold theme-text-primary">Not signed in</p>
                <p className="text-[10px] theme-accent font-medium hover:underline">
                  Tap to sign in →
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Login Popup Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
      />
    </>
  );
}
