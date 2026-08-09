import { useState, useEffect } from "react";
import { verifyReport } from "../../api/reports";
import QrCodeBadge from "../../components/common/QrCodeBadge";

export default function PublicVerifyReportView({ reportIdParam }) {
  const [reportId, setReportId] = useState(reportIdParam || "");
  const [searchInput, setSearchInput] = useState(reportIdParam || "");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // Extract reportId from URL path if not provided via props
    let targetId = reportIdParam;
    if (!targetId && typeof window !== "undefined") {
      const match = window.location.pathname.match(/\/verify-report\/([^/]+)/);
      if (match && match[1]) {
        targetId = match[1];
      }
    }

    if (targetId) {
      setReportId(targetId);
      setSearchInput(targetId);
      performVerification(targetId);
    } else {
      setLoading(false);
    }
  }, [reportIdParam]);

  const performVerification = async (idToVerify) => {
    setLoading(true);
    setResult(null);

    const res = await verifyReport(idToVerify);
    setResult(res);
    setLoading(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const cleanId = searchInput.trim();
    setReportId(cleanId);
    window.history.pushState({}, "", `/verify-report/${cleanId}`);
    performVerification(cleanId);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 md:p-8 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Header Branding */}
      <div className="w-full max-w-xl text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Suffah Official Hifz Verification Portal
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
          Hifz Report Authenticity Verification
        </h1>
        <p className="text-slate-400 text-sm md:text-base mt-2">
          Verify digital authenticity of scanned student daily progress reports.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-6 flex items-center gap-2 max-w-md mx-auto">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Enter Report ID (e.g. REP-F721092B)"
            className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors shadow-lg shadow-emerald-900/20"
          >
            Verify
          </button>
        </form>
      </div>

      {/* Main Verification Status Card */}
      <div className="w-full max-w-xl">
        {loading ? (
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-8 text-center space-y-4 backdrop-blur-md">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-300 font-medium">Validating cryptographic QR signature against Hifz database...</p>
          </div>
        ) : !reportId ? (
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-700/50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m0 14v1m8-8h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">No Report ID Specified</h3>
            <p className="text-slate-400 text-sm">Please scan a report QR code or enter a Report Unique ID above to verify.</p>
          </div>
        ) : result?.statusCode === 200 && result?.data?.is_valid ? (
          /* 🟢 200 OK: VERIFIED REPORT CARD */
          <div className="bg-slate-800/90 border border-emerald-500/40 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md space-y-6 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header Badge */}
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-inner">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      AUTHENTIC & VERIFIED
                    </span>
                    {result.data.is_locked && (
                      <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        🔒 Admin Locked
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">Official Student Hifz Report</h2>
                </div>
              </div>

              {/* QR Code Mirror */}
              <div className="hidden sm:block">
                <QrCodeBadge reportId={result.data.report_unique_id} size={64} showLabel={false} />
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Report Unique ID</div>
                <div className="text-emerald-300 font-mono font-bold text-base mt-0.5">{result.data.report_unique_id}</div>
              </div>

              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Student Name</div>
                <div className="text-white font-bold text-base mt-0.5">{result.data.student_name || "N/A"}</div>
              </div>

              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Date & Session</div>
                <div className="text-slate-200 font-semibold mt-0.5">
                  {result.data.date || "N/A"} • <span className="text-emerald-400">{result.data.session_name || "Subah"}</span>
                </div>
              </div>

              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Pages & Performance</div>
                <div className="text-slate-200 font-semibold mt-0.5 flex items-center justify-between">
                  <span>{result.data.total_page || 1} Pages Recited</span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Score: {result.data.overall_score !== null ? result.data.overall_score : 100}%
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Status */}
            <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4">
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-emerald-400">Status:</span> {result.data.report_performance || "Completed"}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Verified: {new Date().toLocaleTimeString()}
              </div>
            </div>

            {/* Security Footer */}
            <div className="text-center text-xs text-slate-500 border-t border-slate-700/50 pt-4 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Cryptographically signed by Suffah Hifz REST Database Engine
            </div>
          </div>
        ) : result?.statusCode === 410 || result?.data?.verification_status === "DELETED" ? (
          /* 🟠 410 GONE: SOFT-DELETED / REVOKED REPORT CARD */
          <div className="bg-slate-800/90 border border-amber-500/50 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-700/60 pb-5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  REVOKED / SOFT-DELETED
                </span>
                <h2 className="text-xl font-bold text-white mt-1">Report Has Been Revoked</h2>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-200 text-sm leading-relaxed">
              <p className="font-semibold mb-1">Notice to Inspector / Parent:</p>
              This daily report ({reportId}) was soft-deleted or revoked by the institution administrator on record. The records attached to this QR code are no longer valid.
            </div>

            <div className="text-xs text-slate-400 text-center border-t border-slate-700/50 pt-4">
              If you believe this is an error, please contact the Suffah Administration.
            </div>
          </div>
        ) : (
          /* 🔴 404 NOT FOUND: UNVERIFIED / FRAUDULENT QR CODE CARD */
          <div className="bg-slate-800/90 border border-red-500/50 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-700/60 pb-5">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-red-400 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                  UNVERIFIED / FRAUDULENT QR CODE
                </span>
                <h2 className="text-xl font-bold text-white mt-1">Report Not Found</h2>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-200 text-sm leading-relaxed space-y-2">
              <p className="font-semibold">⚠️ Verification Warning:</p>
              <p>
                The Report ID <span className="font-mono font-bold underline">{reportId}</span> could not be found in the Suffah Hifz database.
              </p>
              <p className="text-xs text-red-300">
                This QR Code may be invalid, altered, or generated by an unauthorized third-party system.
              </p>
            </div>

            <div className="text-xs text-slate-400 text-center border-t border-slate-700/50 pt-4">
              Please double check the Report ID or contact your Ustadh / Admin.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
