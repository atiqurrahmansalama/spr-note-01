import { useState, useRef } from "react";
import type { JuzRowData, DetailRowData } from "../types";

export interface UseProgressDragReorderParams {
  juzPageData: JuzRowData[];
  setJuzPageData: (data: JuzRowData[]) => void;
  bookPageData: JuzRowData[];
  setBookPageData: (data: JuzRowData[]) => void;
  mistakeData: DetailRowData[];
  setMistakeData: (data: DetailRowData[]) => void;
  stuckData: DetailRowData[];
  setStuckData: (data: DetailRowData[]) => void;
  bookMistakeData: DetailRowData[];
  setBookMistakeData: (data: DetailRowData[]) => void;
  bookStuckData: DetailRowData[];
  setBookStuckData: (data: DetailRowData[]) => void;
  createBlankRow?: () => DetailRowData;
}

export function useProgressDragReorder({
  juzPageData,
  setJuzPageData,
  bookPageData,
  setBookPageData,
  mistakeData,
  setMistakeData,
  stuckData,
  setStuckData,
  bookMistakeData,
  setBookMistakeData,
  bookStuckData,
  setBookStuckData,
  createBlankRow = () => ({
    id: crypto.randomUUID(),
    juz: "",
    page: "",
    ayahs: [{ id: crypto.randomUUID(), value: "" }],
  }),
}: UseProgressDragReorderParams) {
  const activeDragRef = useRef<{ listType: string; index: number } | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ listType: string; index: number } | null>(null);

  const handleDragStart = (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => {
    const payload = { listType, index };
    activeDragRef.current = payload;
    (window as any).__spr_active_drag_item = payload;
    setDraggedItem(payload);
    if ("dataTransfer" in e && e.dataTransfer) {
      e.dataTransfer.effectAllowed = "copyMove";
      try {
        const json = JSON.stringify(payload);
        e.dataTransfer.setData("application/json", json);
        e.dataTransfer.setData("text/plain", json);
      } catch {
        // Ignore
      }
    }
  };

  const handleDragEnd = () => {
    setTimeout(() => {
      activeDragRef.current = null;
      (window as any).__spr_active_drag_item = null;
      setDraggedItem(null);
    }, 120);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.altKey) {
      e.dataTransfer.dropEffect = "copy";
    } else {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleReorderRows = (
    sourceListType: string,
    sourceIndex: number,
    targetListType: string,
    targetIndex?: number,
    isCopy: boolean = false
  ) => {
    if (sourceListType === "juz" && targetListType === "juz") {
      let newJuz = [...juzPageData];
      if (isCopy) {
        const sourceItem = newJuz[sourceIndex];
        if (!sourceItem) return;
        const itemCopy = {
          ...sourceItem,
          id: crypto.randomUUID(),
          juzInputId: `juz-input-${crypto.randomUUID()}`,
          ranges: (sourceItem.ranges || []).map((r) => ({ ...r, id: crypto.randomUUID() })),
        };
        if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= newJuz.length) {
          newJuz.splice(targetIndex, 0, itemCopy);
        } else {
          newJuz.push(itemCopy);
        }
      } else {
        if (
          targetIndex !== undefined &&
          targetIndex >= 0 &&
          sourceIndex >= 0 &&
          sourceIndex < newJuz.length
        ) {
          const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
          if (adjustedTarget !== sourceIndex) {
            const [movedItem] = newJuz.splice(sourceIndex, 1);
            newJuz.splice(adjustedTarget, 0, movedItem);
          }
        }
      }
      setJuzPageData(newJuz);
      activeDragRef.current = null;
      (window as any).__spr_active_drag_item = null;
      setDraggedItem(null);
      return;
    }

    if (sourceListType === "book-page" && targetListType === "book-page") {
      let newBookPage = [...bookPageData];
      if (isCopy) {
        const sourceItem = newBookPage[sourceIndex];
        if (!sourceItem) return;
        const itemCopy = {
          ...sourceItem,
          id: crypto.randomUUID(),
          ranges: (sourceItem.ranges || []).map((r) => ({ ...r, id: crypto.randomUUID() })),
        };
        if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= newBookPage.length) {
          newBookPage.splice(targetIndex, 0, itemCopy);
        } else {
          newBookPage.push(itemCopy);
        }
      } else {
        if (
          targetIndex !== undefined &&
          targetIndex >= 0 &&
          sourceIndex >= 0 &&
          sourceIndex < newBookPage.length
        ) {
          const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
          if (adjustedTarget !== sourceIndex) {
            const [movedItem] = newBookPage.splice(sourceIndex, 1);
            newBookPage.splice(adjustedTarget, 0, movedItem);
          }
        }
      }
      setBookPageData(newBookPage);
      activeDragRef.current = null;
      (window as any).__spr_active_drag_item = null;
      setDraggedItem(null);
      return;
    }

    if (
      (sourceListType === "book-mistake" || sourceListType === "book-stuck") &&
      (targetListType === "book-mistake" || targetListType === "book-stuck")
    ) {
      let newMistake = [...bookMistakeData];
      let newStuck = [...bookStuckData];

      let sourceList = sourceListType === "book-mistake" ? newMistake : newStuck;
      let targetList = targetListType === "book-mistake" ? newMistake : newStuck;

      const isRowBlank = (r?: any) => {
        if (!r) return true;
        const hasPage = r.page !== undefined && r.page !== null && String(r.page).trim() !== "";
        const hasAyahs = (r.ayahs || []).some(
          (a: any) => a.value !== undefined && a.value !== null && String(a.value).trim() !== ""
        );
        return !hasPage && !hasAyahs;
      };

      if (isCopy) {
        const sourceItem = sourceList[sourceIndex];
        if (!sourceItem) return;

        const itemCopy = {
          ...sourceItem,
          id: crypto.randomUUID(),
          ayahs: (sourceItem.ayahs || []).map((a) => ({ ...a, id: crypto.randomUUID() })),
        };

        if (targetList.length === 1 && isRowBlank(targetList[0])) {
          targetList.splice(0, 1, itemCopy);
        } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= targetList.length) {
          targetList.splice(targetIndex, 0, itemCopy);
        } else {
          targetList.push(itemCopy);
        }
      } else {
        if (sourceListType === targetListType) {
          if (
            targetIndex !== undefined &&
            targetIndex >= 0 &&
            sourceIndex >= 0 &&
            sourceIndex < targetList.length
          ) {
            const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
            if (adjustedTarget !== sourceIndex) {
              const [movedItem] = targetList.splice(sourceIndex, 1);
              targetList.splice(adjustedTarget, 0, movedItem);
            }
          }
        } else {
          if (sourceIndex >= 0 && sourceIndex < sourceList.length) {
            const [movedItem] = sourceList.splice(sourceIndex, 1);
            if (targetList.length === 1 && isRowBlank(targetList[0])) {
              targetList.splice(0, 1, movedItem);
            } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= targetList.length) {
              targetList.splice(targetIndex, 0, movedItem);
            } else {
              targetList.push(movedItem);
            }
            if (sourceList.length === 0) {
              sourceList.push(createBlankRow());
            }
          }
        }
      }

      setBookMistakeData(newMistake);
      setBookStuckData(newStuck);
      activeDragRef.current = null;
      (window as any).__spr_active_drag_item = null;
      setDraggedItem(null);
      return;
    }

    let newMistake = [...mistakeData];
    let newStuck = [...stuckData];

    let sourceList = sourceListType === "mistake" ? newMistake : newStuck;
    let targetList = targetListType === "mistake" ? newMistake : newStuck;

    const isRowBlank = (r?: any) => {
      if (!r) return true;
      const hasPage = r.page !== undefined && r.page !== null && String(r.page).trim() !== "";
      const hasAyahs = (r.ayahs || []).some(
        (a: any) => a.value !== undefined && a.value !== null && String(a.value).trim() !== ""
      );
      return !hasPage && !hasAyahs;
    };

    if (isCopy) {
      const sourceItem = sourceList[sourceIndex];
      if (!sourceItem) return;

      const itemCopy = {
        ...sourceItem,
        id: crypto.randomUUID(),
        ayahs: (sourceItem.ayahs || []).map((a) => ({ ...a, id: crypto.randomUUID() })),
      };

      if (targetList.length === 1 && isRowBlank(targetList[0])) {
        targetList.splice(0, 1, itemCopy);
      } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= targetList.length) {
        targetList.splice(targetIndex, 0, itemCopy);
      } else {
        targetList.push(itemCopy);
      }
    } else {
      if (sourceListType === targetListType) {
        if (
          targetIndex !== undefined &&
          targetIndex >= 0 &&
          sourceIndex >= 0 &&
          sourceIndex < targetList.length
        ) {
          const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
          if (adjustedTarget !== sourceIndex) {
            const [movedItem] = targetList.splice(sourceIndex, 1);
            targetList.splice(adjustedTarget, 0, movedItem);
          }
        }
      } else {
        if (sourceIndex >= 0 && sourceIndex < sourceList.length) {
          const [movedItem] = sourceList.splice(sourceIndex, 1);
          if (targetList.length === 1 && isRowBlank(targetList[0])) {
            targetList.splice(0, 1, movedItem);
          } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= targetList.length) {
            targetList.splice(targetIndex, 0, movedItem);
          } else {
            targetList.push(movedItem);
          }
          if (sourceList.length === 0) {
            sourceList.push(createBlankRow());
          }
        }
      }
    }

    setMistakeData(newMistake);
    setStuckData(newStuck);
    activeDragRef.current = null;
    (window as any).__spr_active_drag_item = null;
    setDraggedItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetListType: string, targetIndex?: number) => {
    e.preventDefault();

    let sourceListType =
      activeDragRef.current?.listType ||
      (window as any).__spr_active_drag_item?.listType ||
      draggedItem?.listType;
    let sourceIndex =
      activeDragRef.current?.index ??
      (window as any).__spr_active_drag_item?.index ??
      draggedItem?.index;

    if (sourceListType === undefined || sourceIndex === undefined) {
      try {
        const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
        if (raw) {
          const parsed = JSON.parse(raw);
          sourceListType = parsed.listType;
          sourceIndex = parsed.index;
        }
      } catch {
        // Ignore
      }
    }

    if (sourceListType === undefined || sourceIndex === undefined) return;

    const isCopy = e.ctrlKey || e.altKey;
    handleReorderRows(sourceListType, sourceIndex, targetListType, targetIndex, isCopy);
  };

  return {
    draggedItem,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleReorderRows,
  };
}

export default useProgressDragReorder;
