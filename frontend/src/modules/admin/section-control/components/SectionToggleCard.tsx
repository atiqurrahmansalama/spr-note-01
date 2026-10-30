import React from 'react';
import { ChevronIcon } from '../../../../components/ui/Icons';
import { useSectionTranslation } from '../hooks/useSectionTranslation';
import { SectionItem, InheritanceOrigin } from '../types';

export interface SectionToggleCardProps {
  section: SectionItem;
  isEnabled: boolean;
  hasLocalMod: boolean;
  isParent?: boolean;
  isChild?: boolean;
  parentActive?: boolean;
  onToggle: (sectionKey: string, currentVal: boolean) => void;
  hasChildren?: boolean;
  childrenCount?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const SectionToggleCard: React.FC<SectionToggleCardProps> = ({
  section,
  isEnabled,
  hasLocalMod,
  isParent = false,
  isChild = false,
  parentActive = true,
  onToggle,
  hasChildren = false,
  childrenCount = 0,
  isExpanded = false,
  onToggleExpand,
}) => {
  const { t } = useSectionTranslation();

  const isInteractive = isChild ? parentActive : true;
  const isEffectivelyEnabled = isChild ? parentActive && isEnabled : isEnabled;

  const renderOriginBadge = (origin: InheritanceOrigin = 'GLOBAL') => {
    switch (origin) {
      case 'USER':
        return (
          <span className="theme-purple-badge text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 shadow-2xs shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0" />
            {t('badges.userOverride', 'User Override')}
          </span>
        );
      case 'GROUP':
        return (
          <span className="theme-success-badge text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 shadow-2xs shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0" />
            {t('badges.groupOverride', 'Group Override')}
          </span>
        );
      case 'ROLE':
        return (
          <span className="theme-info-badge text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 shadow-2xs shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0" />
            {t('badges.roleOverride', 'Role Override')}
          </span>
        );
      case 'ACADEMY':
        return (
          <span className="theme-bg-accent-soft theme-accent text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 shadow-2xs shrink-0 border border-current/20">
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0" />
            {t('badges.academyOverride', 'Academy Override')}
          </span>
        );
      case 'GLOBAL':
      default:
        return null;
    }
  };

  const isExpandableParent = Boolean(hasChildren && onToggleExpand);

  const handleCardClick = () => {
    if (!isInteractive) return;
    if (isExpandableParent) {
      onToggleExpand?.();
    } else {
      onToggle(section.section_key, isEnabled);
    }
  };

  const handleSwitchToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (isInteractive) {
      onToggle(section.section_key, isEnabled);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      title={
        !isInteractive
          ? t('badges.disabledByParent', 'Disabled by Parent')
          : isExpandableParent
          ? isExpanded
            ? t('actions.collapse', 'Collapse sub-modules')
            : t('actions.expand', 'Expand sub-modules')
          : isEffectivelyEnabled
          ? t('actions.disable', 'Click to disable')
          : t('actions.enable', 'Click to enable')
      }
      className={`group rounded-xl transition-all duration-150 select-none flex items-center justify-between gap-3 sm:gap-4 px-3.5 py-2.5 sm:px-4 sm:py-3 ${
        !isInteractive
          ? 'theme-bg-sub/20 opacity-40 pointer-events-none'
          : isEffectivelyEnabled
          ? 'theme-bg-surface hover:theme-bg-elevated shadow-2xs cursor-pointer'
          : 'theme-bg-sub/35 opacity-75 hover:opacity-100 hover:theme-bg-sub/60 cursor-pointer'
      } ${hasLocalMod && isInteractive ? 'ring-1.5 ring-[var(--accent-main)]/60' : ''}`}
    >
      {/* Left & Center: Streamlined Content (Click expands/collapses for parent rows) */}
      <div className="min-w-0 flex-1 space-y-1">
        {/* Line 1: Collapse Trigger (if has children) + Title + Override Badges */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
              }}
              className="p-1 -ml-1 rounded-lg theme-text-secondary group-hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title={isExpanded ? t('actions.collapse', 'Collapse sub-modules') : t('actions.expand', 'Expand sub-modules')}
              aria-label={isExpanded ? t('actions.collapse', 'Collapse sub-modules') : t('actions.expand', 'Expand sub-modules')}
              aria-expanded={isExpanded}
            >
              <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5" />
            </button>
          )}

          <span className="font-semibold text-xs sm:text-[13px] theme-text-primary truncate">
            {section.title}
          </span>

          {!isInteractive ? (
            <span className="theme-danger-badge text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
              {t('badges.disabledByParent', 'Disabled by Parent')}
            </span>
          ) : (
            renderOriginBadge(section.inheritance_origin)
          )}
        </div>

        {/* Line 2: Subtitle / Description */}
        {section.description ? (
          <div className="text-[11px] theme-text-secondary min-w-0 leading-tight">
            <span className="truncate opacity-85 block">
              {section.description}
            </span>
          </div>
        ) : null}
      </div>

      {/* Right: Dedicated Switch Toggle Zone (Independent Action) */}
      <div
        className="shrink-0 flex items-center pl-2 sm:pl-3"
        onClick={handleSwitchToggle}
        title={
          !isInteractive
            ? t('badges.disabledByParent', 'Disabled by Parent')
            : isEffectivelyEnabled
            ? t('actions.disable', 'Click to disable')
            : t('actions.enable', 'Click to enable')
        }
      >
        <div
          role="switch"
          aria-checked={isEffectivelyEnabled}
          aria-label={section.title}
          tabIndex={isInteractive ? 0 : -1}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              handleSwitchToggle(e);
            }
          }}
          className={`relative inline-flex items-center rounded-full transition-all duration-200 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-main)] cursor-pointer select-none hover:ring-2 hover:ring-[var(--accent-main)]/35 ${
            isChild ? 'w-9 h-5 p-0.5' : 'w-11 h-6 p-0.5 sm:p-1'
          } ${
            isEffectivelyEnabled
              ? 'theme-bg-accent shadow-xs'
              : 'theme-bg-sub opacity-85'
          }`}
        >
          <span
            className={`inline-block rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out shrink-0 ${
              isChild ? 'w-4 h-4' : 'w-4 h-4 sm:w-4 sm:h-4'
            } ${
              isEffectivelyEnabled
                ? isChild
                  ? 'translate-x-4'
                  : 'translate-x-5'
                : 'translate-x-0'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

export default SectionToggleCard;
