import { useState, useEffect, useRef } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { GateIcon, RefreshIcon, SaveIcon } from "../../components/ui/Icons";

export default function GateEntryLogView() {
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Quick Scanner State
  const [scanBarcode, setScanBarcode] = useState("");
  const [scanDirection, setScanDirection] = useState("ENTRY");
  const [scanReason, setScanReason] = useState("");

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDirection, setSelectedDirection] = useState("ALL");

  const barcodeInputRef = useRef(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = "/attendance/gate-logs/";
      const params = [];
      if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
      if (selectedDirection !== "ALL") params.push(`direction=${selectedDirection}`);
      if (params.length > 0) url += `?${params.join("&")}`;

      const res = await fetchWithAuth(url);
      const list = res?.results || (Array.isArray(res) ? res : []);
      setLogs(list);
    } catch (err) {
      showToast(err.message || "Failed to load gate logs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedDirection]);

  // Handle Quick Scan Submit
  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanBarcode.trim()) {
      showToast("Please enter or scan a barcode/RFID.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchWithAuth("/attendance/gate-logs/log-punch/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode_or_rfid: scanBarcode.trim(),
          direction: scanDirection,
          gate_pass_reason: scanReason.trim()
        })
      });

      showToast(`Gate ${scanDirection} logged for ${res.person_name || res.student_name || "person"}.`, "success");
      setScanBarcode("");
      setScanReason("");
      fetchLogs();
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    } catch (err) {
      showToast(err.message || "Failed to log gate punch.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full theme-bg-app theme-text-primary">
      {/* Top Banner */}
      <div className="p-4 border-b theme-border flex flex-wrap items-center justify-between gap-4 theme-bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center">
            <GateIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Campus Gate Entry & Pass Tracker</h1>
            <p className="text-xs theme-text-secondary">
              Real-time RFID, barcode scanning, and campus exit gate pass registry.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="p-2 rounded-lg border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition"
          title="Refresh Gate Logs"
        >
          <RefreshIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Main Grid: Scanner Box on Left, Stream on Right */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-auto">
        {/* Left Column: Fast RFID/Barcode Scanner Logger */}
        <div className="lg:col-span-1 border theme-border rounded-2xl p-4 theme-bg-surface shadow-md h-fit space-y-4">
          <div className="border-b theme-border pb-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <GateIcon className="w-4 h-4 theme-accent" />
              <span>Fast Gate Pass Scanner</span>
            </h2>
            <p className="text-xs theme-text-secondary mt-0.5">
              Scan student ID card or RFID badge for instant verification.
            </p>
          </div>

          <form onSubmit={handleScanSubmit} className="space-y-3.5 text-xs">
            {/* Direction Radio Toggle */}
            <div>
              <label className="block font-semibold mb-1.5 theme-text-secondary">Movement Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScanDirection("ENTRY")}
                  className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition border ${
                    scanDirection === "ENTRY"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm"
                      : "theme-bg-sub theme-border opacity-60 hover:opacity-100"
                  }`}
                >
                  <span>⬇ Campus Entry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScanDirection("EXIT")}
                  className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition border ${
                    scanDirection === "EXIT"
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm"
                      : "theme-bg-sub theme-border opacity-60 hover:opacity-100"
                  }`}
                >
                  <span>⬆ Campus Exit</span>
                </button>
              </div>
            </div>

            {/* Barcode / RFID Input */}
            <div>
              <label className="block font-semibold mb-1 theme-text-secondary">
                Barcode / Student Roll / RFID
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                autoFocus
                value={scanBarcode}
                onChange={(e) => setScanBarcode(e.target.value)}
                placeholder="Scan or type ID / Roll number..."
                className="w-full px-3 py-2.5 rounded-xl border theme-border theme-bg-sub theme-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Reason / Gate Pass Note */}
            <div>
              <label className="block font-semibold mb-1 theme-text-secondary">
                Gate Pass Reason (Optional)
              </label>
              <input
                type="text"
                value={scanReason}
                onChange={(e) => setScanReason(e.target.value)}
                placeholder="e.g., Medical visit, Family leave, Daily outing"
                className="w-full px-3 py-2 rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !scanBarcode.trim()}
              className="w-full py-2.5 rounded-xl font-bold theme-bg-accent text-white shadow-md hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 transition disabled:opacity-40"
            >
              <SaveIcon className="w-4 h-4" />
              <span>{submitting ? "Logging..." : "Log Gate Punch"}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Live Gate Movement Stream */}
        <div className="lg:col-span-2 border theme-border rounded-2xl p-4 theme-bg-surface shadow-md flex flex-col">
          {/* Header & Filter Controls */}
          <div className="border-b theme-border pb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <h2 className="font-bold text-sm">Recent Gate Movements</h2>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search person or roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                className="px-2.5 py-1.5 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              <select
                value={selectedDirection}
                onChange={(e) => setSelectedDirection(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Movements</option>
                <option value="ENTRY">Entries Only</option>
                <option value="EXIT">Exits Only</option>
              </select>
            </div>
          </div>

          {/* Logs List Table */}
          <div className="flex-1 overflow-x-auto pt-3">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 theme-text-secondary">
                <RefreshIcon className="w-5 h-5 animate-spin theme-accent" />
                <span className="text-xs">Loading gate stream...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 theme-text-secondary">
                <GateIcon className="w-8 h-8 opacity-40" />
                <span className="text-xs font-semibold">No gate movement records found.</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b theme-border theme-bg-sub/70 font-bold theme-text-secondary text-[11px] uppercase">
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5 text-center">Direction</th>
                    <th className="p-2.5">Person / Student</th>
                    <th className="p-2.5">Class / Roll</th>
                    <th className="p-2.5">Reason / Device</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border font-mono text-[11px]">
                  {logs.map((log) => {
                    const isEntry = log.direction === "ENTRY";
                    const punchTime = new Date(log.punch_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    });
                    const punchDate = new Date(log.punch_time).toLocaleDateString([], {
                      month: "short",
                      day: "numeric"
                    });

                    return (
                      <tr key={log.id} className="hover:theme-bg-elevated/40 transition">
                        <td className="p-2.5">
                          <span className="font-bold text-xs">{punchTime}</span>
                          <span className="text-[10px] theme-text-secondary block">{punchDate}</span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                              isEntry
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {isEntry ? "ENTRY" : "EXIT"}
                          </span>
                        </td>
                        <td className="p-2.5 font-sans font-semibold theme-text-primary">
                          {log.person_name || log.student_name || log.staff_name || "Unknown"}
                        </td>
                        <td className="p-2.5 font-sans">
                          {log.student_class_name ? (
                            <span>{log.student_class_name} (Roll: {log.student_roll})</span>
                          ) : (
                            <span className="theme-text-secondary">--</span>
                          )}
                        </td>
                        <td className="p-2.5 font-sans text-xs">
                          {log.gate_pass_reason ? (
                            <span className="theme-text-primary">{log.gate_pass_reason}</span>
                          ) : (
                            <span className="theme-text-secondary text-[11px] font-mono">{log.device_name || "Gate Scanner"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
