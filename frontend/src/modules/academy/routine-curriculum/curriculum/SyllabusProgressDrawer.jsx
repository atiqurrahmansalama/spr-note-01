import React, { useState, useEffect } from 'react';
import {
  BookOpenIcon,
  FilledCheckCircleIcon,
  ClassIcon,
  ChartBarIcon,
} from '../../../../components/ui/Icons';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomButton from '../../../../components/ui/CustomButton';
import { useToast } from '../../../../context/ToastContext';
import { curriculumStore } from '../../../../utils/localStore';

export default function SyllabusProgressDrawer({
  item,
  activeTenantId,
  onSaveSuccess,
  onCancel,
}) {
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(() => (item ? item.currentPage || 0 : 0));
  const [notes, setNotes] = useState(() => (item ? item.notes || '' : ''));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setCurrentPage(item.currentPage || 0);
      setNotes(item.notes || '');
    }
  }, [item]);

  if (!item) return null;

  const start = Number(item.startPage) || 1;
  const end = Number(item.endPage) || start;
  const cur = Number(currentPage) || 0;
  const total = Math.max(1, end - start + 1);
  const covered = Math.max(0, Math.min(total, cur >= start ? cur - start + 1 : 0));
  const progressPct = Math.min(100, Math.round((covered / total) * 100));

  const handleSave = (e) => {
    e.preventDefault();
    if (cur < 0) {
      showToast('Page number cannot be negative.', 'warning');
      return;
    }
    if (cur > end) {
      showToast(`Current page (${cur}) cannot exceed the target page (${end}).`, 'warning');
      return;
    }

    setIsSaving(true);
    try {
      curriculumStore.updateProgress(activeTenantId, item.id, cur, notes);
      showToast(`Progress updated for "${item.name}" (Page ${cur} of ${end})`, 'success');
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to update progress.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col h-full space-y-5 p-1 text-left">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-2xl theme-bg-sub/80 border theme-border space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent">
            {item.subject || 'General'}
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider theme-bg-sub border theme-border theme-text-secondary">
            {item.semester || '1st Semester'}
          </span>
        </div>
        <h3 className="text-base font-bold theme-text-primary leading-snug">
          {item.name}
        </h3>
        <div className="flex items-center gap-2 text-xs theme-text-secondary flex-wrap">
          <span className="flex items-center gap-1 font-semibold theme-text-primary">
            <ClassIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
            {item.className || 'All Classes'}{item.sectionName ? ` (Section: ${item.sectionName})` : ''}
          </span>
          <span>•</span>
          <span>Teacher: <strong className="theme-text-primary font-semibold">{item.teacherName || 'Unassigned'}</strong></span>
        </div>
      </div>

      {/* 2. Quick Volume & Page Span Summary */}
      <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl theme-bg-sub border theme-border text-center">
        <div>
          <div className="text-[11px] theme-text-secondary font-medium uppercase">Start Page</div>
          <div className="text-sm font-bold theme-text-primary mt-0.5">{start}</div>
        </div>
        <div>
          <div className="text-[11px] theme-text-secondary font-medium uppercase">Target End</div>
          <div className="text-sm font-bold theme-text-primary mt-0.5">{end}</div>
        </div>
        <div>
          <div className="text-[11px] theme-text-secondary font-medium uppercase">Total Volume</div>
          <div className="text-sm font-bold theme-text-primary mt-0.5">{total} pgs</div>
        </div>
      </div>

      {/* 3. Live Progress Bar Card */}
      <div className="space-y-2 p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold theme-text-primary flex items-center gap-1.5">
            <ChartBarIcon className="w-4 h-4 theme-accent" />
            <span>Calculated Completion</span>
          </span>
          <span
            className={`font-extrabold ${
              progressPct >= 100
                ? 'text-emerald-500 dark:text-emerald-400'
                : progressPct >= 50
                ? 'theme-accent'
                : 'text-amber-500 dark:text-amber-400'
            }`}
          >
            {progressPct}%
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full theme-bg-elevated overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              progressPct >= 100
                ? 'bg-emerald-500'
                : progressPct >= 50
                ? 'theme-bg-accent'
                : 'bg-amber-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-[11px] theme-text-secondary flex justify-between pt-0.5 font-semibold">
          <span>{cur >= start ? `${covered} pages covered` : 'Not started yet'}</span>
          <span>{Math.max(0, total - covered)} pages remaining</span>
        </div>
      </div>

      {/* 4. Current Completed Page Stepper Input with Reusable CustomInput */}
      <div className="space-y-3 p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs">
        <CustomInput
          label="Current Completed Page"
          type="number"
          required
          min={0}
          max={end}
          value={currentPage}
          onChange={(val) => {
            if (val === '') {
              setCurrentPage('');
              return;
            }
            const num = Number(val);
            if (num > end) {
              setCurrentPage(end);
              showToast(`Current page cannot exceed target page (${end}).`, 'warning');
            } else if (num < 0) {
              setCurrentPage(0);
            } else {
              setCurrentPage(num);
            }
          }}
          unit={`/ ${end} pgs`}
          stepper={true}
          placeholder={`Enter current page (${start}–${end})`}
        />

        {/* Quick Stepper Presets */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t theme-border">
          <span className="text-[11px] font-bold theme-text-secondary uppercase">Quick Adjust</span>
          <div className="flex items-center gap-1.5">
            <CustomButton
              type="button"
              variant="sub"
              size="xs"
              onClick={() => setCurrentPage((p) => Math.max(0, Number(p || 0) - 5))}
              title="Minus 5 Pages"
            >
              -5
            </CustomButton>
            <CustomButton
              type="button"
              variant="sub"
              size="xs"
              onClick={() => setCurrentPage((p) => Math.max(0, Number(p || 0) - 1))}
              title="Minus 1 Page"
            >
              -1
            </CustomButton>
            <CustomButton
              type="button"
              variant="sub"
              size="xs"
              onClick={() => setCurrentPage((p) => Math.min(end, Number(p || 0) + 1))}
              title="Plus 1 Page"
            >
              +1
            </CustomButton>
            <CustomButton
              type="button"
              variant="sub"
              size="xs"
              onClick={() => setCurrentPage((p) => Math.min(end, Number(p || 0) + 5))}
              title="Plus 5 Pages"
            >
              +5
            </CustomButton>
          </div>
        </div>
      </div>

      {/* 5. Milestone Remarks / Notes with Reusable CustomInput Textarea */}
      <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs">
        <CustomInput
          label="Lesson Notes / Chapter Milestone (Optional)"
          type="textarea"
          rows={3}
          value={notes}
          onChange={(val) => setNotes(val)}
          placeholder="e.g. Completed Chapter 5; starting Chapter 6 next week..."
          maxLength={300}
        />
      </div>

      {/* 6. Footer Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t theme-border mt-auto">
        <CustomButton
          type="button"
          variant="sub"
          onClick={onCancel}
        >
          Cancel
        </CustomButton>
        <CustomButton
          type="submit"
          variant="primary"
          loading={isSaving}
          icon={FilledCheckCircleIcon}
        >
          Update Milestone
        </CustomButton>
      </div>
    </form>
  );
}
