import React from 'react';
import CustomCheckbox from './CustomCheckbox';

export default function DataTable({
  columns = [],
  data = [],
  keyExtractor = (item, idx) => item?.id ?? idx,
  isLoading = false,
  loadingMessage = 'Loading records...',
  emptyTitle = 'No Records Found',
  emptySubMessage = 'No matching data available to display.',
  emptyIcon: EmptyIcon,
  onRowClick,
  hideHeader = false,
  compact = false,
  cellPaddingClass = '',
  wrapperClassName = '',
  tableClassName = '',
  rowClassName,
  // --- Reusable Multi-Selection Props ---
  selectable = false,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  idField = 'id',
  selectionHeaderClassName = 'w-12 text-center',
  selectionCellClassName = 'text-center',
}) {
  if (isLoading) {
    return (
      <div className={`theme-bg-surface border theme-border rounded-2xl p-12 text-center shadow-xs ${wrapperClassName}`}>
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin theme-accent"></div>
          <span className="text-xs font-semibold theme-text-secondary">{loadingMessage}</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`theme-bg-surface border theme-border rounded-2xl p-12 text-center shadow-xs space-y-3 ${wrapperClassName}`}>
        {EmptyIcon && (
          <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center mx-auto theme-text-muted">
            <EmptyIcon className="w-6 h-6" />
          </div>
        )}
        <h3 className="text-sm font-bold theme-text-primary">{emptyTitle}</h3>
        {emptySubMessage && (
          <p className="text-xs theme-text-secondary max-w-sm mx-auto leading-relaxed">
            {emptySubMessage}
          </p>
        )}
      </div>
    );
  }

  const defaultHeaderPad = compact ? 'py-2 px-3' : 'py-3.5 px-4 sm:px-6';
  const defaultCellPad = cellPaddingClass || (compact ? 'py-1.5 px-3' : 'py-3.5 px-4 sm:px-6');

  const getItemId = (item, idx) => {
    if (item && item[idField] !== undefined && item[idField] !== null) {
      return item[idField];
    }
    return keyExtractor(item, idx);
  };

  const selectedSet = React.useMemo(() => {
    if (!selectable) return new Set();
    if (selectedIds instanceof Set) return selectedIds;
    if (Array.isArray(selectedIds)) return new Set(selectedIds);
    return new Set();
  }, [selectable, selectedIds]);

  const isSelected = (item, idx) => {
    if (!selectable) return false;
    const itemId = getItemId(item, idx);
    return selectedSet.has(itemId);
  };

  const isAllSelected =
    selectable &&
    data.length > 0 &&
    data.every((item, idx) => isSelected(item, idx));

  return (
    <div className={`theme-bg-surface border theme-border rounded-2xl shadow-xs overflow-hidden ${wrapperClassName}`}>
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-xs border-collapse ${tableClassName}`}>
          {!hideHeader && (
            <thead className="border-b theme-border theme-bg-sub/60 theme-text-secondary uppercase text-[10px] tracking-wider font-bold">
              <tr>
                {selectable && (
                  <th
                    className={`${defaultHeaderPad} ${selectionHeaderClassName}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center">
                      <CustomCheckbox
                        size="sm"
                        checked={isAllSelected}
                        onChange={(checked) => {
                          const allIds = data.map((item, idx) => getItemId(item, idx));
                          onSelectAll?.(checked ? allIds : [], checked);
                        }}
                        disabled={data.length === 0}
                      />
                    </div>
                  </th>
                )}
                {columns.map((col, idx) => {
                  const alignClass =
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left';

                  return (
                    <th
                      key={col.key || idx}
                      className={`${defaultHeaderPad} ${alignClass} ${col.headerClassName || ''}`}
                    >
                      {col.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06] text-xs">
            {data.map((item, rowIdx) => {
              const rowKey = keyExtractor(item, rowIdx);
              const itemSelected = isSelected(item, rowIdx);
              const customRowClass =
                typeof rowClassName === 'function'
                  ? rowClassName(item, rowIdx, itemSelected)
                  : rowClassName || '';

              return (
                <tr
                  key={rowKey}
                  onClick={(e) => {
                    if (
                      e.target.closest('input') ||
                      e.target.closest('button') ||
                      e.target.closest('a') ||
                      e.target.closest('label') ||
                      e.target.closest('[data-no-row-click="true"]')
                    ) {
                      return;
                    }
                    onRowClick?.(item);
                  }}
                  className={`hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors ${
                    itemSelected ? 'theme-bg-accent-soft/20' : ''
                  } ${onRowClick ? 'cursor-pointer' : ''} ${customRowClass}`}
                >
                  {selectable && (
                    <td
                      className={`${defaultCellPad} ${selectionCellClassName}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center">
                        <CustomCheckbox
                          size="sm"
                          checked={itemSelected}
                          onChange={(checked) => {
                            const itemId = getItemId(item, rowIdx);
                            onSelectRow?.(itemId, item, checked);
                          }}
                        />
                      </div>
                    </td>
                  )}
                  {columns.map((col, colIdx) => {
                    const alignClass =
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-left';

                    const customCellClass =
                      typeof col.cellClassName === 'function'
                        ? col.cellClassName(item, rowIdx)
                        : col.cellClassName || '';

                    const content = col.render
                      ? col.render(item, rowIdx)
                      : col.key
                      ? item[col.key] ?? '--'
                      : null;

                    return (
                      <td
                        key={col.key || colIdx}
                        className={`${defaultCellPad} ${alignClass} ${customCellClass}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
