import React, { useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "./Icons";
import CustomSelect from "./CustomSelect";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  showPageSizeSelector?: boolean;
  showItemCount?: boolean;
  compact?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * Enterprise Reusable Pagination Component
 * 
 * Provides responsive, theme-consistent pagination with page window calculation,
 * custom page sizing, first/last quick jumps, and mobile-adaptive layout.
 */
export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 25,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = "items",
  showPageSizeSelector = true,
  showItemCount = true,
  compact = false,
  className = "",
  disabled = false,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate intelligent page numbers window
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (safeCurrentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "...",
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      "...",
      totalPages,
    ];
  }, [safeCurrentPage, totalPages]);

  const handlePageClick = (page: number) => {
    if (disabled || page === safeCurrentPage || page < 1 || page > totalPages) return;
    onPageChange(page);
  };

  const pageSizeSelectOptions = useMemo(() => {
    return pageSizeOptions.map((size) => ({
      value: String(size),
      label: `${size}`,
    }));
  }, [pageSizeOptions]);

  const canPrev = safeCurrentPage > 1 && !disabled;
  const canNext = safeCurrentPage < totalPages && !disabled;

  if (totalItems === 0) {
    return null;
  }

  return (
    <div
      className={`pt-4 border-t theme-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs theme-text-secondary select-none ${className}`}
    >
      {/* 1. Item Count Summary */}
      {showItemCount && (
        <div className="flex items-center gap-1.5 order-1 sm:order-1 font-medium">
          <span>Showing</span>
          <span className="font-bold theme-text-primary">
            {startItem}-{endItem}
          </span>
          <span>of</span>
          <span className="font-bold theme-text-primary">{totalItems}</span>
          <span>{itemLabel}</span>
        </div>
      )}

      {/* 2. Main Page Controls & Numbers */}
      <div className="flex items-center gap-1 sm:gap-1.5 order-3 sm:order-2">
        {/* First Page Button */}
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={!canPrev}
          title="First Page"
          aria-label="First Page"
          className={`w-8 h-8 flex items-center justify-center rounded-lg border theme-border transition-all cursor-pointer ${
            canPrev
              ? "theme-bg-sub hover:theme-bg-elevated theme-text-primary hover:border-[var(--border-hover)]"
              : "opacity-35 pointer-events-none cursor-not-allowed theme-text-muted"
          }`}
        >
          <ChevronDoubleLeftIcon className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page Button */}
        <button
          type="button"
          onClick={() => handlePageClick(safeCurrentPage - 1)}
          disabled={!canPrev}
          title="Previous Page"
          aria-label="Previous Page"
          className={`w-8 h-8 flex items-center justify-center rounded-lg border theme-border transition-all cursor-pointer ${
            canPrev
              ? "theme-bg-sub hover:theme-bg-elevated theme-text-primary hover:border-[var(--border-hover)]"
              : "opacity-35 pointer-events-none cursor-not-allowed theme-text-muted"
          }`}
        >
          <ChevronLeftIcon className="w-3.5 h-3.5" />
        </button>

        {/* Dynamic Page Number Buttons (Hidden on compact/extra small screen unless 1 page) */}
        {!compact && (
          <div className="hidden xs:flex items-center gap-1">
            {pageNumbers.map((p, idx) => {
              if (p === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-8 h-8 flex items-center justify-center text-xs font-semibold theme-text-muted select-none"
                  >
                    •••
                  </span>
                );
              }

              const pageNum = Number(p);
              const isActive = pageNum === safeCurrentPage;

              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => handlePageClick(pageNum)}
                  disabled={disabled}
                  aria-current={isActive ? "page" : undefined}
                  className={`min-w-8 h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "theme-bg-accent theme-accent-text shadow-sm"
                      : "theme-bg-sub/60 hover:theme-bg-elevated border theme-border theme-text-primary hover:border-[var(--border-hover)]"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        )}

        {/* Compact / Mobile Page Number Indicator */}
        <div className="xs:hidden px-2 text-xs font-semibold theme-text-primary">
          Page {safeCurrentPage} of {totalPages}
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => handlePageClick(safeCurrentPage + 1)}
          disabled={!canNext}
          title="Next Page"
          aria-label="Next Page"
          className={`w-8 h-8 flex items-center justify-center rounded-lg border theme-border transition-all cursor-pointer ${
            canNext
              ? "theme-bg-sub hover:theme-bg-elevated theme-text-primary hover:border-[var(--border-hover)]"
              : "opacity-35 pointer-events-none cursor-not-allowed theme-text-muted"
          }`}
        >
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          onClick={() => handlePageClick(totalPages)}
          disabled={!canNext}
          title="Last Page"
          aria-label="Last Page"
          className={`w-8 h-8 flex items-center justify-center rounded-lg border theme-border transition-all cursor-pointer ${
            canNext
              ? "theme-bg-sub hover:theme-bg-elevated theme-text-primary hover:border-[var(--border-hover)]"
              : "opacity-35 pointer-events-none cursor-not-allowed theme-text-muted"
          }`}
        >
          <ChevronDoubleRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. Compact Page Size Selector using Project CustomSelect */}
      {showPageSizeSelector && onPageSizeChange && (
        <div className="flex items-center gap-1.5 order-2 sm:order-3 text-xs theme-text-secondary">
          <span className="hidden sm:inline font-medium">Rows:</span>
          <div className="w-20">
            <CustomSelect
              value={String(pageSize)}
              onChange={(val: string) => onPageSizeChange(Number(val))}
              options={pageSizeSelectOptions}
              disabled={disabled}
              size="xs"
              direction="up"
              showBadge={false}
              searchable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

