import React from 'react';
import { ShieldCheckIcon, CheckIcon, AlertCircleIcon, ChevronRightIcon } from '../../../components/ui/Icons';
import { useTranslation } from '../../../i18n';
import type { SecurityScoreMetric } from '../types';

interface ProfileSecurityScoreCardProps {
  metric: SecurityScoreMetric;
  onOpenCheckDrawer: (drawerKey: string) => void;
}

export const ProfileSecurityScoreCard: React.FC<ProfileSecurityScoreCardProps> = ({
  metric,
  onOpenCheckDrawer,
}) => {
  const { t, formatNumber, isRTL } = useTranslation('profile');

  const getLevelBadgeClass = () => {
    switch (metric.level) {
      case 'optimal':
        return 'theme-bg-accent-soft theme-accent border theme-border';
      case 'strong':
        return 'theme-bg-accent-soft theme-accent border theme-border';
      case 'moderate':
        return 'theme-bg-warning-soft text-amber-500 border border-amber-500/20';
      case 'critical':
      default:
        return 'theme-bg-danger-soft theme-danger border border-rose-500/20';
    }
  };

  return (
    <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xs space-y-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg theme-bg-sub border theme-border flex items-center justify-center shrink-0">
            <ShieldCheckIcon className="w-4 h-4 theme-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary truncate">
              {t('securityHealth', 'Security & Account Health')}
            </h2>
            <p className="text-sm font-semibold theme-text-primary mt-0.5 truncate">
              {metric.label}
            </p>
          </div>
        </div>

        <span
          className={`text-xs px-2.5 py-1 rounded-full font-bold border inline-flex items-center gap-1 shrink-0 ${getLevelBadgeClass()}`}
        >
          {formatNumber(metric.score)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full theme-bg-sub rounded-full h-2 overflow-hidden border theme-border">
        <div
          className="h-full theme-bg-accent transition-all duration-500 rounded-full"
          style={{ width: `${Math.min(100, Math.max(10, metric.score))}%` }}
        />
      </div>

      <p className="text-xs theme-text-secondary leading-relaxed">
        {metric.summary}
      </p>

      {/* Checklist Grid */}
      <div className="pt-2 border-t theme-border space-y-1.5">
        {metric.checks.map((chk) => {
          const isClickable = !!chk.drawerKey;
          return (
            <div
              key={chk.id}
              onClick={() => {
                if (chk.drawerKey) onOpenCheckDrawer(chk.drawerKey);
              }}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              className={`flex items-center justify-between text-xs py-1 px-1.5 rounded-lg transition-colors ${
                isClickable ? 'hover:theme-bg-sub cursor-pointer group' : ''
              }`}
            >
              <span className="theme-text-secondary truncate pr-2 group-hover:theme-text-primary transition-colors">
                {chk.label}
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                {chk.passed ? (
                  <span className="inline-flex items-center gap-1 theme-accent font-medium text-[11px]">
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>
                      {chk.statusType === 'verification' || chk.id === 'email'
                        ? t('badgeVerified', 'Verified')
                        : t('badgeEnabled', 'Enabled')}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 theme-danger font-medium text-[11px]">
                    <AlertCircleIcon className="w-3.5 h-3.5" />
                    <span>
                      {chk.statusType === 'verification' || chk.id === 'email'
                        ? t('badgeUnverified', 'Unverified')
                        : t('badgeDisabled', 'Disabled')}
                    </span>
                  </span>
                )}

                {isClickable && (
                  <ChevronRightIcon
                    className={`w-3 h-3 theme-text-secondary/60 group-hover:theme-text-primary transition-transform ${
                      isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'
                    }`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileSecurityScoreCard;
