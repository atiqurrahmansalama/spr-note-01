import React from 'react';
import CustomButton from './CustomButton';
import { CheckIcon, UndoIcon } from './Icons';

export interface FloatingActionDockProps {
  /**
   * Whether the dock is visible. Defaults to true.
   */
  visible?: boolean;
  /**
   * Primary status/title text or node (e.g. "3 unsaved changes" or "Customize Workspace Layout")
   */
  title?: React.ReactNode;
  /**
   * Secondary description text or node
   */
  subtitle?: React.ReactNode;
  /**
   * Whether to show a live pulsating indicator dot. Defaults to true.
   */
  showPulseDot?: boolean;
  /**
   * Tailwind class for pulse dot color. Defaults to accent main color.
   */
  pulseDotColor?: string;
  /**
   * Primary action handler (e.g. Save Changes / Done)
   */
  onPrimaryClick?: () => void;
  primaryLabel?: string;
  primaryIcon?: React.ComponentType<{ className?: string }>;
  isPrimaryLoading?: boolean;
  primaryLoadingText?: string;
  isPrimaryDisabled?: boolean;
  /**
   * Secondary action handler (e.g. Discard / Cancel)
   */
  onSecondaryClick?: () => void;
  secondaryLabel?: string;
  secondaryIcon?: React.ComponentType<{ className?: string }>;
  isSecondaryLoading?: boolean;
  isSecondaryDisabled?: boolean;
  /**
   * Extra action buttons or custom elements rendered before primary/secondary buttons
   */
  extraActions?: React.ReactNode;
  /**
   * Maximum width utility class. Defaults to 'max-w-xl'.
   */
  maxWidthClass?: string;
  /**
   * Custom additional container className
   */
  className?: string;
  /**
   * Custom children overriding default inner content
   */
  children?: React.ReactNode;
}

/**
 * FloatingActionDock
 * Enterprise reusable floating action dock (sticky bottom center pill).
 * Follows Rule 14 (borderless, soft-surface, ring-0, Apple/Linear minimalist aesthetics).
 * Used across Feature & Module Control, Workspace Customizer, Table Bulk Actions, etc.
 */
export const FloatingActionDock: React.FC<FloatingActionDockProps> = ({
  visible = true,
  title,
  subtitle,
  showPulseDot = true,
  pulseDotColor = 'bg-[var(--accent-main)]',
  onPrimaryClick,
  primaryLabel = 'Save Changes',
  primaryIcon = CheckIcon,
  isPrimaryLoading = false,
  primaryLoadingText,
  isPrimaryDisabled = false,
  onSecondaryClick,
  secondaryLabel = 'Discard',
  secondaryIcon = UndoIcon,
  isSecondaryLoading = false,
  isSecondaryDisabled = false,
  extraActions,
  maxWidthClass = 'max-w-xl',
  className = '',
  children,
}) => {
  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] ${maxWidthClass} animate-in fade-in slide-in-from-bottom-4 duration-200 select-none ${className}`}
    >
      <div className="p-3 sm:px-5 sm:py-3.5 rounded-2xl theme-bg-surface/95 backdrop-blur-md theme-shadow-floating border-0 flex items-center justify-between gap-3">
        {children ? (
          children
        ) : (
          <>
            {/* Status / Title Section */}
            <div className="flex items-center gap-2.5 min-w-0">
              {showPulseDot && (
                <span
                  className={`w-2.5 h-2.5 rounded-full ${pulseDotColor} animate-pulse shrink-0`}
                />
              )}
              <div className="min-w-0">
                {title && (
                  <div className="text-xs sm:text-sm font-semibold theme-text-primary truncate">
                    {title}
                  </div>
                )}
                {subtitle && (
                  <div className="text-[11px] theme-text-secondary truncate hidden xs:block">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-2 shrink-0">
              {extraActions}

              {onSecondaryClick && (
                <CustomButton
                  size="sm"
                  variant="sub"
                  disabled={isSecondaryDisabled || isSecondaryLoading}
                  loading={isSecondaryLoading}
                  icon={secondaryIcon}
                  onClick={onSecondaryClick}
                  className="rounded-xl px-3.5"
                >
                  {secondaryLabel}
                </CustomButton>
              )}

              {onPrimaryClick && (
                <CustomButton
                  size="sm"
                  variant="primary"
                  disabled={isPrimaryDisabled || isPrimaryLoading}
                  loading={isPrimaryLoading}
                  loadingText={primaryLoadingText}
                  icon={primaryIcon}
                  onClick={onPrimaryClick}
                  className="rounded-xl px-4"
                >
                  {primaryLabel}
                </CustomButton>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FloatingActionDock;
