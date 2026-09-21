import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, CheckIcon, AlertCircleIcon } from './Icons';
import CustomButton from './CustomButton';
import IconButton from './IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full' | string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  headerActions?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  overlayClassName?: string;
  zIndex?: number | string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  badge,
  children,
  footer,
  size = '2xl',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  headerActions,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  overlayClassName = '',
  zIndex = 10000,
}) => {
  // ESC key listener
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
    '3xl': 'max-w-4xl',
    '4xl': 'max-w-5xl',
    '5xl': 'max-w-6xl',
    full: 'max-w-[95vw] sm:max-w-[92vw]',
  };

  const currentSizeClass = sizeClasses[size] || 'max-w-3xl';

  const modalContent = (
    <div
      className={`fixed inset-0 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 dark:bg-black/80 animate-fade-in text-left font-sans ${overlayClassName}`}
      style={{ zIndex }}
      onClick={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={`w-full ${currentSizeClass} rounded-2xl sm:rounded-3xl theme-bg-surface border theme-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] transform transition-all animate-scale-up ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || Icon || showCloseButton || headerActions) && (
          <div
            className={`flex items-center justify-between px-5 sm:px-6 py-4 border-b theme-border theme-bg-sub shrink-0 ${headerClassName}`}
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {Icon && (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent shrink-0 shadow-xs">
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {title && (
                    <h2 className="text-sm sm:text-base font-bold theme-text-primary truncate tracking-tight">
                      {title}
                    </h2>
                  )}
                  {badge && <div className="shrink-0">{badge}</div>}
                </div>
                {subtitle && (
                  <p className="text-[11px] sm:text-xs theme-text-secondary mt-0.5 truncate leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {(headerActions || showCloseButton) && (
              <div className="flex items-center gap-2 shrink-0">
                {headerActions}
                {showCloseButton && (
                  <IconButton
                    icon={CloseIcon}
                    size="sm"
                    variant="ghost"
                    onClick={onClose}
                    ariaLabel="Close modal"
                    title="Close (Esc)"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`px-5 sm:px-6 py-3.5 border-t theme-border theme-bg-sub shrink-0 ${footerClassName}`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

// ── ConfirmModal (Ultra-Reusable Enterprise Confirmation & Alert Modal) ── //

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'sub' | 'surface' | 'outline' | 'soft' | 'danger' | 'danger-solid' | 'success' | 'success-solid' | 'warning' | 'ghost';
  confirmIcon?: React.ComponentType<{ className?: string }>;
  confirmLoading?: boolean;
  confirmLoadingText?: string;
  confirmDisabled?: boolean;
  showCancelButton?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | string;
  callout?: {
    type?: 'info' | 'warning' | 'danger' | 'success';
    title?: string;
    message: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
  };
  consequences?:
    | {
        title?: string;
        type?: 'danger' | 'warning' | 'info';
        items: Array<React.ReactNode>;
      }
    | Array<React.ReactNode>;
  summaryItems?: Array<{
    label: string;
    value: React.ReactNode;
    color?: string;
    subLabel?: string;
  }>;
  note?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmation Required',
  subtitle,
  icon = AlertCircleIcon,
  badge,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  confirmIcon = CheckIcon,
  confirmLoading = false,
  confirmLoadingText,
  confirmDisabled = false,
  showCancelButton = true,
  size = 'md',
  callout,
  consequences,
  summaryItems,
  note,
  children,
  className = '',
}) => {
  const calloutStyles: Record<string, { border: string; bg: string; text: string; icon: string }> = {
    info: { border: 'theme-border-info', bg: 'theme-bg-info-soft', text: 'theme-text-primary', icon: 'theme-text-info' },
    warning: { border: 'theme-border-warning', bg: 'theme-bg-warning-soft', text: 'theme-text-primary', icon: 'theme-text-warning' },
    danger: { border: 'theme-border-danger', bg: 'theme-bg-danger-soft', text: 'theme-text-primary', icon: 'theme-text-danger' },
    success: { border: 'theme-border-success', bg: 'theme-bg-success-soft', text: 'theme-text-primary', icon: 'theme-text-success' },
  };

  const footerActions = (
    <div className="flex items-center justify-end gap-2.5 w-full">
      {showCancelButton && (
        <CustomButton
          variant="sub"
          size="sm"
          onClick={onClose}
          disabled={confirmLoading}
        >
          {cancelText}
        </CustomButton>
      )}
      <CustomButton
        variant={confirmVariant}
        size="sm"
        icon={confirmIcon}
        loading={confirmLoading}
        loadingText={confirmLoadingText || 'Processing...'}
        disabled={confirmDisabled}
        onClick={onConfirm}
      >
        {confirmText}
      </CustomButton>
    </div>
  );

  const activeCalloutStyle = callout
    ? calloutStyles[callout.type || 'warning'] || calloutStyles.warning
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={icon}
      badge={badge}
      size={size}
      footer={footerActions}
      className={className}
    >
      <div className="p-4 sm:p-6 space-y-4 text-xs">
        {/* Callout Box */}
        {callout && activeCalloutStyle && (
          <div
            className={`flex items-start gap-3 p-3.5 rounded-2xl border ${activeCalloutStyle.border} ${activeCalloutStyle.bg}`}
          >
            {callout.icon ? (
              <callout.icon className={`w-5 h-5 ${activeCalloutStyle.icon} shrink-0 mt-0.5`} />
            ) : (
              <AlertCircleIcon className={`w-5 h-5 ${activeCalloutStyle.icon} shrink-0 mt-0.5`} />
            )}
            <div className="space-y-1 min-w-0 flex-1">
              {callout.title && (
                <p className="font-bold theme-text-primary text-xs">
                  {callout.title}
                </p>
              )}
              {callout.message && (
                <div className="text-[11px] theme-text-secondary leading-relaxed">
                  {callout.message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Summary Cards Grid */}
        {summaryItems && summaryItems.length > 0 && (
          <div className="p-3.5 rounded-2xl border theme-border theme-bg-sub/50 space-y-2">
            <p className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider">
              Summary Details
            </p>
            <div
              className={`grid gap-2 text-center pt-1 ${
                summaryItems.length === 2
                  ? 'grid-cols-2'
                  : summaryItems.length === 4
                  ? 'grid-cols-2 sm:grid-cols-4'
                  : 'grid-cols-3'
              }`}
            >
              {summaryItems.map((item, idx) => (
                <div
                  key={`sum_item_${idx}`}
                  className="p-2.5 rounded-xl theme-bg-surface border theme-border"
                >
                  <span className="block text-[10px] theme-text-secondary truncate">
                    {item.label}
                  </span>
                  <span
                    className={`text-sm font-bold block mt-0.5 ${
                      item.color || 'theme-text-primary'
                    }`}
                  >
                    {item.value}
                  </span>
                  {item.subLabel && (
                    <span className="block text-[9px] theme-text-secondary opacity-75 mt-0.5">
                      {item.subLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Consequences & Impact Warning List */}
        {consequences && (() => {
          const consequenceType =
            typeof consequences === 'object' && !Array.isArray(consequences) && consequences.type
              ? consequences.type
              : 'danger';

          const consequenceStyleMap = {
            warning: { border: 'theme-border-warning', bg: 'theme-bg-warning-soft', title: 'theme-text-warning' },
            info: { border: 'theme-border-info', bg: 'theme-bg-info-soft', title: 'theme-text-info' },
            danger: { border: 'theme-border-danger', bg: 'theme-bg-danger-soft', title: 'theme-text-danger' },
          }[consequenceType] || { border: 'theme-border-danger', bg: 'theme-bg-danger-soft', title: 'theme-text-danger' };

          return (
            <div
              className={`p-3.5 rounded-2xl border ${consequenceStyleMap.border} ${consequenceStyleMap.bg} text-xs space-y-2 leading-relaxed`}
            >
              <p className={`font-bold text-[11px] uppercase tracking-wider ${consequenceStyleMap.title}`}>
                {Array.isArray(consequences)
                  ? 'Direct Consequences of This Action:'
                  : consequences.title || 'Direct Consequences of This Action:'}
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-[11px] theme-text-secondary leading-relaxed">
                {(Array.isArray(consequences) ? consequences : consequences.items || []).map(
                  (item, idx) => (
                    <li key={`consequence_${idx}`} className="theme-text-secondary leading-relaxed">
                      {item}
                    </li>
                  )
                )}
              </ul>
            </div>
          );
        })()}

        {/* Custom Input / Nested Form Content */}
        {children && <div className="space-y-3">{children}</div>}

        {/* Supplementary Note */}
        {note && (
          <p className="text-[11px] theme-text-secondary italic leading-relaxed">
            {note}
          </p>
        )}
      </div>
    </Modal>
  );
};

export default Modal;
