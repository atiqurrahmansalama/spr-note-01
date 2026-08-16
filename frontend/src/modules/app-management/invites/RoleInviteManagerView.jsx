import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";
import {
  KeyIcon,
  PlusIcon,
  QrCodeIcon,
  CopyIcon,
  BanIcon,
  TrashIcon,
  DownloadIcon,
  PrinterIcon,
  CloseIcon,
  DotsVerticalIcon,
  SparklesIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "../../../components/ui/Icons";
import CustomSelect from "../../../components/ui/CustomSelect";

export default function RoleInviteManagerView() {
  const { showToast } = useToast();
  const [invites, setInvites] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [deletingInvite, setDeletingInvite] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Action Menu Dropdown State
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuContainerRef = useRef(null);

  // Form states
  const [title, setTitle] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [expiryPreset, setExpiryPreset] = useState("24h");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Close 3-dots action menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeMenuId]);

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
        const roleList = data.results || data || [];
        setRoles(roleList);
        if (roleList.length > 0 && !targetRole) {
          setTargetRole(String(roleList[0].id));
        }
      }
    } catch {
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
        title: title.trim(),
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
        showToast(errData.error || errData.detail || "Failed to generate invite.", "error");
      }
    } catch {
      showToast("Network connection error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id) => {
    setActiveMenuId(null);
    try {
      const res = await fetchWithAuth(`/api/v1/admin/invites/${id}/revoke/`, {
        method: "POST",
      });
      if (res.ok) {
        showToast("Invitation token revoked.", "success");
        loadData();
      } else {
        showToast("Failed to revoke invitation.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    }
  };

  const handleDeleteInvite = async () => {
    if (!deletingInvite) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/v1/admin/invites/${deletingInvite.id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Invite '${deletingInvite.title}' deleted.`, "success");
        setDeletingInvite(null);
        loadData();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || errData.detail || "Failed to delete invite.", "error");
      }
    } catch {
      showToast("Network connection error.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const getJoinUrl = (token) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join?token=${token}`;
  };

  const copyLinkToClipboard = (token) => {
    setActiveMenuId(null);
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
            body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f8fafc; }
            .card { width: 340px; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); padding: 32px; text-align: center; border: 1px solid #e2e8f0; }
            .logo { font-size: 20px; font-weight: 800; color: #0284c7; margin-bottom: 20px; letter-spacing: -0.5px; }
            .qr-container { display: flex; justify-content: center; margin: 20px 0; }
            .title { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
            .role { display: inline-block; background: #e0f2fe; color: #0369a1; font-weight: 700; padding: 4px 14px; border-radius: 9999px; font-size: 11px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
            .instructions { font-size: 11px; color: #64748b; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">Suffah Notes</div>
            <div class="title">${selectedInvite.title}</div>
            <div class="role">${selectedInvite.target_role_name}</div>
            <div class="qr-container">${svgString}</div>
            <div class="instructions">Scan this QR code to claim your role and instantly onboard into the institutional portal.</div>
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

  const roleOptions = roles.map((r) => ({
    value: String(r.id),
    label: `${r.name} (${r.code})`,
    desc: `Assigns ${r.name} permissions on join`,
  }));

  const expiryOptions = [
    { value: "1h", label: "1 Hour Duration" },
    { value: "24h", label: "24 Hours (1 Day)" },
    { value: "7d", label: "7 Days (1 Week)" },
    { value: "30d", label: "30 Days (1 Month)" },
    { value: "never", label: "Never Expires (Permanent)" },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 font-sans theme-text-primary animate-fade-in select-none" ref={menuContainerRef}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-xs">
            <KeyIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
              Role QR &amp; Invite Links
            </h1>
            <p className="text-xs theme-text-secondary mt-0.5">
              Generate dynamic role-based onboarding invite tokens and printable QR cards
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 rounded-2xl theme-bg-accent theme-accent-text font-bold text-xs shadow-md hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Generate Role Invite &amp; QR</span>
        </button>
      </div>

      {/* Content List Table */}
      {loading ? (
        <div className="w-full theme-bg-elevated border theme-border rounded-3xl p-12 text-center animate-pulse shadow-xs">
          <div className="w-8 h-8 border-3 border-[var(--accent-main)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-xs font-bold theme-text-secondary">Loading onboarding invite tokens...</div>
        </div>
      ) : invites.length === 0 ? (
        <div className="w-full theme-bg-elevated border theme-border rounded-3xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl theme-bg-sub flex items-center justify-center mx-auto text-sky-400 shadow-inner">
            <QrCodeIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold theme-text-primary">No Invite Links Created Yet</h3>
          <p className="text-xs theme-text-secondary max-w-sm mx-auto">
            Click the button above to generate your first role onboarding link or QR card.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl theme-bg-elevated border theme-border shadow-xs overflow-visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b theme-border/40 theme-bg-sub/50 text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                  <th className="px-5 py-3.5">Title / Batch Label</th>
                  <th className="px-5 py-3.5">Target Role</th>
                  <th className="px-5 py-3.5 text-center">Usages</th>
                  <th className="px-5 py-3.5">Expires</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border/30">
                {invites.map((invite) => {
                  const isValid = invite.is_valid && invite.is_active;
                  const isMenuOpen = activeMenuId === invite.id;

                  return (
                    <tr
                      key={invite.id}
                      className="hover:theme-bg-sub/40 transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-bold theme-text-primary block">{invite.title}</span>
                        <span className="text-[10px] font-mono text-sky-400">
                          {invite.token?.slice(0, 16)}...
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">
                          {invite.target_role_name}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center font-bold">
                        {invite.max_uses === 0 ? (
                          <span className="theme-text-primary">{invite.used_count} / ∞</span>
                        ) : (
                          <span className="theme-text-primary">
                            {invite.used_count} / {invite.max_uses}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        {invite.expires_at ? (
                          <span className={new Date(invite.expires_at) < new Date() ? "text-rose-400 font-bold" : "theme-text-primary"}>
                            {new Date(invite.expires_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="theme-text-secondary">Never</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                            isValid
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isValid ? "bg-emerald-400" : "bg-rose-400"}`}></span>
                          {isValid ? "Active" : "Revoked"}
                        </span>
                      </td>

                      {/* 3-Dots Action Menu Dropdown */}
                      <td className="px-5 py-3.5 text-right relative">
                        <div className="inline-block text-left relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId((prev) => (prev === invite.id ? null : invite.id));
                            }}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                              isMenuOpen
                                ? "theme-bg-accent theme-accent-text border-[var(--accent-main)]"
                                : "theme-bg-sub hover:theme-bg-elevated theme-border theme-text-secondary hover:theme-text-primary"
                            }`}
                            title="Actions Menu"
                          >
                            <DotsVerticalIcon className="w-4 h-4" />
                          </button>

                          {/* Action Menu Popup */}
                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-2xl theme-bg-elevated border theme-border shadow-2xl p-1.5 space-y-1 animate-fade-in text-left"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInvite(invite);
                                  setShowQRModal(true);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold theme-text-primary hover:theme-bg-sub transition flex items-center gap-2 cursor-pointer"
                              >
                                <QrCodeIcon className="w-3.5 h-3.5 text-sky-400" />
                                <span>View QR Code</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => copyLinkToClipboard(invite.token)}
                                className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold theme-text-primary hover:theme-bg-sub transition flex items-center gap-2 cursor-pointer"
                              >
                                <CopyIcon className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copy Link</span>
                              </button>

                              {isValid && (
                                <button
                                  type="button"
                                  onClick={() => handleRevoke(invite.id)}
                                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition flex items-center gap-2 cursor-pointer"
                                >
                                  <BanIcon className="w-3.5 h-3.5" />
                                  <span>Revoke Invite</span>
                                </button>
                              )}

                              <div className="border-t theme-border/40 my-1"></div>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setDeletingInvite(invite);
                                }}
                                className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-2 cursor-pointer"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                                <span>Delete Invite</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- CREATE INVITE MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-lg theme-bg-elevated border theme-border rounded-3xl shadow-2xl overflow-hidden animate-zoom-in">
            {/* Header */}
            <div className="px-6 py-5 border-b theme-border flex justify-between items-center bg-black/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <KeyIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm theme-text-primary">Generate Role Invite &amp; QR</h3>
                  <p className="text-[11px] theme-text-secondary mt-0.5">
                    Create a tokenized URL and printable QR card for onboarding
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateInvite} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Title / Batch Label <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hifz Faculty Induction 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 text-xs font-medium theme-text-primary"
                  required
                />
              </div>

              <div>
                <CustomSelect
                  label="Target Assigned Role"
                  value={targetRole}
                  onChange={(val) => setTargetRole(val)}
                  options={roleOptions}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Max Allowed Usages
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 for unlimited uses"
                    value={maxUses}
                    onChange={(e) => setMaxUses(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-4 py-3 rounded-2xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)] text-xs font-medium theme-text-primary"
                  />
                  <p className="text-[10px] theme-text-secondary mt-1">
                    Set 0 for unlimited multi-person registration.
                  </p>
                </div>

                <div>
                  <CustomSelect
                    label="Token Expiration"
                    value={expiryPreset}
                    onChange={(val) => setExpiryPreset(val)}
                    options={expiryOptions}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t theme-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-2xl border theme-border hover:theme-bg-sub transition text-xs font-bold theme-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl font-bold text-xs theme-bg-accent theme-accent-text hover:opacity-90 transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <span>Generating...</span>
                  ) : (
                    <>
                      <SparklesIcon className="w-3.5 h-3.5" />
                      <span>Generate Invite Token</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- QR VIEWER & DOWNLOADER MODAL --- */}
      {showQRModal && selectedInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-md theme-bg-elevated border theme-border rounded-3xl shadow-2xl overflow-hidden animate-zoom-in">
            {/* Header */}
            <div className="px-6 py-4 border-b theme-border flex justify-between items-center bg-black/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <QrCodeIcon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm theme-text-primary">Onboarding QR Code</h3>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* QR Card */}
            <div className="p-6 text-center space-y-4">
              <div className="flex flex-col items-center">
                <h4 className="font-bold text-base theme-text-primary">{selectedInvite.title}</h4>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold uppercase tracking-wider mt-1 mb-4">
                  {selectedInvite.target_role_name}
                </span>

                {/* High Contrast White QR Card */}
                <div className="p-5 bg-white border border-zinc-200 rounded-3xl shadow-xl flex items-center justify-center">
                  <QRCodeSVG
                    id="invite-qr-svg"
                    value={getJoinUrl(selectedInvite.token)}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Download Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => downloadQR("png")}
                  className="px-4 py-2.5 rounded-2xl border theme-border hover:theme-bg-sub transition text-xs font-bold theme-text-primary cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <DownloadIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Download PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadQR("svg")}
                  className="px-4 py-2.5 rounded-2xl border theme-border hover:theme-bg-sub transition text-xs font-bold theme-text-primary cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <DownloadIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>Download SVG</span>
                </button>
              </div>

              {/* Print Card Button */}
              <button
                type="button"
                onClick={printOnboardingCard}
                className="w-full py-3 rounded-2xl font-bold text-xs theme-bg-accent theme-accent-text hover:opacity-90 transition cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>Print Physical Onboarding Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE INVITE CONFIRMATION MODAL --- */}
      {deletingInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-sm theme-bg-elevated border border-rose-500/40 rounded-3xl shadow-2xl p-6 space-y-4 animate-zoom-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangleIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold theme-text-primary">Delete Invite Link</h3>
                <p className="text-[11px] theme-text-secondary mt-0.5">Permanent token removal</p>
              </div>
            </div>

            <p className="text-xs theme-text-secondary leading-relaxed">
              Are you sure you want to permanently delete the invite token for{" "}
              <strong className="theme-text-primary">"{deletingInvite.title}"</strong>? Any user trying to onboard with this link will be rejected.
            </p>

            <div className="pt-3 border-t theme-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingInvite(null)}
                className="px-4 py-2 rounded-xl border theme-border hover:theme-bg-sub text-xs font-bold theme-text-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteInvite}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Deleting..." : "Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
