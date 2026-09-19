import React, { useState, useEffect, useMemo } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import { useTenant } from "../../../context/TenantContext";
import {
  TransferIcon,
  DepartmentIcon,
  ClassIcon,
  SectionIcon,
  GroupIcon,
  UsersIcon,
} from "../../../components/ui/Icons";
import Modal from "../../../components/ui/Modal";
import CustomSelect from "../../../components/ui/CustomSelect";
import CustomInput from "../../../components/ui/CustomInput";
import TemplateTextarea from "../../../components/ui/TemplateTextarea";
import ReusableCalendar from "../../../components/common/ReusableCalendar";
import {
  DepartmentSelect,
  ClassSelect,
  SectionSelect,
  GroupSelect,
  DormitoryRoomSelect,
} from "../../../components/selectors";
import { transferReasonsStore } from "../../../utils/localStore";

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

  const [classes, setClasses] = useState<any[]>([]);
  const [loadedStudents, setLoadedStudents] = useState<any[]>([]);
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>("");
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [targetSectionId, setTargetSectionId] = useState<string>("");
  const [targetGroupId, setTargetGroupId] = useState<string>("");
  const [targetRoomId, setTargetRoomId] = useState<string>("");
  const [availableSections, setAvailableSections] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [loadingStructure, setLoadingStructure] = useState<boolean>(false);
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

  // Load student records for accurate placement metadata
  useEffect(() => {
    if (!isOpen) return;

    if (student) {
      setLoadedStudents([student]);
      return;
    }

    if (Array.isArray(studentIds) && studentIds.length > 0) {
      if (selectedStudents && selectedStudents.length >= studentIds.length) {
        setLoadedStudents(selectedStudents);
      } else {
        // Fetch student records for these specific IDs
        fetchWithAuth(`/api/v1/students/?page_size=500&all=true`)
          .then((res) => res.json())
          .then((data) => {
            const allList = Array.isArray(data) ? data : data.results || [];
            const idStrings = studentIds.map(String);
            const matched = allList.filter((s: any) => idStrings.includes(String(s.id)));
            setLoadedStudents(matched.length > 0 ? matched : selectedStudents || []);
          })
          .catch(() => {
            setLoadedStudents(selectedStudents || []);
          });
      }
    }
  }, [isOpen, student, studentIds, selectedStudents]);

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

  useEffect(() => {
    if (isOpen) {
      loadClasses();
      setTransitionDate(getTodayDate());
      setTransitionReason(initialReasonTemplates[0] || "");
      setTargetDepartmentId("");
      setTargetClassId("");
      setTargetSectionId("");
      setTargetGroupId("");
      setTargetRoomId("");
      setAvailableSections([]);
      setAvailableGroups([]);
    }
  }, [isOpen, student, initialReasonTemplates]);

  // Dynamically load available sections and groups for selected destination class
  useEffect(() => {
    if (!targetClassId || targetClassId === "ALL") {
      setAvailableSections([]);
      setAvailableGroups([]);
      setTargetSectionId("");
      setTargetGroupId("");
      return;
    }

    let isMounted = true;
    setLoadingStructure(true);

    Promise.allSettled([
      fetchWithAuth(`/api/v1/academy/sections/?class=${targetClassId}&page_size=500&all=true`),
      fetchWithAuth(`/api/v1/groups/?student_class=${targetClassId}&page_size=500&all=true`),
    ]).then(([secRes, grpRes]) => {
      if (!isMounted) return;
      if (secRes.status === "fulfilled" && secRes.value?.ok) {
        secRes.value
          .json()
          .then((data) => {
            const list = Array.isArray(data) ? data : data.results || [];
            if (isMounted) setAvailableSections(list);
          })
          .catch(() => {
            if (isMounted) setAvailableSections([]);
          });
      } else {
        setAvailableSections([]);
      }

      if (grpRes.status === "fulfilled" && grpRes.value?.ok) {
        grpRes.value
          .json()
          .then((data) => {
            const list = Array.isArray(data) ? data : data.results || [];
            if (isMounted) setAvailableGroups(list);
          })
          .catch(() => {
            if (isMounted) setAvailableGroups([]);
          });
      } else {
        setAvailableGroups([]);
      }
      setLoadingStructure(false);
    });

    return () => {
      isMounted = false;
    };
  }, [targetClassId]);

  const loadClasses = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/classes/?page_size=500&all=true");
      if (res.ok) {
        const cData = await res.json();
        setClasses(Array.isArray(cData) ? cData : cData.results || []);
      }
    } catch {}
  };

  if (!isOpen) return null;

  // Cascading handler when Department changes
  const handleDepartmentChange = (deptId: string) => {
    setTargetDepartmentId(deptId);
    setTargetClassId("");
    setTargetSectionId("");
    setTargetGroupId("");
    setAvailableSections([]);
    setAvailableGroups([]);
  };

  // Cascading handler when Class changes
  const handleClassChange = (cid: string) => {
    setTargetClassId(cid);
    setTargetSectionId("");
    setTargetGroupId("");
  };

  // Cascading handler when Section changes
  const handleSectionChange = (sid: string) => {
    setTargetSectionId(sid);
    setTargetGroupId("");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();

    if (
      !targetDepartmentId &&
      !targetClassId &&
      !targetSectionId &&
      !targetGroupId &&
      !targetRoomId
    ) {
      showToast(
        "Please select at least one destination (Department, Class, Section, Group, or Dormitory Room).",
        "warning"
      );
      return;
    }

    const finalReason = transitionReason.trim() || initialReasonTemplates[0] || "";

    setSubmitting(true);

    try {
      if (isBulk) {
        // Bulk Transfer Action
        const payload = {
          action: "transfer",
          student_ids: studentIds,
          target_department_id: targetDepartmentId || null,
          target_class_id: targetClassId || null,
          target_section_id: targetSectionId || null,
          target_group_id: targetGroupId || null,
          target_room_id: targetRoomId || null,
          transition_date: transitionDate,
          transition_reason: finalReason,
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
          showToast(err.error || err.detail || "Failed to transfer students.", "error");
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

        const payload = {
          target_department_id: targetDepartmentId || null,
          target_class_id: targetClassId || null,
          target_section_id: targetSectionId || null,
          target_group_id: targetGroupId || null,
          target_room_id: targetRoomId || null,
          transition_date: transitionDate,
          transition_reason: finalReason,
        };

        const res = await fetchWithAuth(
          `/api/v1/students/${targetStudentId}/transfer-academic/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
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
          const msg = err.error || err.detail || "Failed to transfer student.";
          showToast(msg, "error");
        }
      }
    } catch {
      showToast("Network error during academic transfer.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const hasAnyDestinationSelected =
    Boolean(targetDepartmentId) ||
    Boolean(targetClassId) ||
    Boolean(targetSectionId) ||
    Boolean(targetGroupId) ||
    Boolean(targetRoomId);

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
      <div className="p-5 sm:p-6 space-y-5 text-left">
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
                disabled={!targetDepartmentId}
                allowAll={true}
                allLabel="Keep Current"
                placeholder={!targetDepartmentId ? "Select Department first" : "Keep Current"}
                icon={ClassIcon}
              />
            </div>
          </div>

          {/* Row 2: Destination Section & Group (Shown ONLY if Class is selected and has sections/groups) */}
          {Boolean(targetClassId) && (availableSections.length > 0 || availableGroups.length > 0) && (
            <div
              className={`grid grid-cols-1 ${
                availableSections.length > 0 && availableGroups.length > 0
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

              {availableGroups.length > 0 && (
                <div>
                  <GroupSelect
                    label="Group"
                    value={targetGroupId}
                    onChange={(gid: string) => setTargetGroupId(gid)}
                    classId={targetClassId}
                    sectionId={targetSectionId || undefined}
                    groups={availableGroups}
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
