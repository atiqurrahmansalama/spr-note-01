import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { BookOpenIcon, FilledCheckCircleIcon } from '../../../components/ui/Icons';
import { useToast } from '../../../context/ToastContext';
import { curriculumStore } from '../../../utils/localStore';

export default function SyllabusProgressModal({
  isOpen,
  onClose,
  item,
  activeTenantId,
  onProgressUpdated,
}) {
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(() => (item ? item.currentPage || 0 : 0));
  const [notes, setNotes] = useState(() => (item ? item.notes || '' : ''));
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
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

    setIsSaving(true);
    try {
      curriculumStore.updateProgress(activeTenantId, item.id, cur, notes);
      showToast(`Progress updated for "${item.name}" (Page ${cur} of ${end})`, 'success');
      if (onProgressUpdated) onProgressUpdated();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to update progress.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Syllabus Progress"
      subtitle={`${item.name} • ${item.className || 'Class'} (${item.semester || 'Current Term'})`}
      icon={BookOpenIcon}
      size="md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Quick Stats Summary */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl theme-bg-sub border theme-border text-center">
          <div>
            <div className="text-[11px] theme-text-secondary font-medium">Start Page</div>
            <div className="text-sm font-bold theme-text-primary">{start}</div>
          </div>
          <div>
            <div className="text-[11px] theme-text-secondary font-medium">Target End</div>
            <div className="text-sm font-bold theme-text-primary">{end}</div>
          </div>
          <div>
            <div className="text-[11px] theme-text-secondary font-medium">Total Volume</div>
            <div className="text-sm font-bold theme-text-primary">{total} pgs</div>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="space-y-1.5 p-3.5 rounded-2xl theme-bg-sub/60 border theme-border">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold theme-text-secondary">Calculated Completion</span>
            <span className="font-bold theme-accent">{progressPct}%</span>
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
          <div className="text-[11px] theme-text-secondary flex justify-between pt-0.5">
            <span>{cur >= start ? `${covered} pages covered` : 'Not started yet'}</span>
            <span>{Math.max(0, total - covered)} pages remaining</span>
          </div>
        </div>

        {/* Current Page Numeric Input */}
        <div>
          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
            Current Completed Page *
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(start, Number(p || start) - 5))}
              className="px-3 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-primary transition cursor-pointer"
              title="Minus 5 Pages"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(start, Number(p || start) - 1))}
              className="px-3 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-primary transition cursor-pointer"
              title="Minus 1 Page"
            >
              -1
            </button>
            <input
              type="number"
              min={0}
              max={end + 100}
              value={currentPage}
              onChange={(e) => setCurrentPage(e.target.value === '' ? '' : Number(e.target.value))}
              required
              className="flex-1 text-center font-bold text-base px-3.5 py-2 rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
            />
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(end, Number(p || start) + 1))}
              className="px-3 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-primary transition cursor-pointer"
              title="Plus 1 Page"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(end, Number(p || start) + 5))}
              className="px-3 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-primary transition cursor-pointer"
              title="Plus 5 Pages"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(end)}
              className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition cursor-pointer"
              title="Mark 100% Completed"
            >
              Full
            </button>
          </div>
        </div>

        {/* Milestone Remarks / Notes */}
        <div>
          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
            Lesson Notes / Chapter Milestone (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Completed Chapter 5; starting Chapter 6 next week..."
            className="w-full px-3.5 py-2 rounded-xl theme-bg-sub border theme-border theme-text-primary text-xs focus:outline-none focus:border-[var(--accent-main)] resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t theme-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <FilledCheckCircleIcon className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Update Milestone'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
