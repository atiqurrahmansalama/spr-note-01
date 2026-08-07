import { EditIcon, TrashIcon } from "../../../components/ui/Icons";

export default function ReportCardDetail({ report, onEdit, onDelete }) {
  if (!report) return null;

  return (
    <div className="p-4 theme-bg-sub border-t theme-border space-y-4 text-xs font-sans animate-fade-in select-none">
      
      {/* Standard Summary Header Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 theme-bg-surface border theme-border rounded-xl">
        <div>
          <span className="text-[10px] theme-text-secondary font-semibold uppercase tracking-wider block">
            Name
          </span>
          <span className="font-bold theme-text-primary text-xs">
            {report.student_name}
          </span>
        </div>
        <div>
          <span className="text-[10px] theme-text-secondary font-semibold uppercase tracking-wider block">
            Group
          </span>
          <span className="font-semibold theme-text-primary text-xs">
            {report.student_group}
          </span>
        </div>
        <div>
          <span className="text-[10px] theme-text-secondary font-semibold uppercase tracking-wider block">
            Session
          </span>
          <span className="font-semibold theme-text-primary text-xs">
            {report.session_name}
          </span>
        </div>
        <div>
          <span className="text-[10px] theme-text-secondary font-semibold uppercase tracking-wider block">
            Date & Time
          </span>
          <span className="font-mono theme-text-secondary text-xs">
            {report.formattedDate} {report.formattedTime}
          </span>
        </div>
      </div>

      {/* Recitation Juz & Page Table */}
      {Array.isArray(report.juz_and_pages) && report.juz_and_pages.length > 0 && (
        <div className="space-y-2">
          <span className="font-bold text-[10px] uppercase tracking-wider theme-text-secondary pd-[10px]">
            Juz & Page
          </span>
          <div className="theme-bg-surface border theme-border rounded-xl overflow-hidden">
            <table className="text-left text-xs border-collapse">
              <thead>
                <tr className="theme-bg-sub border-b theme-border text-[10px] theme-text-secondary">
                  <th className="py-2 px-3.5 font-bold">Juz</th>
                  <th className="py-2 px-3.5 font-bold">Page</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {report.juz_and_pages.map((jp, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3.5 font-bold theme-text-primary">Juz {jp.juz}</td>
                    <td className="py-2.5 px-3.5 font-mono theme-text-secondary">
                      {Array.isArray(jp.ranges) && jp.ranges.map((r, rIdx) => (
                        <span key={rIdx}>
                          Pages: {r.start || r.page_start || 0} - {r.end || r.page_end || 0}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Mistakes Log Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[10px] uppercase tracking-wider theme-text-secondary">
            Mistakes Details ({report.mistakesCount || 0})
          </span>
        </div>

        {Array.isArray(report.mistake_details) && report.mistake_details.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {report.mistake_details.map((m, idx) => (
              <div key={idx} className="theme-bg-surface rounded-xl p-1.5 pl-2 flex items-center justify-between">
                <div className="font-semibold theme-text-primary">
                  <span>Juz {m.juz || '—'}</span>
                  {m.page && <span className="ml-2 theme-text-secondary font-mono">Page {m.page}</span>}
                  {m.ayah && <span className="ml-2 theme-text-secondary font-mono">Ayah {m.ayah}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] theme-text-secondary italic">
            No Mistakes, Masha Allah.</p>
        )}
      </div>

      {/* Detailed Stucks / Hesitation Log Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[10px] uppercase tracking-wider theme-text-secondary">
            Stuck Details ({report.stucksCount || 0})
          </span>
        </div>

        {Array.isArray(report.stuck_details) && report.stuck_details.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {report.stuck_details.map((s, idx) => (
              <div key={idx} className="theme-bg-surface rounded-xl p-1.5 pl-2 flex items-center justify-between">
                <div className="font-semibold theme-text-primary">
                  <span>Juz {s.juz || '—'}</span>
                  {s.page && <span className="ml-2 theme-text-secondary font-mono">Page {s.page}</span>}
                  {s.ayah && <span className="ml-2 theme-text-secondary font-mono">Ayah {s.ayah}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] theme-text-secondary italic">No Stucks, Masha Allah.</p>
        )}
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <span className="font-bold text-[10px] uppercase tracking-wider theme-text-secondary">
          Comment
        </span>
        <p className="theme-bg-surface p-2 rounded-xl theme-text-primary text-xs font-medium leading-relaxed">
          {report.comment || "No comment recorded for this report."}
        </p>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t theme-border text-[11px]">
        <span className="font-mono theme-text-secondary">
          Report ID: {report.report_unique_id || report.id}
        </span>
        <div className="flex items-center gap-1.5">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(report)}
              className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-surface transition cursor-pointer"
              title="Edit Report"
            >
              <EditIcon className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(report)}
              className="p-1.5 rounded-lg theme-text-secondary hover:text-rose-400 hover:theme-bg-surface transition cursor-pointer"
              title="Delete Report"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
