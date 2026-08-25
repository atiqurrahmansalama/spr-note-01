import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTenant } from '../../context/TenantContext';
import { useFont } from '../../context/useFont';
import {
  DepartmentIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
} from '../ui/Icons';

export default function InstitutionSwitchModal() {
  const { activeFont } = useFont();
  const {
    pendingSwitchInstitution,
    confirmSwitchInstitution,
    cancelSwitchInstitution,
  } = useTenant();

  // Handle ESC key
  useEffect(() => {
    if (!pendingSwitchInstitution) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        cancelSwitchInstitution();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingSwitchInstitution, cancelSwitchInstitution]);

  if (!pendingSwitchInstitution) return null;

  const isGlobalTarget = pendingSwitchInstitution.id === 'ALL';
  const targetName = pendingSwitchInstitution.name || (isGlobalTarget ? 'All Institutions' : 'Academic Workspace');
  const targetBanglaName = pendingSwitchInstitution.bangla_name || '';
  const targetType = pendingSwitchInstitution.institution_type || (isGlobalTarget ? 'GLOBAL' : 'ACADEMY');
  const targetDistrict = pendingSwitchInstitution.district || '';
  const targetSlug = pendingSwitchInstitution.slug || '';

  const modalContent = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fade-in select-none text-left"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          cancelSwitchInstitution();
        }
      }}
    >
      <div
        style={{ fontFamily: activeFont?.css }}
        className="relative w-full max-w-[420px] rounded-3xl theme-bg-surface border theme-border shadow-2xl p-6 sm:p-7 text-center space-y-5 animate-scale-up overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full theme-bg-accent opacity-15 blur-3xl pointer-events-none" />

        {/* Monogram / Avatar with soft ring */}
        <div className="relative flex justify-center">
          <div className="relative w-16 h-16 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent text-2xl font-black shadow-md ring-4 ring-[var(--accent-main)]/10">
            {pendingSwitchInstitution.logo_url ? (
              <img
                src={pendingSwitchInstitution.logo_url}
                alt=""
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : isGlobalTarget ? (
              <BuildingOfficeIcon className="w-7 h-7" />
            ) : (
              targetName.charAt(0).toUpperCase()
            )}

            {pendingSwitchInstitution.is_verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full theme-bg-surface border theme-border flex items-center justify-center shadow-xs">
                <CheckCircleIcon className="w-3.5 h-3.5 theme-accent" />
              </div>
            )}
          </div>
        </div>

        {/* Institution Title & Details */}
        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight leading-snug px-1">
            {targetName}
          </h3>

          {targetBanglaName && (
            <p className="text-xs theme-text-secondary font-medium">
              {targetBanglaName}
            </p>
          )}

          {/* Minimal Badges */}
          <div className="flex items-center justify-center gap-1.5 pt-1.5 flex-wrap text-[10px]">
            <span className="px-2.5 py-0.5 rounded-full theme-bg-accent-soft theme-accent font-semibold border theme-border">
              {targetType}
            </span>
            {targetDistrict && (
              <span className="px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-text-secondary">
                {targetDistrict}
              </span>
            )}
            {targetSlug && (
              <span className="px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border font-mono theme-text-secondary">
                @{targetSlug}
              </span>
            )}
          </div>
        </div>

        {/* Sleek Workspace Transition Box */}
        <div className="p-3.5 rounded-2xl theme-bg-sub/80 border theme-border text-left flex items-start gap-3 shadow-2xs">
          <div className="w-7 h-7 rounded-xl theme-bg-accent-soft theme-accent border theme-border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <DepartmentIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs space-y-0.5 min-w-0">
            <p className="font-semibold theme-text-primary text-[11.5px]">Workspace Transition</p>
            <p className="theme-text-secondary text-[11px] leading-relaxed">
              {isGlobalTarget
                ? 'Switching to Global Scope across all registered institutions.'
                : 'All classes, enrolled students, attendance rolls, and academic settings will dynamically sync to this institution.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={cancelSwitchInstitution}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary border theme-border transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmSwitchInstitution}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold theme-bg-accent hover:opacity-95 theme-accent-text transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
          >
            <span>Switch Workspace</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
