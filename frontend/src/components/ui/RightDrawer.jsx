import React, { useEffect } from 'react';
import { CloseIcon } from './Icons';
import { useRightDrawer } from '../../context/RightDrawerContext';

export default function RightDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  badge,
  children,
  width = 'max-w-2xl',
  footer,
}) {
  const { registerRightDrawer } = useRightDrawer();

  useEffect(() => {
    if (isOpen) {
      registerRightDrawer(true);
      return () => {
        registerRightDrawer(false);
      };
    }
  }, [isOpen, registerRightDrawer]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div
        className={`relative w-full ${width} h-full theme-bg-surface border-l theme-border shadow-2xl z-10 flex flex-col transition-transform duration-300 transform translate-x-0 animate-slide-left theme-text-primary`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border shrink-0 theme-bg-sub/50">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight theme-text-primary truncate">
                  {title}
                </h2>
                {badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold theme-bg-accent theme-accent-text shrink-0">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs theme-text-secondary truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer shrink-0 ml-2"
            title="Close Drawer (Esc)"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t theme-border shrink-0 theme-bg-sub/40 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
