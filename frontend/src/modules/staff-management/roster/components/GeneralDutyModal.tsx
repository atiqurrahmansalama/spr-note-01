import React, { useState, useEffect, useCallback } from 'react';
import {
  DutyIcon,
  PlusIcon,
  TrashIcon,
  CloseIcon,
} from '@/components/ui/Icons';
import { getStaffDuties, assignGeneralDuty, deleteGeneralDuty } from '@/api/staff';
import { useToast } from '@/context/ToastContext';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import { useStaffTranslation } from '../../locales';
import type { StaffMember } from '../../types';

interface GeneralDutyModalProps {
  isOpen: boolean;
  staff: StaffMember | null;
  onClose: () => void;
  onUpdated?: () => void;
}

interface DutyItem {
  id: string | number;
  duty_type?: string;
  duty_type_display?: string;
  title: string;
  description?: string;
  location?: string;
}

const DUTY_TYPE_OPTIONS = [
  { value: 'DORMITORY_SUPERVISION', label: 'Dormitory & Residential Supervision' },
  { value: 'DINING_HALL', label: 'Dining Hall / Meal Shift In-Charge' },
  { value: 'CAMPUS_SECURITY', label: 'Campus Gate & Security Patrol' },
  { value: 'PRAYER_SUPERVISION', label: 'Masjid & Salah Jamaat Supervision' },
  { value: 'STUDY_HALL', label: 'Night Study Hall (Mutalaah) Proctor' },
  { value: 'GENERAL_ADMIN', label: 'General Administrative Support' },
];

export const GeneralDutyModal: React.FC<GeneralDutyModalProps> = ({
  isOpen,
  staff,
  onClose,
  onUpdated,
}) => {
  const { showToast } = useToast();
  const { t } = useStaffTranslation();

  const [duties, setDuties] = useState<DutyItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [form, setForm] = useState({
    duty_type: 'DORMITORY_SUPERVISION',
    title: '',
    location: '',
  });

  const loadDuties = useCallback(async () => {
    if (!staff?.id) return;
    setIsLoading(true);
    try {
      const data = await getStaffDuties({ staff: staff.id });
      setDuties(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      console.warn('Failed to load duties:', err);
    } finally {
      setIsLoading(false);
    }
  }, [staff]);

  useEffect(() => {
    if (isOpen && staff) {
      loadDuties();
    }
  }, [isOpen, staff, loadDuties]);

  if (!isOpen || !staff) return null;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Please provide a duty title', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await assignGeneralDuty({
        staff: staff.id,
        duty_type: form.duty_type,
        title: form.title.trim(),
        location: form.location.trim() || undefined,
      });

      showToast('Duty successfully assigned to staff!', 'success');
      setForm({ duty_type: 'DORMITORY_SUPERVISION', title: '', location: '' });
      await loadDuties();
      onUpdated?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to assign duty', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (dutyId: string | number) => {
    try {
      await deleteGeneralDuty(dutyId);
      showToast('Duty removed', 'success');
      await loadDuties();
      onUpdated?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove duty', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg theme-bg-surface rounded-3xl p-6 shadow-2xl space-y-5 border-0 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-0 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <DutyIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold theme-text-primary">
                {t('manageDutiesTitle', 'General & Campus Duties')}
              </h3>
              <p className="text-xs theme-text-secondary">
                {staff.user_name || staff.name_en || staff.employee_id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl theme-bg-app hover:theme-bg-elevated/40 text-xs theme-text-secondary hover:theme-text-primary transition cursor-pointer border-0"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Duties List */}
        <div className="space-y-2">
          <label className="text-xs font-bold theme-text-secondary block">Assigned Duties</label>
          {isLoading ? (
            <div className="p-4 text-center text-xs theme-text-secondary">Loading duties...</div>
          ) : duties.length === 0 ? (
            <div className="p-4 rounded-2xl theme-bg-app text-center text-xs theme-text-secondary border-0">
              No campus duties assigned to this staff member.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {duties.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl theme-bg-app flex items-center justify-between gap-3 border-0"
                >
                  <div>
                    <span className="text-xs font-bold theme-text-primary block">{item.title}</span>
                    <span className="text-[10px] theme-text-secondary">
                      {item.duty_type_display || item.duty_type}
                      {item.location ? ` • ${item.location}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-xl hover:bg-rose-500/10 text-rose-500 transition cursor-pointer border-0"
                    title="Remove duty"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Duty Form */}
        <form onSubmit={handleAssign} className="p-4 rounded-2xl theme-bg-app space-y-3 border-0">
          <span className="text-xs font-bold theme-text-primary block">{t('addNewDuty', 'Add New Duty')}</span>
          <CustomSelect
            options={DUTY_TYPE_OPTIONS}
            value={form.duty_type}
            onChange={(val) => setForm((prev) => ({ ...prev, duty_type: val }))}
            placeholder="Duty Category"
          />
          <CustomInput
            type="text"
            placeholder={t('dutyTitle', 'Duty Title (e.g. Night Study Proctor)')}
            value={form.title}
            onChange={(val) => setForm((prev) => ({ ...prev, title: val }))}
          />
          <CustomInput
            type="text"
            placeholder="Location / Building (Optional)"
            value={form.location}
            onChange={(val) => setForm((prev) => ({ ...prev, location: val }))}
          />
          <button
            type="submit"
            disabled={isSubmitting || !form.title.trim()}
            className="w-full py-2.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 border-0"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{isSubmitting ? 'Assigning...' : t('saveDuties', 'Assign Duty')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

