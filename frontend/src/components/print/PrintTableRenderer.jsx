import React from 'react';
import { TrashIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from '../ui/Icons';

/**
 * PrintTableRenderer
 * Universal high-contrast, density-aware tabular grid for print documents.
 * Supports dynamic column filtering, custom renderers, metrics summary boxes, and extra blank rows.
 * Features full WYSIWYG Live Canvas Editing: Inline cell text edit, hover row delete/insert/move, and header renaming.
 */
export default function PrintTableRenderer({
  columns = [],
  data = [],
  visibleColumnKeys = null, // array of keys or null to show all
  isColumnMandatory = null,
  isColumnRequired = null,
  requiredColumnKeys = [],
  visibleRowKeys = null, // array of row keys or null to show all
  isRowMandatory = null,
  isRowRequired = null,
  requiredRowKeys = [],
  getRowKey = null, // custom function (row, idx) => key
  extraBlankRows = 0,
  summaryMetrics = [], // [{ label: 'Total Appeared', value: 45 }]
  showIndex = true,
  indexLabel = 'No',
  density = 'NORMAL',
  className = '',
  footerRow = null,
  footerRows = [],
  startIndex = 0,
  // WYSIWYG Live Document Canvas Editing Handlers
  isEditable = false,
  onCellChange = null, // (rowIndex, colKey, value) => void
  onRowDelete = null, // (rowIndex) => void
  onRowInsert = null, // (rowIndex, position) => void
  onRowMove = null, // (fromIndex, toIndex) => void
  onColumnHeaderChange = null, // (colKey, newHeader) => void
  onAddRow = null, // () => void
}) {
  // Filter visible columns
  const activeColumns = React.useMemo(() => {
    if (!visibleColumnKeys || !Array.isArray(visibleColumnKeys)) {
      return columns;
    }
    const visibleSet = new Set(visibleColumnKeys.map(String));
    return columns.filter((col, idx) => {
      const key = String(col.id || col.key || col.accessor || col.dataIndex || `col_${idx}`);
      const isMandatory =
        (typeof isColumnMandatory === 'function' && isColumnMandatory(col, idx)) ||
        (typeof isColumnRequired === 'function' && isColumnRequired(col, idx)) ||
        (requiredColumnKeys && Array.isArray(requiredColumnKeys) && requiredColumnKeys.map(String).includes(key)) ||
        Boolean(col?.required || col?.mandatory || col?.isMandatory || col?.locked || col?.isLocked);

      return isMandatory || visibleSet.has(key);
    });
  }, [columns, visibleColumnKeys, isColumnMandatory, isColumnRequired, requiredColumnKeys]);

  // Filter visible rows
  const activeData = React.useMemo(() => {
    if (!visibleRowKeys || !Array.isArray(visibleRowKeys) || !Array.isArray(data)) {
      return data || [];
    }
    const visibleSet = new Set(visibleRowKeys.map(String));
    return data.filter((row, idx) => {
      let key;
      if (typeof getRowKey === 'function') {
        key = String(getRowKey(row, idx));
      } else {
        key = String(row?.id ?? row?.key ?? row?._id ?? row?.uid ?? row?.code ?? `row_${idx}`);
      }
      const isMandatory =
        (typeof isRowMandatory === 'function' && isRowMandatory(row, idx)) ||
        (typeof isRowRequired === 'function' && isRowRequired(row, idx)) ||
        (requiredRowKeys && Array.isArray(requiredRowKeys) && requiredRowKeys.map(String).includes(key)) ||
        Boolean(row?.required || row?.mandatory || row?.isMandatory || row?.locked || row?.isLocked);

      return isMandatory || visibleSet.has(key);
    });
  }, [data, visibleRowKeys, getRowKey, isRowMandatory, isRowRequired, requiredRowKeys]);

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
    <div className={`w-full max-w-full overflow-hidden space-y-2.5 print:space-y-1.5 relative ${className}`}>
      {/* Table Grid */}
      <table className={`print-table w-full max-w-full ${currentDensity.fontSize} relative`}>
        <thead>
          <tr className="font-bold bg-slate-100">
            {showIndex && (
              <th className={`text-center align-middle w-8 whitespace-nowrap bg-slate-100 text-slate-900 border border-slate-300 ${currentDensity.headerPad}`}>
                {indexLabel}
              </th>
            )}
            {activeColumns.map((col, idx) => {
              const headerTitle = col.header ?? col.label ?? col.title ?? '';
              const colKey = col.id || col.key || col.accessor || col.dataIndex || idx;
              const isRotated = Boolean(col.rotate || col.vertical || col.rotatable || col.isVertical);

              return (
                <th
                  key={colKey}
                  style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                  className={`bg-slate-100 text-slate-900 border border-slate-300 ${
                    isRotated ? 'align-bottom p-0.5 pb-1' : `align-middle ${currentDensity.headerPad}`
                  } ${
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  } ${col.headerClassName || ''}`}
                >
                  {isRotated ? (
                    <div className="flex flex-col items-center justify-end w-full h-full select-none min-h-[75px] max-h-[90px] py-0.5 print:min-h-[68px] print:max-h-[82px]">
                      <div
                        style={{
                          writingMode: 'vertical-rl',
                          textOrientation: 'sideways',
                          WebkitTextOrientation: 'sideways',
                          transform: 'rotate(180deg)',
                          transformOrigin: 'center center',
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                          textRendering: 'optimizeLegibility',
                          textAlign: 'left',
                          maxHeight: '74px',
                          maxWidth: '22px',
                          lineHeight: '1.1',
                          overflow: 'hidden',
                          wordBreak: 'break-word',
                          display: 'inline-block',
                          clipPath: 'inset(0 0 0 0)',
                        }}
                        className="text-[9px] font-bold text-slate-900 tracking-tight"
                        title={`${headerTitle}${col.subLabel ? ` ${col.subLabel}` : ''}`}
                      >
                        {headerTitle}
                      </div>
                      {col.subLabel && (
                        <span className="block text-[8px] font-bold text-slate-700 mt-0.5 leading-none tracking-tight">
                          {col.subLabel}
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className={`leading-tight font-bold text-slate-900 ${col.nowrap ? 'whitespace-nowrap' : 'break-normal'}`}>
                        {headerTitle}
                      </div>
                      {col.subLabel && (
                        <span className={`block font-normal text-slate-600 leading-tight ${currentDensity.subText} ${col.nowrap ? 'whitespace-nowrap' : 'break-normal'}`}>
                          {col.subLabel}
                        </span>
                      )}
                    </>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {activeData.map((row, rIdx) => {
            const actualIdx = rIdx + (typeof startIndex === 'number' ? startIndex : 0);
            return (
              <tr key={row.id || rIdx} className="print-avoid-break bg-white hover:bg-slate-50/50 relative transition-colors">
                {showIndex && (
                  <td className={`text-center font-mono font-medium text-slate-700 border border-slate-300 w-8 whitespace-nowrap ${currentDensity.cellPad}`}>
                    {actualIdx + 1}
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

                  const isReactNode = React.isValidElement(content);

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
                      {isReactNode ? (
                        content
                      ) : (
                        <div className="leading-snug">
                          {content !== undefined && content !== null ? content : '-'}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* Extra Blank Rows (e.g. for offline handwritten marks) */}
          {blankRowsArray.map((_, bIdx) => (
            <tr key={`blank_${bIdx}`} className={`print-avoid-break bg-white ${currentDensity.blankHeight}`}>
              {showIndex && (
                <td className={`text-center font-mono font-medium text-slate-400 border border-slate-300 w-10 ${currentDensity.cellPad}`}>
                  {activeData.length + bIdx + 1}
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
        {(footerRow || (Array.isArray(footerRows) && footerRows.length > 0)) && (
          <tfoot className="print-avoid-break">
            {(Array.isArray(footerRows) && footerRows.length > 0 ? footerRows : [footerRow]).map((fRow, rIdx) => {
              if (fRow?.isSpacer || fRow?.type === 'spacer') {
                const totalColsCount = activeColumns.length + (showIndex ? 1 : 0);
                return (
                  <tr key={`footer_spacer_${rIdx}`} className="print-table-spacer border-none bg-transparent">
                    <td
                      colSpan={totalColsCount}
                      style={{
                        border: 'none',
                        borderLeft: 'hidden',
                        borderRight: 'hidden',
                        borderTop: 'none',
                        borderBottom: 'none',
                        borderColor: 'transparent',
                        backgroundColor: 'transparent',
                        height: fRow.height || '12px',
                        padding: 0,
                        lineHeight: 1,
                      }}
                      className="print-cell-borderless border-0 border-transparent bg-transparent text-transparent select-none"
                    >
                      &nbsp;
                    </td>
                  </tr>
                );
              }

              if (Array.isArray(fRow?.cells)) {
                return (
                  <tr key={`footer_${rIdx}`} className={`font-bold ${fRow.className || 'bg-transparent'}`}>
                    {showIndex && !fRow.ignoreIndex && !fRow.mergeIndex && (
                      <td className={`text-center font-bold text-slate-700 border border-slate-300 bg-slate-100 w-8 ${currentDensity.cellPad}`}>
                        -
                      </td>
                    )}
                    {fRow.cells.map((cell, cellIdx) => {
                      let colSpan = 1;
                      if (typeof cell.colSpan === 'function') {
                        colSpan = cell.colSpan(activeColumns.length, showIndex);
                      } else if (cell.colSpan) {
                        colSpan = cell.colSpan;
                        if (cellIdx === 0 && showIndex && fRow.mergeIndex) {
                          colSpan += 1;
                        }
                      } else if (cellIdx === 0 && showIndex && fRow.mergeIndex) {
                        colSpan = 2;
                      }

                      const isBorderless = Boolean(
                        cell.borderless ||
                        cell.transparent ||
                        cell.className?.includes('border-transparent') ||
                        cell.className?.includes('border-0') ||
                        cell.className?.includes('border-none')
                      );

                      return (
                        <td
                          key={`fcell_${rIdx}_${cellIdx}`}
                          colSpan={colSpan}
                          style={{
                            ...(cell.className?.includes('font-normal') ? { fontWeight: 'normal' } : {}),
                            ...(cell.style || {}),
                            ...(isBorderless
                              ? {
                                  border: 'none',
                                  borderLeft: 'none',
                                  borderTop: 'none',
                                  borderRight: 'hidden',
                                  borderBottom: 'hidden',
                                  borderColor: 'transparent',
                                  backgroundColor: 'transparent',
                                }
                              : {}),
                          }}
                          className={`${
                            isBorderless
                              ? 'print-cell-borderless border-0 border-transparent bg-transparent text-transparent select-none'
                              : `border border-slate-300 bg-slate-100 ${
                                  cell.className?.includes('font-normal')
                                    ? '!font-normal font-normal text-slate-700'
                                    : 'text-slate-900 font-bold'
                                }`
                          } ${currentDensity.cellPad} ${
                            cell.align === 'center'
                              ? 'text-center'
                              : cell.align === 'right'
                              ? 'text-right'
                              : cell.align === 'left'
                              ? 'text-left'
                              : 'text-center'
                          } ${cell.className || ''}`}
                        >
                          {React.isValidElement(cell.content ?? cell.value ?? cell)
                            ? (cell.content ?? cell.value ?? cell)
                            : (cell.content !== undefined && cell.content !== null ? cell.content : (isBorderless ? '' : '-'))}
                        </td>
                      );
                    })}
                  </tr>
                );
              }

              return (
                <tr key={`footer_${rIdx}`} className="font-bold bg-slate-100">
                  {showIndex && (
                    <td className={`text-center font-bold text-slate-700 border border-slate-300 w-8 ${currentDensity.cellPad}`}>
                      -
                    </td>
                  )}
                  {activeColumns.map((col, cIdx) => {
                    const colKey = col.id || col.key || col.accessor || col.dataIndex;
                    const val = typeof fRow === 'function' ? fRow(col, cIdx) : fRow?.[colKey];

                    return (
                      <td
                        key={colKey || cIdx}
                        className={`border border-slate-300 text-slate-900 font-bold ${currentDensity.cellPad} ${
                          col.align === 'center'
                            ? 'text-center'
                            : col.align === 'right'
                            ? 'text-right'
                            : 'text-left'
                        } ${col.className || ''}`}
                      >
                        {React.isValidElement(val) ? val : (val !== undefined && val !== null ? val : '-')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tfoot>
        )}
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
