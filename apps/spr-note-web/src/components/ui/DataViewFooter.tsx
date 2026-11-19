import React from 'react';

export interface DataViewFooterProps {
  filteredCount?: number;
  totalCount?: number;
  itemLabel?: string;
  extraContent?: React.ReactNode;
  className?: string;
}

/**
 * Reusable Footer Strip for Data Tables & Card Grids
 */
export const DataViewFooter: React.FC<DataViewFooterProps> = ({
  filteredCount = 0,
  totalCount = 0,
  itemLabel = 'items',
  extraContent = null,
  className = '',
}) => {
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
};

export default DataViewFooter;
