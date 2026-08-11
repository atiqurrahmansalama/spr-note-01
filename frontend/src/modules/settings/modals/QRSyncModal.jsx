import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";
import { auth as authStore } from "../../../utils/localStore";
import { CloseIcon, RefreshIcon } from "../components/Icons";

export default function QRSyncModal({ isOpen, onClose }) {
  const { showToast } = useToast();
  const [ticketId, setTicketId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(180);
  const [status, setStatus] = useState("loading"); // loading, pending, authorized, expired
  const [authorizedUser, setAuthorizedUser] = useState(null);

  const timerRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      generateTicket();
    } else {
      cleanupTimers();
    }
    return () => cleanupTimers();
  }, [isOpen]);

  const cleanupTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const generateTicket = async () => {
    cleanupTimers();
    setStatus("loading");
    setTimeLeft(180);
    setAuthorizedUser(null);

    try {
      const res = await fetchWithAuth("/api/v1/auth/qr/generate/", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTicketId(data.ticket_id);
        setStatus("pending");

        // Start Countdown Timer
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              cleanupTimers();
              setStatus("expired");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // Start Polling Status
        pollRef.current = setInterval(() => {
          checkTicketStatus(data.ticket_id);
        }, 2000);
      } else {
        setStatus("expired");
        showToast("Failed generating QR Session ticket.", "error");
      }
    } catch {
      setStatus("expired");
      showToast("Server offline for QR generation.", "error");
    }
  };

  const checkTicketStatus = async (tid) => {
    try {
      const res = await fetchWithAuth(`/api/v1/auth/qr/status/${tid}/`);
      if (res.ok) {
        const data = await res.json();

        if (data.status === "authorized") {
          cleanupTimers();
          setStatus("authorized");
          setAuthorizedUser(data.user || {});

          if (data.access && data.refresh) {
            authStore.saveAccessToken(data.access);
            authStore.saveRefreshToken(data.refresh);
            if (data.user) authStore.saveUser(data.user);
            window.dispatchEvent(new CustomEvent("spr_auth_updated"));

            showToast("Instant Cross-Device Login Authorized!", "success");
            setTimeout(() => {
              onClose();
              window.location.reload();
            }, 1800);
          }
        } else if (data.status === "expired") {
          cleanupTimers();
          setStatus("expired");
        }
      }
    } catch {
      // Keep polling silently
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="theme-bg-surface border theme-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 theme-text-primary relative text-center">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b theme-border pb-3.5 text-left">
          <div>
            <h2 className="text-base font-bold theme-text-primary tracking-tight">Instant QR Cross-Device Login</h2>
            <p className="text-xs theme-text-secondary mt-0.5">Scan to log into another device instantly</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Canvas Card */}
        <div className="theme-bg-sub border theme-border rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
          {status === "loading" ? (
            <div className="h-48 flex items-center justify-center text-xs font-mono theme-text-secondary animate-pulse">
              Generating secure QR session...
            </div>
          ) : status === "authorized" ? (
            <div className="h-48 flex flex-col items-center justify-center space-y-3 text-emerald-400 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl font-bold">
                ✓
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Login Authorized!</h4>
                <p className="text-xs theme-text-secondary font-mono mt-0.5">
                  Connected as {authorizedUser?.name || "Logged User"}
                </p>
              </div>
            </div>
          ) : status === "expired" ? (
            <div className="h-48 flex flex-col items-center justify-center space-y-3">
              <p className="text-xs text-rose-400 font-mono">QR Session Expired</p>
              <button
                type="button"
                onClick={generateTicket}
                className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <RefreshIcon className="w-3.5 h-3.5" />
                <span>Generate New Code</span>
              </button>
            </div>
          ) : (
            <>
              {/* Active QR Code Display */}
              <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-zinc-800">
                <QRCodeCanvas
                  value={`https://${window.location.host}/qr-auth?ticket=${ticketId}`}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Countdown badge */}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-mono font-semibold theme-text-secondary">
                  Expires in <span className="theme-text-primary font-bold">{formattedTime}</span>
                </span>
              </div>
            </>
          )}
        </div>

        {/* Instructions */}
        <p className="text-xs theme-text-secondary font-normal px-2">
          Open SPR Note on your logged-in phone or device, tap <span className="theme-text-primary font-medium">Scan QR to Login</span>, and point camera here.
        </p>

        {/* Footer */}
        <div className="pt-3 border-t theme-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl theme-bg-sub hover:theme-bg-elevated text-xs font-semibold theme-text-primary transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
