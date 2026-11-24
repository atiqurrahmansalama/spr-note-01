import React, { useState, useRef, useEffect, useMemo } from 'react';
import CustomInput from '@/components/ui/CustomInput';
import CustomButton from '@/components/ui/CustomButton';
import TemplateTextarea from '@/components/ui/TemplateTextarea';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import {
  CalendarIcon,
  ChevronIcon,
  DutyIcon,
  AcademicCapIcon,
  AwardIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  StarIcon,
  ClockIcon,
  TransferIcon,
  CheckIcon,
  AdmissionIcon,
  BuildingOfficeIcon,
} from '@/components/ui/Icons';
import { resolveCanonicalEventColor } from '@/modules/academy/calendar-events/constants/eventColors';
import { EventColorPickerDropdown } from '@/modules/academy/calendar-events/components/EventColorPickerDropdown';
import type { LifecycleTimelineRecord, TimelineEntityType } from './timelineTypes';

export interface LifecycleTimelineDrawerFormProps {
  entityType?: TimelineEntityType;
  initialData?: LifecycleTimelineRecord | null;
  onSave: (data: Omit<LifecycleTimelineRecord, 'id' | 'created_at'>) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export const LIFECYCLE_TIMELINE_ICONS: Array<{
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'appointment', label: 'Appointment', icon: DutyIcon },
  { key: 'admission', label: 'Admission', icon: AdmissionIcon },
  { key: 'academic', label: 'Promotion', icon: AcademicCapIcon },
  { key: 'award', label: 'Award', icon: AwardIcon },
  { key: 'shield', label: 'Governance', icon: ShieldCheckIcon },
  { key: 'document', label: 'Document', icon: DocumentTextIcon },
  { key: 'star', label: 'Achievement', icon: StarIcon },
  { key: 'clock', label: 'Attendance', icon: ClockIcon },
  { key: 'transfer', label: 'Transfer', icon: TransferIcon },
  { key: 'building', label: 'Campus', icon: BuildingOfficeIcon },
  { key: 'calendar', label: 'Milestone', icon: CalendarIcon },
];

export const LifecycleTimelineDrawerForm: React.FC<LifecycleTimelineDrawerFormProps> = ({
  entityType = 'staff',
  initialData,
  onSave,
  onClose,
  isSubmitting = false,
}) => {
  const isEdit = Boolean(initialData?.id);

  const [date, setDate] = useState<string>(
    initialData?.date || new Date().toISOString().split('T')[0]
  );
  const [badge, setBadge] = useState<string>(
    initialData?.badge || initialData?.subtitle || (initialData as any)?.action || ''
  );
  const [title, setTitle] = useState<string>(initialData?.title || '');
  const [subtitle, setSubtitle] = useState<string>(initialData?.subtitle || '');
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [iconKey, setIconKey] = useState<string>(
    initialData?.iconKey || (entityType === 'student' ? 'admission' : 'appointment')
  );
  const [isIconDropdownOpen, setIsIconDropdownOpen] = useState<boolean>(false);
  const [color, setColor] = useState<string>(() => {
    return resolveCanonicalEventColor(initialData?.color, 'eucalyptus');
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const iconDropdownRef = useRef<HTMLDivElement>(null);

  // Close icon dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (iconDropdownRef.current && !iconDropdownRef.current.contains(e.target as Node)) {
        setIsIconDropdownOpen(false);
      }
    };
    if (isIconDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isIconDropdownOpen]);

  const selectedIconItem = useMemo(() => {
    return LIFECYCLE_TIMELINE_ICONS.find((item) => item.key === iconKey) || LIFECYCLE_TIMELINE_ICONS[0];
  }, [iconKey]);

  const SelectedIcon = selectedIconItem.icon;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!date) newErrors.date = 'Date is required';
    if (!title.trim()) newErrors.title = 'Milestone header is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      date,
      badge: badge.trim() || undefined,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      description: description.trim() || undefined,
      iconKey,
      color,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="@container space-y-5 pt-2 pb-6 select-none">
      {/* ─── 1. Date & Badge Row (Container Query Responsive) ─── */}
      <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4 items-start">
        <ReusableCalendar
          label="Milestone Date"
          required={true}
          selectedDate={date}
          onSelectDate={(newDate) => {
            setDate(newDate);
            if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
          }}
          error={errors.date}
        />

        <CustomInput
          label="Badge"
          placeholder="e.g. Promotion, Enrolment, Transfer"
          value={badge}
          onChange={(val: any) => {
            const str = typeof val === 'object' && val?.target ? val.target.value : String(val ?? '');
            setBadge(str);
          }}
        />
      </div>

      {/* ─── 2. Milestone Header (Title) ─── */}
      <CustomInput
        label="Header"
        placeholder={entityType === 'student' ? 'e.g. Enrolled in Tahfeez Class' : 'e.g. Promoted to Senior Ustadh'}
        required
        value={title}
        onChange={(val: any) => {
          const str = typeof val === 'object' && val?.target ? val.target.value : String(val ?? '');
          setTitle(str);
          if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
        }}
        error={errors.title}
      />

      {/* ─── 3. Subtitle ─── */}
      <CustomInput
        label="Subtitle"
        placeholder={entityType === 'student' ? 'e.g. Academic Session 2026-2027' : 'e.g. Department Transfer, Annual Session'}
        value={subtitle}
        onChange={(val: any) => {
          const str = typeof val === 'object' && val?.target ? val.target.value : String(val ?? '');
          setSubtitle(str);
        }}
      />

      {/* ─── 4. Description & Details (Reused TemplateTextarea) ─── */}
      <TemplateTextarea
        label="Description"
        placeholder="Write concise context..."
        value={description}
        onChange={(val: string) => setDescription(val)}
        rows={3}
      />

      {/* ─── 5. Milestone Icon & Milestone Color (Always 2 Columns in One Row Across All Screen Sizes) ─── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 items-start">
        {/* Column 1: Milestone Icon (Input Height h-[46px]) */}
        <div ref={iconDropdownRef} className="relative w-full">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary truncate">
              Milestone Icon
            </label>
          </div>

          <button
            type="button"
            onClick={() => setIsIconDropdownOpen((prev) => !prev)}
            className={`w-full h-[46px] min-h-[46px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl border-0 ring-0 transition cursor-pointer text-left focus:outline-hidden shadow-xs ${
              isIconDropdownOpen
                ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25'
                : 'theme-bg-surface hover:theme-bg-elevated/40'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <SelectedIcon className="w-4 h-4 theme-accent shrink-0" />
              <span className="text-xs font-semibold theme-text-primary truncate leading-tight">
                {selectedIconItem.label}
              </span>
            </div>

            <ChevronIcon isOpen={isIconDropdownOpen} className="w-3.5 h-3.5 theme-text-secondary shrink-0 ml-1.5" />
          </button>

          {isIconDropdownOpen && (
            <div className="mt-1.5 p-2.5 rounded-3xl theme-bg-surface border-0 ring-0 shadow-xl animate-fade-in space-y-1 z-40 w-[calc(100vw-3rem)] max-w-xs sm:w-80 absolute left-0">
              <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto scrollbar-none pr-0.5">
                {LIFECYCLE_TIMELINE_ICONS.map((item) => {
                  const ItemIcon = item.icon;
                  const isSelected = iconKey === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setIconKey(item.key);
                        setIsIconDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border-0 ring-0 text-left transition cursor-pointer select-none min-w-0 ${
                        isSelected
                          ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 theme-accent font-bold'
                          : 'theme-bg-app hover:theme-bg-elevated/60 theme-text-primary'
                      }`}
                    >
                      <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'theme-accent' : 'theme-text-secondary'}`} />
                      <span className="text-[11px] font-medium truncate leading-tight flex-1 min-w-0">
                        {item.label}
                      </span>
                      {isSelected && (
                        <span className="w-3.5 h-3.5 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0 ml-auto">
                          <CheckIcon className="w-2 h-2" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Milestone Color (Direct Call & Full UI Reuse from Calendar & Events) */}
        <EventColorPickerDropdown
          value={color}
          onChange={(newColorId) => setColor(newColorId)}
          label="Milestone Color"
          align="right"
        />
      </div>

      {/* ─── 7. Action Buttons ─── */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <CustomButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </CustomButton>

        <CustomButton
          type="submit"
          variant="primary"
          size="sm"
          disabled={isSubmitting}
        >
          {isEdit ? 'Update Milestone' : 'Add Milestone'}
        </CustomButton>
      </div>
    </form>
  );
};

export default LifecycleTimelineDrawerForm;
