import React from "react";
import { useTranslation } from "../../i18n/useTranslation";
import PortalTopUtilityBar from "./PortalTopUtilityBar";

export interface PublicPortalShellProps {
  brandName?: string;
  brandBadge?: string;
  brandIcon?: React.ComponentType<{ className?: string }>;
  footerBrandName?: string;
  headerRightExtra?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "2xl" | "5xl";
  children: React.ReactNode;
}

const MAX_WIDTH_CLASS_MAP: Record<NonNullable<PublicPortalShellProps["maxWidth"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
  "5xl": "max-w-5xl",
};

/**
 * Shared borderless page shell for all standalone public and authentication portals.
 * Guarantees consistent ambient backdrop, top language/theme utility bar, RTL directionality,
 * responsive viewport spacing, and footer across Login, Registration, and Onboarding pages.
 */
export default function PublicPortalShell({
  brandName,
  brandBadge,
  brandIcon,
  footerBrandName,
  headerRightExtra,
  maxWidth = "md",
  children,
}: PublicPortalShellProps): React.JSX.Element {
  const { t, isRTL } = useTranslation("auth");
  const containerWidthClass = MAX_WIDTH_CLASS_MAP[maxWidth] || "max-w-md";
  const resolvedFooterBrand = footerBrandName || brandName || t("brandName", "Suffah Hifz LMS");

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen theme-bg-app flex flex-col justify-between p-4 sm:p-6 font-sans theme-text-primary relative overflow-hidden transition-colors duration-200 border-0"
    >
      {/* Ambient soft background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -start-32 w-96 h-96 rounded-full theme-bg-accent-soft opacity-40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -end-32 w-96 h-96 rounded-full theme-bg-accent-soft opacity-30 blur-3xl"
      />

      {/* Shared Top Utility Bar (Brand + 4-Language + Light/Dark Switch) */}
      <PortalTopUtilityBar
        brandName={brandName}
        brandBadge={brandBadge}
        brandIcon={brandIcon}
        rightExtra={headerRightExtra}
      />

      {/* Main Content Slot */}
      <main className={`relative z-10 w-full ${containerWidthClass} mx-auto mt-2 sm:mt-4 mb-auto py-3 sm:py-5`}>
        {children}
      </main>

      {/* Consistent Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto py-3 text-center text-[11px] theme-text-secondary">
        <span>
          © {new Date().getFullYear()} {resolvedFooterBrand}. {t("allRightsReserved", "All rights reserved.")}
        </span>
      </footer>
    </div>
  );
}

