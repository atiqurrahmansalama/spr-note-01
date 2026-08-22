import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "../../../context/ToastContext";
import { useRightSidebar, useDrawerRegistration } from "../../../context/RightSidebarContext";
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
  const { openDrawer, closeDrawer } = useRightSidebar();

  const [invites, setInvites] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [deletingInvite, setDeletingInvite] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Action Menu Portal State
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, openUpward: false });
  const menuRef = useRef(null);

  const loadData = useCallback(async () => {
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
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close 3-dots action menu on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    const handleScrollOrResize = () => {
      if (activeMenuId) setActiveMenuId(null);
    };

    if (activeMenuId) {
      document.addEventListener("mousedown", handleOutsideClick);
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [activeMenuId]);

  // Universal Drawer Registration for Role Invite (survives F5 refresh)
  useDrawerRegistration(
    "invite",
    () => {
      return {
        title: "Generate Role Invite & QR",
        category: "Role Management & Invites",
        width: 620,
        content: (
          <RoleInviteCreateForm
            roles={roles}
            onSaved={() => {
              loadData();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [roles, loadData, closeDrawer]
  );

  const handleOpenCreateInSidebar = () => {
    openDrawer("invite");
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

  // Trigger 3-dots menu with precise viewport coordinates
  const handleToggleMenu = (e, inviteId) => {
    e.stopPropagation();
    if (activeMenuId === inviteId) {
      setActiveMenuId(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = 180;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight;

    const top = openUpward ? rect.top - 6 : rect.bottom + 6;
    const left = Math.max(12, rect.right - menuWidth);

    setMenuPosition({ top, left, openUpward });
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
    const baseUrl = window.location.origin;
    const shareText = `You're invited to join "${selectedInvite.title}" on SPR App.\nRole: ${selectedInvite.target_role_name}\nDirect link to claim role: ${baseUrl}/join`;

    const svgEl = document.getElementById("invite-qr-svg");
    if (!svgEl) return;

    const svgString = new XMLSerializer().serializeToString(svgEl);
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

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], `invite_${selectedInvite.title.replace(/\s+/g, "_")}.png`, {
          type: "image/png",
        });

        if (navigator.share) {
          try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                text: shareText,
                files: [file],
              });
            } else {
              await navigator.share({
                text: shareText,
              });
            }
            showToast("Shared successfully!", "success");
            return;
          } catch (err) {
            if (err.name === "AbortError") {
              // User cancelled share dialog
              return;
            }
          }
        }

        // Fallback for browsers without Web Share: copy concise text and download QR
        try {
          await navigator.clipboard.writeText(shareText);
        } catch {
          // ignore
        }
        downloadQR("png");
        showToast("QR image downloaded & invite text copied!", "success");
      }, "image/png");
    };
    img.src = svgUrl;
  };

  const activeInvite = invites.find((i) => i.id === activeMenuId);

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 font-sans theme-text-primary animate-fade-in select-none">
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
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-12 text-center animate-pulse shadow-xs">
          <div className="w-8 h-8 border-3 border-[var(--accent-main)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-xs font-bold theme-text-secondary">Loading onboarding invite tokens...</div>
        </div>
      ) : invites.length === 0 ? (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl theme-bg-sub flex items-center justify-center mx-auto text-[var(--accent-main)] shadow-inner">
            <QrCodeIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold theme-text-primary">No Invite Links Created Yet</h3>
          <p className="text-xs theme-text-secondary max-w-sm mx-auto">
            Click the button above to generate your first role onboarding link or QR card.
          </p>
        </div>
      ) : (
        /* Natural height table card (no artificial bottom padding) */
        <div className="rounded-2xl theme-bg-surface border theme-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b theme-border theme-bg-sub text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                  <th className="px-5 py-3.5">Title / Batch Label</th>
                  <th className="px-5 py-3.5">Target Role</th>
                  <th className="px-5 py-3.5 text-center">Usages</th>
                  <th className="px-5 py-3.5">Expires</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {invites.map((invite) => {
                  const isValid = invite.is_valid && invite.is_active;
                  const isMenuOpen = activeMenuId === invite.id;

                  return (
                    <tr
                      key={invite.id}
                      className="hover:theme-bg-sub/60 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-bold theme-text-primary block">{invite.title}</span>
                        <span className="text-[10px] font-mono theme-text-secondary opacity-75">
                          {invite.token?.slice(0, 16)}...
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold theme-bg-sub theme-text-secondary border theme-border uppercase tracking-wider">
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
                          <span className={new Date(invite.expires_at) < new Date() ? "theme-danger font-bold" : "theme-text-primary"}>
                            {new Date(invite.expires_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="theme-text-secondary">Never</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border theme-border ${
                            isValid
                              ? "theme-bg-accent-soft theme-accent"
                              : "theme-bg-danger-soft theme-danger"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isValid ? "theme-bg-accent" : "bg-[var(--danger-main)]"
                            }`}
                          ></span>
                          {isValid ? "Active" : "Revoked"}
                        </span>
                      </td>

                      {/* 3-Dots Action Menu Trigger Button */}
                      <td className="px-5 py-3.5 text-right">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- 3-DOTS ACTION MENU PORTAL (Rendered at root with z-[9999], never clipped!) --- */}
      {activeMenuId && activeInvite && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: menuPosition.openUpward ? undefined : `${menuPosition.top}px`,
            bottom: menuPosition.openUpward ? `${window.innerHeight - menuPosition.top}px` : undefined,
            left: `${menuPosition.left}px`,
            zIndex: 9999,
          }}
          className="w-48 rounded-2xl theme-bg-elevated border theme-border shadow-2xl p-1.5 space-y-1 animate-fade-in select-none text-left"
        >
          <button
            type="button"
            onClick={() => {
              setSelectedInvite(activeInvite);
              setShowQRModal(true);
              setActiveMenuId(null);
            }}
            className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold theme-text-primary hover:theme-bg-sub transition flex items-center gap-2 cursor-pointer group"
          >
            <QrCodeIcon className="w-3.5 h-3.5 theme-text-secondary group-hover:theme-text-primary" />
            <span>View &amp; Share QR</span>
          </button>

          <button
            type="button"
            onClick={() => copyLinkToClipboard(activeInvite.token)}
            className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold theme-text-primary hover:theme-bg-sub transition flex items-center gap-2 cursor-pointer group"
          >
            <CopyIcon className="w-3.5 h-3.5 theme-text-secondary group-hover:theme-text-primary" />
            <span>Copy Join Link</span>
          </button>

          {activeInvite.is_valid && activeInvite.is_active && (
            <button
              type="button"
              onClick={() => handleRevoke(activeInvite.id)}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition flex items-center gap-2 cursor-pointer"
            >
              <BanIcon className="w-3.5 h-3.5" />
              <span>Revoke Invite</span>
            </button>
          )}

          <div className="border-t theme-border my-1"></div>

          <button
            type="button"
            onClick={() => {
              setActiveMenuId(null);
              setDeletingInvite(activeInvite);
            }}
            className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold theme-danger hover:theme-bg-danger-soft transition flex items-center gap-2 cursor-pointer"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            <span>Delete Invite</span>
          </button>
        </div>,
        document.body
      )}

      {/* --- QR VIEWER, DOWNLOADER & SHARER MODAL (Portaled with z-[9999]) --- */}
      {showQRModal && selectedInvite && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-fade-in">
          <div className="w-full max-w-md theme-bg-elevated border theme-border rounded-3xl shadow-2xl overflow-hidden animate-zoom-in">
            {/* Header */}
            <div className="px-6 py-4 border-b theme-border flex justify-between items-center theme-bg-sub">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl theme-bg-elevated border theme-border flex items-center justify-center theme-text-primary">
                  <QrCodeIcon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm theme-text-primary">Onboarding QR Code</h3>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* QR Card Body */}
            <div className="p-6 text-center space-y-4">
              <div className="flex flex-col items-center">
                <h4 className="font-bold text-base theme-text-primary">{selectedInvite.title}</h4>
                <span className="px-2.5 py-0.5 rounded-full theme-bg-sub theme-text-secondary border theme-border text-[10px] font-bold uppercase tracking-wider mt-1 mb-4">
                  {selectedInvite.target_role_name}
                </span>

                {/* High Contrast QR Card Container */}
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
                  <DownloadIcon className="w-3.5 h-3.5 theme-text-secondary" />
                  <span>Download PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadQR("svg")}
                  className="px-4 py-2.5 rounded-2xl border theme-border hover:theme-bg-sub transition text-xs font-bold theme-text-primary cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <DownloadIcon className="w-3.5 h-3.5 theme-text-secondary" />
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
          <div className="w-full max-w-sm theme-bg-elevated border theme-border rounded-3xl shadow-2xl p-6 space-y-4 animate-zoom-in">
            <div className="flex items-center gap-3 theme-danger">
              <div className="w-10 h-10 rounded-2xl theme-bg-danger-soft border theme-border flex items-center justify-center">
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
                className="px-5 py-2 rounded-xl bg-[var(--danger-main)] hover:opacity-90 text-white text-xs font-bold cursor-pointer transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
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
