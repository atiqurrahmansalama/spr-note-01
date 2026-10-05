import React, { useMemo } from "react";
import ActionMenu from "../../../../components/ui/ActionMenu";
import {
  SearchIcon,
  EditIcon,
  TransferIcon,
  TrashIcon,
  WhatsAppIcon,
} from "../../../../components/ui/Icons";
import { StudentRecord } from "../types";

export interface SectionGroupItem {
  label: string;
  isUnassigned: boolean;
}

export interface StudentClassDetails {
  className: string;
  parts: SectionGroupItem[];
}

export function getStudentClassDetails(
  s: StudentRecord,
  classesMap: Map<string, any>,
  sectionsByClassMap: Map<string, any[]>,
  groupsByClassMap: Map<string, any[]>
): StudentClassDetails {
  const classId = String(
    s.student_class_id ||
    (typeof s.student_class === "object" ? s.student_class?.id : s.student_class) ||
    ""
  );

  const classNameFromRecord =
    s.student_class_name ||
    s.class_name ||
    (typeof s.student_class === "object" ? s.student_class?.name : null) ||
    "";

  // Find class by ID or fallback by name
  const classObj =
    (classId ? classesMap.get(classId) : null) ||
    (classNameFromRecord ? classesMap.get(classNameFromRecord.toLowerCase()) : null);

  const resolvedClassId = classObj ? String(classObj.id) : classId;
  const className = classObj?.name || classNameFromRecord || "General";

  // Check if class has sections configured (must have active sections created or positive count)
  const classSectionsList = resolvedClassId ? sectionsByClassMap.get(resolvedClassId) || [] : [];
  const classHasSections = Boolean(
    classSectionsList.length > 0 ||
    (classObj && typeof classObj.section_count === "number" && classObj.section_count > 0)
  );

  // Check if class has groups configured (must have active groups created or positive count)
  const classGroupsList = resolvedClassId ? groupsByClassMap.get(resolvedClassId) || [] : [];
  const classHasGroups = Boolean(
    classGroupsList.length > 0 ||
    (classObj && typeof classObj.group_count === "number" && classObj.group_count > 0)
  );

  // Student's assigned section
  let assignedSection = (
    s.section_name ||
    s.student_section_name ||
    (typeof s.section === "object" ? s.section?.section_name || s.section?.name : "") ||
    ""
  ).trim();

  // Student's assigned group
  let assignedGroup = (
    s.student_group_name ||
    s.group_name ||
    (typeof s.student_group === "object" ? s.student_group?.name : "") ||
    ""
  ).trim();

  // If section and group names are identical (e.g. legacy dirty seed data where section name was copied into group_name)
  if (assignedSection && assignedGroup && assignedSection.toLowerCase() === assignedGroup.toLowerCase()) {
    const hasSectionFk = Boolean(s.section_id || s.section || s.student_section);
    const hasGroupFk = Boolean(s.student_group_id || s.student_group);
    if (hasSectionFk && !hasGroupFk) {
      assignedGroup = "";
    } else if (hasGroupFk && !hasSectionFk) {
      assignedSection = "";
    } else if (!classHasGroups && classHasSections) {
      assignedGroup = "";
    } else if (!classHasSections && classHasGroups) {
      assignedSection = "";
    }
  }

  const parts: SectionGroupItem[] = [];

  // Section Part
  if (classHasSections || assignedSection) {
    if (assignedSection) {
      parts.push({
        label: assignedSection.toLowerCase().startsWith("sec") ? assignedSection : `Section: ${assignedSection}`,
        isUnassigned: false,
      });
    } else {
      parts.push({
        label: "No Section Assigned",
        isUnassigned: true,
      });
    }
  }

  // Group Part
  if (classHasGroups || assignedGroup) {
    if (assignedGroup) {
      parts.push({
        label:
          assignedGroup.toLowerCase().startsWith("grp") || assignedGroup.toLowerCase().startsWith("group")
            ? assignedGroup
            : `Group: ${assignedGroup}`,
        isUnassigned: false,
      });
    } else {
      parts.push({
        label: "No Group Assigned",
        isUnassigned: true,
      });
    }
  }

  return {
    className,
    parts,
  };
}

interface UseStudentTableColumnsOptions {
  classes?: any[];
  groups?: any[];
  sections?: any[];
  onNavigateProfile: (id: string | number) => void;
  onEditStudent?: (student: StudentRecord) => void;
  onTransferStudent: (student: StudentRecord) => void;
  onDeleteStudent: (id: string | number, name?: string) => void;
}

export function useStudentTableColumns({
  classes = [],
  groups = [],
  sections = [],
  onNavigateProfile,
  onEditStudent,
  onTransferStudent,
  onDeleteStudent,
}: UseStudentTableColumnsOptions) {
  // Build fast indexed maps for classes, sections, and groups
  const classesMap = useMemo(() => {
    const map = new Map<string, any>();
    classes.forEach((c) => {
      if (c && c.id) map.set(String(c.id), c);
      if (c && c.name) map.set(String(c.name).toLowerCase(), c);
    });
    return map;
  }, [classes]);

  const sectionsByClassMap = useMemo(() => {
    const map = new Map<string, any[]>();
    sections.forEach((sec) => {
      const cId = String(
        sec.student_class_id ||
        (typeof sec.student_class === "object" ? sec.student_class?.id : sec.student_class) ||
        ""
      );
      if (cId) {
        const list = map.get(cId) || [];
        list.push(sec);
        map.set(cId, list);
      }
    });
    return map;
  }, [sections]);

  const groupsByClassMap = useMemo(() => {
    const map = new Map<string, any[]>();
    groups.forEach((grp) => {
      const cId = String(
        grp.student_class_id ||
        (typeof grp.student_class === "object" ? grp.student_class?.id : grp.student_class) ||
        ""
      );
      if (cId) {
        const list = map.get(cId) || [];
        list.push(grp);
        map.set(cId, list);
      }
    });
    return map;
  }, [groups]);

  const getActionMenuItems = useMemo(
    () => (s: StudentRecord) => [
      {
        label: "View Profile",
        icon: SearchIcon,
        onClick: () => onNavigateProfile(s.id),
      },
      {
        label: "Edit Student",
        icon: EditIcon,
        onClick: () => (onEditStudent ? onEditStudent(s) : onNavigateProfile(s.id)),
      },
      {
        label: "Academic Transfer",
        icon: TransferIcon,
        onClick: () => onTransferStudent(s),
      },
      { divider: true },
      {
        label: "Delete Record",
        icon: TrashIcon,
        danger: true,
        onClick: () => onDeleteStudent(s.id, s.name_en || s.name),
      },
    ],
    [onNavigateProfile, onEditStudent, onTransferStudent, onDeleteStudent]
  );

  const tableColumns = useMemo(
    () => [
      {
        key: "name",
        header: "NAME",
        headerClassName: "text-left min-w-[180px] w-[36%]",
        cellClassName: "min-w-[180px] w-[30%] text-left",
        align: "left",
        render: (s: StudentRecord) => {
          const studentId =
            s.student_id_card_number ||
            s.uniq_id ||
            s.unique_id ||
            (s.id ? `ID: ${s.id}` : "");

          return (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl theme-bg-accent-soft text-xs font-bold theme-accent flex items-center justify-center border theme-border shrink-0 shadow-xs">
                {s.name_en
                  ? s.name_en.charAt(0).toUpperCase()
                  : s.name
                  ? s.name.charAt(0).toUpperCase()
                  : "S"}
              </div>
              <div className="min-w-0 text-left">
                <span className="font-bold theme-text-primary text-xs sm:text-sm truncate block leading-tight">
                  {s.name_en || s.name}
                </span>
                {studentId && (
                  <span className="text-[11px] font-mono theme-text-secondary block mt-0.5 truncate select-all">
                    {studentId}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "class",
        header: "CLASS & SECTION",
        headerClassName: "text-left min-w-[170px] w-[32%]",
        cellClassName: "min-w-[170px] w-[32%] text-left",
        align: "left",
        render: (s: StudentRecord) => {
          const { className, parts } = getStudentClassDetails(
            s,
            classesMap,
            sectionsByClassMap,
            groupsByClassMap
          );

          return (
            <div className="text-left text-xs min-w-0">
              <span className="theme-accent font-bold truncate block">
                {className}
              </span>
              {parts.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-[11px] leading-tight">
                  {parts.map((p, pIdx) => (
                    <React.Fragment key={pIdx}>
                      {pIdx > 0 && (
                        <span className="text-zinc-400 dark:text-zinc-600 select-none">•</span>
                      )}
                      <span
                        className={
                          p.isUnassigned
                            ? "text-zinc-400 dark:text-zinc-500 italic font-normal"
                            : "theme-text-secondary font-medium"
                        }
                      >
                        {p.label}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "guardian",
        header: "GUARDIAN",
        headerClassName: "text-center w-36 min-w-[130px]",
        cellClassName: "text-center w-36 min-w-[130px]",
        align: "center",
        render: (s: StudentRecord) => (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center gap-2">
            {s.details?.guardian_phone ? (
              <>
                <span className="font-mono text-xs font-semibold theme-text-primary">
                  {s.details.guardian_phone}
                </span>
                <a
                  href={`https://wa.me/${s.details.guardian_phone.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:scale-110 transition-transform inline-flex items-center"
                  title="Contact on WhatsApp"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <span className="text-zinc-500 text-xs italic">Unspecified</span>
            )}
          </div>
        ),
      },
      {
        key: "status",
        header: "STATUS",
        headerClassName: "text-center w-28 min-w-[95px]",
        cellClassName: "text-center w-28 min-w-[95px]",
        align: "center",
        render: (s: StudentRecord) => {
          const status = (s.status || "Active").toUpperCase();
          const isActive = status === "ACTIVE";
          const isAlumni = status === "ALUMNI" || status === "TC";

          return (
            <div className="flex justify-center">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                  isActive
                    ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20"
                    : isAlumni
                    ? "theme-bg-sub theme-text-primary theme-border"
                    : "theme-bg-sub theme-text-secondary theme-border"
                }`}
              >
                {s.status || "Active"}
              </span>
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "ACTIONS",
        align: "center",
        headerClassName: "text-center w-16 min-w-[65px]",
        cellClassName: "text-center w-16 min-w-[65px]",
        render: (s: StudentRecord) => (
          <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
            <ActionMenu items={getActionMenuItems(s)} />
          </div>
        ),
      },
    ],
    [getActionMenuItems, classesMap, sectionsByClassMap, groupsByClassMap]
  );

  return {
    tableColumns,
    getActionMenuItems,
  };
}
