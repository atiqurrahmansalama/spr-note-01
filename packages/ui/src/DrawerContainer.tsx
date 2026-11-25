import React, { useState } from 'react';
import CustomButton from './CustomButton';
import AutoSaveBadge from './AutoSaveBadge';
import { ChevronIcon } from './Icons';

export interface DrawerContainerProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  spacing?: 'normal' | 'compact' | 'relaxed' | 'none';
  padding?: 'normal' | 'compact' | 'none';
  animate?: boolean;
  className?: string;
}

export interface DrawerBannerProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export interface DrawerSectionProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  variant?: 'streamlined' | 'card';
  collapsible?: boolean;
  defaultExpanded?: boolean;
  expanded?: boolean;
  storageKey?: string;
  onToggle?: (expanded: boolean) => void;
}

export interface DrawerFooterProps {
  onCancel?: () => void;
  onSubmit?: (e: React.SyntheticEvent) => void;
  onSave?: (e: React.SyntheticEvent) => void;
  onConfirm?: (e: React.SyntheticEvent) => void;
  cancelLabel?: string;
  cancelText?: string;
  saveLabel?: string;
  saveText?: string;
  confirmText?: string;
  saveIcon?: React.ComponentType<{ className?: string }>;
  confirmIcon?: React.ComponentType<{ className?: string }>;
  isSubmitting?: boolean;
  confirmLoading?: boolean;
  isSaveDisabled?: boolean;
  saveDisabled?: boolean;
  confirmDisabled?: boolean;
  isDisabled?: boolean;
  autoSaveStatus?: 'saved' | 'saving' | 'error' | null;
  lastSavedAt?: Date | string | null;
  showAutoSave?: boolean;
  extraButtons?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Container-query aware wrapper for Right Drawer content.
 * Enforces padding="none" compatibility inside RightSidebarPanel and borderless soft surfaces.
 */
export function DrawerContainer({
  children,
  header,
  footer,
  spacing = 'normal',
  padding = 'none',
  animate = false,
  className = '',
}: DrawerContainerProps) {
  const spacingClasses: Record<string, string> = {
    compact: 'space-y-4',
    normal: 'space-y-5',
    relaxed: 'space-y-6',
    none: '',
  };

  const paddingClasses: Record<string, string> = {
    compact: 'p-4',
    normal: 'p-5',
    none: '',
  };

  return (
    <div
      className={`@container flex flex-col w-full ${spacingClasses[spacing] || spacingClasses.normal} ${
        paddingClasses[padding] || ''
      } ${animate ? 'animate-fade-in' : ''} ${className}`}
    >
      {header}
      <div className={`flex-1 min-w-0 ${spacingClasses[spacing] || spacingClasses.normal}`}>{children}</div>
      {footer}
    </div>
  );
}

export function DrawerBanner({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions,
  className = '',
  children,
}: DrawerBannerProps) {
  return (
    <div
      className={`p-4 rounded-2xl theme-bg-app border-0 flex items-center justify-between gap-3 shadow-xs ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="w-10 h-10 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {title && (
              <h4 className="text-xs @[420px]:text-sm font-bold theme-text-primary leading-snug break-words">
                {title}
              </h4>
            )}
            {badge && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs theme-text-secondary mt-0.5 font-normal leading-relaxed break-words">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function DrawerSection({
  title,
  subtitle,
  icon: Icon,
  badge,
  headerRight,
  children,
  className = '',
  bodyClassName = '',
  variant = 'streamlined',
  collapsible = false,
  defaultExpanded = true,
  expanded: controlledExpanded,
  storageKey,
  onToggle,
}: DrawerSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && storageKey && collapsible) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) return JSON.parse(saved) === true;
      } catch {
        // Ignore
      }
    }
    return defaultExpanded;
  });

  const isExpanded = collapsible
    ? controlledExpanded !== undefined
      ? controlledExpanded
      : internalExpanded
    : true;

  const handleToggle = () => {
    if (!collapsible) return;
    const next = !isExpanded;
    if (controlledExpanded !== undefined) {
      onToggle?.(next);
    } else {
      setInternalExpanded(next);
      if (typeof window !== 'undefined' && storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Ignore
        }
      }
      onToggle?.(next);
    }
  };

  const isCard = variant === 'card';

  return (
    <div
      className={
        isCard
          ? `rounded-2xl theme-bg-app p-4 @[480px]:p-5 shadow-xs space-y-4 border-0 ${className}`
          : `space-y-4 pt-4 first:pt-0 ${className}`
      }
    >
      {(title || subtitle || headerRight || collapsible) && (
        <div
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          aria-expanded={collapsible ? isExpanded : undefined}
          onClick={collapsible ? handleToggle : undefined}
          onKeyDown={
            collapsible
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle();
                  }
                }
              : undefined
          }
          className={`flex flex-wrap items-center justify-between gap-2 pb-2 theme-bg-transparent border-0 ${
            collapsible ? 'cursor-pointer group' : ''
          }`}
        >
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {Icon && <Icon className="w-4 h-4 theme-accent shrink-0 mt-0.5" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {title && (
                  <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    {title}
                  </h3>
                )}
                {badge && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full theme-bg-sub theme-text-secondary border-0 shrink-0">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-[11px] theme-text-secondary font-normal mt-0.5 leading-relaxed break-words">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0 ms-auto flex items-center gap-2">
            {headerRight && (
              <div onClick={collapsible ? (e) => e.stopPropagation() : undefined}>{headerRight}</div>
            )}
            {collapsible && (
              <div className="p-1 rounded-lg theme-text-secondary group-hover:theme-text-primary group-hover:theme-bg-sub transition-colors">
                <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      )}
      {isExpanded && <div className={bodyClassName || 'space-y-3.5'}>{children}</div>}
    </div>
  );
}

export function DrawerFooter({
  onCancel,
  onSubmit,
  onSave,
  onConfirm,
  cancelLabel,
  cancelText,
  saveLabel,
  saveText,
  confirmText,
  saveIcon,
  confirmIcon,
  isSubmitting = false,
  confirmLoading = false,
  isSaveDisabled = false,
  saveDisabled = false,
  confirmDisabled = false,
  isDisabled = false,
  autoSaveStatus = null,
  lastSavedAt = null,
  showAutoSave = false,
  extraButtons,
  className = '',
  children,
}: DrawerFooterProps) {
  const resolvedCancelLabel = cancelLabel || cancelText || 'Cancel';
  const resolvedSaveLabel = saveLabel || saveText || confirmText || 'Save Changes';
  const resolvedSaveIcon = saveIcon || confirmIcon;
  const resolvedIsSubmitting = Boolean(isSubmitting || confirmLoading);
  const resolvedIsSaveDisabled = Boolean(
    isSaveDisabled || saveDisabled || confirmDisabled || isDisabled
  );
  const hasSaveAction = Boolean(onSubmit || onSave || onConfirm || confirmText || saveText || saveLabel);
  const formattedLastSavedAt =
    lastSavedAt instanceof Date ? lastSavedAt.toISOString() : lastSavedAt ? String(lastSavedAt) : null;

  const handleSaveClick = (e: React.MouseEvent) => {
    if (onSave) onSave(e);
    else if (onConfirm) onConfirm(e);
    else if (onSubmit) onSubmit(e);
  };

  return (
    <div className={`flex items-center justify-between gap-2.5 pt-3 w-full border-0 ${className}`}>
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        {onCancel && (
          <CustomButton
            type="button"
            variant="sub"
            size="md"
            onClick={onCancel}
            disabled={resolvedIsSubmitting}
          >
            {resolvedCancelLabel}
          </CustomButton>
        )}
        {showAutoSave && (
          <AutoSaveBadge
            status={autoSaveStatus || 'saved'}
            lastSavedAt={formattedLastSavedAt}
            size="sm"
            variant="badge"
          />
        )}
        {extraButtons}
        {children}
      </div>

      <div className="flex items-center gap-2 ms-auto shrink-0">
        {hasSaveAction && (
          <CustomButton
            type={onSubmit && !onSave && !onConfirm ? 'submit' : 'button'}
            variant="primary"
            size="md"
            icon={resolvedSaveIcon}
            onClick={handleSaveClick}
            loading={resolvedIsSubmitting}
            disabled={resolvedIsSaveDisabled}
          >
            {resolvedSaveLabel}
          </CustomButton>
        )}
      </div>
    </div>
  );
}

DrawerContainer.Banner = DrawerBanner;
DrawerContainer.Section = DrawerSection;
DrawerContainer.Footer = DrawerFooter;

export default DrawerContainer;
