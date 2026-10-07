import React, { useState, useEffect, useMemo } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import { useTenant } from "../../../context/TenantContext";
import { useAcademicData } from "../../../hooks/useAcademicData";
import {
  TransferIcon,
  DepartmentIcon,
  ClassIcon,
  SectionIcon,
  GroupIcon,
} from "../../../components/ui/Icons";
import Modal from "../../../components/ui/Modal";
import TemplateTextarea from "../../../components/ui/TemplateTextarea";
import ReusableCalendar from "../../../components/common/ReusableCalendar";
import {
  DepartmentSelect,
  ClassSelect,
  SectionSelect,
  GroupSelect,
  DormitoryRoomSelect,
} from "../../../components/selectors";
import { transferReasonsStore, students as studentStore } from "../../../utils/localStore";

const getTodayDate = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export interface StudentTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: any;
  studentIds?: (string | number)[];
  selectedStudents?: any[];
  onSuccess?: () => void;
}

export const StudentTransferModal: React.FC<StudentTransferModalProps> = ({
  isOpen,
  onClose,
  student = null,
  studentIds = [],
  selectedStudents = [],
  onSuccess,
}) => {
  const { showToast } = useToast() as any;
  const tenantContext = useTenant ? useTenant() : null;
  const activeTenantId = tenantContext?.activeTenantId || "default";

  // Instant pre-cached academic hierarchy
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
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>("");
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [targetSectionId, setTargetSectionId] = useState<string>("");
  const [targetGroupId, setTargetGroupId] = useState<string>("");
  const [targetRoomId, setTargetRoomId] = useState<string>("");
  const [extraGroups, setExtraGroups] = useState<any[]>([]);
  const [transitionDate, setTransitionDate] = useState<string>(getTodayDate());
  const [transitionReason, setTransitionReason] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [reasonsVersion, setReasonsVersion] = useState<number>(0);

  const isBulk = !student && Array.isArray(studentIds) && studentIds.length > 1;
  const activeStudentCount = isBulk
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
      str === "" ||
      str === "0" ||
      str.toUpperCase() === "ALL" ||
      str.toLowerCase() === "null" ||
      str.toLowerCase() === "undefined"
    ) {
      return null;
    }
    return str;
  };

  // Listen to Admin Tools transfer reasons changes reactively
  useEffect(() => {
    const handleReasonsUpdated = () => setReasonsVersion((v) => v + 1);
    window.addEventListener("spr_transfer_reasons_updated", handleReasonsUpdated);
    return () => window.removeEventListener("spr_transfer_reasons_updated", handleReasonsUpdated);
  }, []);

  // Dynamically load configured transfer reasons from Admin Tools store as initial templates
  const initialReasonTemplates = useMemo(() => {
    const list = transferReasonsStore.getReasons(activeTenantId);
    return list
      .filter((r: any) => r.is_active !== false && r.code !== "OTHER")
      .map((r: any) => r.name || r.code)
      .filter(Boolean);
  }, [activeTenantId, reasonsVersion]);

  // Load student records for accurate placement metadata with instant cache fallback
  useEffect(() => {
    if (!isOpen) return;

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
      const cached = (academicStudents || []).filter((s: any) => idStrings.includes(String(s.id)));
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
  }, [isOpen, student, studentIds, selectedStudents, academicStudents]);

  // Reset form inputs upon modal open
  useEffect(() => {
    if (isOpen) {
      setTransitionDate(getTodayDate());
      setTransitionReason(initialReasonTemplates[0] || "");
      setTargetDepartmentId("");
      setTargetClassId("");
      setTargetSectionId("");
      setTargetGroupId("");
      setTargetRoomId("");
      setExtraGroups([]);
    }
  }, [isOpen, initialReasonTemplates]);

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
        branchName: "--",
        departmentName: "--",
        className: "--",
        sectionName: "--",
        groupName: "--",
        roomName: "--",
        isMulti: isBulk,
      };
    }

    const getUniqueValues = (extractor: (s: any) => string | null | undefined): string[] => {
      const raw = list
        .map(extractor)
        .map((v) => (v ? String(v).trim() : ""))
        .filter(Boolean);
      return Array.from(new Set(raw));
    };

    const branches = getUniqueValues(
      (s) => s.branch_name || s.branch?.name || (typeof s.branch === "string" ? s.branch : "")
    );
    const depts = getUniqueValues(
      (s) =>
        s.department_name ||
        s.department?.name ||
        s.student_class_obj?.department_name ||
        (typeof s.department === "string" ? s.department : "")
    );
    const classes = getUniqueValues(
      (s) =>
        s.student_class_name ||
        s.class_name ||
        s.student_class?.name ||
        (typeof s.student_class === "string" ? s.student_class : "")
    );
    const sections = getUniqueValues(
      (s) => s.section_name || s.section?.name || (typeof s.section === "string" ? s.section : "")
    );
    const groups = getUniqueValues(
      (s) =>
        s.student_group_name ||
        s.group_name ||
        s.student_group?.name ||
        (typeof s.student_group === "string" ? s.student_group : "")
    );
    const rooms = getUniqueValues(
      (s) =>
        s.dormitory_room_name ||
        s.room_number ||
        s.dormitory_room?.name ||
        (typeof s.dormitory_room === "string" ? s.dormitory_room : "")
    );

    const formatSummaryField = (uniques: string[], pluralLabel: string) => {
      if (uniques.length === 0) return "Not Assigned";
      if (uniques.length === 1) return uniques[0];
      return `Multiple ${pluralLabel}`;
    };

    return {
      branchName: formatSummaryField(branches, "Campuses"),
      departmentName: formatSummaryField(depts, "Departments"),
      className: formatSummaryField(classes, "Classes"),
      sectionName: formatSummaryField(sections, "Sections"),
      groupName: formatSummaryField(groups, "Groups"),
      roomName: formatSummaryField(rooms, "Rooms"),
      isMulti: list.length > 1,
    };
  }, [student, loadedStudents, selectedStudents, isBulk]);

  // Reusable structured items for current placement display (All 6 fields always rendered)
  const placementItems = useMemo(() => {
    return [
      {
        key: "campus",
        label: "Campus",
        value: placementSummary.branchName || "Not Assigned",
        isMulti: Boolean(placementSummary.branchName?.includes("Multiple")),
      },
      {
        key: "department",
        label: "Department",
        value: placementSummary.departmentName || "Not Assigned",
        isMulti: Boolean(placementSummary.departmentName?.includes("Multiple")),
      },
      {
        key: "class",
        label: "Class",
        value: placementSummary.className || "Not Assigned",
        isMulti: Boolean(placementSummary.className?.includes("Multiple")),
      },
      {
        key: "section",
        label: "Section",
        value: placementSummary.sectionName || "Not Assigned",
        isMulti: Boolean(placementSummary.sectionName?.includes("Multiple")),
      },
      {
        key: "group",
        label: "Group",
        value: placementSummary.groupName || "Not Assigned",
        isMulti: Boolean(placementSummary.groupName?.includes("Multiple")),
      },
      {
        key: "room",
        label: "Room",
        value: placementSummary.roomName || "Not Assigned",
        isMulti: Boolean(placementSummary.roomName?.includes("Multiple")),
      },
    ];
  }, [placementSummary]);

  if (!isOpen) return null;

  // Cascading handler when Department changes
  const handleDepartmentChange = (deptId: string) => {
    const cleanDept = sanitizeId(deptId) || "";
    setTargetDepartmentId(cleanDept);
    // If current selected class doesn't belong to the newly selected department, reset class & children
    if (targetClassId && cleanDept) {
      const clsObj = classes.find((c: any) => String(c.id) === String(targetClassId));
      const classDept =
        clsObj?.department?.id ||
        clsObj?.department_id ||
        (typeof clsObj?.department === "string" ? clsObj?.department : "");
      if (classDept && String(classDept) !== String(cleanDept)) {
        setTargetClassId("");
        setTargetSectionId("");
        setTargetGroupId("");
      }
    }
  };

  // Cascading handler when Class changes
  const handleClassChange = (cid: string) => {
    const cleanClass = sanitizeId(cid) || "";
    setTargetClassId(cleanClass);
    setTargetSectionId("");
    setTargetGroupId("");

    // Auto sync department if not set and class has a department
    if (cleanClass && classes.length > 0) {
      const clsObj = classes.find((c: any) => String(c.id) === String(cleanClass));
      const classDept =
        clsObj?.department?.id ||
        clsObj?.department_id ||
        (typeof clsObj?.department === "string" ? clsObj?.department : "");
      if (classDept && !targetDepartmentId) {
        setTargetDepartmentId(String(classDept));
      }
    }
  };

  // Cascading handler when Section changes
  const handleSectionChange = (sid: string) => {
    setTargetSectionId(sanitizeId(sid) || "");
    setTargetGroupId("");
  };

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
        "Please select at least one destination (Department, Class, Section, Group, or Dormitory Room).",
        "warning"
      );
      return;
    }

    const finalReason = transitionReason.trim() || initialReasonTemplates[0] || "Academic Placement Transfer";
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
      if (isBulk) {
        // Bulk Transfer Action
        const payload = {
          action: "transfer",
          student_ids: studentIds,
          ...basePayload,
        };

        const res = await fetchWithAuth("/api/v1/students/bulk-action/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          showToast(
            `Successfully transferred ${studentIds.length} students with lifecycle progression recorded!`,
            "success"
          );
          onSuccess?.();
          onClose();
        } else {
          const err = await res.json().catch(() => ({}));
          const msg = err.error || err.detail || (typeof err === "object" ? Object.values(err)[0] : "Failed to transfer students.");
          showToast(typeof msg === "string" ? msg : JSON.stringify(msg), "error");
        }
      } else {
        // Single Student Transfer Action
        const targetStudentId =
          student?.id ||
          (Array.isArray(studentIds) && studentIds.length === 1 ? studentIds[0] : null);

        if (!targetStudentId) {
          showToast("No student record selected for transfer.", "error");
          return;
        }

        const res = await fetchWithAuth(
          `/api/v1/students/${targetStudentId}/transfer-academic/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(basePayload),
          }
        );

        if (res.ok) {
          const data = await res.json();
          showToast(
            data.message || `Student academic placement transferred successfully!`,
            "success"
          );
          onSuccess?.();
          onClose();
        } else {
          const err = await res.json().catch(() => ({}));
          const msg = err.error || err.detail || (typeof err === "object" ? Object.values(err)[0] : "Failed to transfer student.");
          showToast(typeof msg === "string" ? msg : JSON.stringify(msg), "error");
        }
      }
    } catch {
      showToast("Network error during academic transfer.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const hasAnyDestinationSelected =
    Boolean(sanitizeId(targetDepartmentId)) ||
    Boolean(sanitizeId(targetClassId)) ||
    Boolean(sanitizeId(targetSectionId)) ||
    Boolean(sanitizeId(targetGroupId)) ||
    Boolean(sanitizeId(targetRoomId));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isBulk ? (
          <span>
            Bulk Transfer Students{" "}
            <span className="font-normal text-xs sm:text-sm theme-text-secondary">
              ({activeStudentCount} Selected)
            </span>
          </span>
        ) : student?.name_en || student?.name ? (
          `Transfer Student: ${student.name_en || student.name}`
        ) : (
          `Transfer Student Academic Placement`
        )
      }
      icon={TransferIcon}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-sub transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !hasAnyDestinationSelected}
            className="px-5 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            <TransferIcon className="w-3.5 h-3.5" />
            <span>
              {submitting
                ? "Processing Transfer..."
                : isBulk
                ? `Transfer ${activeStudentCount} Students`
                : "Confirm Transfer"}
            </span>
          </button>
        </div>
      }
    >
      <div className="space-y-5 text-left">
        {/* Current Academic Placement Summary (Clean 2-Column Text Format) */}
        <div className="p-3.5 rounded-2xl theme-bg-sub/60 border theme-border space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider theme-text-primary">
              Current Placement
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs leading-relaxed">
            {placementItems.map((item) => {
              const isUnassigned =
                item.value === "Not Assigned" ||
                item.value === "--" ||
                item.value === "—" ||
                !item.value;
              return (
                <div key={item.key} className="flex items-center gap-1.5 min-w-0">
                  <span className="theme-text-secondary font-medium shrink-0">{item.label}:</span>
                  <span
                    className={`truncate ${
                      item.isMulti
                        ? "font-bold theme-accent"
                        : isUnassigned
                        ? "theme-text-muted font-normal"
                        : "theme-text-primary font-semibold"
                    }`}
                  >
                    {isUnassigned ? "Not Assigned" : item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 1: Academic Hierarchy Placement */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <DepartmentIcon className="w-4 h-4 theme-accent shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Destination Academic Hierarchy
            </span>
          </div>

          {/* Row 1: Destination Department & Academic Class */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <DepartmentSelect
                label="Department"
                departments={departments}
                value={targetDepartmentId}
                onChange={handleDepartmentChange}
                allowAll={true}
                allLabel="Keep Current"
                placeholder="Keep Current"
                icon={DepartmentIcon}
              />
            </div>

            <div>
              <ClassSelect
                label="Class"
                value={targetClassId}
                onChange={handleClassChange}
                classes={classes}
                departmentId={targetDepartmentId || undefined}
                disabled={false}
                allowAll={true}
                allLabel="Keep Current"
                placeholder="Keep Current"
                icon={ClassIcon}
              />
            </div>
          </div>

          {/* Row 2: Destination Section & Group (Shown ONLY if Class is selected and has sections/groups) */}
          {Boolean(targetClassId) && (availableSections.length > 0 || effectiveAvailableGroups.length > 0) && (
            <div
              className={`grid grid-cols-1 ${
                availableSections.length > 0 && effectiveAvailableGroups.length > 0
                  ? "sm:grid-cols-2"
                  : ""
              } gap-3.5 animate-fade-in`}
            >
              {availableSections.length > 0 && (
                <div>
                  <SectionSelect
                    label="Section"
                    value={targetSectionId}
                    onChange={handleSectionChange}
                    classId={targetClassId}
                    sections={availableSections}
                    allowAll={true}
                    allLabel="Keep Current"
                    optional={false}
                    placeholder="Keep Current"
                    icon={SectionIcon}
                  />
                </div>
              )}

              {effectiveAvailableGroups.length > 0 && (
                <div>
                  <GroupSelect
                    label="Group"
                    value={targetGroupId}
                    onChange={(gid: string) => setTargetGroupId(gid)}
                    classId={targetClassId}
                    sectionId={targetSectionId || undefined}
                    groups={effectiveAvailableGroups}
                    allowAll={true}
                    allLabel="Keep Current"
                    placeholder="Keep Current"
                    icon={GroupIcon}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Residential & Lifecycle Transition Details */}
        <div className="space-y-3.5 pt-1">
          {/* Row 3: Dormitory Room & Effective Transition Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <DormitoryRoomSelect
                label="Residential Room"
                value={targetRoomId}
                onChange={(rid: string) => setTargetRoomId(rid)}
                searchable={false}
                allowAll={true}
                allLabel="Keep Current"
                placeholder="Keep Current"
              />
            </div>

            <div>
              <ReusableCalendar
                label="Effective Transition Date"
                selectedDate={transitionDate}
                onSelectDate={(dateStr: string) => setTransitionDate(dateStr)}
                required={true}
                placeholder="Select Effective Date"
              />
            </div>
          </div>

          {/* Row 4: Transition Reason with Template Feature */}
          <div className="w-full">
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
      </div>
    </Modal>
  );
};

export default StudentTransferModal;
