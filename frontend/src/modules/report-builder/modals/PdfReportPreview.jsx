import { forwardRef } from "react";
import { formatDate } from "../../../utils/reportGenerator";
import QrCodeBadge from "../../../components/common/QrCodeBadge";
import { useFeatureControl } from "../../../context/FeatureControlContext";

export const PdfReportPreview = forwardRef(function PdfReportPreview({
  reportData,
  includeGroup,
  includeTeacher,
}, ref) {
  const { isFeatureEnabled } = useFeatureControl();

  const showHeaderDate = isFeatureEnabled('headerDate');
  const showStudentSelect = isFeatureEnabled('studentSelect');
  const showSessionSelect = isFeatureEnabled('sessionSelect');
  const showJuzPageInput = isFeatureEnabled('juzPageInput');
  const showMistakeTracker = isFeatureEnabled('mistakeTracker');
  const showStuckTracker = isFeatureEnabled('stuckTracker');
  const showCommentSection = isFeatureEnabled('commentSection');

  const {
    studentName = "N/A",
    groupName = "",
    selectedSession = "N/A",
    selectedDate = "",
    juzPageData = [],
    mistakeData = [],
    stuckData = [],
    comment = "",
    report_unique_id = "",
    id = "",
    teacherName = "",
  } = reportData || {};

  const reportId = report_unique_id || id;

  // 1. Date Formatting
  const formattedDate = formatDate(selectedDate);

  // 2. Extract Juz & Page Ranges
  const juzMap = new Map();
  (juzPageData || []).forEach((row) => {
    if (!row.juz || row.juz.toString().trim() === "") return;
    const juzNum = row.juz.toString().trim();
    if (!juzMap.has(juzNum)) {
      juzMap.set(juzNum, []);
    }
    if (row.ranges && Array.isArray(row.ranges)) {
      row.ranges.forEach((r) => {
        const s = (r.start || "").toString().trim();
        const e = (r.end || "").toString().trim();
        if (s) {
          if (e && e !== s) {
            juzMap.get(juzNum).push(`${s}-${e}`);
          } else {
            juzMap.get(juzNum).push(s);
          }
        }
      });
    }
  });

  const validJuzs = Array.from(juzMap.keys());
  const isSingleJuz = validJuzs.length <= 1;

  // Helper for mistake/stuck counts
  const countValidItems = (data) => {
    return (data || []).reduce((total, row) => {
      if (!row.page || row.page.toString().trim() === "") return total;
      const validAyahs = (row.ayahs || []).filter(a => a.value && a.value.toString().trim() !== "").length;
      return total + (validAyahs > 0 ? validAyahs : 0);
    }, 0);
  };

  const totalMistakes = countValidItems(mistakeData);
  const totalStuck = countValidItems(stuckData);

  // Group mistake/stuck detail rows
  const getDetailRows = (data) => {
    const detailByJuz = new Map();

    (data || []).forEach((row) => {
      if (!row.page || row.page.toString().trim() === "") return;
      const juzNum = (row.juz || validJuzs[0] || "").toString().trim();
      const pageStr = row.page.toString().trim();

      const validAyahs = (row.ayahs || [])
        .map((a) => (a.value || "").toString().trim())
        .filter((v) => v !== "");

      if (validAyahs.length === 0) return;

      if (!detailByJuz.has(juzNum)) {
        detailByJuz.set(juzNum, []);
      }

      validAyahs.forEach((ayahVal) => {
        detailByJuz.get(juzNum).push(`Page ${pageStr} Ayah ${ayahVal}`);
      });
    });

    return detailByJuz;
  };

  const mistakeMap = getDetailRows(mistakeData);
  const stuckMap = getDetailRows(stuckData);

  // Format Group Footer string
  let groupText = "";
  if (includeGroup && showStudentSelect) {
    let gStr = groupName ? groupName.trim() : "Ml Saqib's Group";
    if (!gStr.toLowerCase().endsWith("group") && !gStr.toLowerCase().includes("'s")) {
      gStr = `${gStr}'s Group`;
    }
    groupText = `He's Student of ${gStr}.`;
  }

  const cleanTeacher = teacherName
    ? (teacherName.startsWith("@") ? teacherName : `@${teacherName}`)
    : "";

  return (
    <div
      ref={ref}
      className="w-full bg-white text-slate-800 rounded-xl shadow-md border border-slate-200 overflow-hidden max-w-lg mx-auto font-[system-ui,sans-serif] select-all"
    >
      {/* Document Top Bar */}
      <div className="bg-slate-800 px-5 py-3 flex items-center justify-between">
        <span className="text-white text-[11px] font-bold uppercase tracking-widest opacity-80">Daily Progress Report</span>
        <span className="text-slate-400 text-[10px] font-mono">{reportId || "SPR-DRAFT"}</span>
      </div>

      {/* Body */}
      <div className="p-5 space-y-3">

        {/* Student & Date Info */}
        <div className="space-y-1 pb-3 border-b border-slate-100">
          {showHeaderDate && (
            <div className="flex items-baseline gap-2 text-[14px]">
              <span className="font-semibold text-slate-500 w-28 shrink-0 text-[12px] uppercase tracking-wide">Date</span>
              <span className="text-slate-800 font-medium">{formattedDate}</span>
            </div>
          )}
          {showStudentSelect && (
            <div className="flex items-baseline gap-2 text-[14px]">
              <span className="font-semibold text-slate-500 w-28 shrink-0 text-[12px] uppercase tracking-wide">Student</span>
              <span className="text-slate-900 font-semibold">{studentName}</span>
            </div>
          )}
        </div>

        {/* Juz & Page Block */}
        {showJuzPageInput && (
          <div className="pb-3 border-b border-slate-100 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Recitation Range</p>
            {validJuzs.length > 0 ? (
              <>
                <div className="flex items-baseline gap-2 text-[14px]">
                  <span className="font-semibold text-slate-500 w-28 shrink-0 text-[12px] uppercase tracking-wide">Juz</span>
                  <span className="text-slate-800 font-medium">{validJuzs.join(", ")}</span>
                </div>
                {isSingleJuz ? (
                  <div className="flex items-baseline gap-2 text-[14px]">
                    <span className="font-semibold text-slate-500 w-28 shrink-0 text-[12px] uppercase tracking-wide">Pages</span>
                    <span className="text-slate-800 font-medium">{juzMap.get(validJuzs[0])?.join(", ") || "N/A"}</span>
                  </div>
                ) : (
                  <div className="space-y-0.5 pl-28">
                    {validJuzs.map((j) => (
                      <div key={j} className="text-[13px] text-slate-700">
                        <span className="font-semibold text-slate-500">Juz {j}:</span>{" "}
                        {juzMap.get(j)?.join(", ") || "N/A"}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-slate-400 text-[13px] italic">No juz/page data entered.</div>
            )}
          </div>
        )}

        {/* Session Summary Block */}
        {(showSessionSelect || showMistakeTracker || showStuckTracker) && (
          <div className="pb-3 border-b border-slate-100 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Session Summary</p>
            {showSessionSelect && (
              <div className="flex items-baseline gap-2 text-[14px]">
                <span className="font-semibold text-slate-500 w-28 shrink-0 text-[12px] uppercase tracking-wide">Session</span>
                <span className="text-slate-800 font-medium">{selectedSession}</span>
              </div>
            )}
            {showMistakeTracker && (
              <div className="flex items-baseline gap-2 text-[14px]">
                <span className="font-semibold text-slate-500 w-28 shrink-0 text-[12px] uppercase tracking-wide">Mistakes</span>
                <span className={`font-semibold ${totalMistakes > 0 ? "text-rose-600" : "text-emerald-600"}`}>{totalMistakes}</span>
              </div>
            )}
            {showStuckTracker && (
              <div className="flex items-baseline gap-2 text-[14px]">
                <span className="font-semibold text-slate-500 w-28 shrink-0 text-[12px] uppercase tracking-wide">Stuck</span>
                <span className={`font-semibold ${totalStuck > 0 ? "text-amber-600" : "text-emerald-600"}`}>{totalStuck}</span>
              </div>
            )}
          </div>
        )}

        {/* Mistake Details */}
        {showMistakeTracker && mistakeMap.size > 0 && (
          <div className="pb-3 border-b border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-rose-500 mb-2">Mistake Details</p>
            <div className="space-y-0.5 text-[13px] text-slate-700">
              {isSingleJuz ? (
                Array.from(mistakeMap.values())[0].map((item, idx) => (
                  <div key={idx}>• {item}</div>
                ))
              ) : (
                Array.from(mistakeMap.entries()).map(([juzNum, items]) => (
                  <div key={juzNum}>
                    <div className="font-semibold text-slate-500 text-[11px] uppercase tracking-wide mt-1">Juz {juzNum}</div>
                    {items.map((item, idx) => <div key={idx} className="pl-2">• {item}</div>)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Stuck Details */}
        {showStuckTracker && stuckMap.size > 0 && (
          <div className="pb-3 border-b border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-500 mb-2">Stuck Details</p>
            <div className="space-y-0.5 text-[13px] text-slate-700">
              {isSingleJuz ? (
                Array.from(stuckMap.values())[0].map((item, idx) => (
                  <div key={idx}>• {item}</div>
                ))
              ) : (
                Array.from(stuckMap.entries()).map(([juzNum, items]) => (
                  <div key={juzNum}>
                    <div className="font-semibold text-slate-500 text-[11px] uppercase tracking-wide mt-1">Juz {juzNum}</div>
                    {items.map((item, idx) => <div key={idx} className="pl-2">• {item}</div>)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Comment Block */}
        {showCommentSection && comment && comment.trim() !== "" && (
          <div className="pb-3 border-b border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Comment</p>
            <div className="whitespace-pre-wrap text-[13px] text-slate-700 leading-relaxed">{comment.trim()}</div>
          </div>
        )}

        {/* Footer Group / Teacher Line */}
        {(includeGroup && groupText) || (includeTeacher && cleanTeacher) ? (
          <div className="text-[13px] text-slate-500 space-y-0.5 pt-1">
            {includeGroup && groupText && <div>{groupText}</div>}
            {includeTeacher && cleanTeacher && <div>Teacher: {cleanTeacher}</div>}
          </div>
        ) : null}
      </div>

      {/* QR Code — always at the bottom */}
      <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 flex items-center justify-between gap-4">
        <div className="text-[11px] text-slate-400 leading-snug max-w-[180px]">
          Scan QR to verify the<br />authenticity of this report
        </div>
        <QrCodeBadge reportId={reportId} size={72} showLabel={false} />
      </div>
    </div>
  );
});
