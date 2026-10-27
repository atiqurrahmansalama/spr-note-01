import React from 'react';
import {
  CameraIcon,
  EditIcon as EditPencilIcon,
  CheckIcon,
  AlertCircleIcon,
} from '../../../components/ui/Icons';
import IconButton from '../../../components/ui/IconButton';
import { useTranslation } from '../../../i18n';
import type { UserProfile } from '../types';

interface ProfileHeroCardProps {
  user: UserProfile | null;
  onEditProfile: () => void;
  onChangeAvatar?: () => void;
  onVerifyEmail?: () => void;
}

export const ProfileHeroCard: React.FC<ProfileHeroCardProps> = ({
  user,
  onEditProfile,
  onChangeAvatar,
  onVerifyEmail,
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
    <div className="theme-bg-surface border theme-border rounded-2xl p-7 sm:p-8 text-center shadow-xs relative overflow-hidden select-none">
      {/* Background Accent Soft Glow */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 theme-bg-accent-soft rounded-full blur-3xl pointer-events-none" />

      {/* Avatar Centering Container */}
      <div className="w-full flex justify-center items-center">
        <div className="relative w-20 h-20 sm:w-22 sm:h-22 group">
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 theme-border shadow-xs overflow-hidden theme-bg-sub flex items-center justify-center theme-text-primary">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl sm:text-3xl font-bold theme-text-primary">{avatarInitial}</span>
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
      </div>

      {/* User Info Stack */}
      <div className="mt-4 sm:mt-5 space-y-1.5">
        <h1 className="text-lg sm:text-xl font-bold theme-text-primary tracking-tight truncate">{fullName}</h1>

        {user.email && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-[13px] theme-text-secondary truncate max-w-full">{user.email}</span>
            {user.is_email_verified ? (
              <span
                className="w-4 h-4 rounded-full theme-bg-accent text-white inline-flex items-center justify-center shadow-xs shrink-0"
                title={t('statusVerified', 'Verified')}
                aria-label={t('statusVerified', 'Verified')}
              >
                <CheckIcon className="w-2.5 h-2.5 stroke-[2.5]" />
              </span>
            ) : (
              <button
                type="button"
                onClick={onVerifyEmail}
                className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95"
                title={t('verifyNow', 'Verify Now')}
              >
                <AlertCircleIcon className="w-2.5 h-2.5" />
                <span>{t('unverifiedAction', 'Unverified • Verify Now')}</span>
              </button>
            )}
          </div>
        )}

        {user.phone_number && !user.email && (
          <p className="text-xs sm:text-[13px] theme-text-secondary">{user.phone_number}</p>
        )}

        {/* Dynamic Role Badge */}
        <div className="pt-2">
          <span className="theme-bg-accent-soft theme-accent border theme-border text-xs px-3.5 py-1 rounded-full font-semibold inline-flex items-center gap-1.5 shadow-2xs">
            <span>{roleName}</span>
          </span>
        </div>
      </div>

      {/* Bottom Right Corner Edit Profile Icon Button */}
      <div className="absolute bottom-3.5 right-3.5 rtl:right-auto rtl:left-3.5 z-10">
        <IconButton
          icon={EditPencilIcon}
          variant="sub"
          size="sm"
          onClick={onEditProfile}
          title={t('editProfile', 'Edit Profile')}
          ariaLabel={t('editProfile', 'Edit Profile')}
        />
      </div>
    </div>
  );
};

export default ProfileHeroCard;
