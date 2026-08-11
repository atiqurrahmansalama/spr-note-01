import { CameraIcon, EditPencilIcon } from "./Icons";

export default function ProfileHeroCard({ user, onEditProfile, onChangeAvatar }) {
  if (!user) return null;

  const fullName = user.first_name || user.last_name
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
    : (user.phone_number || user.username || "User Profile");

  const avatarInitial = fullName.charAt(0).toUpperCase();
  const roleCode = (user.role?.code || user.role_info?.code || user.user_type || user.role || "TEACHER").toUpperCase();
  const roleName = user.role?.name || user.role_info?.name || roleCode.replace("_", " ");

  return (
    <div className="theme-bg-surface border theme-border rounded-2xl p-6 text-center shadow-xl relative overflow-hidden select-none">
      {/* Background Accent Soft Glow */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 theme-bg-accent-soft rounded-full blur-3xl pointer-events-none" />

      {/* Avatar Container */}
      <div className="relative w-[84px] h-[84px] mx-auto group">
        <div className="w-[84px] h-[84px] rounded-full border-2 theme-border shadow-md overflow-hidden theme-bg-sub flex items-center justify-center mx-auto theme-text-primary">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold theme-text-primary">{avatarInitial}</span>
          )}
        </div>

        {/* Hover Camera Overlay */}
        <button
          type="button"
          onClick={onChangeAvatar || onEditProfile}
          className="bg-black/60 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-full flex items-center justify-center absolute inset-0 text-white"
          title="Change Avatar Photo"
        >
          <CameraIcon className="w-5 h-5 theme-accent" />
        </button>
      </div>

      {/* User Info Stack */}
      <div className="mt-3 space-y-1">
        <h1 className="text-lg font-bold theme-text-primary tracking-tight">{fullName}</h1>

        {user.email && (
          <p className="text-xs theme-text-secondary font-mono">{user.email}</p>
        )}

        {/* Dynamic Role Badge */}
        <div className="pt-1">
          <span className="theme-bg-accent-soft theme-accent border theme-border text-xs px-3 py-0.5 rounded-full font-mono font-semibold inline-flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full theme-bg-accent animate-pulse" />
            <span>{roleName}</span>
          </span>
        </div>
      </div>

      {/* Edit Action Button */}
      <button
        type="button"
        onClick={onEditProfile}
        className="theme-bg-accent hover:opacity-90 theme-accent-text font-semibold text-xs px-5 py-2.5 rounded-full shadow-md transition-all inline-flex items-center gap-2 mx-auto mt-4 active:scale-95 cursor-pointer"
      >
        <EditPencilIcon className="w-3.5 h-3.5" />
        <span>Edit Profile</span>
      </button>
    </div>
  );
}
