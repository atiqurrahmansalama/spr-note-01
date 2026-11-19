import React, { useState, useMemo, useCallback } from 'react';
import TimetableMatrixCell from './TimetableMatrixCell';
import TimetableCellContextMenu from './TimetableCellContextMenu';
import TimetableLensSelector, { LENS_MODES } from './TimetableLensSelector';
import { getItemConflicts } from '../../../modules/examinations/exam-schedules/subject-routine/utils/routineConflictHelper';
import { validateMatrixGridDnd } from './timetableDndValidator';
import {
  CalendarIcon,
  ClockIcon,
  ClassIcon,
  PrinterIcon,
  SearchIcon,
  SparklesIcon,
} from '../../ui/Icons';
import CustomInput from '../../ui/CustomInput';
import CustomButton from '../../ui/CustomButton';

/**
 * Format date for display in header (e.g. "16 Oct, Thursday")
 */
function formatHeaderDate(dateStr) {
  if (!dateStr) return 'TBD Date';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    return `${day} ${month}, ${weekday}`;
  } catch {
    return dateStr;
  }
}

/**
 * TimetableMatrixGrid
 * High-performance, fully reusable 2D Timetable Routine Matrix Ecosystem.
 * Features:
 * - Dynamic Dates & Shifts (X-Axis) and Classes/Departments (Y-Axis)
 * - 60fps Mouse Drag-and-Drop (DND) with Swap & Move Detection
 * - Real-time Lens Switcher (Subject / Teacher / Room / Full Compound)
 * - Conflict & Clash warning indicators
 * - Configurable cross-row / cross-column DND rules & custom validators
 * - Sticky Column & Sticky Row navigation for large rosters
 * - Density Switcher (Compact / Normal / Comfortable)
 * - Print-perfect layout mirroring official institutional boards
 */
export default function TimetableMatrixGrid({
  title = '2D Timetable Routine Board',
  subtitle = 'Interactive visual schedule board. Drag cards to move or swap exam dates and timings.',
  rows = [], // Array of row objects: { id, label, sub, code, ... }
  columns = [], // Array of column objects: { id, date, shiftId, shiftName, timing, label, ... }
  items = [], // Array of scheduled items
  cellItemExtractor = null, // (items, rowItem, colItem) => item | null
  conflictMap = null, // Map<itemId, Conflict[]>
  onItemMove = null, // (draggedItem, sourceRow, sourceCol, targetRow, targetCol, activeLens) => void
  onItemSwap = null, // (draggedItem, targetItem, sourceRow, sourceCol, targetRow, targetCol, activeLens) => void
  onItemCopy = null, // (draggedItem, targetItem, sourceRow, sourceCol, targetRow, targetCol, activeLens) => void
  onCellAdd = null, // (rowItem, colItem) => void
  onCellEdit = null, // (item, rowItem, colItem) => void
  onCellDuplicate = null, // (item, rowItem, colItem) => void
  onCellDelete = null, // (item, rowItem, colItem) => void
  onCellClick = null, // (item, rowItem, colItem) => void
  allowCrossRowDnd = true, // boolean | ((context) => boolean)
  allowCrossColDnd = true, // boolean | ((context) => boolean)
  validateDnd = null, // (context) => { allowed: boolean, reason?: string } | boolean
  onDndBlocked = null, // (blockedInfo) => void
  initialLens = LENS_MODES.ALL,
  activeLens: propActiveLens,
  density: propDensity,
  hideHeader = false,
  showLensSelector = true,
  showDensitySelector = true,
  showSearch = true,
  readOnly = false,
  extraHeaderActions = null,
  onPrint = null,
  emptyMessage = 'No scheduled classes or dates available for this session.',
}) {
  const [internalLens, setInternalLens] = useState(initialLens);
  const [internalDensity, setInternalDensity] = useState('normal'); // 'compact' | 'normal' | 'comfortable'
  const [searchQuery, setSearchQuery] = useState('');

  const activeLens = propActiveLens !== undefined ? propActiveLens : internalLens;
  const density = propDensity !== undefined ? propDensity : internalDensity;

  // ─── Drag and Drop Internal State ──────────────────────────────────────────
  const [dragContext, setDragContext] = useState(null); // { item, sourceRow, sourceCol }
  const [dragOverTarget, setDragOverTarget] = useState(null); // { rowId, colId, isOccupied, isCopy }
  const [isCtrlHeld, setIsCtrlHeld] = useState(false);

  // ─── Right-Click Context Menu State ────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState(null); // { x, y, item, rowItem, colItem }

  const handleCellContextMenu = useCallback((e, cellItem, rowItem, colItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item: cellItem,
      rowItem,
      colItem,
    });
  }, []);

  // Dynamic Ctrl/Alt/Meta key listener during active drag
  React.useEffect(() => {
    if (!dragContext) {
      setIsCtrlHeld(false);
      return;
    }
    const handleKey = (e) => {
      setIsCtrlHeld(Boolean(e.ctrlKey || e.altKey || e.metaKey));
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, [dragContext]);

  // Fallback Cell Extractor
  const defaultCellExtractor = useCallback(
    (allData, row, col) => {
      if (!Array.isArray(allData)) return null;
      return (
        allData.find((it) => {
          const matchRow =
            String(it.classId) === String(row.id) ||
            String(it.targetClassId) === String(row.id) ||
            (row.code && String(it.classCode) === String(row.code));

          const matchCol =
            col.id === it.colId ||
            (it.examDate && col.date && it.examDate === col.date && (!col.shiftId || it.shiftId === col.shiftId)) ||
            (it.date && col.date && it.date === col.date && (!col.shiftId || it.shiftId === col.shiftId));

          return matchRow && matchCol;
        }) || null
      );
    },
    []
  );

  const getItemForCell = cellItemExtractor || defaultCellExtractor;

  // Filter Rows by Search Query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return (rows || []).filter(
      (r) =>
        r?.label?.toLowerCase().includes(q) ||
        (typeof r?.sub === 'string' && r.sub.toLowerCase().includes(q)) ||
        r?.code?.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  // ─── Central Reusable DND Validator Evaluation ────────────────────────────
  const checkDndAllowed = useCallback(
    (targetRow, targetCol, targetItem, isCopy = false) => {
      if (!dragContext) return { allowed: true };
      const { item: draggedItem, sourceRow, sourceCol } = dragContext;

      return validateMatrixGridDnd(
        {
          sourceRow,
          sourceCol,
          targetRow,
          targetCol,
          draggedItem,
          targetItem,
          activeLens,
          isCopy,
        },
        {
          allowCrossRow: allowCrossRowDnd,
          allowCrossCol: allowCrossColDnd,
          customValidator: validateDnd,
        }
      );
    },
    [dragContext, allowCrossRowDnd, allowCrossColDnd, validateDnd, activeLens]
  );

  // ─── Drag & Drop Event Handlers ───────────────────────────────────────────
  const handleDragStart = useCallback((item, rowItem, colItem) => {
    setDragContext({ item, sourceRow: rowItem, sourceCol: colItem });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragContext(null);
    setDragOverTarget(null);
    setIsCtrlHeld(false);
  }, []);

  const handleDragEnter = useCallback(
    (e, rowItem, colItem, targetItem) => {
      e.preventDefault();
      const isOccupied = Boolean(targetItem);
      const isCopy = Boolean(e.ctrlKey || e.altKey || e.metaKey || isCtrlHeld);
      const validation = checkDndAllowed(rowItem, colItem, targetItem, isCopy);
      const isRestricted = !validation.allowed;

      setDragOverTarget((prev) => {
        if (
          prev?.rowId === rowItem.id &&
          prev?.colId === colItem.id &&
          prev?.isOccupied === isOccupied &&
          prev?.isCopy === isCopy &&
          prev?.isRestricted === isRestricted
        ) {
          return prev;
        }
        return {
          rowId: rowItem.id,
          colId: colItem.id,
          isOccupied,
          isCopy,
          isRestricted,
        };
      });
    },
    [checkDndAllowed, isCtrlHeld]
  );

  const handleDragOver = useCallback(
    (e, rowItem, colItem, targetItem) => {
      e.preventDefault();
      const isCopy = Boolean(e.ctrlKey || e.altKey || e.metaKey || isCtrlHeld);
      const validation = checkDndAllowed(rowItem, colItem, targetItem, isCopy);
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = !validation.allowed ? 'none' : isCopy ? 'copy' : 'move';
      }
    },
    [checkDndAllowed, isCtrlHeld]
  );

  const handleDragLeave = useCallback((e, rowItem, colItem) => {
    e.preventDefault();
    if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) {
      return;
    }
    setDragOverTarget((prev) => {
      if (prev?.rowId === rowItem.id && prev?.colId === colItem.id) {
        return null;
      }
      return prev;
    });
  }, []);

  const handleDrop = useCallback(
    (e, targetRow, targetCol, targetItem) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dragContext) return;

      const { item: draggedItem, sourceRow, sourceCol } = dragContext;
      const isCopy = Boolean(e.ctrlKey || e.altKey || e.metaKey || isCtrlHeld);

      // Check cross-class DND allowance under active scope & configuration
      const validation = checkDndAllowed(targetRow, targetCol, targetItem, isCopy);
      if (!validation.allowed) {
        onDndBlocked?.({
          reason: validation.reason,
          draggedItem,
          targetItem,
          sourceRow,
          sourceCol,
          targetRow,
          targetCol,
          activeLens,
        });
        handleDragEnd();
        return;
      }

      // Drop on the exact same cell without copy -> No-op
      if (!isCopy && sourceRow?.id === targetRow?.id && sourceCol?.id === targetCol?.id) {
        handleDragEnd();
        return;
      }

      if (isCopy) {
        // Copy / Duplicate Item or Granular Attribute into target
        onItemCopy?.(draggedItem, targetItem, sourceRow, sourceCol, targetRow, targetCol, activeLens);
      } else if (targetItem && targetItem.id !== draggedItem.id) {
        // Swap items or Granular Attributes
        onItemSwap?.(draggedItem, targetItem, sourceRow, sourceCol, targetRow, targetCol, activeLens);
      } else {
        // Move item to empty slot
        onItemMove?.(draggedItem, sourceRow, sourceCol, targetRow, targetCol, activeLens);
      }

      handleDragEnd();
    },
    [dragContext, isCtrlHeld, checkDndAllowed, onDndBlocked, activeLens, onItemCopy, onItemSwap, onItemMove, handleDragEnd]
  );


  const handleDefaultPrint = () => {
    if (onPrint) onPrint();
    else window.print();
  };

  // Uniform and Identical Column Widths for all slots
  const colWidthClass = 'w-[210px] min-w-[210px] max-w-[210px]';
  const rowHeaderWidthClass = 'w-[210px] min-w-[210px] max-w-[210px]';

  return (
    <div className="space-y-4 text-left">
      {/* ─── 1. Optional Built-in Board Control Bar (Hidden when parent provides its own toolbar or on print) ─── */}
      {!hideHeader && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black theme-text-primary tracking-tight">
                {title}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                <SparklesIcon className="w-3 h-3" />
                60fps DND Board
              </span>
            </div>
            {subtitle && (
              <p className="text-xs theme-text-secondary mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          {/* Action Controls Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {showLensSelector && (
              <TimetableLensSelector
                activeLens={activeLens}
                onChange={setInternalLens}
              />
            )}

            <CustomButton
              variant="sub"
              size="sm"
              icon={PrinterIcon}
              onClick={handleDefaultPrint}
            >
              Print Board
            </CustomButton>

            {extraHeaderActions}
          </div>
        </div>
      )}


      {/* ─── 2. Quick Search & Row Counter (if not hidden by parent) ────────────────── */}
      {!hideHeader && showSearch && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 print:hidden">
          <div className="w-full max-w-xs">
            <CustomInput
              placeholder="Search classes or departments..."
              prefix={SearchIcon}
              value={searchQuery}
              onChange={setSearchQuery}
              size="sm"
            />
          </div>

          <div className="text-xs theme-text-secondary font-medium flex items-center gap-2">
            <span>
              Showing <strong className="theme-text-primary">{filteredRows.length}</strong> Classes •{' '}
              <strong className="theme-text-primary">{columns.length}</strong> Date Slots
            </span>
          </div>
        </div>
      )}

      {/* ─── 3. Printable Header (Shown ONLY on Print) ──────────────────────── */}
      <div className="hidden print:block text-center space-y-1 mb-6 border-b pb-4">
        <h1 className="text-2xl font-black theme-text-primary">{title}</h1>
        <p className="text-sm font-semibold theme-text-secondary">{subtitle}</p>
        <p className="text-xs theme-text-muted">Generated on: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* ─── 4. Master 2D Matrix Grid Container ─────────────────────────────── */}
      {rows.length === 0 || columns.length === 0 ? (
        <div className="p-16 text-center border theme-border rounded-2xl theme-bg-surface/50 shadow-xs">
          <CalendarIcon className="w-12 h-12 mx-auto theme-text-secondary/40 mb-3" />
          <h3 className="text-sm font-bold theme-text-primary">{emptyMessage}</h3>
          <p className="text-xs theme-text-secondary mt-1 max-w-md mx-auto">
            Please configure academic classes and examination session date slots to render the 2D routine board.
          </p>
        </div>
      ) : (
        <div className="border theme-border rounded-2xl theme-bg-surface shadow-xs overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[750px] relative no-scrollbar">
            <table className="w-full text-left border-collapse min-w-max table-fixed">
              {/* ─── Column Headers (Sticky Top) ─── */}
              <thead className="sticky top-0 z-30 border-b theme-border theme-bg-sub select-none shadow-2xs">
                {/* Header Row 1: Dates & Days */}
                <tr>
                  {/* Top-Left Corner Anchor (Sticky Top + Sticky Left) */}
                  <th
                    className={`sticky top-0 left-0 z-40 ${rowHeaderWidthClass} p-3.5 border-r theme-border theme-bg-sub font-black text-xs uppercase tracking-wider theme-text-primary`}
                  >
                    <div className="flex items-center gap-2">
                      <ClassIcon className="w-4 h-4 theme-accent" />
                      <span>Class / Level</span>
                    </div>
                  </th>

                  {/* Date Column Headers */}
                  {columns.map((col, cIdx) => (
                    <th
                      key={col.id || cIdx}
                      className={`${colWidthClass} p-3 border-r theme-border text-center`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs sm:text-[13px] theme-text-primary whitespace-nowrap">
                          {col.dateLabel || formatHeaderDate(col.date)}
                        </div>
                        <div className="flex items-center justify-center gap-1 text-[11px] font-mono theme-text-secondary font-medium">
                          <ClockIcon className="w-3 h-3 opacity-60" />
                          <span>{col.timing || col.shiftName || 'Standard Shift'}</span>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* ─── Matrix Rows (Classes / Academic Levels) ─── */}
              <tbody className="divide-y divide-theme-border theme-border text-xs">
                {filteredRows.map((rowItem, rIdx) => (
                  <tr
                    key={rowItem.id || rIdx}
                    className="border-b theme-border hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
                  >
                    {/* Leftmost Row Header (Sticky Left) */}
                    <th
                      className={`sticky left-0 z-20 ${rowHeaderWidthClass} p-3.5 border-r border-b theme-border theme-bg-surface align-middle shadow-2xs`}
                    >
                      <div className="space-y-0.5 text-left">
                        <div className="font-black text-xs sm:text-sm theme-text-primary tracking-tight">
                          {rowItem.label || rowItem.name || 'Class'}
                        </div>
                        {typeof rowItem?.sub === 'string' && rowItem.sub.trim() && (
                          <div className="text-[11px] theme-text-secondary font-medium truncate">
                            {rowItem.sub}
                          </div>
                        )}
                        {rowItem.code && (
                          <span className="inline-block text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded theme-bg-sub theme-text-secondary border theme-border mt-0.5">
                            {rowItem.code}
                          </span>
                        )}
                      </div>
                    </th>

                    {/* Matrix Cells */}
                    {columns.map((colItem, cIdx) => {
                      const cellItem = getItemForCell(items, rowItem, colItem);
                      const isDragSource = dragContext?.item?.id === cellItem?.id;
                      const isTargetHovered =
                        dragOverTarget?.rowId === rowItem.id && dragOverTarget?.colId === colItem.id;
                      const isDragTarget = isTargetHovered && !cellItem;
                      const isSwapTarget = isTargetHovered && cellItem && !isDragSource;
                      const conflictInfo = cellItem ? getItemConflicts(cellItem.id, conflictMap) : null;

                      return (
                        <td
                          key={colItem.id || cIdx}
                          className={`${colWidthClass} p-1.5 border-r border-b theme-border align-middle`}
                        >

                          <TimetableMatrixCell
                            item={cellItem}
                            rowItem={rowItem}
                            colItem={colItem}
                            rowIndex={rIdx}
                            colIndex={cIdx}
                            activeLens={activeLens}
                            conflictInfo={conflictInfo}
                            density={density}
                            readOnly={readOnly}
                            isDragSource={isDragSource}
                            isDragTarget={isDragTarget}
                            isSwapTarget={isSwapTarget}
                            isDraggingActive={Boolean(dragContext)}
                            isCopyMode={Boolean(isTargetHovered && (dragOverTarget?.isCopy || isCtrlHeld))}
                            isRestricted={Boolean(isTargetHovered && dragOverTarget?.isRestricted)}
                            draggedItem={dragContext?.item}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragEnter={handleDragEnter}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onCellAdd={onCellAdd}
                            onCellEdit={onCellEdit}
                            onCellDuplicate={onCellDuplicate}
                            onCellDelete={onCellDelete}
                            onCellClick={onCellClick}
                            onContextMenu={handleCellContextMenu}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 5. Right-Click Context Menu for Routine Slots ─────────────────── */}
      {contextMenu && (
        <TimetableCellContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          rowItem={contextMenu.rowItem}
          colItem={contextMenu.colItem}
          readOnly={readOnly}
          onClose={() => setContextMenu(null)}
          onEdit={onCellEdit}
          onDuplicate={onCellDuplicate}
          onDelete={onCellDelete}
          onAdd={onCellAdd}
        />
      )}
    </div>
  );
}
