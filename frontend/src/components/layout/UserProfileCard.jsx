import { useState } from "react";
import LoginModal from "../auth/LoginModal";

export default function UserProfileCard({ isProfileOpen, setIsProfileOpen }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const avatarChar = user
    ? user.first_name
      ? user.first_name.charAt(0).toUpperCase()
      : user.username.charAt(0).toUpperCase()
    : "S";

  return (
    <>
      <div className="p-3 border-t border-slate-800 bg-[#17181a]">
        <div
          onClick={() => (user ? setIsProfileOpen(!isProfileOpen) : setIsLoginOpen(true))}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition-colors"
        >
          <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-xs font-semibold">
            {avatarChar}
          </div>

          <div className="flex-1 overflow-hidden">
            {user ? (
              <div>
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {user.first_name ? `${user.first_name} ${user.last_name || ""}` : user.username}
                </p>
                <p className="text-[10px] text-slate-500 uppercase font-mono">
                  {user.role || "MEMBER"}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-slate-300">Not signed in</p>
                <p className="text-[10px] text-indigo-400 font-medium hover:underline">
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
