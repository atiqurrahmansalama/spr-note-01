import React from 'react';

/**
 * PrintTableRenderer
 * Universal high-contrast, density-aware tabular grid for print documents.
 * Supports dynamic column filtering, custom renderers, metrics summary boxes, and extra blank rows.
 */
export default function PrintTableRenderer({
  columns = [],
  data = [],
  visibleColumnKeys = null, // array of keys or null to show all
  extraBlankRows = 0,
  summaryMetrics = [], // [{ label: 'Total Appeared', value: 45 }]
  showIndex = true,
  indexLabel = 'No',
  density = 'NORMAL',
  className = '',
}) {
  // Filter visible columns
  const activeColumns = React.useMemo(() => {
    if (!visibleColumnKeys || !Array.isArray(visibleColumnKeys)) {
      return columns;
    }
    return columns.filter((col) => {
      const key = col.id || col.key || col.accessor || col.dataIndex;
      return visibleColumnKeys.includes(key);
    });
  }, [columns, visibleColumnKeys]);

  const blankRowsArray = React.useMemo(() => {
    const count = Math.max(0, parseInt(extraBlankRows, 10) || 0);
    return Array.from({ length: count });
  }, [extraBlankRows]);

  const densityConfig = {
    ULTRA_COMPACT: {
      fontSize: 'text-[9.5px]',
      cellPad: 'py-1 px-1.5',
      headerPad: 'py-1 px-1.5',
      subText: 'text-[8.5px]',
      blankHeight: 'h-6',
    },
    COMPACT: {
      fontSize: 'text-[10px]',
      cellPad: 'py-1.5 px-2',
      headerPad: 'py-1.5 px-2',
      subText: 'text-[9px]',
      blankHeight: 'h-7',
    },
    NORMAL: {
      fontSize: 'text-[11px]',
      cellPad: 'py-1.5 px-2.5',
      headerPad: 'py-2 px-2.5',
      subText: 'text-[9.5px]',
      blankHeight: 'h-8',
    },
    RELAXED: {
      fontSize: 'text-[12px]',
      cellPad: 'py-2.5 px-3',
      headerPad: 'py-2.5 px-3',
      subText: 'text-[10px]',
      blankHeight: 'h-9',
    },
    SPACIOUS: {
      fontSize: 'text-[13px]',
      cellPad: 'py-3.5 px-3.5',
      headerPad: 'py-3.5 px-3.5',
      subText: 'text-[11px]',
      blankHeight: 'h-11',
    },
  };

  const currentDensity = densityConfig[density] || densityConfig.NORMAL;

  return (
    <div className={`w-full max-w-full overflow-hidden space-y-4 ${className}`}>
      {/* Table Grid */}
      <table className={`print-table w-full max-w-full ${currentDensity.fontSize}`}>
        <thead>
          <tr className="font-bold bg-slate-100">
            {showIndex && (
              <th className={`text-center w-8 whitespace-nowrap bg-slate-100 text-slate-900 border border-slate-300 ${currentDensity.headerPad}`}>
                {indexLabel}
              </th>
            )}
            {activeColumns.map((col, idx) => {
              const headerTitle = col.header ?? col.label ?? col.title ?? '';
              const colKey = col.id || col.key || col.accessor || col.dataIndex || idx;

              return (
                <th
                  key={colKey}
                  style={col.width ? { width: col.width } : undefined}
                  className={`bg-slate-100 text-slate-900 border border-slate-300 ${currentDensity.headerPad} ${
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  } ${col.headerClassName || ''}`}
                >
                  <div className={`leading-tight font-bold text-slate-900 ${col.nowrap ? 'whitespace-nowrap' : 'break-normal'}`}>
                    {headerTitle}
                  </div>
                  {col.subLabel && (
                    <span className={`block font-normal text-slate-600 leading-tight ${currentDensity.subText} ${col.nowrap ? 'whitespace-nowrap' : 'break-normal'}`}>
                      {col.subLabel}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIdx) => (
            <tr key={row.id || rIdx} className="print-avoid-break bg-white hover:bg-slate-50/60">
              {showIndex && (
                <td className={`text-center font-mono font-medium text-slate-700 border border-slate-300 w-8 whitespace-nowrap ${currentDensity.cellPad}`}>
                  {rIdx + 1}
                </td>
              )}
              {activeColumns.map((col, cIdx) => {
                const colKey = col.id || col.key || col.accessor || col.dataIndex;
                const cellValue = typeof col.accessor === 'function' ? col.accessor(row) : row[colKey];

                let content = cellValue;
                if (col.cell) {
                  content = col.cell(cellValue, row, rIdx);
                } else if (col.render) {
                  content = col.render(row, rIdx, cellValue);
                }

                return (
                  <td
                    key={colKey || cIdx}
                    className={`border border-slate-300 text-slate-900 ${currentDensity.cellPad} ${
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-left'
                    } ${col.bold ? 'font-bold' : ''} ${col.mono ? 'font-mono' : ''} ${
                      col.nowrap ? 'whitespace-nowrap' : 'break-normal'
                    } ${col.className || ''}`}
                  >
                    {content !== undefined && content !== null ? content : '-'}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Extra Blank Rows (e.g. for offline handwritten marks) */}
          {blankRowsArray.map((_, bIdx) => (
            <tr key={`blank_${bIdx}`} className={`print-avoid-break bg-white ${currentDensity.blankHeight}`}>
              {showIndex && (
                <td className={`text-center font-mono font-medium text-slate-400 border border-slate-300 w-10 ${currentDensity.cellPad}`}>
                  {data.length + bIdx + 1}
                </td>
              )}
              {activeColumns.map((col, cIdx) => (
                <td
                  key={`blank_cell_${cIdx}`}
                  className={`border border-slate-300 text-slate-300 ${currentDensity.cellPad}`}
                >
                  &nbsp;
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Metrics Box at bottom of table */}
      {summaryMetrics && summaryMetrics.length > 0 && (
        <div className="print-summary-box text-[11px] print-avoid-break border border-slate-300 bg-slate-50 rounded-lg p-2.5 text-slate-900">
          <div
            className="grid gap-2 text-center"
            style={{
              gridTemplateColumns: `repeat(${Math.min(summaryMetrics.length, 6)}, minmax(0, 1fr))`,
            }}
          >
            {summaryMetrics.map((met, idx) => (
              <div key={idx} className="border-r border-slate-300 last:border-r-0 px-2 space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  {met.label}
                </span>
                <span className="text-sm font-extrabold text-slate-900 block">
                  {met.value !== undefined ? met.value : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
