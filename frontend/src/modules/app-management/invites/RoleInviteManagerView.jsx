import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";

export default function RoleInviteManagerView() {
  const { showToast } = useToast();
  const [invites, setInvites] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);

  // Form states
  const [title, setTitle] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [expiryPreset, setExpiryPreset] = useState("24h"); // "1h", "24h", "7d", "30d", "never"
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, roleRes] = await Promise.all([
        fetchWithAuth("/api/v1/admin/invites/"),
        fetchWithAuth("/api/v1/admin/roles/"),
      ]);

      if (invRes.ok) {
        const data = await invRes.json();
        setInvites(data.results || data);
      }
      if (roleRes.ok) {
        const data = await roleRes.json();
        setRoles(data.results || data);
        if (data.length > 0) {
          setTargetRole(data[0].id);
        }
      }
    } catch (err) {
      showToast("Failed to load invites and roles.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Please enter a title.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      // Calculate expires_at datetime
      let expires_at = null;
      if (expiryPreset !== "never") {
        const now = new Date();
        if (expiryPreset === "1h") now.setHours(now.getHours() + 1);
        else if (expiryPreset === "24h") now.setDate(now.getDate() + 1);
        else if (expiryPreset === "7d") now.setDate(now.getDate() + 7);
        else if (expiryPreset === "30d") now.setDate(now.getDate() + 30);
        expires_at = now.toISOString();
      }

      const payload = {
        title,
        target_role: parseInt(targetRole),
        max_uses: parseInt(maxUses) || 0,
        expires_at,
        is_active: true,
      };

      const res = await fetchWithAuth("/api/v1/admin/invites/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("Invite generated successfully!", "success");
        setShowCreateModal(false);
        setTitle("");
        setMaxUses(1);
        setExpiryPreset("24h");
        loadData();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to generate invite.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this onboarding link?")) return;

    try {
      const res = await fetchWithAuth(`/api/v1/admin/invites/${id}/revoke/`, {
        method: "POST",
      });
      if (res.ok) {
        showToast("Invitation revoked.", "success");
        loadData();
      } else {
        showToast("Failed to revoke invitation.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    }
  };

  const getJoinUrl = (token) => {
    const base = window.location.origin;
    return `${base}/join?token=${token}`;
  };

  const copyLinkToClipboard = (token) => {
    const url = getJoinUrl(token);
    navigator.clipboard.writeText(url);
    showToast("Join link copied to clipboard!", "success");
  };

  const downloadQR = (format = "png") => {
    const svgEl = document.getElementById("invite-qr-svg");
    if (!svgEl) return;
    
    const svgString = new XMLSerializer().serializeToString(svgEl);
    
    if (format === "svg") {
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = `invite_${selectedInvite.title.replace(/\s+/g, "_")}_qr.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } else {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        canvas.width = 512;
        canvas.height = 512;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, 512, 512);
        ctx.drawImage(img, 24, 24, 464, 464);
        URL.revokeObjectURL(svgUrl);
        
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `invite_${selectedInvite.title.replace(/\s+/g, "_")}_qr.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      };
      img.src = svgUrl;
    }
  };

  const printOnboardingCard = () => {
    const svgEl = document.getElementById("invite-qr-svg");
    if (!svgEl) return;
    const svgString = new XMLSerializer().serializeToString(svgEl);
    
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Onboarding Card</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f4f4f5; }
            .card { width: 350px; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 32px; text-align: center; border: 1px solid #e4e4e7; }
            .logo { font-size: 24px; font-weight: bold; color: #0284c7; margin-bottom: 24px; }
            .qr-container { display: flex; justify-content: center; margin: 24px 0; }
            .title { font-size: 18px; font-weight: 700; color: #18181b; margin-bottom: 8px; }
            .role { display: inline-block; background: #e0f2fe; color: #0369a1; font-weight: 600; padding: 4px 12px; border-radius: 9999px; font-size: 12px; margin-bottom: 16px; text-transform: uppercase; }
            .instructions { font-size: 12px; color: #71717a; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">Suffah Notes</div>
            <div class="title">${selectedInvite.title}</div>
            <div class="role">${selectedInvite.target_role_name}</div>
            <div class="qr-container">${svgString}</div>
            <div class="instructions">Scan this QR code to instantly claim your role and onboard into the platform.</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 font-sans theme-text-primary animate-fade-in select-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Role QR &amp; Invite Links</h1>
          <p className="text-sm theme-text-secondary mt-1">Generate dynamic role-based onboarding invite links and printable QR cards.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl font-bold text-sm theme-bg-accent theme-accent-text hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-md"
        >
          <span>➕</span> Generate Role Invite &amp; QR
        </button>
      </div>

      {loading ? (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-12 text-center animate-pulse">
          <div className="h-6 w-32 bg-zinc-800 rounded mx-auto mb-4" />
          <div className="h-4 w-48 bg-zinc-800 rounded mx-auto" />
        </div>
      ) : invites.length === 0 ? (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">🎫</div>
          <h3 className="text-lg font-bold">No invite links created yet</h3>
          <p className="text-sm theme-text-secondary mt-1">Click the button above to generate your first onboarding invite token.</p>
        </div>
      ) : (
        <div className="overflow-hidden border theme-border rounded-2xl theme-bg-surface shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b theme-border text-xs font-semibold theme-text-secondary uppercase tracking-wider bg-black/10">
                <th className="px-6 py-4">Title / Batch</th>
                <th className="px-6 py-4">Target Role</th>
                <th className="px-6 py-4">Uses</th>
                <th className="px-6 py-4">Expires</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border text-sm">
              {invites.map((invite) => {
                const isValid = invite.is_valid && invite.is_active;
                return (
                  <tr key={invite.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-semibold">{invite.title}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wide">
                        {invite.target_role_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {invite.max_uses === 0 ? (
                        <span>{invite.used_count} / Unlimited</span>
                      ) : (
                        <span>
                          {invite.used_count} / {invite.max_uses}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {invite.expires_at ? (
                        <span className={new Date(invite.expires_at) < new Date() ? "text-rose-400" : ""}>
                          {new Date(invite.expires_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-zinc-500">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isValid ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedInvite(invite);
                              setShowQRModal(true);
                            }}
                            className="p-1.5 rounded-lg border theme-border hover:theme-bg-elevated transition-colors text-xs font-bold cursor-pointer"
                            title="View QR Code"
                          >
                            🖼️ QR
                          </button>
                          <button
                            onClick={() => copyLinkToClipboard(invite.token)}
                            className="p-1.5 rounded-lg border theme-border hover:theme-bg-elevated transition-colors text-xs font-bold cursor-pointer"
                            title="Copy Link"
                          >
                            🔗 Copy
                          </button>
                          <button
                            onClick={() => handleRevoke(invite.id)}
                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors text-xs font-bold cursor-pointer"
                            title="Revoke Link"
                          >
                            🚫 Revoke
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                          Inactive / Expired
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- CREATE INVITE MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md theme-bg-surface border theme-border rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 border-b theme-border flex justify-between items-center bg-black/20">
              <h3 className="font-bold text-lg">Generate Role Invite &amp; QR</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white cursor-pointer font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Title / Batch Label</label>
                <input
                  type="text"
                  placeholder="e.g. Hifz Teachers Batch 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-elevated focus:outline-none focus:border-sky-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Target Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-elevated focus:outline-none focus:border-sky-500 text-sm"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Max Usages</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 for unlimited"
                    value={maxUses}
                    onChange={(e) => setMaxUses(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-elevated focus:outline-none focus:border-sky-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Expires In</label>
                  <select
                    value={expiryPreset}
                    onChange={(e) => setExpiryPreset(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-elevated focus:outline-none focus:border-sky-500 text-sm"
                  >
                    <option value="1h">1 Hour</option>
                    <option value="24h">24 Hours</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                    <option value="never">Never (Unlimited)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t theme-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border theme-border hover:theme-bg-elevated transition-colors text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm theme-bg-accent theme-accent-text hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-55"
                >
                  {submitting ? "Generating..." : "⚡ Generate Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- QR VIEWER & DOWNLOADER MODAL --- */}
      {showQRModal && selectedInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm theme-bg-surface border theme-border rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 border-b theme-border flex justify-between items-center bg-black/20">
              <h3 className="font-bold text-lg">Onboarding QR Code</h3>
              <button onClick={() => setShowQRModal(false)} className="text-zinc-400 hover:text-white cursor-pointer font-bold">✕</button>
            </div>
            <div className="p-6 text-center space-y-4">
              <div className="flex flex-col items-center">
                <h4 className="font-bold text-base">{selectedInvite.title}</h4>
                <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold uppercase tracking-wider mt-1 mb-4">
                  {selectedInvite.target_role_name}
                </span>
                <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-inner flex items-center justify-center">
                  <QRCodeSVG
                    id="invite-qr-svg"
                    value={getJoinUrl(selectedInvite.token)}
                    size={220}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4">
                <button
                  onClick={() => downloadQR("png")}
                  className="px-3 py-2 rounded-xl border theme-border hover:theme-bg-elevated transition-colors text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  💾 Download PNG
                </button>
                <button
                  onClick={() => downloadQR("svg")}
                  className="px-3 py-2 rounded-xl border theme-border hover:theme-bg-elevated transition-colors text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  🎨 Download SVG
                </button>
              </div>

              <button
                onClick={printOnboardingCard}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                🖨️ Print Onboarding Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
