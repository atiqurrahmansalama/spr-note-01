import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "../../../context/ToastContext";
import { useRightSidebar } from "../../../context/RightSidebarContext";
import { fetchWithAuth } from "../../../utils/authService";
import {
  KeyIcon,
  PlusIcon,
  QrCodeIcon,
  CopyIcon,
  BanIcon,
  TrashIcon,
  DownloadIcon,
  CloseIcon,
  DotsVerticalIcon,
  ShareIcon,
  AlertTriangleIcon,
} from "../../../components/ui/Icons";
import RoleInviteCreateForm from "./RoleInviteCreateForm";

export default function RoleInviteManagerView() {
  const { showToast } = useToast();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const [invites, setInvites] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [deletingInvite, setDeletingInvite] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Action Menu Dropdown State
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuDirection, setMenuDirection] = useState("down");
  const menuContainerRef = useRef(null);

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
      }
    } catch {
      showToast("Failed to load invites and roles.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateInSidebar = () => {
    openRightSidebar({
      title: "Generate Role Invite & QR",
      width: 620,
      content: (
        <RoleInviteCreateForm
          roles={roles}
          onSaved={() => {
            loadData();
            closeRightSidebar();
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
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

  const handleToggleMenu = (e, inviteId) => {
    e.stopPropagation();
    if (activeMenuId === inviteId) {
      setActiveMenuId(null);
      return;
    }

    // Detect if click is near bottom of viewport to open menu upward
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 220) {
      setMenuDirection("up");
    } else {
      setMenuDirection("down");
    }
    setActiveMenuId(inviteId);
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

  const handleShareInviteAndQR = async () => {
    if (!selectedInvite) return;
    const url = getJoinUrl(selectedInvite.token);
    const shareText = `You're invited to join "${selectedInvite.title}" on Suffah Notes.\nRole: ${selectedInvite.target_role_name}\nDirect link to claim role: ${url}`;

    // 1. Copy message and link to clipboard first
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // fallback
    }

    // 2. Prepare QR Image Blob for Native Web Share API if supported
    const svgEl = document.getElementById("invite-qr-svg");
    if (svgEl) {
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      img.onload = async () => {
        canvas.width = 512;
        canvas.height = 512;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, 512, 512);
        ctx.drawImage(img, 24, 24, 464, 464);
        URL.revokeObjectURL(svgUrl);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            showToast("Invite text & link copied to clipboard!", "success");
            return;
          }

          const file = new File([blob], `invite_${selectedInvite.title.replace(/\s+/g, "_")}.png`, {
            type: "image/png",
          });

          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: selectedInvite.title,
                text: shareText,
                url: url,
                files: [file],
              });
              showToast("Shared successfully!", "success");
              return;
            } catch (err) {
              if (err.name !== "AbortError") {
                showToast("Invite message & link copied to clipboard!", "success");
              }
              return;
            }
          }

          // Desktop fallback: Download image and announce text copy
          downloadQR("png");
          showToast("Invite link copied & QR image downloaded!", "success");
        }, "image/png");
      };
      img.src = svgUrl;
    } else {
      showToast("Invite text & link copied to clipboard!", "success");
    }
  };

  return (
    <div
      className="w-full max-w-6xl mx-auto py-6 px-4 font-sans theme-text-primary animate-fade-in select-none"
      ref={menuContainerRef}
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center text-[var(--accent-main)] shadow-xs">
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
          onClick={handleOpenCreateInSidebar}
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
          <div className="w-12 h-12 rounded-2xl theme-bg-sub flex items-center justify-center mx-auto text-[var(--accent-main)] shadow-inner">
            <QrCodeIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold theme-text-primary">No Invite Links Created Yet</h3>
          <p className="text-xs theme-text-secondary max-w-sm mx-auto">
            Click the button above to generate your first role onboarding link or QR card.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl theme-bg-elevated border theme-border shadow-xs pb-32">
          <div className="overflow-x-auto">
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
                        <span className="text-[10px] font-mono text-[var(--accent-main)]">
                          {invite.token?.slice(0, 16)}...
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold theme-bg-sub text-[var(--accent-main)] border theme-border uppercase tracking-wider">
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

                      {/* 3-Dots Action Menu Dropdown with Smart Up/Down Orientation */}
                      <td className="px-5 py-3.5 text-right relative">
                        <div className="inline-block text-left relative">
                          <button
                            type="button"
                            onClick={(e) => handleToggleMenu(e, invite.id)}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                              isMenuOpen
                                ? "theme-bg-accent theme-accent-text border-[var(--accent-main)]"
                                : "theme-bg-sub hover:theme-bg-elevated theme-border theme-text-secondary hover:theme-text-primary"
                            }`}
                            title="Actions Menu"
                          >
                            <DotsVerticalIcon className="w-4 h-4" />
                          </button>

                          {/* Action Menu Popup (Opens Upward if near bottom) */}
                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute right-0 z-[100] w-48 rounded-2xl theme-bg-elevated border theme-border shadow-2xl p-1.5 space-y-1 animate-fade-in text-left ${
                                menuDirection === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"
                              }`}
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
                                <QrCodeIcon className="w-3.5 h-3.5 text-[var(--accent-main)]" />
                                <span>View &amp; Share QR</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => copyLinkToClipboard(invite.token)}
                                className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold theme-text-primary hover:theme-bg-sub transition flex items-center gap-2 cursor-pointer"
                              >
                                <CopyIcon className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copy Join Link</span>
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

      {/* --- QR VIEWER, DOWNLOADER & SHARER MODAL (Portaled with z-[9999]) --- */}
      {showQRModal && selectedInvite && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-fade-in">
          <div className="w-full max-w-md theme-bg-elevated border theme-border rounded-3xl shadow-2xl overflow-hidden animate-zoom-in">
            {/* Header */}
            <div className="px-6 py-4 border-b theme-border flex justify-between items-center bg-black/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl theme-bg-sub border theme-border flex items-center justify-center text-[var(--accent-main)]">
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

            {/* QR Card Body */}
            <div className="p-6 text-center space-y-4">
              <div className="flex flex-col items-center">
                <h4 className="font-bold text-base theme-text-primary">{selectedInvite.title}</h4>
                <span className="px-2.5 py-0.5 rounded-full theme-bg-sub text-[var(--accent-main)] border theme-border text-[10px] font-bold uppercase tracking-wider mt-1 mb-4">
                  {selectedInvite.target_role_name}
                </span>

                {/* High Contrast White QR Card Container */}
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

              {/* Direct Share Button (With QR image + Invite Message & Link) */}
              <button
                type="button"
                onClick={handleShareInviteAndQR}
                className="w-full py-3 rounded-2xl font-bold text-xs theme-bg-accent theme-accent-text hover:opacity-90 transition cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <ShareIcon className="w-4 h-4" />
                <span>Share QR Code &amp; Invite Link</span>
              </button>

              {/* Download Format Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => downloadQR("png")}
                  className="px-4 py-2.5 rounded-2xl border theme-border hover:theme-bg-sub transition text-xs font-bold theme-text-primary cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <DownloadIcon className="w-3.5 h-3.5 text-[var(--accent-main)]" />
                  <span>Download PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadQR("svg")}
                  className="px-4 py-2.5 rounded-2xl border theme-border hover:theme-bg-sub transition text-xs font-bold theme-text-primary cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <DownloadIcon className="w-3.5 h-3.5 text-[var(--accent-main)]" />
                  <span>Download SVG</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- DELETE INVITE CONFIRMATION MODAL (Portaled with z-[9999]) --- */}
      {deletingInvite && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-fade-in">
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
              <strong className="theme-text-primary">"{deletingInvite.title}"</strong>? Any user attempting to onboard with this link will be rejected.
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
        </div>,
        document.body
      )}
    </div>
  );
}
