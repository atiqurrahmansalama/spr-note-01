import { EditIcon, TrashIcon } from "../../../components/ui/Icons";

export default function ReportCardDetail({ report, onEdit, onDelete }) {

  if (!report) return null;

  // Extract recitation ranges in a standard format: [{ juz, ranges: [{ start, end }] }]
  const getPortions = () => {
    if (Array.isArray(report.juz_and_pages) && report.juz_and_pages.length > 0) {
      return report.juz_and_pages;
    }
    if (Array.isArray(report.portions) && report.portions.length > 0) {
      const juzMap = new Map();
      report.portions.forEach((p) => {
        const j = p.start_juz || p.juz || 1;
        if (!juzMap.has(j)) {
          juzMap.set(j, []);
        }
        juzMap.get(j).push({
          start: p.start_page,
          end: p.end_page || p.start_page,
        });
      });
      return Array.from(juzMap.entries()).map(([juz, ranges]) => ({
        juz,
        ranges,
      }));
    }
    return [];
  };

  // Extract mistakes in a standard format: [{ juz, page, ayah }]
  const getMistakes = () => {
    if (Array.isArray(report.mistake_details) && report.mistake_details.length > 0) {
      return report.mistake_details;
    }
    if (Array.isArray(report.error_details)) {
      const serverMistakes = report.error_details.filter((e) => e.type === "Mistake");
      if (serverMistakes.length > 0) return serverMistakes;
    }
    if (Array.isArray(report.mistakes)) {
      const list = [];
      report.mistakes.forEach((row) => {
        const juz = row.juz || "";
        const page = row.page || "";
        (row.ayahs || []).forEach((a) => {
          const val = a.value || a.ayah || "";
          if (val && String(val).trim()) {
            list.push({ juz, page, ayah: val });
          }
        });
      });
      return list;
    }
    return [];
  };

  // Extract stucks in a standard format: [{ juz, page, ayah }]
  const getStucks = () => {
    if (Array.isArray(report.stuck_details) && report.stuck_details.length > 0) {
      return report.stuck_details;
    }
    if (Array.isArray(report.error_details)) {
      const serverStucks = report.error_details.filter((e) => e.type === "Stuck");
      if (serverStucks.length > 0) return serverStucks;
    }
    if (Array.isArray(report.stucks)) {
      const list = [];
      report.stucks.forEach((row) => {
        const juz = row.juz || "";
        const page = row.page || "";
        (row.ayahs || []).forEach((a) => {
          const val = a.value || a.ayah || "";
          if (val && String(val).trim()) {
            list.push({ juz, page, ayah: val });
          }
        });
      });
      return list;
    }
    return [];
  };

  const displayPortions = getPortions();

  const validMistakes = getMistakes().filter((m) => {
    const hasPage = m.page !== undefined && m.page !== null && String(m.page).trim() !== "";
    const hasAyah = m.ayah !== undefined && m.ayah !== null && String(m.ayah).trim() !== "";
    return hasPage || hasAyah;
  });

  const validStucks = getStucks().filter((s) => {
    const hasPage = s.page !== undefined && s.page !== null && String(s.page).trim() !== "";
    const hasAyah = s.ayah !== undefined && s.ayah !== null && String(s.ayah).trim() !== "";
    return hasPage || hasAyah;
  });

  const hasMistakes = validMistakes.length > 0;
  const hasStucks = validStucks.length > 0;
  const isEdited = Boolean(report.is_edited || report.edited_at);

  return (
    <div className="p-4 sm:p-5 theme-bg-sub border-t theme-border space-y-4 text-xs font-sans animate-fade-in select-none rounded-b-2xl">
      
      {/* 1. Summary Header Grid Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 sm:p-4 theme-bg-surface border theme-border rounded-2xl shadow-sm">
        <div className="space-y-0.5">
          <span className="text-[10px] theme-text-secondary font-bold uppercase tracking-wider block">
            Student Name
          </span>
          <span className="font-bold theme-text-primary text-xs sm:text-sm truncate block">
            {report.student_name}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] theme-text-secondary font-bold uppercase tracking-wider block">
            Group
          </span>
          <span className="font-semibold theme-text-primary text-xs sm:text-sm truncate block">
            {report.student_group}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] theme-text-secondary font-bold uppercase tracking-wider block">
            Session
          </span>
          <span className="font-semibold theme-accent text-xs sm:text-sm truncate block">
            {report.session_name}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] theme-text-secondary font-bold uppercase tracking-wider block">
            Date & Time
          </span>
          <span className="font-mono theme-text-secondary text-xs truncate block">
            {report.formattedDate} {report.formattedTime && `· ${report.formattedTime}`}
          </span>
        </div>
      </div>

      {/* 2. Recitation Juz & Page Badges */}
      {displayPortions.length > 0 && (
        <div className="space-y-2 text-left">
          <span className="font-bold text-[10px] uppercase tracking-wider theme-text-secondary block">
            Juz & Page Recited
          </span>
          <div className="flex flex-col items-start gap-1.5">
            {displayPortions.map((jp, idx) => {
              const rangesStr = Array.isArray(jp.ranges)
                ? jp.ranges.map((r) => `Pages ${r.start || r.page_start || 0} – ${r.end || r.page_end || 0}`).join(", ")
                : "";
              return (
                <div
                  key={idx}
                  className="w-64 theme-bg-surface border theme-border rounded-xl px-3 py-1.5 text-xs font-mono theme-text-primary shadow-sm flex items-center justify-between"
                >
                  <span className="font-bold theme-accent">Juz {jp.juz}</span>
                  <span className="theme-text-secondary">{rangesStr}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Mistakes Section — only shown when valid mistakes > 0 */}
      {hasMistakes && (
        <div className="space-y-1.5 text-left">
          <span className="font-bold text-[10px] uppercase tracking-wider theme-text-secondary block">
            Mistakes ({validMistakes.length})
          </span>
          <div className="flex flex-col items-start gap-1.5">
            {validMistakes.map((m, idx) => {
              const parts = [];
              if (m.juz) parts.push(`Juz ${m.juz}`);
              if (m.page) parts.push(`Page ${m.page}`);
              if (m.ayah) parts.push(`Ayah ${m.ayah}`);
              return (
                <div
                  key={idx}
                  className="w-64 theme-bg-surface border theme-border rounded-xl px-3 py-1.5 text-xs font-mono theme-text-primary shadow-sm"
                >
                  {parts.join(" · ")}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Stucks Section — only shown when valid stucks > 0 */}
      {hasStucks && (
        <div className="space-y-1.5 text-left">
          <span className="font-bold text-[10px] uppercase tracking-wider theme-text-secondary block">
            Stuck Details ({validStucks.length})
          </span>
          <div className="flex flex-col items-start gap-1.5">
            {validStucks.map((s, idx) => {
              const parts = [];
              if (s.juz) parts.push(`Juz ${s.juz}`);
              if (s.page) parts.push(`Page ${s.page}`);
              if (s.ayah) parts.push(`Ayah ${s.ayah}`);
              return (
                <div
                  key={idx}
                  className="w-64 theme-bg-surface border theme-border rounded-xl px-3 py-1.5 text-xs font-mono theme-text-primary shadow-sm"
                >
                  {parts.join(" · ")}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Comment Section */}
      <div className="space-y-1.5 text-left">
        <span className="font-bold text-[10px] uppercase tracking-wider theme-text-secondary block">
          Comments / Notes
        </span>
        <div className="theme-bg-surface border theme-border p-3 rounded-2xl theme-text-primary text-xs font-medium leading-relaxed break-words shadow-sm">
          {report.comment || "No comment recorded for this report."}
        </div>
      </div>

      {/* 6. Footer Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t theme-border text-[11px]">
        <div className="flex items-center gap-2 font-mono theme-text-secondary truncate max-w-full flex-wrap">
          <span className="px-2 py-0.5 rounded-md theme-bg-surface border theme-border text-[10px] font-bold">
            REPORT ID
          </span>
          <span>{report.report_unique_id || report.id}</span>

          {isEdited && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md theme-bg-accent-soft theme-accent border theme-border text-[10px] font-bold shadow-sm">
              <EditIcon className="w-3 h-3 theme-accent" />
              <span>Edited</span>
              {report.edited_at && (
                <span className="theme-text-secondary font-mono font-normal ml-0.5 opacity-80">
                  ·{" "}
                  {new Date(report.edited_at).toLocaleString("en-US", {
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
              className="px-3 py-1.5 rounded-xl theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary hover:border-slate-500 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm font-semibold text-xs"
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
              className="px-3 py-1.5 rounded-xl theme-bg-surface border theme-border theme-text-secondary hover:text-rose-400 hover:border-rose-500/40 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm font-semibold text-xs"
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

