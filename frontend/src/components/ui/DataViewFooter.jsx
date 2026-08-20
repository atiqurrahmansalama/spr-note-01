import React from 'react';

/**
 * Reusable Footer Strip for Data Tables & Card Grids
 *
 * @param {number} filteredCount
 * @param {number} totalCount
 * @param {string} itemLabel
 * @param {React.ReactNode} extraContent
 * @param {string} className
 */
export default function DataViewFooter({
  filteredCount = 0,
  totalCount = 0,
  itemLabel = 'items',
  extraContent = null,
  className = '',
}) {
  return (
    <div
      className={`pt-3.5 border-t theme-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs theme-text-secondary ${className}`}
    >
      <div className="font-medium">
        Showing{' '}
        <span className="font-bold theme-text-primary">{filteredCount}</span> of{' '}
        <span className="font-bold theme-text-primary">{totalCount}</span>{' '}
        {itemLabel}
      </div>

      {extraContent && (
        <div className="flex items-center gap-2">
          {extraContent}
        </div>
      )}
    </div>
  );
}
