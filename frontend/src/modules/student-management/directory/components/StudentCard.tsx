import React from "react";
import ActionMenu from "../../../../components/ui/ActionMenu";
import { WhatsAppIcon } from "../../../../components/ui/Icons";
import { StudentRecord } from "../types";

interface StudentCardProps {
  student: StudentRecord;
  onNavigateProfile: (id: string | number) => void;
  actionMenuItems: any[];
  isHighlighted?: boolean;
}

export default function StudentCard({
  student: s,
  onNavigateProfile,
  actionMenuItems,
  isHighlighted = false,
}: StudentCardProps) {
  const fatherName =
    s.details?.father_name ||
    s.father_name ||
    s.details?.guardian_name ||
    s.guardian_name;

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
            <div className="min-w-0 flex-1">
              <h3 className="font-bold theme-text-primary text-sm truncate">
                {s.name_en || s.name}
              </h3>
              {fatherName && (
                <p className="text-[11px] theme-text-secondary truncate">
                  {fatherName}
                </p>
              )}
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={actionMenuItems} />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="theme-accent font-bold">
            {s.student_class_name ||
              (typeof s.student_class === "object" ? s.student_class?.name : null) ||
              "General"}
          </span>
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
