import React from "react";
import {
  JuzPageSection,
  DetailSection,
  JuzRow,
  DetailRow,
} from "./ProgressSections";
import type { JuzRowData, DetailRowData } from "../types";

export interface BookPageRowProps {
  rowData: JuzRowData;
  index: number;
  prevRowLastRangeId?: string;
  onChange: (updater: (prevRow: JuzRowData) => JuzRowData) => void;
  onRemoveRow?: () => void;
  onAddNewRow?: () => void;
  onNextSection?: () => void;
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

/**
 * Backward compatible BookPageRow delegating to unified JuzRow (without Juz selector)
 */
export function BookPageRow(props: BookPageRowProps) {
  return <JuzRow {...props} showJuz={false} />;
}

export interface BookPageSectionProps {
  data: JuzRowData[];
  onChange: (updater: JuzRowData[] | ((prevData: JuzRowData[]) => JuzRowData[])) => void;
  onReset?: () => void;
  onNextSection?: () => void;
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

/**
 * Backward compatible BookPageSection delegating to unified JuzPageSection
 */
export function BookPageSection(props: BookPageSectionProps) {
  return <JuzPageSection {...props} showJuz={false} title="PAGE DETAILS" />;
}

export interface BookDetailRowProps {
  rowData: DetailRowData;
  index: number;
  isLastRow?: boolean;
  listType?: string;
  onChange: (updater: (prevRow: DetailRowData) => DetailRowData) => void;
  onRemoveRow?: () => void;
  onAddNewRow?: () => void;
  onNextSection?: () => void;
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

/**
 * Backward compatible BookDetailRow delegating to unified DetailRow
 */
export function BookDetailRow(props: BookDetailRowProps) {
  return <DetailRow {...props} showJuz={false} unitLabel="Line" />;
}

export interface BookDetailSectionProps {
  title: string;
  listType: "mistake" | "stuck" | string;
  data: DetailRowData[];
  onChange: (updater: DetailRowData[] | ((prevData: DetailRowData[]) => DetailRowData[])) => void;
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
  onReset?: () => void;
  onNextSection?: () => void;
}

/**
 * Backward compatible BookDetailSection delegating to unified DetailSection
 */
export function BookDetailSection(props: BookDetailSectionProps) {
  return <DetailSection {...props} showJuz={false} unitLabel="Line" />;
}

export default BookPageSection;
