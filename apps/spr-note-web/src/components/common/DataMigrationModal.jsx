import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import {
  AlertTriangleIcon,
  ShieldIcon,
  TransferIcon,
  CloseIcon,
  ClassIcon,
  SectionIcon,
  GroupIcon,
  StudentIcon,
  UsersIcon,
} from '../ui/Icons';
import CustomSelect from '../ui/CustomSelect';

/**
 * Universal, reusable DataMigrationModal component.
 * Allows safe zero-data-loss decommissioning of classes, sections, groups, etc.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility
 * @param {Function} props.onClose - Close callback
 * @param {string} [props.entityType='Record'] - Human-readable entity type (e.g. 'Class', 'Section', 'Group')
 * @param {string} [props.entityName] - Name of deleting item
 * @param {Object} props.deletingItem - Target item object being decommissioned
 * @param {Array} props.availableItems - List of available alternative destination items
 * @param {React.ComponentType} [props.entityIcon] - Icon representing entity
 * @param {Function} [props.getOptionLabel] - Formatter for destination select options
 * @param {Function} [props.getOptionValue] - Value extractor for destination select options
 * @param {Array|Object} [props.impactItems] - Specific impact metrics
 * @param {Object} [props.impactData] - Raw impact data object
 * @param {Function} [props.onConfirmMigrate] - Custom async migration executor
 * @param {string} [props.apiEndpoint] - Standard endpoint for POST migration
 * @param {string} [props.payloadKey] - Body parameter key (e.g. 'target_section_id')
 * @param {Function} [props.onSuccess] - Callback when migration succeeds
 */
export default function DataMigrationModal({
  isOpen,
  onClose,
  title,
  entityType = 'Record',
  entityName,
  deletingItem,
  availableItems = [],
  entityIcon,
  getOptionLabel,
  getOptionValue = (item) => String(item.id),
  impactItems = [],
  impactData,
  onConfirmMigrate,
  apiEndpoint,
  payloadKey,
  onSuccess,
}) {
  const { showToast } = useToast();
  const [targetId, setTargetId] = useState('');
  const [migrating, setMigrating] = useState(false);

  const resolvedEntityName = entityName || deletingItem?.name || deletingItem?.section_name || deletingItem?.title || '';
  
  const DefaultEntityIcon = useMemo(() => {
    if (entityIcon) return entityIcon;
    const lower = entityType.toLowerCase();
    if (lower.includes('class')) return ClassIcon;
    if (lower.includes('section')) return SectionIcon;
    if (lower.includes('group')) return GroupIcon;
    return AlertTriangleIcon;
  }, [entityIcon, entityType]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setTargetId('');
      setMigrating(false);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !migrating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, migrating, onClose]);

  // Filter out self to ensure Guardrail 1 (Self-Target Prevention)
  const eligibleItems = useMemo(() => {
    if (!deletingItem) return [];
    return availableItems.filter(
      (item) => String(item.id) !== String(deletingItem.id) && !item.is_deleted
    );
  }, [availableItems, deletingItem]);

  // Resolve Impact Metric Chips
  const resolvedImpactChips = useMemo(() => {
    if (Array.isArray(impactItems) && impactItems.length > 0) {
      return impactItems;
    }
    const data = impactData || deletingItem || {};
    const chips = [];

    const studentCount = data.student_count ?? data.direct_students ?? data.enrolled_students;
    if (studentCount !== undefined && studentCount > 0) {
      chips.push({ count: studentCount, label: 'Enrolled Students', icon: StudentIcon });
    }

    const sectionCount = data.section_count ?? data.sections;
    if (sectionCount !== undefined && sectionCount > 0) {
      chips.push({ count: sectionCount, label: 'Class Sections', icon: SectionIcon });
    }

    const groupCount = data.group_count ?? data.groups;
    if (groupCount !== undefined && groupCount > 0) {
      chips.push({ count: groupCount, label: 'Study Groups', icon: GroupIcon });
    }

    return chips;
  }, [impactItems, impactData, deletingItem]);

  if (!isOpen || !deletingItem || typeof document === 'undefined') return null;

  // Options generator for Select dropdown
  const selectOptions = eligibleItems.map((item) => {
    if (getOptionLabel) {
      return { value: getOptionValue(item), label: getOptionLabel(item) };
    }
    // Auto-smart labeling
    const name = item.name || item.section_name || item.title || 'Untitled';
    const parentClass = item.student_class_name || item.class_name;
    const branch = item.branch_name;
    const department = item.department_name || item.department_type;

    let subText = '';
    if (parentClass && branch) subText = ` — ${parentClass} (${branch})`;
    else if (parentClass) subText = ` — ${parentClass}`;
    else if (department) subText = ` (${department})`;
    else if (branch) subText = ` (${branch})`;

    return {
      value: getOptionValue(item),
      label: `${name}${subText}`,
    };
  });

  const handleMigrateSubmit = async () => {
    if (!targetId) {
      showToast(`Please select a destination ${entityType.toLowerCase()} for migration.`, 'warning');
      return;
    }

    if (String(targetId) === String(deletingItem.id)) {
      showToast(`Destination cannot be the same ${entityType.toLowerCase()} (Self-Migration Prohibited).`, 'error');
      return;
    }

    setMigrating(true);
    try {
      if (onConfirmMigrate) {
        await onConfirmMigrate(targetId);
      } else if (apiEndpoint) {
        const bodyKey = payloadKey || `target_${entityType.toLowerCase()}_id`;
        const res = await fetchWithAuth(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [bodyKey]: targetId }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.detail || `Failed to execute ${entityType.toLowerCase()} migration.`);
        }
      }

      showToast(`Successfully migrated records and removed ${resolvedEntityName}!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.message || `Failed to execute ${entityType.toLowerCase()} migration.`, 'error');
    } finally {
      setMigrating(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !migrating) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl theme-bg-surface border theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="migration-dialog-title"
      >
        {/* Header with Project Theme Styling */}
        <div className="p-5 sm:p-6 border-b theme-border flex items-start justify-between gap-4 theme-bg-surface">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl theme-bg-accent-soft border border-[var(--accent-main)]/30 flex items-center justify-center theme-accent shrink-0 shadow-2xs mt-0.5">
              <TransferIcon className="w-5 h-5 sm:w-6 sm:h-6 theme-accent" />
            </div>
            <div className="min-w-0">
              <h3 id="migration-dialog-title" className="text-base sm:text-lg font-bold theme-text-primary tracking-tight truncate">
                {title || `Migrate Records & Delete ${entityType}`}
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5 leading-relaxed truncate">
                {entityType} <strong className="theme-text-primary font-semibold">"{resolvedEntityName}"</strong> has associated data.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={migrating}
            className="p-1.5 rounded-xl border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition cursor-pointer shrink-0 disabled:opacity-30 flex items-center justify-center"
            title="Close"
          >
            <CloseIcon className="w-4 h-4 theme-text-secondary hover:theme-text-primary" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Zero Data Loss Protection Info Card */}
          <div className="rounded-2xl p-4 theme-bg-accent-soft/30 border border-[var(--accent-main)]/20 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs theme-accent">
              <div className="w-6 h-6 rounded-lg theme-bg-accent-soft border border-[var(--accent-main)]/30 flex items-center justify-center shrink-0">
                <ShieldIcon className="w-3.5 h-3.5 theme-accent" />
              </div>
              <span>Zero Data Loss Protection</span>
            </div>
            <p className="text-xs theme-text-secondary leading-relaxed">
              All active records and students assigned to <strong className="theme-text-primary font-semibold">"{resolvedEntityName}"</strong> will be safely reassigned to your chosen destination before this {entityType.toLowerCase()} is retired.
            </p>
          </div>

          {/* Impact Metric Chips */}
          {resolvedImpactChips.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {resolvedImpactChips.map((chip, idx) => {
                const Icon = chip.icon || DefaultEntityIcon;
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl theme-bg-sub border theme-border flex items-center gap-2.5 shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 theme-accent" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold font-mono theme-text-primary truncate">
                        {chip.count}
                      </div>
                      <div className="text-[10px] theme-text-secondary truncate">
                        {chip.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Target Destination Selector */}
          <div>
            <CustomSelect
              label={`Target Destination ${entityType}`}
              required={true}
              value={targetId}
              onChange={(val) => setTargetId(val)}
              options={selectOptions}
              placeholder={`Select Destination ${entityType}...`}
              icon={DefaultEntityIcon}
            />
            {eligibleItems.length === 0 && (
              <p className="text-xs theme-danger mt-1.5 font-medium">
                No alternative {entityType.toLowerCase()}s available in this institution. Please create another {entityType.toLowerCase()} first.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t theme-border flex items-center justify-end gap-2.5 theme-bg-surface">
          <button
            type="button"
            onClick={onClose}
            disabled={migrating}
            className="px-4 py-2.5 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary text-xs font-bold transition cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleMigrateSubmit}
            disabled={!targetId || migrating}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
              targetId && !migrating
                ? 'theme-bg-accent text-white hover:opacity-90 active:scale-95'
                : 'theme-bg-sub border theme-border theme-text-secondary opacity-50 cursor-not-allowed'
            }`}
          >
            {migrating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Migrating...</span>
              </>
            ) : (
              <>
                <TransferIcon className="w-4 h-4 text-white" />
                <span>Migrate &amp; Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
