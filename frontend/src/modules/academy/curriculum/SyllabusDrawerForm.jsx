import React, { useState, useEffect } from 'react';
import {
  BookOpenIcon,
  FilledCheckCircleIcon,
  ClassIcon,
  CloseIcon,
} from '../../../components/ui/Icons';
import CustomSelect from '../../../components/ui/CustomSelect';
import { ClassSelect, TeacherSelect } from '../../../components/selectors';
import { useToast } from '../../../context/ToastContext';
import { curriculumStore } from '../../../utils/localStore';

const SUBJECT_OPTIONS = [
  { value: 'Fiqh', label: 'Islamic Jurisprudence (Fiqh)' },
  { value: 'Usul al-Fiqh', label: 'Principles of Jurisprudence (Usul al-Fiqh)' },
  { value: 'Hadith', label: 'Prophetic Traditions (Hadith)' },
  { value: 'Usul al-Hadith', label: 'Hadith Sciences (Usul al-Hadith)' },
  { value: 'Tafsir', label: 'Quranic Exegesis (Tafsir)' },
  { value: 'Usul al-Tafsir', label: 'Principles of Exegesis (Usul al-Tafsir)' },
  { value: 'Arabic Syntax', label: 'Arabic Syntax & Grammar (Nahw)' },
  { value: 'Arabic Morphology', label: 'Arabic Morphology (Sarf)' },
  { value: 'Arabic Literature', label: 'Arabic Literature (Adab)' },
  { value: 'Arabic Rhetoric', label: 'Arabic Rhetoric (Balaghah)' },
  { value: 'Logic', label: 'Classical Logic (Mantiq)' },
  { value: 'Theology', label: 'Islamic Creed & Theology (Aqaid)' },
  { value: 'Tajweed & Recitation', label: 'Tajweed & Quran Recitation' },
  { value: 'General Studies', label: 'General / Academic Subject' },
];

const SEMESTER_OPTIONS = [
  { value: '1st Semester', label: '1st Semester' },
  { value: '2nd Semester', label: '2nd Semester' },
  { value: 'Final Term', label: 'Final Term / 3rd Semester' },
  { value: 'Annual Syllabus', label: 'Annual Syllabus' },
];

export default function SyllabusDrawerForm({
  item = null,
  activeTenantId,
  classes = [],
  teachers = [],
  onSaveSuccess,
  onCancel,
}) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    subject: 'Fiqh',
    classId: '',
    className: '',
    semester: '1st Semester',
    teacherId: '',
    teacherName: '',
    startPage: 1,
    endPage: 100,
    currentPage: 0,
    targetDate: '',
    status: 'NOT_STARTED',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        subject: item.subject || 'Fiqh',
        classId: item.classId || '',
        className: item.className || '',
        semester: item.semester || '1st Semester',
        teacherId: item.teacherId || '',
        teacherName: item.teacherName || '',
        startPage: item.startPage || 1,
        endPage: item.endPage || 100,
        currentPage: item.currentPage || 0,
        targetDate: item.targetDate || '',
        status: item.status || 'NOT_STARTED',
        notes: item.notes || '',
      });
    } else {
      const firstClass = classes && classes.length > 0 ? classes[0] : null;
      setFormData({
        name: '',
        subject: 'Fiqh',
        classId: firstClass ? String(firstClass.id) : '',
        className: firstClass ? firstClass.name : '',
        semester: '1st Semester',
        teacherId: '',
        teacherName: '',
        startPage: 1,
        endPage: 150,
        currentPage: 0,
        targetDate: '',
        status: 'NOT_STARTED',
        notes: '',
      });
    }
  }, [item, classes]);

  const handleClassChange = (newClassId) => {
    const matched = classes.find((c) => String(c.id) === String(newClassId));
    setFormData((prev) => ({
      ...prev,
      classId: newClassId,
      className: matched ? matched.name : prev.className,
    }));
  };

  const handleTeacherChange = (newTeacherId) => {
    const matched = teachers.find(
      (t) => String(t.id) === String(newTeacherId) || String(t.user) === String(newTeacherId)
    );
    const tName = matched
      ? matched.name ||
        matched.name_en ||
        (matched.first_name ? `${matched.first_name} ${matched.last_name || ''}`.trim() : '')
      : '';
    setFormData((prev) => ({
      ...prev,
      teacherId: newTeacherId,
      teacherName: tName || prev.teacherName,
    }));
  };

  const start = Number(formData.startPage) || 1;
  const end = Number(formData.endPage) || start;
  const cur = Number(formData.currentPage) || 0;
  const total = Math.max(1, end - start + 1);
  const covered = Math.max(0, Math.min(total, cur >= start ? cur - start + 1 : 0));
  const progressPct = Math.min(100, Math.round((covered / total) * 100));

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Please enter the Textbook or Syllabus title.', 'warning');
      return;
    }

    if (end < start) {
      showToast('Target End Page cannot be less than Start Page.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      if (item && item.id) {
        curriculumStore.updateItem(activeTenantId, item.id, formData);
        showToast(`Syllabus "${formData.name}" updated successfully.`, 'success');
      } else {
        curriculumStore.addItem(activeTenantId, formData);
        showToast(`Syllabus "${formData.name}" added to curriculum.`, 'success');
      }

      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to save syllabus item.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-5 p-1">
      {/* Live Completion Indicator Card */}
      <div className="p-4 rounded-2xl theme-bg-sub/80 border theme-border space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold theme-text-primary">Curriculum Progress Preview</span>
          <span className="font-extrabold theme-accent">{progressPct}%</span>
        </div>
        <div className="w-full h-2 rounded-full theme-bg-elevated overflow-hidden">
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
        <div className="flex justify-between items-center text-[11px] theme-text-secondary">
          <span>{total} Total Pages in Syllabus</span>
          <span>{covered} Pages Covered</span>
        </div>
      </div>

      {/* 1. Textbook Name & Subject Category */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
            Textbook / Syllabus Title *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Mukhtasar al-Quduri"
            className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <CustomSelect
              label="Subject / Science *"
              options={SUBJECT_OPTIONS}
              value={formData.subject}
              onChange={(val) => setFormData({ ...formData, subject: val })}
            />
          </div>

          <div>
            <CustomSelect
              label="Semester / Term *"
              options={SEMESTER_OPTIONS}
              value={formData.semester}
              onChange={(val) => setFormData({ ...formData, semester: val })}
            />
          </div>
        </div>
      </div>

      {/* 2. Class & Assigned Teacher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <ClassSelect
            label="Assigned Class *"
            value={formData.classId}
            onChange={handleClassChange}
            classes={classes}
            allLabel="Select Class"
          />
        </div>

        <div>
          <TeacherSelect
            label="Assigned Teacher"
            value={formData.teacherId}
            onChange={handleTeacherChange}
            teachers={teachers}
            allLabel="Assign Later"
            onlyTeachers={true}
          />
        </div>
      </div>

      {/* 3. Page Boundaries (Start Page, Target End Page, Current Page) */}
      <div className="p-4 rounded-2xl theme-bg-sub border theme-border space-y-3">
        <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider">
          Syllabus Page Range & Milestones
        </label>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <span className="block text-[11px] font-semibold theme-text-secondary mb-1">
              Start Page *
            </span>
            <input
              type="number"
              min={1}
              required
              value={formData.startPage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  startPage: e.target.value === '' ? '' : Number(e.target.value),
                })
              }
              className="w-full text-center px-3 py-2 rounded-xl theme-bg-surface border theme-border theme-text-primary text-xs font-bold focus:outline-none focus:border-[var(--accent-main)]"
            />
          </div>

          <div>
            <span className="block text-[11px] font-semibold theme-text-secondary mb-1">
              Target End *
            </span>
            <input
              type="number"
              min={1}
              required
              value={formData.endPage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  endPage: e.target.value === '' ? '' : Number(e.target.value),
                })
              }
              className="w-full text-center px-3 py-2 rounded-xl theme-bg-surface border theme-border theme-text-primary text-xs font-bold focus:outline-none focus:border-[var(--accent-main)]"
            />
          </div>

          <div>
            <span className="block text-[11px] font-semibold theme-text-secondary mb-1">
              Current Page
            </span>
            <input
              type="number"
              min={0}
              value={formData.currentPage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  currentPage: e.target.value === '' ? '' : Number(e.target.value),
                })
              }
              className="w-full text-center px-3 py-2 rounded-xl theme-bg-surface border theme-border theme-text-primary text-xs font-bold focus:outline-none focus:border-[var(--accent-main)]"
            />
          </div>
        </div>
      </div>

      {/* 4. Target Completion Date & Notes */}
      <div className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
            Target Completion Date (Optional)
          </label>
          <input
            type="date"
            value={formData.targetDate}
            onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary text-xs focus:outline-none focus:border-[var(--accent-main)]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
            Syllabus Scope & Chapter Notes
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g. Chapters 1 to 15 included; special focus on practical application..."
            className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary text-xs focus:outline-none focus:border-[var(--accent-main)] resize-none"
          />
        </div>
      </div>

      {/* Footer Submit Buttons */}
      <div className="pt-4 border-t theme-border flex items-center justify-end gap-3 mt-auto">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          <FilledCheckCircleIcon className="w-4 h-4" />
          <span>{item ? 'Save Changes' : 'Add to Curriculum'}</span>
        </button>
      </div>
    </form>
  );
}
