/**
 * Student Academic Transfer Drawer (Slide-over Form)
 * ====================================================
 * Institutional student academic placement and section transfer management.
 * Supports single student reallocation and batch/bulk classroom reassignments.
 *
 * Implements strict project enterprise standards:
 * - Zero hardcoded colors / borderless & ringless soft surfaces (RULE 14)
 * - Container queries @container and @[480px]:grid-cols-2 (RULE 5 & 17)
 * - Streamlined section separation with clean section headers (RULE 5)
 * - ReusableCalendar & TemplateTextarea integration (RULE 2)
 * - Reusable DrawerContainer (padding="none") & DrawerFooter (RULE 5)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { fetchWithAuth } from '../../../../utils/authService';
import { useToast } from '../../../../context/ToastContext';
import { useTenant } from '../../../../context/TenantContext';
import { useAcademicData } from '../../../../hooks/useAcademicData';
import {
  DrawerContainer,
  DrawerFooter,
} from '../../../../components/layout';
import TemplateTextarea from '../../../../components/ui/TemplateTextarea';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import {
  DepartmentSelect,
  ClassSelect,
  SectionSelect,
  GroupSelect,
  DormitoryRoomSelect,
} from '../../../../components/selectors';
import {
  TransferIcon,
  DepartmentIcon,
  ClassIcon,
  SectionIcon,
  GroupIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  InfoIcon,
  UsersIcon,
  DocumentTextIcon,
} from '../../../../components/ui/Icons';
import { transferReasonsStore, students as studentStore } from '../../../../utils/localStore';

const getTodayDate = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface StudentTransferDrawerProps {
  student?: any;
  studentIds?: (string | number)[];
  selectedStudents?: any[];
  isBulk?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StudentTransferDrawer({
  student = null,
  studentIds = [],
  selectedStudents = [],
  isBulk = false,
  onClose,
  onSuccess,
}: StudentTransferDrawerProps) {
  const { showToast } = useToast() as any;
  const tenantContext = useTenant ? useTenant() : null;
  const activeTenantId = tenantContext?.activeTenantId || 'default';

  // Academic hierarchy context
  const {
    departments,
    classes,
    sections,
    groups,
    students: academicStudents,
    getSectionsForClass,
    getGroupsForClass,
  } = useAcademicData();

  const [loadedStudents, setLoadedStudents] = useState<any[]>([]);
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>('');
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [targetSectionId, setTargetSectionId] = useState<string>('');
  const [targetGroupId, setTargetGroupId] = useState<string>('');
  const [targetRoomId, setTargetRoomId] = useState<string>('');
  const [extraGroups, setExtraGroups] = useState<any[]>([]);
  const [transitionDate, setTransitionDate] = useState<string>(getTodayDate());
  const [transitionReason, setTransitionReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [reasonsVersion, setReasonsVersion] = useState<number>(0);

  const effectiveIsBulk = Boolean(
    isBulk || (!student && Array.isArray(studentIds) && studentIds.length > 1)
  );

  const activeStudentCount = effectiveIsBulk
    ? studentIds.length
    : student
    ? 1
    : Array.isArray(studentIds) && studentIds.length === 1
    ? 1
    : 0;

  const sanitizeId = (val: any): string | null => {
    if (!val) return null;
    const str = String(val).trim();
    if (
      str === '' ||
      str === '0' ||
      str.toUpperCase() === 'ALL' ||
      str.toLowerCase() === 'null' ||
      str.toLowerCase() === 'undefined'
    ) {
      return null;
    }
    return str;
  };

  // Listen to Admin Tools transfer reasons changes reactively
  useEffect(() => {
    const handleReasonsUpdated = () => setReasonsVersion((v) => v + 1);
    window.addEventListener('spr_transfer_reasons_updated', handleReasonsUpdated);
    return () => window.removeEventListener('spr_transfer_reasons_updated', handleReasonsUpdated);
  }, []);

  // Dynamically load configured transfer reasons from Admin Tools store as initial templates
  const initialReasonTemplates = useMemo(() => {
    const list = transferReasonsStore.getReasons(activeTenantId);
    return list
      .filter((r: any) => r.is_active !== false && r.code !== 'OTHER')
      .map((r: any) => r.name || r.code)
      .filter(Boolean);
  }, [activeTenantId, reasonsVersion]);

  // Load student records for accurate placement metadata with instant cache fallback
  useEffect(() => {
    if (student) {
      setLoadedStudents([student]);
      return;
    }

    if (Array.isArray(studentIds) && studentIds.length > 0) {
      if (selectedStudents && selectedStudents.length >= studentIds.length) {
        setLoadedStudents(selectedStudents);
        return;
      }

      // Fast in-memory lookup from academicStudents
      const idStrings = studentIds.map(String);
      const cached = (academicStudents || []).filter((s: any) =>
        idStrings.includes(String(s.id))
      );
      if (cached.length >= studentIds.length) {
        setLoadedStudents(cached);
        return;
      }

      // Fast in-memory lookup from studentStore
      const storeList = studentStore.getAll?.() || [];
      const fromStore = storeList.filter((s: any) => idStrings.includes(String(s.id)));
      if (fromStore.length >= studentIds.length) {
        setLoadedStudents(fromStore);
        return;
      }

      // Targeted fetch only if not in local memory/cache
      if (studentIds.length === 1) {
        fetchWithAuth(`/api/v1/students/${studentIds[0]}/full-profile/`)
          .then((res) => res.json())
          .then((data) => {
            if (data && (data.id || data.name || data.name_en)) {
              setLoadedStudents([data]);
            } else {
              setLoadedStudents(selectedStudents || []);
            }
          })
          .catch(() => {
            setLoadedStudents(selectedStudents || []);
          });
      } else {
        setLoadedStudents(selectedStudents || cached || fromStore || []);
      }
    }
  }, [student, studentIds, selectedStudents, academicStudents]);

  // Instant local calculation of available sections for targetClassId
  const availableSections = useMemo(() => {
    const cleanClassId = sanitizeId(targetClassId);
    if (!cleanClassId) return [];
    return getSectionsForClass(cleanClassId);
  }, [targetClassId, getSectionsForClass, sections]);

  // Instant local calculation of available groups for targetClassId
  const availableGroups = useMemo(() => {
    const cleanClassId = sanitizeId(targetClassId);
    if (!cleanClassId) return [];
    return getGroupsForClass(cleanClassId);
  }, [targetClassId, getGroupsForClass, groups]);

  // Background fallback to fetch groups if not pre-cached
  useEffect(() => {
    const cleanClassId = sanitizeId(targetClassId);
    if (!cleanClassId) {
      setExtraGroups([]);
      return;
    }

    if (availableGroups.length === 0) {
      let isMounted = true;
      fetchWithAuth(`/api/v1/groups/?student_class=${cleanClassId}&page_size=500&all=true`)
        .then((res) => res.json())
        .then((data) => {
          if (isMounted) {
            const list = Array.isArray(data) ? data : data.results || [];
            setExtraGroups(list);
          }
        })
        .catch(() => {
          if (isMounted) setExtraGroups([]);
        });
      return () => {
        isMounted = false;
      };
    } else {
      setExtraGroups([]);
    }
  }, [targetClassId, availableGroups.length]);

  const effectiveAvailableGroups = availableGroups.length > 0 ? availableGroups : extraGroups;

  // Calculate Aggregated Current Academic Placement across single / multiple students
  const placementSummary = useMemo(() => {
    const list = student
      ? [student]
      : loadedStudents.length > 0
      ? loadedStudents
      : selectedStudents || [];

    if (list.length === 0) {
      return {
        branchName: '--',
        departmentName: '--',
        className: '--',
        sectionName: '--',
        groupName: '--',
        roomName: '--',
        isMulti: effectiveIsBulk,
      };
    }

    const getUniqueValues = (extractor: (s: any) => string | null | undefined): string[] => {
      const raw = list
        .map(extractor)
        .map((v) => (v ? String(v).trim() : ''))
        .filter(Boolean);
      return Array.from(new Set(raw));
    };

    const branches = getUniqueValues(
      (s) => s.branch_name || s.branch?.name || (typeof s.branch === 'string' ? s.branch : '')
    );
    const depts = getUniqueValues(
      (s) =>
        s.department_name ||
        s.department?.name ||
        s.student_class_obj?.department_name ||
        (typeof s.department === 'string' ? s.department : '')
    );
    const classList = getUniqueValues(
      (s) =>
        s.student_class_name ||
        s.class_name ||
        s.student_class?.name ||
        (typeof s.student_class === 'string' ? s.student_class : '')
    );
    const sectionList = getUniqueValues(
      (s) => s.section_name || s.section?.name || (typeof s.section === 'string' ? s.section : '')
    );
    const groupList = getUniqueValues(
      (s) =>
        s.student_group_name ||
        s.group_name ||
        s.student_group?.name ||
        (typeof s.student_group === 'string' ? s.student_group : '')
    );
    const rooms = getUniqueValues(
      (s) =>
        s.dormitory_room_name ||
        s.room_number ||
        s.dormitory_room?.name ||
        (typeof s.dormitory_room === 'string' ? s.dormitory_room : '')
    );

    const formatSummaryField = (uniques: string[], pluralLabel: string) => {
      if (uniques.length === 0) return 'Not Assigned';
      if (uniques.length === 1) return uniques[0];
      return `Multiple ${pluralLabel}`;
    };

    return {
      branchName: formatSummaryField(branches, 'Campuses'),
      departmentName: formatSummaryField(depts, 'Departments'),
      className: formatSummaryField(classList, 'Classes'),
      sectionName: formatSummaryField(sectionList, 'Sections'),
      groupName: formatSummaryField(groupList, 'Groups'),
      roomName: formatSummaryField(rooms, 'Rooms'),
      isMulti: list.length > 1,
    };
  }, [student, loadedStudents, selectedStudents, effectiveIsBulk]);

  const placementItems = useMemo(() => {
    return [
      {
        key: 'department',
        label: 'Department',
        value: placementSummary.departmentName || 'Not Assigned',
      },
      {
        key: 'class',
        label: 'Class',
        value: placementSummary.className || 'Not Assigned',
      },
      {
        key: 'section',
        label: 'Section',
        value: placementSummary.sectionName || 'Not Assigned',
      },
      {
        key: 'group',
        label: 'Group',
        value: placementSummary.groupName || 'Not Assigned',
      },
      {
        key: 'room',
        label: 'Room',
        value: placementSummary.roomName || 'Not Assigned',
      },
    ];
  }, [placementSummary]);

  // Cascading handler when Department changes
  const handleDepartmentChange = (deptId: string) => {
    const cleanDept = sanitizeId(deptId) || '';
    setTargetDepartmentId(cleanDept);
    if (targetClassId && cleanDept) {
      const clsObj = classes.find((c: any) => String(c.id) === String(targetClassId));
      const classDept =
        clsObj?.department?.id ||
        clsObj?.department_id ||
        (typeof clsObj?.department === 'string' ? clsObj?.department : '');
      if (classDept && String(classDept) !== String(cleanDept)) {
        setTargetClassId('');
        setTargetSectionId('');
        setTargetGroupId('');
      }
    }
  };

  // Cascading handler when Class changes
  const handleClassChange = (cid: string) => {
    const cleanClass = sanitizeId(cid) || '';
    setTargetClassId(cleanClass);
    setTargetSectionId('');
    setTargetGroupId('');

    if (cleanClass && classes.length > 0) {
      const clsObj = classes.find((c: any) => String(c.id) === String(cleanClass));
      const classDept =
        clsObj?.department?.id ||
        clsObj?.department_id ||
        (typeof clsObj?.department === 'string' ? clsObj?.department : '');
      if (classDept && !targetDepartmentId) {
        setTargetDepartmentId(String(classDept));
      }
    }
  };

  // Cascading handler when Section changes
  const handleSectionChange = (sid: string) => {
    setTargetSectionId(sanitizeId(sid) || '');
    setTargetGroupId('');
  };

  const hasAnyDestinationSelected =
    Boolean(sanitizeId(targetDepartmentId)) ||
    Boolean(sanitizeId(targetClassId)) ||
    Boolean(sanitizeId(targetSectionId)) ||
    Boolean(sanitizeId(targetGroupId)) ||
    Boolean(sanitizeId(targetRoomId));

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();

    const sanitizedDeptId = sanitizeId(targetDepartmentId);
    const sanitizedClassId = sanitizeId(targetClassId);
    const sanitizedSectionId = sanitizeId(targetSectionId);
    const sanitizedGroupId = sanitizeId(targetGroupId);
    const sanitizedRoomId = sanitizeId(targetRoomId);

    if (
      !sanitizedDeptId &&
      !sanitizedClassId &&
      !sanitizedSectionId &&
      !sanitizedGroupId &&
      !sanitizedRoomId
    ) {
      showToast(
        'Please select at least one destination (Department, Class, Section, Group, or Room).',
        'warning'
      );
      return;
    }

    const finalReason =
      transitionReason.trim() || initialReasonTemplates[0] || 'Academic Placement Transfer';
    const basePayload = {
      target_department_id: sanitizedDeptId,
      target_class_id: sanitizedClassId,
      target_section_id: sanitizedSectionId,
      target_group_id: sanitizedGroupId,
      target_room_id: sanitizedRoomId,
      transition_date: transitionDate,
      transition_reason: finalReason,
    };

    setSubmitting(true);

    try {
      if (effectiveIsBulk) {
        // Bulk Transfer Action
        const payload = {
          action: 'transfer',
          student_ids: studentIds,
          ...basePayload,
        };

        const res = await fetchWithAuth('/api/v1/students/bulk-action/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          showToast(
            `Successfully transferred ${studentIds.length} students with academic placement recorded!`,
            'success'
          );
          window.dispatchEvent(new CustomEvent('spr_students_updated'));
          window.dispatchEvent(new CustomEvent('spr_student_transferred'));
          onSuccess?.();
          onClose();
        } else {
          const err = await res.json().catch(() => ({}));
          const msg =
            err.error ||
            err.detail ||
            (typeof err === 'object' ? Object.values(err)[0] : 'Failed to transfer students.');
          showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
        }
      } else {
        // Single Student Transfer Action
        const targetStudentId =
          student?.id ||
          (Array.isArray(studentIds) && studentIds.length === 1 ? studentIds[0] : null);

        if (!targetStudentId) {
          showToast('No student record selected for transfer.', 'error');
          return;
        }

        const res = await fetchWithAuth(
          `/api/v1/students/${targetStudentId}/transfer-academic/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(basePayload),
          }
        );

        if (res.ok) {
          const data = await res.json();
          showToast(
            data.message || `Student academic placement transferred successfully!`,
            'success'
          );
          window.dispatchEvent(new CustomEvent('spr_students_updated'));
          window.dispatchEvent(new CustomEvent('spr_student_transferred'));
          onSuccess?.();
          onClose();
        } else {
          const err = await res.json().catch(() => ({}));
          const msg =
            err.error ||
            err.detail ||
            (typeof err === 'object' ? Object.values(err)[0] : 'Failed to transfer student.');
          showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
        }
      }
    } catch {
      showToast('Network error during academic transfer.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const singleStudentName = student?.name_en || student?.name || 'Student';
  const singleStudentId =
    student?.student_id_card_number ||
    student?.uniq_id ||
    student?.unique_id ||
    (student?.id ? `ID: ${student.id}` : '');

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="@container space-y-6 pt-2">
        {/* ─── 1. Identity & Current Placement Banner ─── */}
        <div className="p-4 rounded-2xl theme-bg-surface border-0 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft text-base font-bold theme-accent flex items-center justify-center shrink-0 shadow-xs">
              {effectiveIsBulk ? (
                <UsersIcon className="w-6 h-6" />
              ) : (
                singleStudentName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold theme-text-primary text-sm truncate leading-tight">
                {effectiveIsBulk
                  ? `Bulk Academic Transfer (${activeStudentCount} Students)`
                  : singleStudentName}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {!effectiveIsBulk && singleStudentId && (
                  <span className="text-[11px] font-mono theme-text-secondary truncate select-all">
                    {singleStudentId}
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider theme-bg-sub theme-text-primary">
                  {effectiveIsBulk ? `${activeStudentCount} Selected` : 'Active Record'}
                </span>
              </div>
            </div>
          </div>

          {/* Current Placement Details Grid */}
          <div className="pt-2 border-t theme-border/60">
            <div className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary opacity-75 mb-2">
              Current Academic Placement
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {placementItems.map((item) => (
                <div key={item.key} className="p-2 rounded-xl theme-bg-app border-0">
                  <span className="text-[10px] font-medium uppercase tracking-wider theme-text-secondary block">
                    {item.label}
                  </span>
                  <span className="font-semibold theme-text-primary truncate block mt-0.5">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── 2. Institutional Audit Notice ─── */}
        <div className="p-3.5 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 border-0 flex items-start gap-3">
          <InfoIcon className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs text-sky-800 dark:text-sky-200 leading-relaxed">
            <span className="font-semibold block mb-0.5">Academic Placement Integrity</span>
            Reallocating a student to a new department, class, or section preserves historical attendance registers,
            lesson recitations, and assessment marksheets in their respective sessions.
          </div>
        </div>

        {/* ─── 3. Destination Academic Hierarchy ─── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <DepartmentIcon className="w-4 h-4 theme-accent shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Destination Academic Hierarchy
            </span>
          </div>

          {/* Complementary Row 1: Department & Class (Container responsive @[480px]:grid-cols-2) */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <div>
              <DepartmentSelect
                label="Destination Department"
                departments={departments}
                value={targetDepartmentId}
                onChange={handleDepartmentChange}
                allowAll={true}
                allLabel="Keep Current Department"
                placeholder="Keep Current Department"
                icon={DepartmentIcon}
              />
            </div>

            <div>
              <ClassSelect
                label="Destination Class"
                value={targetClassId}
                onChange={handleClassChange}
                classes={classes}
                departmentId={targetDepartmentId || undefined}
                disabled={false}
                allowAll={true}
                allLabel="Keep Current Class"
                placeholder="Keep Current Class"
                icon={ClassIcon}
              />
            </div>
          </div>

          {/* Complementary Row 2: Section & Group (Shown when class is selected) */}
          {Boolean(targetClassId) && (availableSections.length > 0 || effectiveAvailableGroups.length > 0) && (
            <div
              className={`grid grid-cols-1 ${
                availableSections.length > 0 && effectiveAvailableGroups.length > 0
                  ? '@[480px]:grid-cols-2'
                  : ''
              } gap-3.5 animate-fade-in`}
            >
              {availableSections.length > 0 && (
                <div>
                  <SectionSelect
                    label="Destination Section"
                    value={targetSectionId}
                    onChange={handleSectionChange}
                    classId={targetClassId}
                    sections={availableSections}
                    allowAll={true}
                    allLabel="Keep Current Section"
                    optional={false}
                    placeholder="Keep Current Section"
                    icon={SectionIcon}
                  />
                </div>
              )}

              {effectiveAvailableGroups.length > 0 && (
                <div>
                  <GroupSelect
                    label="Destination Group / Halqa"
                    value={targetGroupId}
                    onChange={(gid: string) => setTargetGroupId(gid)}
                    classId={targetClassId}
                    sectionId={targetSectionId || undefined}
                    groups={effectiveAvailableGroups}
                    allowAll={true}
                    allLabel="Keep Current Group"
                    placeholder="Keep Current Group"
                    icon={GroupIcon}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── 4. Residential & Lifecycle Details ─── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <BuildingOfficeIcon className="w-4 h-4 theme-accent shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Residential & Transition Schedule
            </span>
          </div>

          {/* Complementary Row 3: Dormitory Room & Effective Date (Container responsive @[480px]:grid-cols-2) */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <div>
              <DormitoryRoomSelect
                label="Dormitory Room"
                value={targetRoomId}
                onChange={(rid: string) => setTargetRoomId(rid)}
                searchable={false}
                allowAll={true}
                allLabel="Keep Current Room"
                placeholder="Keep Current Room"
              />
            </div>

            <div>
              <ReusableCalendar
                label="Effective Transition Date"
                selectedDate={transitionDate}
                onSelectDate={(dateStr: string) => setTransitionDate(dateStr)}
                required={true}
                placeholder="Select Effective Date"
                className="w-full"
              />
            </div>
          </div>

          {/* Full Width Row 4: Transition Reason with TemplateTextarea */}
          <div>
            <label className="block text-xs font-medium theme-text-secondary mb-1">
              Official Transfer Reason / Justification
            </label>
            <TemplateTextarea
              label="Transfer Reason"
              value={transitionReason}
              onChange={(val: string) => setTransitionReason(val)}
              category="student_transfer_reasons"
              templateCategory="student_transfer_reasons"
              templateNamespace="student_transfer_reasons"
              initialTemplates={initialReasonTemplates}
              mode="replace"
              placeholder="Enter transfer reason or select from saved templates..."
              rows={3}
              showClear={true}
              showSave={true}
              showSaved={true}
              showSearch={true}
              showCount={true}
              showEdit={true}
              showDelete={true}
            />
          </div>
        </div>

        {/* ─── 5. Reusable Drawer Footer ─── */}
        <DrawerFooter
          saveLabel={
            submitting
              ? 'Processing Transfer...'
              : effectiveIsBulk
              ? `Transfer ${activeStudentCount} Students`
              : 'Confirm Transfer'
          }
          saveIcon={TransferIcon}
          cancelLabel="Cancel"
          isSubmitting={submitting}
          isSaveDisabled={submitting || !hasAnyDestinationSelected}
          onCancel={onClose}
        />
      </form>
    </DrawerContainer>
  );
}

export default StudentTransferDrawer;
