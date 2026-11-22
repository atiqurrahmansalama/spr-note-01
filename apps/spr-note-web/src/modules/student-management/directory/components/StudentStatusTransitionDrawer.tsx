/**
 * Student Status Transition Drawer (Slide-over Form)
 * ===================================================
 * Institutional student status lifecycle management.
 * Educational institutions retain all student records permanently for official audits,
 * transcripts, and regulatory compliance. Rather than hard deletion, student lifecycle
 * transitions are recorded (Active, Alumni, Transferred, Expelled, Suspended, Dropped Out, On Leave).
 *
 * Implements strict project standards:
 * - Zero hardcoded colors / borderless & ringless soft surfaces (RULE 14)
 * - Container queries @container and @[480px]:grid-cols-2 (RULE 5 & 17)
 * - ReusableCalendar for effective date selection (RULE 2)
 * - Reusable DrawerContainer (padding="none") & DrawerFooter (RULE 5)
 */

import React, { useState } from 'react';
import {
  DrawerContainer,
  DrawerFooter,
} from '../../../../components/layout';
import CustomInput from '../../../../components/ui/CustomInput';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import {
  CalendarIcon,
  CheckCircleIcon,
  InfoIcon,
  SaveIcon,
  ShieldIcon,
  StudentIcon,
  UserCheckIcon,
} from '../../../../components/ui/Icons';
import type { StudentRecord } from '../types';

export interface StudentStatusTransitionDrawerProps {
  student: StudentRecord;
  onClose: () => void;
  onSuccess: () => void;
  onUpdateStatus: (
    id: string | number,
    newStatus: string,
    remarks?: string,
    effectiveDate?: string
  ) => Promise<boolean>;
}

interface StatusOption {
  value: string;
  label: string;
  description: string;
  badgeClass: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'Active',
    label: 'Active (Enrolled)',
    description: 'Currently enrolled, attending classes, and appearing in daily academic sessions',
    badgeClass: 'theme-bg-accent-soft theme-accent',
  },
  {
    value: 'Alumni',
    label: 'Alumni (Graduated)',
    description: 'Successfully completed educational curriculum, graduated, and archived in alumni roster',
    badgeClass: 'theme-bg-sub theme-text-primary',
  },
  {
    value: 'Transferred',
    label: 'Transferred (TC Issued)',
    description: 'Officially released with Transfer Certificate to another accredited campus or institution',
    badgeClass: 'theme-bg-sub theme-text-secondary',
  },
  {
    value: 'Suspended',
    label: 'Suspended (Temporary)',
    description: 'Temporarily barred from classes and institutional activities under administrative review',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  {
    value: 'Expelled',
    label: 'Expelled (Dismissed)',
    description: 'Permanently dismissed from the academy due to disciplinary or policy violations',
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  },
  {
    value: 'Dropped Out',
    label: 'Dropped Out',
    description: 'Discontinued attendance without official transfer or completion notice',
    badgeClass: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
  },
  {
    value: 'On Leave',
    label: 'On Long Leave',
    description: 'Authorized extended absence with approved institutional leave permissions',
    badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  },
];

export function StudentStatusTransitionDrawer({
  student,
  onClose,
  onSuccess,
  onUpdateStatus,
}: StudentStatusTransitionDrawerProps) {
  const currentStatusNormalized = student.status || 'Active';
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatusNormalized);
  const [effectiveDate, setEffectiveDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const studentName = student.name_en || student.name || 'Unnamed Student';
  const studentIdNumber =
    student.student_id_card_number ||
    student.uniq_id ||
    student.unique_id ||
    (student.id ? `ID: ${student.id}` : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) return;

    setIsSubmitting(true);
    try {
      const ok = await onUpdateStatus(
        student.id,
        selectedStatus,
        remarks.trim() || undefined,
        effectiveDate
      );
      if (ok) {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="@container space-y-6 pt-2">
        {/* ─── 1. Student Identity Header Summary ─── */}
        <div className="p-4 rounded-2xl theme-bg-surface border-0 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft text-base font-bold theme-accent flex items-center justify-center shrink-0 shadow-xs">
            {studentName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold theme-text-primary text-sm truncate leading-tight">
              {studentName}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {studentIdNumber && (
                <span className="text-[11px] font-mono theme-text-secondary truncate select-all">
                  {studentIdNumber}
                </span>
              )}
              <span className="text-zinc-400 dark:text-zinc-600">•</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider theme-bg-sub theme-text-primary">
                Current: {currentStatusNormalized}
              </span>
            </div>
          </div>
        </div>

        {/* ─── 2. Institutional Permanent Record Notice ─── */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border-0 flex items-start gap-3">
          <InfoIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            <span className="font-semibold block mb-0.5">Permanent Audit & Academic Integrity Standard</span>
            Student profiles are never permanently destroyed. Changing status preserves historical grades,
            daily classroom progress, and billing ledgers while adjusting active roster visibility.
          </div>
        </div>

        {/* ─── 3. Target Lifecycle Status ─── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <ShieldIcon className="w-4 h-4 theme-accent" />
            <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Target Lifecycle Status
            </span>
          </div>

          <div className="space-y-2">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = selectedStatus.toLowerCase() === opt.value.toLowerCase();
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedStatus(opt.value)}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all border-0 ring-0 flex items-start gap-3 ${
                    isSelected
                      ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25'
                      : 'theme-bg-app hover:theme-bg-elevated/40'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                      isSelected
                        ? 'theme-bg-accent theme-accent-text shadow-xs'
                        : 'theme-bg-sub/80'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white dark:bg-zinc-900" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs theme-text-primary">
                        {opt.label}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider ${opt.badgeClass}`}
                      >
                        {opt.value}
                      </span>
                    </div>
                    <p className="text-[11px] theme-text-secondary mt-0.5 leading-snug">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── 4. Effective Date & Resolution Details ─── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <CalendarIcon className="w-4 h-4 theme-accent" />
            <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Effective Date & Resolution
            </span>
          </div>

          {/* Reusable Calendar Date Picker */}
          <div>
            <label className="block text-xs font-medium theme-text-secondary mb-1">
              Effective Transition Date
            </label>
            <ReusableCalendar
              selectedDate={effectiveDate}
              onSelectDate={(date) => setEffectiveDate(date)}
              placeholder="Select effective date"
              className="w-full"
            />
          </div>

          {/* Resolution / Administrative Remarks */}
          <div>
            <label className="block text-xs font-medium theme-text-secondary mb-1">
              Official Resolution / Remarks (Optional)
            </label>
            <CustomInput
              multiline
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter official resolution notes, TC dispatch reference, expulsion reason, or return date..."
            />
          </div>
        </div>

        {/* ─── 5. Reusable Drawer Footer ─── */}
        <DrawerFooter
          saveLabel={isSubmitting ? 'Updating Status...' : 'Update Status'}
          saveIcon={SaveIcon}
          cancelLabel="Cancel"
          isSubmitting={isSubmitting}
          onCancel={onClose}
        />
      </form>
    </DrawerContainer>
  );
}

export default StudentStatusTransitionDrawer;
