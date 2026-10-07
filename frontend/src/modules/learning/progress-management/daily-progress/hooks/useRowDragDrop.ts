import React, { useState } from "react";

export interface UseRowDragDropProps {
  listType: string;
  index: number;
  draggedItem?: { listType: string; index: number } | null;
  onDragStart?: (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, listType: string, index?: number) => void;
  onReorderRows?: (
    sourceListType: string,
    sourceIndex: number,
    targetListType: string,
    targetIndex?: number,
    isCopy?: boolean
  ) => void;
}

export function useRowDragDrop({
  listType,
  index,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
}: UseRowDragDropProps) {
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);
  const isDragging = Boolean(
    draggedItem && draggedItem.listType === listType && draggedItem.index === index
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDragOver) onDragOver(e);
    if (isDragging) {
      setDropPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = e.clientY - rect.top;
    setDropPosition(offset < rect.height / 2 ? "before" : "after");
  };

  const handleDragLeave = () => {
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const targetIdx = dropPosition === "after" ? index + 1 : index;
    setDropPosition(null);

    let sourceListType =
      draggedItem?.listType ||
      (typeof window !== "undefined" ? (window as any).__spr_active_drag_item?.listType : undefined);
    let sourceIndex =
      draggedItem?.index ??
      (typeof window !== "undefined" ? (window as any).__spr_active_drag_item?.index : undefined);

    const isCopy = e.ctrlKey || e.altKey;

    if (onReorderRows && sourceListType !== undefined && sourceIndex !== undefined) {
      onReorderRows(sourceListType, sourceIndex, listType, targetIdx, isCopy);
    } else if (onDrop) {
      onDrop(e, listType, targetIdx);
    }
  };

  const handleDragStartInternal = (e: React.DragEvent) => {
    if (onDragStart) onDragStart(e, listType, index);
  };

  const handleDragEndInternal = () => {
    setDropPosition(null);
    if (onDragEnd) onDragEnd();
  };

  return {
    dropPosition,
    isDragging,
    rowContainerProps: {
      "data-row-index": index,
      "data-list-type": listType,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    dragHandleProps: {
      draggable: true,
      onDragStart: handleDragStartInternal,
      onDragEnd: handleDragEndInternal,
    },
  };
}
