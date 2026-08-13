import { forwardRef } from "react";
import { formatDate } from "../../../utils/reportGenerator";
import QrCodeBadge from "../../../components/common/QrCodeBadge";
import { useFeatureControl } from "../../../context/FeatureControlContext";

export const PdfReportPreview = forwardRef(function PdfReportPreview({
  reportData,
  includeGroup,
  pdfFont = "Outfit",
  isPdfBold = false,
  isPdfItalic = false,
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

  return (
    <div
      ref={ref}
      style={{ fontFamily: `'${pdfFont}', system-ui, sans-serif` }}
      className={`w-full bg-[#fafafa] text-[#1e293b] p-6 md:p-7 rounded-xl shadow-md border border-slate-300 select-all space-y-2 text-[16px] leading-snug max-w-lg mx-auto ${
        isPdfBold ? "font-bold" : "font-normal"
      } ${isPdfItalic ? "italic" : "non-italic"}`}
    >
      {/* Document Header & QR Code */}
      <div className="flex items-start justify-between border-b border-slate-200 pb-3 mb-2">
        <div>
          <h1 className="text-[20px] font-bold text-[#0f172a] tracking-tight mb-2">
            Student Daily Progress Report
          </h1>
          <div className="space-y-0.5 text-[15px]">
            {showHeaderDate && (
              <div>
                <span className="font-bold text-[#0f172a]">Date:</span> {formattedDate}
              </div>
            )}
            {showStudentSelect && (
              <div>
                <span className="font-bold text-[#0f172a]">Student Name:</span> {studentName}
              </div>
            )}
          </div>
        </div>
        <QrCodeBadge reportId={reportId} size={84} />
      </div>

      {/* Juz & Page Block */}
      {showJuzPageInput && (
        <div className="pt-1 space-y-0.5 border-b border-slate-100 pb-2 mb-1">
          {validJuzs.length > 0 ? (
            <>
              <div>
                <span className="font-bold text-[#0f172a]">Juz Number:</span> {validJuzs.join(", ")}
              </div>
              {isSingleJuz ? (
                <div>
                  <span className="font-bold text-[#0f172a]">Page:</span> {juzMap.get(validJuzs[0])?.join(", ") || "N/A"}
                </div>
              ) : (
                <div>
                  <span className="font-bold text-[#0f172a]">Page:</span>
                  <div className="pl-4 space-y-0.5">
                    {validJuzs.map((j) => (
                      <div key={j}>
                        <span className="font-bold">{j}:</span> {juzMap.get(j)?.join(", ") || "N/A"}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div>Juz Number: N/A</div>
              <div>Page: N/A</div>
            </>
          )}
        </div>
      )}

      {/* Session Summary Block */}
      {(showSessionSelect || showMistakeTracker || showStuckTracker) && (
        <div className="pt-1.5 space-y-0.5 border-b border-slate-100 pb-2 mb-1">
          <h2 className="text-[16px] font-bold text-[#0f172a]">Session Summary</h2>
          {showSessionSelect && <div>Session Name: {selectedSession}</div>}
          {showMistakeTracker && <div>Mistake: {totalMistakes}</div>}
          {showStuckTracker && <div>Stuck: {totalStuck}</div>}
        </div>
      )}

      {/* Mistake Block */}
      {showMistakeTracker && mistakeMap.size > 0 && (
        <div className="pt-1.5 space-y-0.5 border-b border-slate-100 pb-2 mb-1">
          <h2 className="text-[16px] font-bold text-[#0f172a]">Mistake</h2>
          {isSingleJuz ? (
            Array.from(mistakeMap.values())[0].map((item, idx) => (
              <div key={idx}>{item}</div>
            ))
          ) : (
            Array.from(mistakeMap.entries()).map(([juzNum, items]) => (
              <div key={juzNum} className="space-y-0.5">
                <div className="font-bold">{juzNum}:</div>
                <div className="pl-4 space-y-0.5">
                  {items.map((item, idx) => (
                    <div key={idx}>{item}</div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Stuck Block */}
      {showStuckTracker && stuckMap.size > 0 && (
        <div className="pt-1.5 space-y-0.5 border-b border-slate-100 pb-2 mb-1">
          <h2 className="text-[16px] font-bold text-[#0f172a]">Stuck</h2>
          {isSingleJuz ? (
            Array.from(stuckMap.values())[0].map((item, idx) => (
              <div key={idx}>{item}</div>
            ))
          ) : (
            Array.from(stuckMap.entries()).map(([juzNum, items]) => (
              <div key={juzNum} className="space-y-0.5">
                <div className="font-bold">{juzNum}:</div>
                <div className="pl-4 space-y-0.5">
                  {items.map((item, idx) => (
                    <div key={idx}>{item}</div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Comment Block */}
      {showCommentSection && comment && comment.trim() !== "" && (
        <div className="pt-1.5 space-y-0.5 pb-2 mb-1">
          <h2 className="text-[16px] font-bold text-[#0f172a]">Comment</h2>
          <div className="whitespace-pre-wrap">{comment.trim()}</div>
        </div>
      )}

      {/* Footer Group Line */}
      {includeGroup && groupText && (
        <div className="pt-3 font-normal text-[#1e293b] border-t border-slate-200">
          {groupText}
        </div>
      )}
    </div>
  );
});
