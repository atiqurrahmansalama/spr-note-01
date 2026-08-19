import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './Icons';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  badge,
  children,
  footer,
  size = '2xl', // 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
}) {
  // ESC key listener
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleKeyDown = (e) => {
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

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
    '3xl': 'max-w-4xl',
    '4xl': 'max-w-5xl',
    '5xl': 'max-w-6xl',
    full: 'max-w-[95vw] sm:max-w-[92vw]',
  }[size] || 'max-w-3xl';

  const modalContent = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-fade-in text-left font-sans"
      onClick={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={`w-full ${sizeClasses} rounded-2xl sm:rounded-3xl theme-bg-surface border theme-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] transform transition-all animate-scale-up ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || Icon || showCloseButton) && (
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

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:theme-text-primary hover:theme-bg-elevated border border-transparent hover:theme-border transition-all cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
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
}
