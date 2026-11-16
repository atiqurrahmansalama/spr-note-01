import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@/components/ui/Icons";

export interface TrendFooterFieldItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  items: string[];
  emptyText: string;
  totalLabelSuffix?: string;
  isExpanded: boolean;
}

/**
 * Reusable single metadata field item with single-line truncate vs multi-line expanded view
 */
export const TrendFooterFieldItem: React.FC<TrendFooterFieldItemProps> = ({
  icon: Icon,
  label,
  items,
  emptyText,
  totalLabelSuffix,
  isExpanded,
}) => {
  const hasItems = items && items.length > 0;
  const fullText = hasItems ? items.join(", ") : emptyText;
  const truncatedSummary = !hasItems
    ? emptyText
    : items.length <= 3
    ? items.join(", ")
    : totalLabelSuffix
    ? `${items.length} ${totalLabelSuffix}`
    : items.join(", ");

  if (isExpanded) {
    return (
      <div className="min-w-0 text-xs leading-relaxed">
        <span className="inline-flex items-center gap-1 font-bold theme-text-primary mr-1.5 select-none align-baseline shrink-0">
          <Icon className="w-3.5 h-3.5 theme-accent inline-block shrink-0 -translate-y-0.5" />
          <span>{label}:</span>
        </span>
        <span className="font-medium theme-text-secondary break-words align-baseline">
          {fullText}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5 font-bold theme-text-primary shrink-0">
        <Icon className="w-3.5 h-3.5 theme-accent" />
        <span>{label}:</span>
      </div>
      <span className="text-xs font-medium theme-text-secondary truncate min-w-0" title={fullText}>
        {truncatedSummary}
      </span>
    </div>
  );
};

export interface FooterFieldItemConfig {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  items: string[];
  emptyText: string;
  totalSuffix?: string;
}

export interface TrendChartFooterProps {
  fields: FooterFieldItemConfig[];
  className?: string;
}

/**
 * Dedicated Chart Card Footer: Metadata Overview matching exact original 2-column layout and toggle button
 */
export const TrendChartFooter: React.FC<TrendChartFooterProps> = ({
  fields,
  className = "",
}) => {
  const [isFooterExpanded, setIsFooterExpanded] = useState<boolean>(false);
  const [hasFooterOverflow, setHasFooterOverflow] = useState<boolean>(false);
  const footerGridRef = useRef<HTMLDivElement>(null);

  // Measure if any single-line truncated text is actually clipped / hidden in the DOM
  useEffect(() => {
    const container = footerGridRef.current;
    if (!container) return;

    const checkOverflow = () => {
      if (isFooterExpanded) return;
      const truncates = container.querySelectorAll(".truncate");
      let overflowFound = false;
      truncates.forEach((el) => {
        if (el.scrollWidth > el.clientWidth + 1) {
          overflowFound = true;
        }
      });
      setHasFooterOverflow(overflowFound);
    };

    checkOverflow();
    const ro = new ResizeObserver(checkOverflow);
    ro.observe(container);

    return () => {
      ro.disconnect();
    };
  }, [fields, isFooterExpanded]);

  if (!fields || fields.length === 0) return null;

  return (
    <div className={`pt-3 border-t theme-border select-none ${className}`}>
      <div
        ref={footerGridRef}
        className="grid grid-cols-1 @[520px]:grid-cols-2 gap-x-6 gap-y-2 text-xs theme-text-secondary"
      >
        {fields.map((field) => (
          <TrendFooterFieldItem
            key={field.id}
            icon={field.icon}
            label={field.label}
            items={field.items}
            emptyText={field.emptyText}
            totalLabelSuffix={field.totalSuffix}
            isExpanded={isFooterExpanded}
          />
        ))}
      </div>

      {/* Toggle More / Less button placed cleanly at the bottom right with reserved min-height to prevent layout shifts */}
      <div className="flex items-center justify-end min-h-[22px] pt-1">
        {(hasFooterOverflow || isFooterExpanded) && (
          <button
            type="button"
            onClick={() => setIsFooterExpanded((prev) => !prev)}
            className="bg-transparent hover:opacity-80 theme-accent text-[11px] font-semibold transition-opacity duration-150 flex items-center gap-1 cursor-pointer select-none border-0 p-0 shadow-none ring-0 focus:outline-hidden"
            title={isFooterExpanded ? "Collapse to single line view" : "Expand to view full details"}
          >
            <span>{isFooterExpanded ? "Show Less" : "More"}</span>
            <ChevronDownIcon
              className={`w-3 h-3 transition-transform duration-200 ${
                isFooterExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default TrendChartFooter;
