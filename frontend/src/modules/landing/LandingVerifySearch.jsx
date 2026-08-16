import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { SearchIcon, CheckCircleIcon } from "../../components/ui/Icons";

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
    <section id="verification" className="py-24 px-4 max-w-4xl mx-auto text-center select-none scroll-mt-10">
      <div className="theme-bg-surface border theme-border rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden group">
        <div className="space-y-6 max-w-xl mx-auto relative z-10">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-main)] theme-bg-accent-soft px-3 py-1 rounded-full border theme-border">
              Public Verification Hub
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold theme-text-primary tracking-tight">
              Instant Report Card Verification
            </h2>
            <p className="text-xs theme-text-secondary leading-relaxed">
              Verify student daily progress logs, monthly attendance transcripts, and academic summaries directly using the verification code.
            </p>
          </div>

          <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3 mt-4">
            <input
              type="text"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              placeholder="Enter Report ID or Verification UUID..."
              className="flex-1 theme-bg-sub border theme-border theme-text-primary text-xs sm:text-sm px-4 py-3.5 rounded-2xl focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 shadow-inner"
            />
            <button
              type="submit"
              className="px-6 py-3.5 rounded-2xl theme-bg-accent theme-accent-text text-xs sm:text-sm font-bold active:scale-98 transition duration-200 cursor-pointer shadow-lg hover:opacity-95 shrink-0 flex items-center justify-center gap-2"
            >
              <SearchIcon className="w-4 h-4" />
              <span>Verify Report</span>
            </button>
          </form>

          <p className="text-[10px] theme-text-secondary">
            Verification reference IDs can be found at the bottom of exported digital report cards and ID slips.
          </p>
        </div>
      </div>
    </section>
  );
}
