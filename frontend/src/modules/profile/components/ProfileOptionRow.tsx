import React from 'react';
import { ChevronRightIcon } from '../../../components/ui/Icons';
import { useTranslation } from '../../../i18n';

interface ProfileOptionRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  badgeStyle?: string;
  onClick?: () => void;
  isDanger?: boolean;
}

export const ProfileOptionRow: React.FC<ProfileOptionRowProps> = ({
  icon,
  title,
  subtitle,
  badgeText,
  badgeVariant = 'neutral',
  badgeStyle,
  onClick,
  isDanger = false,
}) => {
  const { isRTL } = useTranslation('profile');

  const getBadgeClasses = () => {
    if (badgeStyle) return badgeStyle;

    switch (badgeVariant) {
      case 'accent':
        return 'theme-bg-accent-soft theme-accent border theme-border';
      case 'success':
        return 'theme-bg-success-soft theme-text-success border theme-border-success';
      case 'warning':
        return 'theme-bg-warning-soft theme-text-warning border theme-border-warning';
      case 'danger':
        return 'theme-bg-danger-soft theme-danger border theme-border-danger';
      case 'neutral':
      default:
        return 'theme-bg-sub theme-text-secondary border theme-border';
    }
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`px-5 py-4 flex items-center justify-between transition-colors cursor-pointer group select-none border-b theme-border last:border-b-0 ${
        isDanger ? 'hover:theme-bg-danger-soft' : 'hover:theme-bg-sub/60'
      }`}
    >
      {/* Left Side: Icon Badge + Text Stack */}
      <div className="flex items-center min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
        <div
          className={`p-2.5 rounded-xl border flex items-center justify-center mr-3.5 rtl:mr-0 rtl:ml-3.5 w-10 h-10 shrink-0 transition-colors ${
            isDanger
              ? 'theme-bg-danger-soft theme-danger border theme-border-danger'
              : 'theme-bg-sub theme-accent border theme-border group-hover:border-[var(--border-hover)]'
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <h3
            className={`text-sm font-semibold transition-colors ${
              isDanger ? 'theme-danger' : 'theme-text-primary'
            }`}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs theme-text-secondary font-normal mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Side: Badge / Status + Chevron */}
      <div className="flex items-center gap-2.5 shrink-0">
        {badgeText && (
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getBadgeClasses()}`}
          >
            {badgeText}
          </span>
        )}

        <ChevronRightIcon
          className={`w-4 h-4 theme-text-secondary/60 group-hover:theme-text-primary transition-transform ${
            isRTL
              ? 'rotate-180 group-hover:-translate-x-0.5'
              : 'group-hover:translate-x-0.5'
          } ${isDanger ? 'theme-danger' : ''}`}
        />
      </div>
    </div>
  );
};

export default ProfileOptionRow;
