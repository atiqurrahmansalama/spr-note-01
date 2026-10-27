import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  MailIcon,
  RefreshIcon,
  SendIcon,
  CheckIcon,
  SpinnerIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  DesktopIcon,
} from "../../../components/ui/Icons";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { useRightSidebar, useDrawerRegistration } from "../../../context/RightSidebarContext";
import { EmailTemplateRightSidebarPreview } from "./EmailTemplateRightSidebarPreview";
import type { DeveloperToolsSectionItem } from "./types";

export interface TemplateFieldMeta {
  key: string;
  label: string;
  default: string;
  type?: "text" | "url" | "email";
}

export interface EmailTemplateItem {
  id: string;
  title: string;
  template_path: string;
  category: string;
  description: string;
  default_subject: string;
  fields: TemplateFieldMeta[];
  sample_context: Record<string, string>;
}

export const emailTemplatesSectionConfig: DeveloperToolsSectionItem = {
  id: "email-templates",
  group: "System & Runtime",
  title: "Email Templates & Mailer",
  description: "Live interactive rendering, variable sandbox, and SMTP testing console",
  icon: MailIcon,
};

// Fallback catalog in case of cold start or network delay
const DEFAULT_CATALOG: EmailTemplateItem[] = [
  {
    id: "password_reset",
    title: "Password Reset Request",
    template_path: "emails/password_reset.html",
    category: "Authentication & Recovery",
    description: "Dispatched when a user requests password recovery instructions from the /forgot-password portal.",
    default_subject: "Reset Your Password - SPR Note Suite",
    fields: [
      { key: "user_name", label: "User Full Name", default: "Atiqur Rahman", type: "text" },
      { key: "reset_url", label: "Password Reset URL", default: "http://localhost:5173/reset-password/sample-uuid-token-f935fec9", type: "url" },
      { key: "institution_name", label: "Institution Name", default: "SPR NOTE SUITE", type: "text" },
    ],
    sample_context: {
      user_name: "Atiqur Rahman",
      reset_url: "http://localhost:5173/reset-password/sample-uuid-token-f935fec9",
      institution_name: "SPR NOTE SUITE",
    },
  },
  {
    id: "email_verification",
    title: "Account Email Verification",
    template_path: "emails/email_verification.html",
    category: "Onboarding & Identity",
    description: "Sent to newly registered accounts to verify and confirm their registered email address.",
    default_subject: "Verify Your Email Address - SPR Note Suite",
    fields: [
      { key: "user_name", label: "User Full Name", default: "Atiqur Rahman", type: "text" },
      { key: "verification_url", label: "Verification URL", default: "http://localhost:5173/verify-email/sample-verification-token-12345", type: "url" },
      { key: "institution_name", label: "Institution Name", default: "SPR NOTE SUITE", type: "text" },
    ],
    sample_context: {
      user_name: "Atiqur Rahman",
      verification_url: "http://localhost:5173/verify-email/sample-verification-token-12345",
      institution_name: "SPR NOTE SUITE",
    },
  },
  {
    id: "password_changed_notification",
    title: "Security Alert: Password Changed",
    template_path: "emails/password_changed_notification.html",
    category: "Account Security & Audit",
    description: "Immediate automated security notification dispatched when account password is changed.",
    default_subject: "Security Alert: Your SPR Note Password Was Changed",
    fields: [
      { key: "user_name", label: "User Full Name", default: "Atiqur Rahman", type: "text" },
      { key: "change_time", label: "Timestamp & Timezone", default: "October 27, 2026 at 02:30 AM (UTC+06:00)", type: "text" },
      { key: "ip_address", label: "Client IP Address", default: "127.0.0.1", type: "text" },
      { key: "device_info", label: "Device & Browser Client", default: "Google Chrome on Windows 11 (Mozilla/5.0...)", type: "text" },
      { key: "security_url", label: "Security Action URL", default: "http://localhost:5173/forgot-password", type: "url" },
    ],
    sample_context: {
      user_name: "Atiqur Rahman",
      change_time: "October 27, 2026 at 02:30 AM (UTC+06:00)",
      ip_address: "127.0.0.1",
      device_info: "Google Chrome on Windows 11 (Mozilla/5.0...)",
      security_url: "http://localhost:5173/forgot-password",
    },
  },
];

export const EmailTemplatesPreviewPanel: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [catalog, setCatalog] = useState<EmailTemplateItem[]>(DEFAULT_CATALOG);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("password_reset");
  const [contextData, setContextData] = useState<Record<string, string>>(() => DEFAULT_CATALOG[0].sample_context);
  const [customSubject, setCustomSubject] = useState<string>(DEFAULT_CATALOG[0].default_subject);
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  const [fromEmail, setFromEmail] = useState<string>("SPR Note Security <security@sprnote.local>");

  const [loadingRender, setLoadingRender] = useState<boolean>(false);
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>(() => user?.email || "atiqurrahmansalama@gmail.com");
  const [dispatchResult, setDispatchResult] = useState<{ success: boolean; message: string } | null>(null);

  const activeTemplate = useMemo(() => {
    return catalog.find((t) => t.id === selectedTemplateId) || catalog[0];
  }, [catalog, selectedTemplateId]);

  // Load catalog from backend API
  const fetchCatalog = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      const res = await fetch("/api/v1/system/email-templates/", {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.templates) && data.templates.length > 0) {
          setCatalog(data.templates);
        }
      }
    } catch {
      // Use fallback catalog
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // When selected template changes, sync context fields & subject
  useEffect(() => {
    if (activeTemplate) {
      setContextData({ ...activeTemplate.sample_context });
      setCustomSubject(activeTemplate.default_subject);
      setDispatchResult(null);
    }
  }, [activeTemplate]);

  // Render template HTML from backend
  const renderTemplate = useCallback(async () => {
    if (!selectedTemplateId) return;
    setLoadingRender(true);
    try {
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      const res = await fetch("/api/v1/system/email-templates/render/", {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: selectedTemplateId,
          context: contextData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRenderedHtml(data.html || "");
        if (data.from_email) setFromEmail(data.from_email);
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to render template", "error");
      }
    } catch {
      showToast("Backend connection failed while rendering", "warning");
    } finally {
      setLoadingRender(false);
    }
  }, [selectedTemplateId, contextData, showToast]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      renderTemplate();
    }, 250);
    return () => clearTimeout(timeout);
  }, [renderTemplate]);

  // Handle live variable edits
  const handleContextChange = (key: string, val: string) => {
    setContextData((prev) => ({ ...prev, [key]: val }));
  };

  // Reset context to default
  const handleResetContext = () => {
    if (activeTemplate) {
      setContextData({ ...activeTemplate.sample_context });
      setCustomSubject(activeTemplate.default_subject);
      showToast("Variables reset to defaults", "info");
    }
  };

  // Dispatch real test email
  const handleSendTestEmail = async () => {
    if (!testEmailRecipient.trim()) {
      showToast("Please enter a valid recipient email", "warning");
      return;
    }

    setSendingTest(true);
    setDispatchResult(null);
    try {
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      const res = await fetch("/api/v1/system/email-templates/send-test/", {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: selectedTemplateId,
          context: contextData,
          recipient_email: testEmailRecipient.trim(),
          subject: customSubject.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDispatchResult({ success: true, message: data.message });
        showToast(`Test email successfully dispatched to ${testEmailRecipient}`, "success");
      } else {
        setDispatchResult({ success: false, message: data.error || "Failed sending email." });
        showToast(data.error || "Failed to send email", "error");
      }
    } catch (e: any) {
      const msg = e?.message || "Server unreachable";
      setDispatchResult({ success: false, message: msg });
      showToast(msg, "error");
    } finally {
      setSendingTest(false);
    }
  };

  // Open preview HTML in separate browser tab
  const handleOpenInNewTab = useCallback(() => {
    if (!renderedHtml) return;
    const blob = new Blob([renderedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }, [renderedHtml]);

  const { openDrawer } = useRightSidebar();

  const handleOpenPreviewDrawer = useCallback(() => {
    openDrawer("email-template-preview");
  }, [openDrawer]);

  useDrawerRegistration(
    "email-template-preview",
    () => ({
      title: activeTemplate ? `${activeTemplate.title} — Live Preview` : "Email Live Preview",
      category: "Developer Tools",
      size: "xl",
      content: (
        <EmailTemplateRightSidebarPreview
          key={`drawer-email-preview-${selectedTemplateId}`}
          renderedHtml={renderedHtml}
          loadingRender={loadingRender}
          fromEmail={fromEmail}
          customSubject={customSubject}
          activeTemplate={activeTemplate}
          onOpenInNewTab={handleOpenInNewTab}
          onRefresh={renderTemplate}
        />
      ),
    }),
    [activeTemplate, selectedTemplateId, renderedHtml, loadingRender, fromEmail, customSubject, handleOpenInNewTab, renderTemplate]
  );

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* ─── 1. TOP HEADER & TELEMETRY BANNER ────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0">
              <MailIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold theme-text-primary flex items-center gap-2">
                <span>Email Templates &amp; Mailer Console</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent">
                  Developer Sandbox
                </span>
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                Inspect live rendered HTML, tweak template variables, test responsiveness, and dispatch live SMTP test emails.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleOpenPreviewDrawer}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:brightness-105 active:scale-95 transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
              title="Open responsive email preview in right sidebar"
            >
              <DesktopIcon className="w-3.5 h-3.5" />
              <span>Preview in Right Sidebar</span>
            </button>
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary transition cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Open full email HTML preview in standalone browser tab"
            >
              <ExternalLinkIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </button>
            <button
              type="button"
              onClick={renderTemplate}
              className="p-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary transition cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Force re-render"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loadingRender ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Template Catalog Selector Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t theme-border">
          {catalog.map((t) => {
            const isSelected = t.id === selectedTemplateId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplateId(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                  isSelected
                    ? "theme-bg-elevated border-[var(--accent-main)]/60 theme-text-primary shadow-xs"
                    : "theme-bg-sub border-transparent theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
                }`}
              >
                <MailIcon className={`w-3.5 h-3.5 ${isSelected ? "theme-accent" : "theme-text-secondary"}`} />
                <span>{t.title}</span>
                {isSelected && <CheckIcon className="w-3.5 h-3.5 theme-accent ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. MAIN CLEAN WORKSPACE ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left / Center Area: Template Specs & Dynamic Context Variables Sandbox (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Template Meta Card */}
          <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b theme-border">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                Template Specifications
              </span>
              <span className="text-[10px] font-mono theme-text-secondary">
                {activeTemplate?.template_path}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold theme-text-primary">{activeTemplate?.title}</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold theme-bg-sub theme-text-secondary border theme-border">
                  {activeTemplate?.category}
                </span>
              </div>
              <p className="text-xs theme-text-secondary mt-1 leading-relaxed">
                {activeTemplate?.description}
              </p>
            </div>
          </div>

          {/* Variables Sandbox Form */}
          <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b theme-border">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                  Dynamic Context Variables Sandbox
                </h4>
                <p className="text-[11px] theme-text-secondary mt-0.5">
                  Live edits immediately update template rendering in the right sidebar preview.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetContext}
                className="text-xs font-semibold theme-accent hover:underline cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {(activeTemplate?.fields || []).map((f) => (
                <div key={f.key} className="space-y-1.5 p-3 rounded-xl border theme-border theme-bg-sub/40">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold theme-text-primary truncate">
                      {f.label}
                    </label>
                    <span className="text-[10px] font-mono theme-text-secondary shrink-0">
                      {`{{ ${f.key} }}`}
                    </span>
                  </div>
                  <input
                    type={f.type || "text"}
                    value={contextData[f.key] ?? ""}
                    onChange={(e) => handleContextChange(f.key, e.target.value)}
                    className="w-full px-3 py-2 text-xs theme-bg-surface border theme-border rounded-xl theme-text-primary focus:outline-none focus:border-[var(--accent-main)] font-mono transition shadow-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Area: Preview Status & SMTP Dispatcher (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Live Preview Dock Card */}
          <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b theme-border">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                Live Preview
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent">
                Right Sidebar
              </span>
            </div>

            <p className="text-xs theme-text-secondary leading-relaxed">
              The live HTML preview with desktop, tablet, and mobile responsiveness is docked in the Right Sidebar to give you maximum workspace clarity.
            </p>

            <button
              type="button"
              onClick={handleOpenPreviewDrawer}
              className="w-full py-2.5 px-4 rounded-xl theme-bg-accent theme-accent-text hover:brightness-105 active:scale-[0.99] font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <DesktopIcon className="w-4 h-4" />
              <span>Open Live Preview in Sidebar</span>
            </button>
          </div>

          {/* Real SMTP Test Mailer Card */}
          <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b theme-border">
              <div className="flex items-center gap-1.5">
                <SendIcon className="w-3.5 h-3.5 theme-accent" />
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Live SMTP Test Mailer
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold theme-bg-accent-soft theme-accent">
                SMTP Live
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold theme-text-primary">
                  Subject Line Override
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs theme-bg-sub border theme-border rounded-xl theme-text-primary focus:outline-none focus:border-[var(--accent-main)] transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold theme-text-primary">
                  Recipient Test Address
                </label>
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="test@example.com"
                  className="w-full px-3 py-1.5 text-xs theme-bg-sub border theme-border rounded-xl theme-text-primary focus:outline-none focus:border-[var(--accent-main)] font-mono transition"
                />
              </div>

              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTest}
                className="w-full py-2.5 px-4 rounded-xl theme-bg-sub border theme-border theme-text-primary hover:theme-bg-elevated active:scale-[0.99] font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {sendingTest ? (
                  <>
                    <SpinnerIcon className="w-4 h-4 animate-spin" />
                    <span>Dispatching via SMTP...</span>
                  </>
                ) : (
                  <>
                    <SendIcon className="w-4 h-4" />
                    <span>Send Live Test Email</span>
                  </>
                )}
              </button>

              {dispatchResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
                    dispatchResult.success
                      ? "theme-bg-success-soft border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                      : "theme-bg-danger-soft border-rose-500/25 theme-danger"
                  }`}
                >
                  {dispatchResult.success ? (
                    <CheckIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed break-words">{dispatchResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmailTemplatesPreviewPanel;
