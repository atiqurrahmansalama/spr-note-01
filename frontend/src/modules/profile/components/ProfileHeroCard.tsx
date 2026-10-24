import React from 'react';
import { CameraIcon, EditIcon as EditPencilIcon } from '../../../components/ui/Icons';
import { useTranslation } from '../../../i18n';
import type { UserProfile } from '../types';

interface ProfileHeroCardProps {
  user: UserProfile | null;
  onEditProfile: () => void;
  onChangeAvatar?: () => void;
}

export const ProfileHeroCard: React.FC<ProfileHeroCardProps> = ({
  user,
  onEditProfile,
  onChangeAvatar,
}) => {
  const { t } = useTranslation('profile');

  if (!user) return null;

  const fullName =
    user.first_name || user.last_name
      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
      : user.phone_number || user.username || t('userFallback', 'User Profile');

  const avatarInitial = fullName.charAt(0).toUpperCase();

  // Clean role format (e.g. 'SUPER_ADMIN' -> 'Super Admin')
  const rawRole =
    typeof user.role === 'string'
      ? user.role
      : user.role?.name || user.role_info?.name || user.user_type || 'Teacher';

  const roleName = rawRole
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return (
    <div className="theme-bg-surface border theme-border rounded-2xl p-6 text-center shadow-xs relative overflow-hidden select-none">
      {/* Background Accent Soft Glow */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 theme-bg-accent-soft rounded-full blur-3xl pointer-events-none" />

      {/* Avatar Container */}
      <div className="relative w-20 h-20 mx-auto group">
        <div className="w-20 h-20 rounded-full border-2 theme-border shadow-xs overflow-hidden theme-bg-sub flex items-center justify-center mx-auto theme-text-primary">
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
          className="bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full flex items-center justify-center absolute inset-0 text-white"
          title={t('changeAvatar', 'Change Avatar Photo')}
          aria-label={t('changeAvatar', 'Change Avatar Photo')}
        >
          <CameraIcon className="w-5 h-5 theme-accent" />
        </button>
      </div>

      {/* User Info Stack */}
      <div className="mt-3.5 space-y-1">
        <h1 className="text-lg font-bold theme-text-primary tracking-tight">{fullName}</h1>

        {user.email && (
          <p className="text-xs theme-text-secondary">{user.email}</p>
        )}

        {user.phone_number && !user.email && (
          <p className="text-xs theme-text-secondary">{user.phone_number}</p>
        )}

        {/* Dynamic Role Badge */}
        <div className="pt-1.5">
          <span className="theme-bg-accent-soft theme-accent border theme-border text-xs px-3 py-1 rounded-full font-semibold inline-flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full theme-bg-accent animate-pulse" />
            <span>{roleName}</span>
          </span>
        </div>
      </div>

      {/* Edit Action Button */}
      <button
        type="button"
        onClick={onEditProfile}
        className="theme-bg-accent hover:opacity-90 theme-accent-text font-semibold text-xs px-5 py-2.5 rounded-full shadow-xs transition-all inline-flex items-center gap-2 mx-auto mt-4 active:scale-95 cursor-pointer"
      >
        <EditPencilIcon className="w-3.5 h-3.5" />
        <span>{t('editProfile', 'Edit Profile')}</span>
      </button>
    </div>
  );
};

export default ProfileHeroCard;
