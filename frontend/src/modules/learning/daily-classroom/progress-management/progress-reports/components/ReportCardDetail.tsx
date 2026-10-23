import React from "react";
import { EditIcon, TrashIcon } from "@/components/ui/Icons";
import { ExpandedCell } from "@/components/ui/DataTable";
import { ReportCardDetailProps } from "../types";
import { getPortions, getMistakes, getStucks } from "../utils/studentMetaResolver";

export default function ReportCardDetail({
  report,
  onEdit,
  onDelete,
  variant = "card",
}: ReportCardDetailProps) {
  if (!report) return null;

  const displayPortions = getPortions(report);
  const rawMistakes = getMistakes(report);
  const rawStucks = getStucks(report);

  const validMistakes = rawMistakes.filter((m) => {
    const hasPage = m.page !== undefined && m.page !== null && String(m.page).trim() !== "";
    const hasAyah = m.ayah !== undefined && m.ayah !== null && String(m.ayah).trim() !== "";
    return hasPage || hasAyah;
  });

  const validStucks = rawStucks.filter((s) => {
    const hasPage = s.page !== undefined && s.page !== null && String(s.page).trim() !== "";
    const hasAyah = s.ayah !== undefined && s.ayah !== null && String(s.ayah).trim() !== "";
    return hasPage || hasAyah;
  });

  const hasMistakes = validMistakes.length > 0;
  const hasStucks = validStucks.length > 0;
  const isEdited = Boolean(report.is_edited && (report.edited_at || report.edit_time));

  // Footer Variant: Renders the full-width original footer info & actions
  if (variant === "footer") {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 text-[11px]">
        <div className="flex items-center gap-2 font-mono theme-text-secondary truncate max-w-full flex-wrap">
          <span className="text-[10px] font-bold opacity-75">
            REPORT ID:
          </span>
          <span className="theme-text-primary font-semibold">{report.report_unique_id || report.id}</span>

          <span className="inline-flex items-center gap-1 text-[10px] font-mono opacity-90 pl-1 border-l theme-border">
            <span className="font-bold opacity-75">REPORTED BY:</span>
            <span className="theme-text-primary font-semibold">
              {report.teacher_name || report.teacher || "—"}
            </span>
          </span>

          {isEdited && (
            <span className="inline-flex items-center gap-1 theme-accent text-[10px] font-semibold">
              <EditIcon className="w-3 h-3 theme-accent" />
              <span>Edited</span>
              {(report.edited_at || report.edit_time) && (
                <span className="theme-text-secondary font-mono font-normal opacity-80">
                  ·{" "}
                  {new Date((report.edited_at || report.edit_time) as string).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(report);
              }}
              className="px-2.5 py-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer flex items-center gap-1.5 font-semibold text-xs"
            >
              <EditIcon className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(report);
              }}
              className="px-2.5 py-1 rounded-lg theme-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-1.5 font-semibold text-xs"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Table Cells Variant: Renders direct <td> elements aligned with parent table columns
  if (variant === "table-cells") {
    return (
      <>
        {/* 1. Juz & Page (under Student & ID column) */}
        <ExpandedCell title="Juz & Page">
          {displayPortions.length > 0 ? (
            <div className="space-y-1 text-xs font-mono">
              {displayPortions.map((jp, idx) => {
                const rangesStr = Array.isArray(jp.ranges)
                  ? jp.ranges
                      .map(
                        (r) =>
                          `Page ${r.start || r.page_start || 0}–${
                            r.end || r.page_end || 0
                          }`
                      )
                      .join(", ")
                  : "";
                return (
                  <div key={idx} className="flex items-center gap-1.5 truncate">
                    <span className="font-bold theme-accent">Juz {jp.juz}:</span>
                    <span className="theme-text-primary font-medium">
                      {rangesStr || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-xs font-mono theme-text-secondary opacity-60">—</span>
          )}
        </ExpandedCell>

        {/* 2. Mistakes Details (under Dept · Class · Sec column) */}
        <ExpandedCell
          title="Mistake Details"
          titleClassName="text-rose-400"
          badge={hasMistakes ? validMistakes.length : undefined}
          badgeClassName="text-rose-400"
        >
          {hasMistakes ? (
            <div className="space-y-1 text-xs font-mono max-h-36 overflow-y-auto pr-1">
              {validMistakes.map((m, idx) => {
                const parts: string[] = [];
                if (m.juz) parts.push(`Juz ${m.juz}`);
                if (m.page) parts.push(`Page ${m.page}`);
                if (m.ayah) parts.push(`Ayah ${m.ayah}`);
                return (
                  <div key={idx} className="flex items-center gap-1.5 theme-text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span>{parts.join(" ")}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-xs font-mono theme-text-secondary opacity-60">0</span>
          )}
        </ExpandedCell>

        {/* 3. Stucks Details (under Date & Time + Session & Pages columns, colSpan={2}) */}
        <ExpandedCell
          colSpan={2}
          title="Stuck Details"
          titleClassName="text-amber-400"
          badge={hasStucks ? validStucks.length : undefined}
          badgeClassName="text-amber-400"
        >
          {hasStucks ? (
            <div className="space-y-1 text-xs font-mono max-h-36 overflow-y-auto pr-1">
              {validStucks.map((s, idx) => {
                const parts: string[] = [];
                if (s.juz) parts.push(`Juz ${s.juz}`);
                if (s.page) parts.push(`Page ${s.page}`);
                if (s.ayah) parts.push(`Ayah ${s.ayah}`);
                return (
                  <div key={idx} className="flex items-center gap-1.5 theme-text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>{parts.join(" ")}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-xs font-mono theme-text-secondary opacity-60">0</span>
          )}
        </ExpandedCell>

        {/* 4. Comments / Remarks (under Mistakes & Stucks + Actions columns, colSpan={2}) */}
        <ExpandedCell colSpan={2} title="Comments / Remarks">
          {report.comment ? (
            <p className="theme-text-primary text-xs font-normal leading-relaxed break-words whitespace-pre-wrap">
              {report.comment}
            </p>
          ) : (
            <span className="text-xs theme-text-secondary opacity-60">—</span>
          )}
        </ExpandedCell>
      </>
    );
  }

  // Card Variant: Renders block container for list views
  return (
    <div className="pl-14 pr-5 sm:pr-6 py-3.5 space-y-3.5 text-xs font-sans animate-fade-in select-none">
      {/* 4 Columns Grid: Juz & Page, Mistakes, Stucks, Comments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6 pt-0.5">
        {/* Column 1: Juz & Page (3 cols) */}
        <div className="lg:col-span-3 space-y-1.5 text-left">
          <span className="font-bold text-[10px] uppercase tracking-wider theme-text-secondary block">
            Juz & Page
          </span>
          {displayPortions.length > 0 ? (
            <div className="space-y-1 text-xs font-mono">
              {displayPortions.map((jp, idx) => {
                const rangesStr = Array.isArray(jp.ranges)
                  ? jp.ranges
                      .map(
                        (r) =>
                          `p. ${r.start || r.page_start || 0}–${
                            r.end || r.page_end || 0
                          }`
                      )
                      .join(", ")
                  : "";
                return (
                  <div key={idx} className="flex items-center gap-1.5 truncate">
                    <span className="font-bold theme-accent">Juz {jp.juz}:</span>
                    <span className="theme-text-primary font-medium">{rangesStr || "—"}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-xs font-mono theme-text-secondary opacity-60">—</span>
          )}
        </div>

        {/* Column 2: Mistakes (3 cols) */}
        <div className="lg:col-span-3 space-y-1.5 text-left">
          <span className="font-bold text-[10px] uppercase tracking-wider text-rose-400 block">
            Mistakes {hasMistakes ? `(${validMistakes.length})` : ""}
          </span>
          {hasMistakes ? (
            <div className="space-y-1 text-xs font-mono">
              {validMistakes.map((m, idx) => {
                const parts: string[] = [];
                if (m.juz) parts.push(`Juz ${m.juz}`);
                if (m.page) parts.push(`p. ${m.page}`);
                if (m.ayah) parts.push(`Ayah ${m.ayah}`);
                return (
                  <div key={idx} className="flex items-center gap-1.5 theme-text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span>{parts.join(" · ")}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-xs font-mono theme-text-secondary opacity-60">0</span>
          )}
        </div>

        {/* Column 3: Stucks (2 cols) */}
        <div className="lg:col-span-2 space-y-1.5 text-left">
          <span className="font-bold text-[10px] uppercase tracking-wider text-amber-400 block">
            Stucks {hasStucks ? `(${validStucks.length})` : ""}
          </span>
          {hasStucks ? (
            <div className="space-y-1 text-xs font-mono">
              {validStucks.map((s, idx) => {
                const parts: string[] = [];
                if (s.juz) parts.push(`Juz ${s.juz}`);
                if (s.page) parts.push(`p. ${s.page}`);
                if (s.ayah) parts.push(`Ayah ${s.ayah}`);
                return (
                  <div key={idx} className="flex items-center gap-1.5 theme-text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>{parts.join(" · ")}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-xs font-mono theme-text-secondary opacity-60">0</span>
          )}
        </div>

        {/* Column 4: Comments (4 cols) */}
        <div className="lg:col-span-4 space-y-1.5 text-left">
          <span className="font-bold text-[10px] uppercase tracking-wider theme-text-secondary block">
            Comments
          </span>
          {report.comment ? (
            <p className="theme-text-primary text-xs font-normal leading-relaxed break-words whitespace-pre-wrap">
              {report.comment}
            </p>
          ) : (
            <span className="text-xs theme-text-secondary opacity-60">—</span>
          )}
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2.5 border-t theme-border-subtle text-[11px]">
        <div className="flex items-center gap-2 font-mono theme-text-secondary truncate max-w-full flex-wrap">
          <span className="text-[10px] font-bold opacity-75">
            REPORT ID:
          </span>
          <span className="theme-text-primary font-semibold">{report.report_unique_id || report.id}</span>

          <span className="inline-flex items-center gap-1 text-[10px] font-mono opacity-90 pl-1 border-l theme-border">
            <span className="font-bold opacity-75">REPORTED BY:</span>
            <span className="theme-text-primary font-semibold">
              {report.teacher_name || report.teacher || "—"}
            </span>
          </span>

          {isEdited && (
            <span className="inline-flex items-center gap-1 theme-accent text-[10px] font-semibold">
              <EditIcon className="w-3 h-3 theme-accent" />
              <span>Edited</span>
              {(report.edited_at || report.edit_time) && (
                <span className="theme-text-secondary font-mono font-normal opacity-80">
                  ·{" "}
                  {new Date((report.edited_at || report.edit_time) as string).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(report);
              }}
              className="px-2.5 py-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer flex items-center gap-1.5 font-semibold text-xs"
            >
              <EditIcon className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(report);
              }}
              className="px-2.5 py-1 rounded-lg theme-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-1.5 font-semibold text-xs"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
