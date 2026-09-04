import React from "react";
import { createPortal } from "react-dom";

/**
 * Enterprise Reusable Page & Sidebar Content Container
 * Provides a standardized responsive layout, uniform padding, max-width constraints,
 * fullscreen viewport expansion (with sidebar/header auto-concealment),
 * and theme tokens across all views and sub-views.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Main page/view content
 * @param {React.ReactNode} [props.header] - Optional Header element (e.g. PageHeader)
 * @param {'full'|'7xl'|'6xl'|'5xl'|'4xl'|'3xl'} [props.maxWidth='7xl'] - Max container width
 * @param {boolean} [props.isEmbedded=false] - Whether this view is embedded inside tabs/modals
 * @param {boolean} [props.isFullscreen=false] - Whether this view is in maximized full screen mode
 * @param {boolean} [props.animate=true] - Whether to apply smooth fade-in animation
 * @param {string} [props.className=''] - Additional custom CSS classes
 */
export default function PageContainer({
  children,
  header,
  maxWidth = "7xl",
  isEmbedded = false,
  isFullscreen = false,
  animate = true,
  className = "",
  ...rest
}) {
  // When in fullscreen mode: portal to document.body, take 100% viewport, cover all sidebars/headers
  if (isFullscreen) {
    const fullscreenContent = (
      <div
        className={`fixed inset-0 z-[9999] theme-bg-app p-3 sm:p-4 md:p-5 flex flex-col justify-between overflow-hidden shadow-2xl animate-fade-in w-screen h-screen min-w-0 ${className}`}
        {...rest}
      >
        {header && <div className="w-full shrink-0">{header}</div>}
        {children}
      </div>
    );

    return typeof document !== "undefined"
      ? createPortal(fullscreenContent, document.body)
      : fullscreenContent;
  }

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
        className={`w-full space-y-4 sm:space-y-6 font-sans text-left theme-text-primary min-w-0 @container ${
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
      className={`w-full ${maxWidthClass} mx-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 font-sans text-left theme-text-primary min-w-0 @container ${
        animate ? "animate-fade-in" : ""
      } ${className}`}
      {...rest}
    >
      {header && <div className="w-full shrink-0">{header}</div>}
      {children}
    </div>
  );
}
