import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangleIcon,
  TrashIcon,
  CloseIcon,
  DepartmentIcon,
  ClassIcon,
  GroupsIcon,
  StudentIcon,
  UsersIcon,
} from '../ui/Icons';

/**
 * Reusable, enterprise-grade Delete Impact & Cascade Risk Modal
 * Displays an explicit summary of all data at risk before permanent decommissioning/deletion.
 */
export default function DeleteImpactModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  subtitle,
  entityName,
  entityType = 'Item',
  impactItems = [],
  warningMessage,
  requireAck = true,
  requireNameMatch = false,
  requirePassword = false,
  confirmButtonText = 'Permanently Delete',
  isDeleting = false,
  onMigrate,
  migrateButtonText = 'Migrate Data Instead',
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAcknowledged(!requireAck);
      setTypedName('');
      setPassword('');
    }
  }, [isOpen, requireAck]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isNameMatchValid = !requireNameMatch || (typedName.trim() === entityName?.trim());
  const isPasswordValid = !requirePassword || (password.trim().length > 0);
  const isAckValid = !requireAck || acknowledged;
  const canConfirm = isAckValid && isNameMatchValid && isPasswordValid && !isDeleting;

  const handleConfirmSubmit = (e) => {
    e.preventDefault();
    if (!canConfirm) return;
    onConfirm({ password, entityName });
  };

  const getImpactIcon = (label = '') => {
    const lower = label.toLowerCase();
    if (lower.includes('department')) return DepartmentIcon;
    if (lower.includes('class')) return ClassIcon;
    if (lower.includes('group')) return GroupsIcon;
    if (lower.includes('student')) return StudentIcon;
    if (lower.includes('staff') || lower.includes('teacher') || lower.includes('user')) return UsersIcon;
    return AlertTriangleIcon;
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-lg rounded-3xl theme-bg-surface border theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        {/* Header with Project Theme Styling */}
        <div className="p-5 sm:p-6 border-b theme-border flex items-start justify-between gap-4 theme-bg-surface">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl theme-bg-danger-soft border border-[var(--color-danger)]/20 flex items-center justify-center theme-danger shrink-0 shadow-2xs mt-0.5">
              <AlertTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 id="delete-dialog-title" className="text-base sm:text-lg font-bold theme-text-primary tracking-tight truncate">
                {title}
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5 leading-relaxed">
                {subtitle || (
                  <>
                    You are about to remove {entityType.toLowerCase()}{' '}
                    <strong className="theme-text-primary font-semibold">"{entityName}"</strong>.
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-xl border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition cursor-pointer shrink-0 disabled:opacity-30"
            title="Close"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleConfirmSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Data at Risk / Impact Breakdown Box */}
          <div className="rounded-2xl p-4 theme-bg-sub border theme-border space-y-2.5">
            <div className="flex items-center gap-1.5">
              <AlertTriangleIcon className="w-3.5 h-3.5 theme-danger" />
              <span className="text-[11px] font-bold uppercase tracking-wider theme-danger">
                Cascading Impact Warning
              </span>
            </div>

            {/* Impact Metric Chips / Counts */}
            {impactItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {impactItems.map((item, idx) => {
                  const Icon = item.icon || getImpactIcon(item.label);
                  return (
                    <div 
                      key={idx} 
                      className="p-2.5 rounded-xl theme-bg-surface border theme-border flex items-center gap-2.5 shadow-2xs"
                    >
                      <div className="w-7 h-7 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold theme-text-primary truncate">
                          {item.count !== undefined ? item.count : '—'}
                        </div>
                        <div className="text-[10px] theme-text-secondary truncate">
                          {item.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <p className="text-xs theme-text-secondary leading-relaxed pt-0.5">
              {warningMessage || (
                <>
                  Deleting this {entityType.toLowerCase()} will disconnect related records, reports, and class rosters. This action cannot be reversed without administrative database recovery.
                </>
              )}
            </p>
          </div>

          {/* Step 1: Acknowledgment Checkbox */}
          {requireAck && (
            <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border flex items-start gap-3 transition hover:theme-bg-elevated cursor-pointer">
              <input
                type="checkbox"
                id="delete_modal_ack"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-[var(--accent-main)] theme-bg-surface theme-border cursor-pointer shrink-0"
              />
              <label htmlFor="delete_modal_ack" className="text-xs font-medium theme-text-primary cursor-pointer leading-relaxed">
                I acknowledge the consequences and confirm that I wish to proceed with deleting this {entityType.toLowerCase()}.
              </label>
            </div>
          )}

          {/* Step 2: Exact Name Match Requirement */}
          {requireNameMatch && (
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Type <span className="theme-text-primary font-mono font-bold select-all theme-bg-elevated px-2 py-0.5 rounded-md border theme-border">{entityName}</span> to confirm:
              </label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={`Type "${entityName}" exactly`}
                className="w-full px-4 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs sm:text-sm font-medium theme-text-primary placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent-main)]/70 focus:ring-2 focus:ring-[var(--accent-main)]/15"
              />
            </div>
          )}

          {/* Step 3: Admin Account Password Requirement */}
          {requirePassword && (
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Your Admin Password <span className="theme-danger">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to authorize deletion"
                className="w-full px-4 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs sm:text-sm font-medium theme-text-primary placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent-main)]/70 focus:ring-2 focus:ring-[var(--accent-main)]/15"
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t theme-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-auto">
              {onMigrate && (
                <button
                  type="button"
                  onClick={onMigrate}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border theme-border theme-bg-accent-soft theme-accent text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 hover:opacity-90"
                >
                  <span>{migrateButtonText}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary text-xs font-bold transition cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!canConfirm}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  canConfirm 
                    ? 'theme-bg-danger text-white hover:opacity-90 active:scale-95' 
                    : 'theme-bg-sub border theme-border theme-text-secondary opacity-50 cursor-not-allowed'
                }`}
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-3.5 h-3.5" />
                    <span>{confirmButtonText}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
