import React from "react";
import { FilledCheckCircleIcon } from "./Icons";

/**
 * Reusable Theme Filled Verified Check Icon Component (Single Solid Circle)
 *
 * @param {string} status - e.g. "ACTIVE", "INACTIVE", "PENDING", "GRADUATED", "TRANSFERRED"
 * @param {string} className - additional custom css classes
 * @param {string} title - optional tooltip title text
 */
export default function StatusBadge({
  status = "ACTIVE",
  className = "",
  title,
}) {
  const normalizedStatus = String(status || "ACTIVE").toUpperCase();
  const isActive = normalizedStatus === "ACTIVE" || normalizedStatus === "CURRENT";
  const tooltipText = title || (isActive ? "Active Student" : normalizedStatus);

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${
        isActive ? "theme-accent" : "text-zinc-400"
      } ${className}`}
      title={tooltipText}
    >
      <FilledCheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-xs" />
    </span>
  );
}
