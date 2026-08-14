import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";

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
    // Redirect directly to the public verification view
    navigate(`/verify-report/${trimmed}`);
  };

  return (
    <section className="py-24 px-4 max-w-4xl mx-auto text-center select-none">
      <div className="theme-bg-surface border theme-border rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden group">
        
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-6 max-w-xl mx-auto relative z-10">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Parents & Public Hub
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold theme-text-primary tracking-tight">
              Instant Report Card Verification
            </h2>
            <p className="text-xs theme-text-secondary leading-relaxed">
              Verify student daily progress logs, monthly transcripts, and recitation summaries. Parents can instantly view verified records without logging in.
            </p>
          </div>

          <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-2 mt-4">
            <input
              type="text"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              placeholder="Enter Report ID or Verification UUID..."
              className="flex-1 theme-bg-sub border theme-border theme-text-primary text-xs sm:text-sm px-4 py-3.5 rounded-xl focus:outline-none focus:border-[var(--accent-main)]/50 shadow-inner"
            />
            <button
              type="submit"
              className="px-6 py-3.5 rounded-xl theme-bg-accent theme-accent-text text-xs sm:text-sm font-bold active:scale-98 transition duration-200 cursor-pointer shadow-lg hover:opacity-95 shrink-0"
            >
              Verify Report 🔍
            </button>
          </form>

          <p className="text-[10px] theme-text-secondary">
            Note: Verification reference IDs can be found at the bottom of printed or exported digital report cards.
          </p>
        </div>

      </div>
    </section>
  );
}
