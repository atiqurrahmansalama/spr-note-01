import React, { useState } from "react";
import {
  DesktopIcon,
  DevicePhoneIcon,
  ExternalLinkIcon,
  RefreshIcon,
  SpinnerIcon,
} from "../../../components/ui/Icons";
import { DrawerContainer } from "../../../components/layout";
import type { EmailTemplateItem } from "./EmailTemplatesPreviewPanel";

export interface EmailTemplateRightSidebarPreviewProps {
  renderedHtml: string;
  loadingRender: boolean;
  fromEmail: string;
  customSubject: string;
  activeTemplate?: EmailTemplateItem;
  onOpenInNewTab: () => void;
  onRefresh: () => void;
}

export const EmailTemplateRightSidebarPreview: React.FC<EmailTemplateRightSidebarPreviewProps> = ({
  renderedHtml,
  loadingRender,
  fromEmail,
  customSubject,
  activeTemplate,
  onOpenInNewTab,
  onRefresh,
}) => {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const getViewportWidth = () => {
    if (viewport === "mobile") return "380px";
    if (viewport === "tablet") return "640px";
    return "100%";
  };

  return (
    <DrawerContainer padding="none">
      <div className="space-y-4 pt-1">
        {/* Preview Viewport & Header Bar */}
        <div className="p-3.5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-3">
          {/* From & Subject Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b theme-border">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-mono theme-text-secondary truncate">
                From: <span className="theme-text-primary font-bold">{fromEmail}</span>
              </div>
              <div className="text-xs font-bold theme-text-primary truncate mt-0.5">
                {customSubject || activeTemplate?.default_subject}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenInNewTab}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary transition cursor-pointer flex items-center gap-1.5"
                title="Open in Standalone Browser Tab"
              >
                <ExternalLinkIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Tab</span>
              </button>
              <button
                type="button"
                onClick={onRefresh}
                className="p-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                title="Force Re-render"
              >
                <RefreshIcon className={`w-3.5 h-3.5 ${loadingRender ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Viewport Toggles */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
              Viewport Simulation
            </span>

            <div className="flex items-center gap-1 theme-bg-sub p-1 rounded-xl border theme-border shrink-0">
              <button
                type="button"
                onClick={() => setViewport("desktop")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  viewport === "desktop"
                    ? "theme-bg-elevated theme-text-primary shadow-xs"
                    : "theme-text-secondary hover:theme-text-primary"
                }`}
                title="Desktop View (100%)"
              >
                <DesktopIcon className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewport("tablet")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  viewport === "tablet"
                    ? "theme-bg-elevated theme-text-primary shadow-xs"
                    : "theme-text-secondary hover:theme-text-primary"
                }`}
                title="Tablet View (640px)"
              >
                <span>Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setViewport("mobile")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  viewport === "mobile"
                    ? "theme-bg-elevated theme-text-primary shadow-xs"
                    : "theme-text-secondary hover:theme-text-primary"
                }`}
                title="Mobile View (380px)"
              >
                <DevicePhoneIcon className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Frame Container */}
        <div className="w-full flex justify-center p-2 rounded-2xl border theme-border theme-bg-app min-h-[640px] overflow-hidden">
          <div
            style={{
              width: getViewportWidth(),
              transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            className="relative shadow-md rounded-xl overflow-hidden border theme-border bg-white"
          >
            {loadingRender && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10 animate-fade-in">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg">
                  <SpinnerIcon className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Rendering Template...</span>
                </div>
              </div>
            )}

            <iframe
              srcDoc={renderedHtml}
              title="Email Template Live Preview"
              className="w-full h-[680px] border-none"
              sandbox="allow-same-origin allow-popups"
            />
          </div>
        </div>
      </div>
    </DrawerContainer>
  );
};

export default EmailTemplateRightSidebarPreview;
