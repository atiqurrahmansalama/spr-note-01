import React, { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import CustomInput from '../../../components/ui/CustomInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import TeacherSelect from '../../../components/selectors/TeacherSelect';
import { UserIcon, CheckIcon, TrashIcon } from '../../../components/ui/Icons';
import { residentialStore } from '../../../utils/stores/residentialStore';
import { students as studentStore } from '../../../utils/stores/academicStore';
import { useTenant } from '../../../context/TenantContext';
import { useToast } from '../../../context/ToastContext';

export default function BedAllocationModal({
  isOpen,
  onClose,
  bed,
  onSaveSuccess,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();

  const [allocType, setAllocType] = useState('STUDENT'); // 'STUDENT' | 'STAFF'
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedStaffObj, setSelectedStaffObj] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [availableStudents, setAvailableStudents] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && bed) {
      setAllocType(bed.staff ? 'STAFF' : 'STUDENT');
      setSelectedStudentId(bed.student || '');
      setSelectedStaffId(bed.staff || '');
      setRemarks(bed.remarks || '');
      setStudentSearch(bed.student_name || '');

      const stList = studentStore.getAll();
      setAvailableStudents(stList || []);
    }
  }, [isOpen, bed]);

  if (!isOpen || !bed) return null;

  const filteredStudents = availableStudents.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    const nameMatch = (s.name_en || s.name || s.label || '').toLowerCase().includes(q);
    const uniqMatch = (s.uniq_id || '').toLowerCase().includes(q);
    const classMatch = (s.student_class_name || s.class_name || '').toLowerCase().includes(q);
    return nameMatch || uniqMatch || classMatch;
  });

  const handleAssign = () => {
    setSaving(true);
    try {
      let studentData = null;
      let staffData = null;

      if (allocType === 'STUDENT') {
        const found = availableStudents.find((s) => String(s.id) === String(selectedStudentId));
        if (!found && !studentSearch.trim()) {
          showToast('Please select or specify a student', 'error');
          setSaving(false);
          return;
        }
        studentData = found || {
          id: `stu_${Date.now()}`,
          name_en: studentSearch.trim(),
          uniq_id: 'STU-NEW',
          student_class_name: 'Residential Student',
        };
      } else {
        if (!selectedStaffId && !selectedStaffObj) {
          showToast('Please select a staff member', 'error');
          setSaving(false);
          return;
        }
        staffData = {
          id: selectedStaffId,
          name: selectedStaffObj?.name || selectedStaffObj?.label || 'Staff Member',
        };
      }

      residentialStore.assignBed(activeTenantId, bed.id, studentData, staffData, remarks);
      showToast(`Seat ${bed.bed_number} assigned successfully!`, 'success');
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch {
      showToast('Failed to assign bed slot', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = () => {
    setSaving(true);
    try {
      residentialStore.unassignBed(activeTenantId, bed.id, remarks);
      showToast(`Seat ${bed.bed_number} vacated successfully.`, 'info');
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch {
      showToast('Failed to vacate bed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Seat: ${bed.bed_number}`}
      subtitle={`Room ${bed.room_number || ''} ${bed.room_name ? `(${bed.room_name})` : ''} • ${bed.building_name || 'Residential Hall'}`}
      size="md"
    >
      <div className="p-5 sm:p-6 space-y-4 text-left">
        {/* Current Status Banner */}
        <div className="p-3 rounded-xl theme-bg-sub border theme-border flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
              Current Allocation
            </span>
            <span className="text-xs font-bold theme-text-primary">
              {bed.status === 'OCCUPIED'
                ? bed.student_name
                  ? `${bed.student_name} (${bed.student_uniq_id || 'Student'})`
                  : `${bed.staff_name || 'Staff'}`
                : 'Vacant (Available for allocation)'}
            </span>
          </div>
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
              bed.status === 'OCCUPIED'
                ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20'
                : 'theme-bg-sub theme-text-secondary border theme-border'
            }`}
          >
            {bed.status}
          </span>
        </div>

        {/* Allocation Type Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl theme-bg-sub border theme-border">
          <button
            type="button"
            onClick={() => setAllocType('STUDENT')}
            className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              allocType === 'STUDENT'
                ? 'theme-bg-accent theme-accent-text shadow-2xs'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            Student Allocation
          </button>
          <button
            type="button"
            onClick={() => setAllocType('STAFF')}
            className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              allocType === 'STAFF'
                ? 'theme-bg-accent theme-accent-text shadow-2xs'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            Staff / Faculty Allocation
          </button>
        </div>

        {allocType === 'STUDENT' ? (
          <div className="space-y-3">
            <div>
              <CustomInput
                label="Search / Specify Student"
                placeholder="Type student name or ID..."
                value={studentSearch}
                onChange={(val) => {
                  setStudentSearch(val);
                  setSelectedStudentId('');
                }}
                icon={UserIcon}
              />
            </div>

            {/* Quick Matching Student List */}
            {filteredStudents.length > 0 && studentSearch.trim() && (
              <div className="max-h-36 overflow-y-auto rounded-xl border theme-border theme-bg-surface p-1 space-y-1">
                {filteredStudents.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudentId(s.id);
                      setStudentSearch(s.name_en || s.name || s.label || '');
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-between ${
                      String(selectedStudentId) === String(s.id)
                        ? 'theme-bg-accent theme-accent-text font-bold'
                        : 'hover:theme-bg-sub theme-text-primary'
                    }`}
                  >
                    <span>{s.name_en || s.name || s.label}</span>
                    <span className="text-[10px] opacity-75">
                      {s.uniq_id ? `${s.uniq_id} • ` : ''}
                      {s.student_class_name || s.class_name || ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <TeacherSelect
              label="Select Resident Staff / Faculty"
              value={selectedStaffId}
              onChange={(val, obj) => {
                setSelectedStaffId(val);
                setSelectedStaffObj(obj);
              }}
              searchable={true}
            />
          </div>
        )}

        <div>
          <CustomInput
            label="Remarks / Assignment Notes"
            placeholder="e.g. Senior Proctor, Special Care, Room Prefect..."
            value={remarks}
            onChange={(val) => setRemarks(val)}
          />
        </div>

        <div className="pt-4 border-t theme-border flex items-center justify-between gap-2.5">
          {bed.status === 'OCCUPIED' ? (
            <button
              type="button"
              onClick={handleUnassign}
              disabled={saving}
              className="px-3 py-2 text-xs font-bold rounded-xl border theme-border text-rose-500 hover:bg-rose-500/10 transition flex items-center gap-1 cursor-pointer"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>Vacate Seat</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border theme-border theme-text-secondary hover:theme-bg-sub transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckIcon className="w-3.5 h-3.5" />
              <span>{saving ? 'Assigning...' : 'Confirm Allocation'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
