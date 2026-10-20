import React from "react";
import { ReportItem } from "../types";
import {
  ResolvedStudentMeta,
  getPortions,
  getMistakes,
  getStucks,
} from "../utils/studentMetaResolver";

/**
 * Shared Student Info Cell
 * Displays student name, cloud sync status, roll number, and student ID.
 */
export function StudentInfoCell({
  name,
  meta,
  hasPendingSync = false,
  t,
}: {
  name: string;
  meta: ResolvedStudentMeta;
  hasPendingSync?: boolean;
  t: (key: string, fallback: string) => string;
}) {
  const hasRoll = Boolean(meta.roll && meta.roll !== "0");
  const hasId = Boolean(meta.studentId);

  return (
    <div className="space-y-0.5 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-bold theme-text-primary block break-words leading-tight">
          {name}
        </span>
        {hasPendingSync && (
          <span
            className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
            title="Pending Cloud Sync"
          />
        )}
      </div>
      <div className="text-[11px] theme-text-secondary font-mono flex flex-wrap items-center gap-1.5">
        {hasRoll && <span>{t("roll", "Roll")}: {meta.roll}</span>}
        {hasId && <span className="opacity-90">{t("id", "ID")}: {meta.studentId}</span>}
        {!hasRoll && !hasId && <span className="opacity-60">{meta.group}</span>}
      </div>
    </div>
  );
}

/**
 * Shared Academic Class, Department & Section Cell
 */
export function AcademicClassDeptCell({
  className,
  deptCode,
  sectionName,
  group,
}: {
  className?: string;
  deptCode?: string;
  sectionName?: string;
  group?: string;
}) {
  const hasDept = Boolean(deptCode && deptCode.trim() !== "");
  const hasSec = Boolean(sectionName && sectionName.trim() !== "");

  return (
    <div className="space-y-0.5 min-w-0">
      <span className="text-xs font-bold theme-text-primary block leading-snug break-words">
        {className || "General Class"}
      </span>
      <div className="flex items-center gap-1 text-[11px] font-mono flex-wrap">
        {hasDept ? (
          <span className="font-semibold theme-accent leading-tight break-words">
            {deptCode}
          </span>
        ) : (
          <span className="theme-text-secondary leading-tight break-words opacity-70">
            {group || "Standard"}
          </span>
        )}
        {hasSec && (
          <span className="theme-text-secondary leading-tight opacity-75">
            · {sectionName}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Shared Report Date & Time Cell
 */
export function ReportDateTimeCell({
  date,
  time,
}: {
  date?: string;
  time?: string;
}) {
  return (
    <div className="space-y-0.5 font-mono">
      <span className="text-xs font-semibold theme-text-primary block truncate">
        {date || "—"}
      </span>
      <span className="text-[11px] theme-text-secondary block truncate opacity-85">
        {time || "—"}
      </span>
    </div>
  );
}

/**
 * Shared Report Session & Pages Cell (Parent Row)
 */
export function ReportSessionPagesCell({
  sessionName,
  totalPages,
}: {
  sessionName?: string;
  totalPages?: number;
}) {
  return (
    <div className="space-y-0.5 flex flex-col items-center justify-center">
      <span className="text-xs font-semibold theme-accent truncate max-w-[130px] block">
        {sessionName || "General Session"}
      </span>
      <span className="text-[11px] font-mono font-bold theme-text-primary truncate block">
        {totalPages || 0} Pages
      </span>
    </div>
  );
}

/**
 * Shared Report Portions Cell
 * Displays session name, total pages, and detailed Juz/Page ranges.
 */
export function ReportPortionsCell({ report }: { report: ReportItem }) {
  const portions = getPortions(report);

  return (
    <div className="space-y-1 text-left min-w-0">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-bold theme-accent break-words leading-tight">
          {report.session_name || "General Session"}
        </span>
        <span className="text-[11px] font-mono font-semibold theme-text-secondary opacity-80 whitespace-nowrap">
          · {report.totalPages || 0} Pages
        </span>
      </div>
      {portions.length > 0 ? (
        <div className="space-y-0.5 text-xs font-mono max-h-24 overflow-y-auto pr-1">
          {portions.map((jp, idx) => {
            const rangesStr = Array.isArray(jp.ranges)
              ? jp.ranges
                  .map((r) => `Page ${r.start || r.page_start || 0}–${r.end || r.page_end || 0}`)
                  .join(", ")
              : "";
            return (
              <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                <span className="font-bold theme-accent shrink-0">Juz {jp.juz}:</span>
                <span className="theme-text-primary font-medium break-words leading-tight">
                  {rangesStr || "—"}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <span className="text-xs font-mono theme-text-secondary opacity-60">—</span>
      )}
    </div>
  );
}

/**
 * Shared Report Mistakes Cell
 */
export function ReportMistakesCell({ report }: { report: ReportItem }) {
  const mistakes = getMistakes(report).filter(
    (m) => (m.page && String(m.page).trim()) || (m.ayah && String(m.ayah).trim())
  );

  if (mistakes.length === 0) {
    return <span className="text-xs font-mono theme-text-secondary opacity-60">0</span>;
  }

  return (
    <div className="space-y-1 text-xs font-mono max-h-24 overflow-y-auto pr-1">
      {mistakes.map((m, idx) => {
        const parts: string[] = [];
        if (m.juz) parts.push(`Juz ${m.juz}`);
        if (m.page) parts.push(`Page ${m.page}`);
        if (m.ayah) parts.push(`Ayah ${m.ayah}`);
        return (
          <div key={idx} className="flex items-start gap-1.5 theme-text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1" />
            <span className="break-words leading-tight">{parts.join(" ")}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Shared Report Stucks Cell
 */
export function ReportStucksCell({ report }: { report: ReportItem }) {
  const stucks = getStucks(report).filter(
    (s) => (s.page && String(s.page).trim()) || (s.ayah && String(s.ayah).trim())
  );

  if (stucks.length === 0) {
    return <span className="text-xs font-mono theme-text-secondary opacity-60">0</span>;
  }

  return (
    <div className="space-y-1 text-xs font-mono max-h-24 overflow-y-auto pr-1">
      {stucks.map((s, idx) => {
        const parts: string[] = [];
        if (s.juz) parts.push(`Juz ${s.juz}`);
        if (s.page) parts.push(`Page ${s.page}`);
        if (s.ayah) parts.push(`Ayah ${s.ayah}`);
        return (
          <div key={idx} className="flex items-start gap-1.5 theme-text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1" />
            <span className="break-words leading-tight">{parts.join(" ")}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Shared Report Comments Cell
 */
export function ReportCommentsCell({ comment }: { comment?: string }) {
  if (!comment || !comment.trim()) {
    return <span className="text-xs theme-text-secondary opacity-60">—</span>;
  }

  return (
    <p
      className="text-xs theme-text-primary leading-relaxed break-words whitespace-pre-wrap italic line-clamp-3"
      title={comment.trim()}
    >
      "{comment.trim()}"
    </p>
  );
}

/**
 * Shared Mistakes & Stucks Summary Counter Badge for Parent Rows
 */
export function MistakesStucksBadge({
  totalMistakes,
  totalStucks,
  t,
}: {
  totalMistakes: number;
  totalStucks: number;
  t: (key: string, fallback: string) => string;
}) {
  const isClean = totalMistakes === 0 && totalStucks === 0;
  if (isClean) {
    return <span className="text-xs font-mono theme-text-secondary opacity-60">0</span>;
  }

  return (
    <div className="space-y-0.5 text-left font-mono">
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="theme-text-secondary">{t("mistakes", "Mistakes")}:</span>
        <span className={`font-bold ${totalMistakes > 0 ? "text-rose-400" : "theme-text-secondary"}`}>
          {totalMistakes}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="theme-text-secondary">{t("stucks", "Stucks")}:</span>
        <span className={`font-bold ${totalStucks > 0 ? "text-amber-400" : "theme-text-secondary"}`}>
          {totalStucks}
        </span>
      </div>
    </div>
  );
}
