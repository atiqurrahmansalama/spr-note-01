import React from "react";
import ActionMenu from "../../../../components/ui/ActionMenu";
import { WhatsAppIcon } from "../../../../components/ui/Icons";
import { StudentRecord } from "../types";
import { getStudentClassDetails } from "../hooks/useStudentTableColumns";

interface StudentCardProps {
  student: StudentRecord;
  onNavigateProfile: (id: string | number) => void;
  actionMenuItems: any[];
  isHighlighted?: boolean;
  classesMap?: Map<string, any>;
  sectionsByClassMap?: Map<string, any[]>;
  groupsByClassMap?: Map<string, any[]>;
}

export default function StudentCard({
  student: s,
  onNavigateProfile,
  actionMenuItems,
  isHighlighted = false,
  classesMap = new Map(),
  sectionsByClassMap = new Map(),
  groupsByClassMap = new Map(),
}: StudentCardProps) {
  const studentId =
    s.student_id_card_number ||
    s.uniq_id ||
    s.unique_id ||
    (s.id ? `ID: ${s.id}` : "");

  const { className, parts } = getStudentClassDetails(
    s,
    classesMap,
    sectionsByClassMap,
    groupsByClassMap
  );

  return (
    <div
      id={`student-card-${s.id}`}
      data-card-id={s.id}
      onClick={() => onNavigateProfile(s.id)}
      className={`rounded-2xl theme-bg-surface border theme-border p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 cursor-pointer group ${
        isHighlighted ? "theme-row-highlight shadow-md" : ""
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft text-sm font-bold theme-accent flex items-center justify-center border theme-border shrink-0 shadow-xs">
              {s.name_en
                ? s.name_en.charAt(0).toUpperCase()
                : s.name
                ? s.name.charAt(0).toUpperCase()
                : "S"}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <h3 className="font-bold theme-text-primary text-sm truncate leading-tight">
                {s.name_en || s.name}
              </h3>
              {studentId && (
                <p className="text-[11px] font-mono theme-text-secondary truncate mt-0.5 select-all">
                  {studentId}
                </p>
              )}
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={actionMenuItems} />
          </div>
        </div>

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
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="pt-3 border-t theme-border flex items-center justify-between text-xs"
      >
        {s.details?.guardian_phone ? (
          <div className="flex items-center gap-1.5 font-mono text-[11px] theme-text-primary">
            <span>{s.details.guardian_phone}</span>
            <a
              href={`https://wa.me/${s.details.guardian_phone.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:scale-110 transition-transform inline-flex items-center"
              title="Contact on WhatsApp"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <span className="text-[11px] text-zinc-500 italic">No phone</span>
        )}

        <span className="text-[10px] font-bold theme-accent">View Profile &rarr;</span>
      </div>
    </div>
  );
}
