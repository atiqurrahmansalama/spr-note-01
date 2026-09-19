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

interface UseStudentTableColumnsOptions {
  onNavigateProfile: (id: string | number) => void;
  onEditStudent?: (student: StudentRecord) => void;
  onTransferStudent: (student: StudentRecord) => void;
  onDeleteStudent: (id: string | number, name?: string) => void;
}

export function useStudentTableColumns({
  onNavigateProfile,
  onEditStudent,
  onTransferStudent,
  onDeleteStudent,
}: UseStudentTableColumnsOptions) {
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
        headerClassName: "text-left",
        align: "left",
        render: (s: StudentRecord) => {
          const fatherName =
            s.details?.father_name ||
            s.father_name ||
            s.details?.guardian_name ||
            s.guardian_name;

          return (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl theme-bg-accent-soft text-xs font-bold theme-accent flex items-center justify-center border theme-border shrink-0 shadow-xs">
                {s.name_en
                  ? s.name_en.charAt(0).toUpperCase()
                  : s.name
                  ? s.name.charAt(0).toUpperCase()
                  : "S"}
              </div>
              <div className="min-w-0">
                <span className="font-bold theme-text-primary text-xs sm:text-sm truncate block leading-tight">
                  {s.name_en || s.name}
                </span>
                {fatherName && (
                  <span className="text-[11px] theme-text-secondary block mt-0.5 truncate">
                    {fatherName}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "class",
        header: "CLASS",
        headerClassName: "text-left",
        align: "left",
        render: (s: StudentRecord) => (
          <div className="text-left truncate text-xs">
            <span className="theme-accent font-bold">
              {s.student_class_name ||
                (typeof s.student_class === "object" ? s.student_class?.name : null) ||
                "General"}
            </span>
          </div>
        ),
      },
      {
        key: "guardian",
        header: "GUARDIAN",
        headerClassName: "text-center",
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
        headerClassName: "text-center",
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
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : isAlumni
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
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
        headerClassName: "w-20 text-center",
        render: (s: StudentRecord) => (
          <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
            <ActionMenu items={getActionMenuItems(s)} />
          </div>
        ),
      },
    ],
    [getActionMenuItems]
  );

  return {
    tableColumns,
    getActionMenuItems,
  };
}
