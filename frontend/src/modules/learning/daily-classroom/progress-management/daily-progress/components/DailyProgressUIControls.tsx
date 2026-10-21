import React, { useRef, useEffect } from "react";
import { CloseIcon, RefreshIcon, PlusIcon, DragHandleIcon } from "@/components/ui/Icons";
import IconButton from "@/components/ui/IconButton";
import CustomInput from "@/components/ui/CustomInput";
import { handleEnterFocusNext } from "@/utils/keyboardUtils";
import { QURAN_RULES } from "../quranRules";

export function RowDragHandle({
  draggable = true,
  onDragStart,
  onDragEnd,
  title = "Drag to reorder",
  className = "",
}: {
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`w-5 h-10 flex items-center justify-center cursor-grab active:cursor-grabbing theme-text-secondary hover:theme-text-primary shrink-0 opacity-40 group-hover:opacity-100 transition-opacity ${className}`}
      title={title}
    >
      <DragHandleIcon className="w-3.5 h-3.5" />
    </div>
  );
}

export function DropIndicatorLine({ position }: { position: "before" | "after" | null }) {
  if (!position) return null;
  return (
    <div
      className={`absolute left-0 right-0 h-1 bg-[var(--accent-main)] rounded-full z-20 pointer-events-none ${
        position === "before" ? "top-0" : "bottom-0"
      }`}
    />
  );
}

export function ItemCommaSeparator({ className = "" }: { className?: string }) {
  return (
    <span className={`theme-text-secondary font-semibold text-xs sm:text-sm select-none -ml-0.5 ${className}`}>
      ,
    </span>
  );
}

export function DraggableRowWrapper({
  children,
  rowContainerProps,
  dropPosition,
  dragHandleProps,
  dragTitle = "Drag to reorder",
  onRemove,
  removeTitle = "Remove Row",
  isDragging = false,
  className = "",
}: {
  children: React.ReactNode;
  rowContainerProps?: React.HTMLAttributes<HTMLDivElement>;
  dropPosition?: "before" | "after" | null;
  dragHandleProps?: {
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: () => void;
  };
  dragTitle?: string;
  onRemove?: () => void;
  removeTitle?: string;
  isDragging?: boolean;
  className?: string;
}) {
  return (
    <div
      {...rowContainerProps}
      className={`flex items-start gap-2 sm:gap-3 w-full py-1.5 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-xl relative group transition-all duration-150 select-none ${
        isDragging ? "opacity-35 scale-[0.98] border border-dashed theme-border theme-bg-sub" : "hover:theme-bg-elevated"
      } ${className}`}
    >
      <DropIndicatorLine position={dropPosition || null} />
      <RowDragHandle {...dragHandleProps} title={dragTitle} />
      {children}
      <RowRemoveButton onRemove={onRemove} title={removeTitle} />
    </div>
  );
}

export function RowRemoveButton({
  onRemove,
  title = "Remove Row",
  className = "",
}: {
  onRemove?: () => void;
  title?: string;
  className?: string;
}) {
  if (!onRemove) return <div className="shrink-0" />;
  return (
    <div className="h-10 flex items-center shrink-0 ml-auto self-start">
      <IconButton
        icon={CloseIcon}
        size="sm"
        variant="ghost"
        shape="circle"
        onClick={onRemove}
        title={title}
        ariaLabel={title}
        className={`hover:theme-danger active:theme-danger shrink-0 ${className}`}
      />
    </div>
  );
}

export function RowAddCircleButton({
  onAdd,
  title = "Add",
  className = "",
}: {
  onAdd: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <IconButton
      icon={PlusIcon}
      size="xs"
      variant="ghost"
      shape="circle"
      onClick={onAdd}
      title={title}
      ariaLabel={title}
      className={`border theme-border hover:theme-bg-elevated hover:theme-text-primary shrink-0 ${className}`}
    />
  );
}

export function SectionHeaderBar({
  title,
  count = 0,
  showReset = false,
  onReset,
  resetTitle = "Reset",
}: {
  title: string;
  count?: number;
  showReset?: boolean;
  onReset?: () => void;
  resetTitle?: string;
}) {
  return (
    <div className="flex items-center justify-between min-h-[32px] sm:min-h-[36px] mb-1.5 sm:mb-2 select-none">
      <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
        {title}
        {count > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-accent-soft theme-accent border theme-border font-mono shadow-xs">
            {count}
          </span>
        )}
      </h3>
      {showReset && onReset ? (
        <IconButton
          icon={RefreshIcon}
          size="sm"
          variant="ghost"
          shape="circle"
          onClick={onReset}
          title={resetTitle}
          ariaLabel={resetTitle}
          className="hover:theme-danger active:theme-danger shrink-0"
        />
      ) : (
        <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 pointer-events-none opacity-0" />
      )}
    </div>
  );
}

export function AddMoreSectionButton({
  onClick,
  label = "+ Add More",
  className = "",
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex justify-center sm:justify-start sm:pl-[72px] pt-2 mt-1 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="px-3.5 py-1.5 rounded-full border theme-border border-dashed hover:border-solid theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary text-xs font-semibold transition-all cursor-pointer shadow-xs"
      >
        {label}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REUSABLE ARRAY & NUMBER HELPER UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

export function removeArrayItem<T>(list: T[], index: number): T[] {
  return list.length > 1 ? list.filter((_, idx) => idx !== index) : list;
}

export function updateArrayItem<T extends { id?: string }>(
  list: T[],
  index: number,
  updater: T | ((prev: T) => T),
  fallbackIdPrefix: string
): T[] {
  const next = [...list];
  const oldItem = next[index];
  const updated = typeof updater === "function" ? (updater as (prev: T) => T)(oldItem) : updater;
  next[index] = {
    ...oldItem,
    ...updated,
    id: oldItem?.id || updated?.id || `${fallbackIdPrefix}-${index}`,
  };
  return next;
}

/**
 * Steps a number circularly through an explicit allowed list (if provided) or min-max range.
 */
export function stepValueCircular(
  currentVal: string | number | undefined | null,
  direction: number,
  allowedList: number[] | null | undefined,
  min: number,
  max: number,
  defaultFallback?: number | null
): number {
  const num = parseInt(String(currentVal), 10);
  if (allowedList && allowedList.length > 0) {
    if (isNaN(num) || !allowedList.includes(num)) {
      if (defaultFallback !== undefined && defaultFallback !== null && allowedList.includes(defaultFallback)) {
        return defaultFallback;
      }
      return direction > 0 ? allowedList[0] : allowedList[allowedList.length - 1];
    }
    const curIdx = allowedList.indexOf(num);
    let nextIdx = curIdx + direction;
    if (nextIdx >= allowedList.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = allowedList.length - 1;
    return allowedList[nextIdx];
  }

  if (isNaN(num)) {
    if (defaultFallback !== undefined && defaultFallback !== null && defaultFallback >= min && defaultFallback <= max) {
      return defaultFallback;
    }
    return direction > 0 ? min : max;
  }

  let next = num + direction;
  if (next > max) next = min;
  if (next < min) next = max;
  return next;
}

/**
 * Clamps a number to the closest item in allowedList, or within [min, max].
 */
export function clampToAllowedOrRange(
  val: string | number | undefined | null,
  allowedList: number[] | null | undefined,
  min: number,
  max: number
): number | null {
  if (val === "" || val === undefined || val === null) return null;
  const num = parseInt(String(val), 10);
  if (isNaN(num)) return null;

  if (allowedList && allowedList.length > 0) {
    if (!allowedList.includes(num)) {
      return allowedList.reduce((prev, curr) =>
        Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev
      );
    }
    return num;
  }

  return Math.min(Math.max(num, min), max);
}

// ══════════════════════════════════════════════════════════════════════════════
// UNIFIED CORE NUMBER INPUT COMPONENT & TYPED WRAPPERS
// ══════════════════════════════════════════════════════════════════════════════

export interface ProgressNumberBoxProps {
  id?: string;
  label?: string;
  value: string | number | undefined | null;
  onChange: (val: string | number) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onWheel?: (e: React.WheelEvent | WheelEvent) => void;
  onEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onShiftEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAdd?: () => void;
  onAddShift?: () => void;
  onEmptyBackspace?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  initialScrollValue?: number;
  scrollable?: boolean;
}

export function ProgressNumberBox({
  id,
  label,
  value,
  onChange,
  onBlur,
  onKeyDown,
  onWheel,
  onEnter,
  onShiftEnter,
  onAdd,
  onAddShift,
  onEmptyBackspace,
  min = 1,
  max = 999,
  initialScrollValue,
  scrollable = false,
}: ProgressNumberBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onWheelRef = useRef(onWheel);
  onWheelRef.current = onWheel;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onWheelRef.current) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (onWheelRef.current) {
        e.preventDefault();
        e.stopPropagation();
        onWheelRef.current(e);
      }
    };

    el.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheelNative);
    };
  }, [onWheel !== undefined]);

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1 shrink-0 h-10 self-start"
    >
      {label && (
        <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none">
          {label}
        </label>
      )}
      <div className="theme-bg-sub rounded-lg border theme-border hover:border-[var(--border-hover)] focus-within:border-[var(--accent-main)] overflow-hidden h-10 w-12 sm:w-14 shrink-0 transition-all flex items-center justify-center">
        <CustomInput
          id={id}
          type="number"
          variant="borderless"
          scrollable={scrollable}
          allowDecimals={false}
          value={value !== undefined && value !== null ? value : ""}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onEnter={onEnter || handleEnterFocusNext}
          onShiftEnter={onShiftEnter}
          onAdd={onAdd}
          onAddShift={onAddShift || onAdd}
          onEmptyBackspace={onEmptyBackspace}
          min={min}
          max={max}
          initialScrollValue={initialScrollValue || min}
          placeholder="--"
          className="w-full h-full p-0 min-h-0"
          wrapperClassName="w-full h-full"
          inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
        />
      </div>
    </div>
  );
}

export interface JuzInputBoxProps extends Omit<ProgressNumberBoxProps, "label"> {
  showLabel?: boolean;
}

export function JuzInputBox({
  showLabel = true,
  min = QURAN_RULES.MIN_JUZ,
  max = QURAN_RULES.MAX_JUZ,
  onWheel,
  ...props
}: JuzInputBoxProps) {
  return (
    <ProgressNumberBox
      {...props}
      onWheel={onWheel}
      label={showLabel ? "Juz" : undefined}
      min={min}
      max={max}
      scrollable={!onWheel}
    />
  );
}

export interface PageInputBoxProps extends Omit<ProgressNumberBoxProps, "label"> {
  showLabel?: boolean;
}

export function PageInputBox({
  showLabel = true,
  min = QURAN_RULES.MIN_PAGE,
  max = QURAN_RULES.MAX_PAGE,
  ...props
}: PageInputBoxProps) {
  return (
    <ProgressNumberBox
      {...props}
      label={showLabel ? "Page" : undefined}
      min={min}
      max={max}
      scrollable={true}
    />
  );
}

export interface AyahInputBoxProps extends Omit<ProgressNumberBoxProps, "label"> {}

export function AyahInputBox({
  min = QURAN_RULES.MIN_AYAH,
  max = QURAN_RULES.MAX_AYAH,
  initialScrollValue = QURAN_RULES.MIN_AYAH,
  ...props
}: AyahInputBoxProps) {
  return (
    <ProgressNumberBox
      {...props}
      min={min}
      max={max}
      initialScrollValue={initialScrollValue}
      scrollable={true}
    />
  );
}
