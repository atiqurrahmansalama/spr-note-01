import React from "react";
import { ReportItem } from "../types";
import {
  ResolvedStudentMeta,
  getPortions,
  getMistakes,
  getStucks,
  isBookReport,
  getBookTitle,
  getLessonTitle,
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
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-bold theme-text-primary block break-words leading-tight">
          {name}
        </span>
        {hasPendingSync && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 shrink-0 shadow-2xs transition-all duration-200 animate-fade-in select-none"
            title={t("pendingSync", "Pending Cloud Sync")}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span>{t("pending", "Pending")}</span>
          </span>
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
  report,
}: {
  sessionName?: string;
  totalPages?: number;
  report?: ReportItem;
}) {
  const isBook = isBookReport(report);
  const bookTitle = isBook ? getBookTitle(report) : "";
  const displayPages = totalPages || 0;

  return (
    <div className="space-y-0.5 flex flex-col items-start justify-start text-left min-w-0">
      <span
        className="text-xs font-semibold theme-accent truncate max-w-[140px] block"
        title={sessionName || "General Session"}
      >
        {sessionName || "General Session"}
      </span>
      <span
        className="text-[11px] font-mono font-bold theme-text-primary truncate max-w-[160px] block"
        title={isBook && bookTitle ? `${bookTitle} · ${displayPages} Pages` : `${displayPages} Pages`}
      >
        {isBook && bookTitle ? (
          <>
            <span className="font-sans font-semibold theme-text-secondary opacity-90">{bookTitle}</span>
            <span className="mx-1 opacity-60">·</span>
            <span>{displayPages} Pages</span>
          </>
        ) : (
          `${displayPages} Pages`
        )}
      </span>
    </div>
  );
}

/**
 * Shared Report Portions Cell
 * Displays session name, total pages (optional), and detailed Juz/Page or Book/Page ranges.
 */
export function ReportPortionsCell({
  report,
  hideSessionHeader = false,
}: {
  report: ReportItem;
  hideSessionHeader?: boolean;
}) {
  const isBook = isBookReport(report);
  const bookTitle = isBook ? getBookTitle(report) : "";
  const lessonTitle = isBook ? getLessonTitle(report) : "";
  const portions = getPortions(report);

  return (
    <div className="space-y-1 text-left min-w-0">
      {!hideSessionHeader && !isBook && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold theme-accent break-words leading-tight">
            {report.session_name || "General Session"}
          </span>
          <span className="text-[11px] font-mono font-semibold theme-text-secondary opacity-80 whitespace-nowrap">
            · {report.totalPages || 0} Pages
          </span>
        </div>
      )}
      {isBook ? (
        <div className="space-y-0.5 text-xs text-left min-w-0">
          {/* Line 1: Book / Subject Name */}
          <div
            className="font-bold theme-text-primary text-xs leading-tight truncate max-w-[200px]"
            title={bookTitle || "Book / Subject"}
          >
            {bookTitle || "Book / Subject"}
          </div>

          {/* Line 2: Lesson Title */}
          <div
            className="text-[11px] theme-text-secondary leading-tight truncate max-w-[200px]"
            title={lessonTitle ? `Lesson: ${lessonTitle}` : "Lesson: —"}
          >
            <span className="opacity-80">Lesson:</span>{" "}
            <span className="font-semibold theme-text-primary">{lessonTitle || "—"}</span>
          </div>

          {/* Line 3: Page Range (3rd line) */}
          <div className="text-[11px] font-mono font-bold theme-accent leading-tight break-words">
            {portions.length > 0 ? (
              portions
                .flatMap((jp) =>
                  (jp.ranges || []).map((r) => {
                    const s = r.start || r.page_start;
                    const e = r.end || r.page_end;
                    if (s && e && String(s) !== String(e)) return `Page ${s}–${e}`;
                    if (s) return `Page ${s}`;
                    return "";
                  }).filter(Boolean)
                )
                .join(", ") || (report.totalPages ? `Page: ${report.totalPages} Pages` : "—")
            ) : (
              report.totalPages ? `Page: ${report.totalPages} Pages` : "—"
            )}
          </div>
        </div>
      ) : portions.length > 0 ? (
        <div className="space-y-0.5 text-xs font-mono max-h-24 overflow-y-auto pr-1">
          {portions.map((jp, idx) => {
            const rangesStr = Array.isArray(jp.ranges)
              ? jp.ranges
                  .map((r) => `Page ${r.start || r.page_start || 0}–${r.end || r.page_end || 0}`)
                  .join(", ")
              : "";
            const hasJuz = jp.juz !== undefined && jp.juz !== null && String(jp.juz).trim() !== "";
            return (
              <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                {hasJuz ? (
                  <span className="font-bold theme-accent shrink-0">Juz {jp.juz}:</span>
                ) : (
                  <span className="font-bold theme-accent shrink-0">Page:</span>
                )}
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
  const isBook = isBookReport(report);
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
        if (!isBook && m.juz && String(m.juz).trim() !== "") {
          parts.push(`Juz ${m.juz}`);
        }
        if (m.page && String(m.page).trim() !== "") {
          parts.push(`Page ${m.page}`);
        }
        if (m.ayah && String(m.ayah).trim() !== "") {
          if (isBook) {
            const raw = String(m.ayah).trim();
            const formatted = /^line\b/i.test(raw) ? raw : isNaN(Number(raw)) ? raw : `Line ${raw}`;
            parts.push(formatted);
          } else {
            parts.push(`Ayah ${m.ayah}`);
          }
        }
        return (
          <div key={idx} className="flex items-start gap-1.5 theme-text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1" />
            <span className="break-words leading-tight">{parts.join(" ") || "—"}</span>
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
  const isBook = isBookReport(report);
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
        if (!isBook && s.juz && String(s.juz).trim() !== "") {
          parts.push(`Juz ${s.juz}`);
        }
        if (s.page && String(s.page).trim() !== "") {
          parts.push(`Page ${s.page}`);
        }
        if (s.ayah && String(s.ayah).trim() !== "") {
          if (isBook) {
            const raw = String(s.ayah).trim();
            const formatted = /^line\b/i.test(raw) ? raw : isNaN(Number(raw)) ? raw : `Line ${raw}`;
            parts.push(formatted);
          } else {
            parts.push(`Ayah ${s.ayah}`);
          }
        }
        return (
          <div key={idx} className="flex items-start gap-1.5 theme-text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1" />
            <span className="break-words leading-tight">{parts.join(" ") || "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Shared Report Comments Cell
 */
export function ReportCommentsCell({
  comment,
  teacherName,
}: {
  comment?: string;
  teacherName?: string;
}) {
  const hasComment = Boolean(comment && comment.trim());
  const hasTeacher = Boolean(teacherName && String(teacherName).trim());

  if (!hasComment && !hasTeacher) {
    return <span className="text-xs theme-text-secondary opacity-60">—</span>;
  }

  return (
    <div className="space-y-1 text-left min-w-0">
      {hasComment ? (
        <p
          className="text-xs theme-text-primary leading-relaxed break-words whitespace-pre-wrap italic line-clamp-3"
          title={comment!.trim()}
        >
          "{comment!.trim()}"
        </p>
      ) : (
        <span className="text-xs theme-text-secondary opacity-60">—</span>
      )}
      {hasTeacher && (
        <div className="text-[10px] font-mono theme-text-secondary leading-tight truncate">
          - <span className="font-semibold theme-text-primary">{String(teacherName).trim()}</span>
        </div>
      )}
    </div>
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
