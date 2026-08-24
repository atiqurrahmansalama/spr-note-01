import React from "react";

/**
 * Enterprise Reusable Page & Sidebar Content Container
 * Provides a standardized responsive layout, uniform padding, max-width constraints,
 * and theme tokens across all sidebar views and sub-views.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Main page/view content
 * @param {React.ReactNode} [props.header] - Optional Header element (e.g. PageHeader)
 * @param {'full'|'7xl'|'6xl'|'5xl'|'4xl'|'3xl'} [props.maxWidth='7xl'] - Max container width
 * @param {boolean} [props.isEmbedded=false] - Whether this view is embedded inside tabs/modals
 * @param {boolean} [props.animate=true] - Whether to apply smooth fade-in animation
 * @param {string} [props.className=''] - Additional custom CSS classes
 */
export default function PageContainer({
  children,
  header,
  maxWidth = "7xl",
  isEmbedded = false,
  animate = true,
  className = "",
  ...rest
}) {
  const maxWidthClass = {
    full: "max-w-full",
    "7xl": "max-w-7xl",
    "6xl": "max-w-6xl",
    "5xl": "max-w-5xl",
    "4xl": "max-w-4xl",
    "3xl": "max-w-3xl",
  }[maxWidth] || "max-w-7xl";

  // When embedded inside tabs/sub-views, avoid duplicate outer margins & paddings
  if (isEmbedded) {
    return (
      <div
        className={`w-full space-y-4 sm:space-y-6 font-sans text-left theme-text-primary select-none min-w-0 ${
          animate ? "animate-fade-in" : ""
        } ${className}`}
        {...rest}
      >
        {header && <div className="w-full shrink-0">{header}</div>}
        {children}
      </div>
    );
  }

  return (
    <div
      className={`w-full ${maxWidthClass} mx-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 font-sans text-left theme-text-primary select-none min-w-0 ${
        animate ? "animate-fade-in" : ""
      } ${className}`}
      {...rest}
    >
      {header && <div className="w-full shrink-0">{header}</div>}
      {children}
    </div>
  );
}
