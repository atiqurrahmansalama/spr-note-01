import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { SearchIcon, QrCodeIcon } from "../../components/ui/Icons";

export default function LandingVerifySearch() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [reportId, setReportId] = useState("");

  const handleVerify = (e) => {
    if (e) e.preventDefault();
    const trimmed = reportId.trim();
    if (!trimmed) {
      showToast("Please enter a valid Report ID or Reference UUID!", "warning");
      return;
    }
    navigate(`/verify-report/${trimmed}`);
  };

  return (
    <section id="verification" className="min-h-screen flex flex-col justify-center items-center py-24 px-4 max-w-4xl mx-auto text-center select-none scroll-mt-10 relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="theme-bg-surface border theme-border rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden group w-full">
        <div className="space-y-6 max-w-xl mx-auto relative z-10">
          <div className="w-14 h-14 rounded-2xl theme-bg-sub border theme-border text-[var(--accent-main)] flex items-center justify-center mx-auto shadow-inner">
            <QrCodeIcon className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-main)] theme-bg-accent-soft px-3.5 py-1 rounded-full border theme-border">
              Guardians &amp; Public Hub
            </span>
            <h2 className="text-2xl sm:text-4xl font-black theme-text-primary tracking-tight">
              Instant Report Card Verification
            </h2>
            <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
              Verify student daily progress logs, monthly attendance transcripts, and academic performance directly without requiring any login credentials.
            </p>
          </div>

          <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3 mt-6">
            <input
              type="text"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              placeholder="Enter Report ID or Verification UUID..."
              className="flex-1 theme-bg-sub border theme-border theme-text-primary text-xs sm:text-sm px-5 py-4 rounded-2xl focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 shadow-inner"
            />
            <button
              type="submit"
              className="px-8 py-4 rounded-2xl theme-bg-accent theme-accent-text text-xs sm:text-sm font-bold active:scale-98 transition duration-200 cursor-pointer shadow-xl hover:opacity-95 shrink-0 flex items-center justify-center gap-2"
            >
              <SearchIcon className="w-4 h-4" />
              <span>Verify Report</span>
            </button>
          </form>

          <p className="text-[11px] theme-text-secondary">
            Note: Verification reference UUIDs and QR codes can be found on printed or digital report slips.
          </p>
        </div>
      </div>
    </section>
  );
}
