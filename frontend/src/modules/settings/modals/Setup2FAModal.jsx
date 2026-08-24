import { useState, useEffect } from "react";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";
import { CloseIcon, LockIcon } from "../../../components/ui/Icons";

export default function Setup2FAModal({ isOpen, onClose, is2FAEnabled, onStatusChanged }) {
  const { showToast } = useToast();
  const [step, setStep] = useState(1); // 1: Setup QR, 2: Verify PIN, 3: Backup Codes
  const [secret, setSecret] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPinCode("");
      setBackupCodes([]);
      if (!is2FAEnabled) {
        initiateSetup();
      }
    }
  }, [isOpen, is2FAEnabled]);

  const initiateSetup = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/auth/2fa/setup/", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSecret(data.secret);
        setQrCodeBase64(data.qr_code_base64);
      } else {
        showToast("Failed setting up 2FA.", "error");
      }
    } catch {
      showToast("Server offline for 2FA setup.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!pinCode || pinCode.length < 6) {
      showToast("Please enter a valid 6-digit PIN code.", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/auth/2fa/enable/", {
        method: "POST",
        body: JSON.stringify({ code: pinCode }),
      });

      if (res.ok) {
        const data = await res.json();
        setBackupCodes(data.backup_codes || []);
        setStep(3);
        showToast("2FA Enabled successfully!", "success");
        if (onStatusChanged) onStatusChanged(true);
      } else {
        const err = await res.json();
        showToast(err.error || "Invalid 6-digit code. Check authenticator app.", "error");
      }
    } catch {
      showToast("Verification failed. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setDisabling(true);
    try {
      const res = await fetchWithAuth("/api/v1/auth/2fa/disable/", { method: "POST" });
      if (res.ok) {
        showToast("Disabled Two-Factor Authentication.", "info");
        if (onStatusChanged) onStatusChanged(false);
        onClose();
      } else {
        showToast("Failed disabling 2FA.", "error");
      }
    } catch {
      showToast("Error disabling 2FA.", "error");
    } finally {
      setDisabling(false);
    }
  };

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    showToast("Secret key copied to clipboard!", "info");
  };

  const handleDownloadBackupCodes = () => {
    if (!backupCodes || backupCodes.length === 0) return;
    const textContent = `SPR NOTE SUITE — EMERGENCY BACKUP RECOVERY CODES\n` +
      `Generated on: ${new Date().toLocaleString()}\n\n` +
      `Keep these single-use recovery codes in a secure offline location.\n\n` +
      backupCodes.map((c, i) => `${i + 1}. ${c}`).join("\n");

    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spr-note-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded backup recovery codes!", "success");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="theme-bg-surface border theme-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 theme-text-primary relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b theme-border pb-3.5">
          <div>
            <h2 className="text-base font-bold theme-text-primary tracking-tight">Two-Factor Authentication (2FA)</h2>
            <p className="text-xs theme-text-secondary mt-0.5">Secure your account using Google Authenticator / Authy</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Existing 2FA Active view */}
        {is2FAEnabled && step !== 3 ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                ✓
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">2FA Protection Active</h4>
                <p className="text-[11px] theme-text-secondary mt-0.5 font-mono">
                  Your account is protected by TOTP authenticator security.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDisable2FA}
              disabled={disabling}
              className="w-full py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-98"
            >
              {disabling ? "Disabling..." : "Disable Two-Factor Authentication"}
            </button>
          </div>
        ) : (
          <>
            {/* Step 1: Scan QR Code */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-left space-y-1">
                  <span className="text-[10px] font-mono theme-accent theme-bg-accent-soft px-2 py-0.5 rounded font-semibold">
                    Step 1 of 3
                  </span>
                  <h3 className="text-xs font-bold theme-text-primary">Scan QR Code or Enter Secret Key</h3>
                </div>

                <div className="theme-bg-sub border theme-border rounded-2xl p-4 flex flex-col items-center justify-center space-y-3">
                  {loading ? (
                    <div className="h-40 flex items-center justify-center text-xs font-mono theme-text-secondary animate-pulse">
                      Generating TOTP QR code...
                    </div>
                  ) : (
                    <>
                      {qrCodeBase64 && (
                        <img src={qrCodeBase64} alt="2FA QR Code" className="w-40 h-40 bg-white p-2 rounded-xl border-2 theme-border shadow-md" />
                      )}
                      <div className="w-full space-y-1">
                        <span className="text-[10px] theme-text-secondary font-mono block">Secret Key:</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={secret}
                            className="theme-bg-elevated border theme-border rounded-lg px-3 py-1.5 text-xs font-mono theme-text-primary w-full select-all"
                          />
                          <button
                            type="button"
                            onClick={handleCopySecret}
                            className="px-3 py-1.5 rounded-lg theme-bg-accent theme-accent-text text-xs font-semibold cursor-pointer shrink-0"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold transition-all cursor-pointer active:scale-98 shadow-sm"
                >
                  Next: Verify Code &rarr;
                </button>
              </div>
            )}

            {/* Step 2: Verification PIN */}
            {step === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="text-left space-y-1">
                  <span className="text-[10px] font-mono theme-accent theme-bg-accent-soft px-2 py-0.5 rounded font-semibold">
                    Step 2 of 3
                  </span>
                  <h3 className="text-xs font-bold theme-text-primary">Enter 6-Digit Authenticator Code</h3>
                </div>

                <div className="theme-bg-sub border theme-border rounded-2xl p-5 space-y-3">
                  <label className="text-xs font-medium theme-text-secondary block">
                    6-Digit Code from Authenticator App
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full theme-bg-elevated border theme-border rounded-xl px-4 py-2.5 text-center text-xl font-mono tracking-widest theme-text-primary focus:outline-none focus:border-[var(--accent-main)] transition-colors"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-2.5 rounded-xl theme-bg-sub hover:theme-bg-elevated text-xs font-semibold theme-text-secondary transition-all cursor-pointer"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || pinCode.length < 6}
                    className="w-2/3 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold transition-all cursor-pointer disabled:opacity-40 shadow-sm active:scale-98"
                  >
                    {loading ? "Verifying..." : "Verify & Enable 2FA"}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Emergency Backup Codes */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="text-left space-y-1">
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-semibold">
                    Step 3 of 3 — Complete!
                  </span>
                  <h3 className="text-xs font-bold theme-text-primary">Emergency Backup Recovery Codes</h3>
                </div>

                <div className="theme-bg-sub border theme-border rounded-2xl p-4 space-y-3">
                  <p className="text-[11px] theme-text-secondary font-mono">
                    Save these single-use recovery codes in a safe place. If you lose your phone, you can use these to sign in.
                  </p>

                  <div className="grid grid-cols-2 gap-2 bg-zinc-950/80 border theme-border p-3 rounded-xl font-mono text-xs text-emerald-400">
                    {backupCodes.map((code, idx) => (
                      <div key={idx} className="p-1 rounded theme-bg-elevated text-center border theme-border">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBackupCodes}
                    className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                    Download Backup Codes (.txt)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 rounded-xl theme-bg-sub hover:theme-bg-elevated text-xs font-semibold theme-text-primary"
                >
                  Done
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
