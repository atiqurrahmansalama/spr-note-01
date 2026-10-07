import React from "react";
import { CloseIcon, RefreshIcon, PlusIcon, DragHandleIcon } from "@/components/ui/Icons";
import IconButton from "@/components/ui/IconButton";

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
