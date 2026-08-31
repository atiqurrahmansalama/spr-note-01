import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangleIcon,
  TrashIcon,
  CloseIcon,
  DepartmentIcon,
  ClassIcon,
  SectionIcon,
  GroupsIcon,
  StudentIcon,
  UsersIcon,
  TransferIcon,
} from '../ui/Icons';

/**
 * Reusable, enterprise-grade Delete Impact & Cascade Risk Modal
 * Displays an explicit summary of all data at risk before permanent decommissioning/deletion.
 */
export default function DeleteImpactModal({
  isOpen,
  onClose,
  onConfirm,
  onDirectDelete,
  title = 'Confirm Deletion',
  subtitle,
  entityName,
  itemName,
  entityType = 'Item',
  itemType,
  impactItems = [],
  impactData,
  warningMessage,
  requireAck = true,
  requireNameMatch = false,
  requirePassword = false,
  confirmButtonText = 'Permanently Delete',
  isDeleting = false,
  onMigrate,
  onMigrateOpen,
  migrateButtonText = 'Migrate Data Instead',
}) {
  const resolvedEntityName = entityName || itemName || '';
  const resolvedEntityType = entityType || itemType || 'Item';
  const resolvedOnConfirm = onConfirm || onDirectDelete;
  const resolvedOnMigrate = onMigrate || onMigrateOpen;

  const cancelBtnRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const migrateBtnRef = useRef(null);
  const nameInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const resolvedImpactItems = useMemo(() => {
    if (Array.isArray(impactItems) && impactItems.length > 0) {
      return impactItems;
    }
    if (impactData && typeof impactData === 'object') {
      const items = [];
      if (impactData.direct_students !== undefined) {
        items.push({ count: impactData.direct_students, label: 'Enrolled Students', icon: StudentIcon });
      } else if (impactData.students !== undefined) {
        items.push({ count: impactData.students, label: 'Enrolled Students', icon: StudentIcon });
      }
      if (impactData.sections !== undefined) {
        items.push({ count: impactData.sections, label: 'Class Sections', icon: SectionIcon });
      }
      if (impactData.groups !== undefined) {
        items.push({ count: impactData.groups, label: 'Study Groups', icon: GroupsIcon });
      }
      if (impactData.classes !== undefined) {
        items.push({ count: impactData.classes, label: 'Classes', icon: ClassIcon });
      }
      if (impactData.teachers !== undefined || impactData.staff !== undefined) {
        items.push({ count: impactData.teachers || impactData.staff, label: 'Teachers / Staff', icon: UsersIcon });
      }
      return items;
    }
    return [];
  }, [impactItems, impactData]);

  const [acknowledged, setAcknowledged] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [password, setPassword] = useState('');

  const isNameMatchValid = !requireNameMatch || (typedName.trim() === resolvedEntityName?.trim());
  const isPasswordValid = !requirePassword || (password.trim().length > 0);
  const isAckValid = !requireAck || acknowledged;
  const canConfirm = isAckValid && isNameMatchValid && isPasswordValid && !isDeleting;

  // Auto-focus on modal open
  useEffect(() => {
    if (isOpen) {
      setAcknowledged(!requireAck);
      setTypedName('');
      setPassword('');

      const timer = setTimeout(() => {
        if (requireNameMatch && nameInputRef.current) {
          nameInputRef.current.focus();
        } else if (requirePassword && passwordInputRef.current) {
          passwordInputRef.current.focus();
        } else if (confirmBtnRef.current) {
          confirmBtnRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, requireAck, requireNameMatch, requirePassword]);

  // Comprehensive keyboard handling (Escape, Enter, Left/Right Arrow navigation)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen || isDeleting) return;

      // 1. Cancel on Escape key
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Check if text/password inputs are actively focused
      const activeEl = document.activeElement;
      const isTextInputActive =
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
        activeEl.type !== 'checkbox';

      // 2. Left / Right Arrow navigation between action buttons
      if (!isTextInputActive && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        if (e.key === 'ArrowLeft') {
          if (activeEl === confirmBtnRef.current && cancelBtnRef.current) {
            cancelBtnRef.current.focus();
          } else if (activeEl === cancelBtnRef.current && migrateBtnRef.current) {
            migrateBtnRef.current.focus();
          } else if (cancelBtnRef.current) {
            cancelBtnRef.current.focus();
          }
        } else if (e.key === 'ArrowRight') {
          if (activeEl === migrateBtnRef.current && cancelBtnRef.current) {
            cancelBtnRef.current.focus();
          } else if (activeEl === cancelBtnRef.current && confirmBtnRef.current) {
            confirmBtnRef.current.focus();
          } else if (confirmBtnRef.current) {
            confirmBtnRef.current.focus();
          }
        }
        return;
      }

      // 3. Enter key handling
      if (e.key === 'Enter') {
        if (activeEl === cancelBtnRef.current) {
          e.preventDefault();
          onClose();
        } else if (canConfirm && resolvedOnConfirm) {
          e.preventDefault();
          resolvedOnConfirm({ password, entityName: resolvedEntityName });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose, canConfirm, resolvedOnConfirm, password, resolvedEntityName]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleConfirmSubmit = (e) => {
    e.preventDefault();
    if (!canConfirm || !resolvedOnConfirm) return;
    resolvedOnConfirm({ password, entityName: resolvedEntityName });
  };

  const getImpactIcon = (label = '') => {
    const lower = label.toLowerCase();
    if (lower.includes('department')) return DepartmentIcon;
    if (lower.includes('class')) return ClassIcon;
    if (lower.includes('section')) return SectionIcon;
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
                    You are about to remove {resolvedEntityType.toLowerCase()}{' '}
                    <strong className="theme-text-primary font-semibold">"{resolvedEntityName}"</strong>.
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-xl border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition cursor-pointer shrink-0 disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]/50"
            title="Close (Esc)"
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
            {resolvedImpactItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {resolvedImpactItems.map((item, idx) => {
                  const Icon = item.icon || getImpactIcon(item.label);
                  return (
                    <div 
                      key={idx} 
                      className="p-2.5 rounded-xl theme-bg-surface border theme-border flex items-center gap-2.5 shadow-2xs"
                    >
                      <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 theme-accent" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold font-mono theme-text-primary truncate">
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
                  Deleting this {resolvedEntityType.toLowerCase()} will disconnect related records, reports, and class rosters. This action cannot be reversed without administrative database recovery.
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
                className="mt-0.5 w-4 h-4 rounded accent-[var(--accent-main)] theme-bg-surface theme-border cursor-pointer shrink-0 focus:ring-2 focus:ring-[var(--accent-main)]/50"
              />
              <label htmlFor="delete_modal_ack" className="text-xs font-medium theme-text-primary cursor-pointer leading-relaxed">
                I acknowledge the consequences and confirm that I wish to proceed with deleting this {resolvedEntityType.toLowerCase()}.
              </label>
            </div>
          )}

          {/* Step 2: Exact Name Match Requirement */}
          {requireNameMatch && (
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Type <span className="theme-text-primary font-mono font-bold select-all theme-bg-elevated px-2 py-0.5 rounded-md border theme-border">{resolvedEntityName}</span> to confirm:
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={`Type "${resolvedEntityName}" exactly`}
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
                ref={passwordInputRef}
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
              {resolvedOnMigrate && (
                <button
                  ref={migrateBtnRef}
                  type="button"
                  onClick={resolvedOnMigrate}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[var(--accent-main)]/30 theme-bg-accent-soft theme-accent text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 hover:opacity-90 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]/50"
                >
                  <TransferIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                  <span>{migrateButtonText}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary text-xs font-bold transition cursor-pointer disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]/50 focus:border-[var(--accent-main)]"
              >
                Cancel
              </button>

              <button
                ref={confirmBtnRef}
                type="submit"
                disabled={!canConfirm}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]/40 focus:ring-offset-1 ${
                  canConfirm 
                    ? 'theme-bg-surface border border-[var(--color-danger)]/40 theme-danger hover:theme-bg-danger-soft/50 hover:border-[var(--color-danger)]/60 active:scale-95' 
                    : 'theme-bg-sub border theme-border theme-text-secondary opacity-50 cursor-not-allowed'
                }`}
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[var(--color-danger)]/30 border-t-[var(--color-danger)] rounded-full animate-spin" />
                    <span className="theme-danger">Deleting...</span>
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-3.5 h-3.5 theme-danger" />
                    <span className="theme-danger">{confirmButtonText}</span>
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
