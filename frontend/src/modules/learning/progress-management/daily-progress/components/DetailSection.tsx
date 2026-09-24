import React, { useState, useEffect } from "react";
import { DragHandleIcon, PlusIcon } from "@/components/ui/Icons";
import IconButton from "@/components/ui/IconButton";
import CustomInput from "@/components/ui/CustomInput";
import CustomSelect from "@/components/ui/CustomSelect";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "@/utils/keyboardUtils";
import { QURAN_RULES, getJuzPageBounds, quranTrackingSession } from "../quranRules";
import { useQuranTrackingSession } from "../hooks/useQuranTrackingSession";
import {
  RowRemoveButton,
  SectionHeaderBar,
  AddMoreSectionButton,
} from "./DailyProgressUIControls";
import type { DetailRowData } from "../types";

export function DetailRow({
  rowData,
  onChange,
  onRemoveRow,
  onAddNewRow,
  availableJuzs,
  juzPageData,
  listType = "mistake",
  index,
  isLastRow = false,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
}: {
  rowData: DetailRowData;
  onChange: (updater: (prevRow: DetailRowData) => DetailRowData) => void;
  onRemoveRow?: () => void;
  onAddNewRow?: () => void;
  onNextSection?: () => void;
  availableJuzs?: (string | number)[];
  juzPageData?: any[];
  listType?: string;
  index: number;
  isLastRow?: boolean;
  draggedItem?: { listType: string; index: number } | null;
  onDragStart?: (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, listType: string, index?: number) => void;
  onReorderRows?: (sourceListType: string, sourceIndex: number, targetListType: string, targetIndex?: number, isCopy?: boolean) => void;
}) {
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);
  const isDragging = Boolean(draggedItem && draggedItem.listType === listType && draggedItem.index === index);

  const { lastPage, lastAyah } = useQuranTrackingSession();

  const effectiveJuz =
    availableJuzs && availableJuzs.length === 1
      ? availableJuzs[0]
      : availableJuzs && availableJuzs.length > 1
      ? (rowData.juz && availableJuzs.some((j) => String(j) === String(rowData.juz)) ? rowData.juz : availableJuzs[0])
      : (rowData.juz || (juzPageData && Array.isArray(juzPageData) && juzPageData.find((r) => r.juz && String(r.juz).trim() !== "")?.juz) || "");

  const { minPage, maxPage } = getJuzPageBounds(effectiveJuz, juzPageData);

  useEffect(() => {
    if (effectiveJuz && String(rowData.juz || "") !== String(effectiveJuz)) {
      onChange((prev) => {
        if (String(prev.juz || "") !== String(effectiveJuz)) {
          return { ...prev, juz: effectiveJuz };
        }
        return prev;
      });
    }
  }, [effectiveJuz, rowData.juz, onChange]);

  const handlePageChange = (val: string | number) => {
    onChange((prev) => ({ ...prev, page: val }));
    if (val !== "" && val !== undefined && val !== null) {
      quranTrackingSession.setLastPage(val);
    }
  };

  const handlePageBlur = () => {
    if (rowData.page !== "" && rowData.page !== undefined && rowData.page !== null) {
      let p = parseInt(String(rowData.page), 10);
      if (!isNaN(p)) {
        if (p < minPage) p = minPage;
        if (p > maxPage) p = maxPage;
        if (p !== Number(rowData.page)) {
          handlePageChange(p);
        } else {
          quranTrackingSession.setLastPage(p);
        }
      }
    }
  };

  const handleAyahChange = (ayahIndex: number, val: string | number) => {
    onChange((prevRow) => {
      const newAyahs = [...prevRow.ayahs];
      newAyahs[ayahIndex] = { ...newAyahs[ayahIndex], value: val };
      return { ...prevRow, ayahs: newAyahs };
    });
    if (val !== "" && val !== undefined && val !== null) {
      quranTrackingSession.setLastAyah(val);
    }
  };

  const handleAyahBlur = (ayahIndex: number) => {
    const ayah = rowData.ayahs[ayahIndex];
    if (ayah && ayah.value !== "" && ayah.value !== undefined && ayah.value !== null) {
      let a = parseInt(String(ayah.value), 10);
      if (!isNaN(a)) {
        if (a < QURAN_RULES.MIN_AYAH) a = QURAN_RULES.MIN_AYAH;
        if (a > QURAN_RULES.MAX_AYAH) a = QURAN_RULES.MAX_AYAH;
        if (a !== Number(ayah.value)) {
          handleAyahChange(ayahIndex, a);
        } else {
          quranTrackingSession.setLastAyah(a);
        }
      }
    }
  };

  const handleAyahEnter = (ayahIndex: number, e: any, isLastAyah: boolean) => {
    handleAyahBlur(ayahIndex);
    if (isLastRow && isLastAyah && onAddNewRow) {
      if (e && e.preventDefault) e.preventDefault();
      onAddNewRow();
    } else {
      handleEnterFocusNext(e);
    }
  };

  const addAyah = () => {
    const newId = crypto.randomUUID();
    onChange((prevRow) => ({
      ...prevRow,
      ayahs: [...prevRow.ayahs, { id: newId, value: "" }],
    }));
    setTimeout(() => {
      const el = document.getElementById(`ayah-${newId}`);
      if (el) el.focus();
    }, 100);
  };

  const removeAyah = (ayahIndex: number) => {
    onChange((prevRow) => {
      if (prevRow.ayahs.length > 1) {
        const newAyahs = prevRow.ayahs.filter((_, idx) => idx !== ayahIndex);
        return { ...prevRow, ayahs: newAyahs };
      }
      return prevRow;
    });
  };

  const handleRowDragOver = (e: React.DragEvent) => {
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

  const handleRowDrop = (e: React.DragEvent) => {
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

  const hasMultiJuz = Boolean(availableJuzs && availableJuzs.length > 1);

  const pageInputBlock = (
    <div className="theme-bg-sub rounded-lg border theme-border hover:border-[var(--border-hover)] focus-within:border-[var(--accent-main)] overflow-hidden h-10 w-12 sm:w-14 shrink-0 transition-all flex items-center justify-center">
      <CustomInput
        id={`page-${rowData.id}`}
        type="number"
        variant="borderless"
        scrollable={true}
        allowDecimals={false}
        value={rowData.page}
        onChange={handlePageChange}
        onBlur={handlePageBlur}
        onEnter={handleEnterFocusNext}
        onAdd={addAyah}
        onAddShift={addAyah}
        onEmptyBackspace={(e: any) => {
          if (onRemoveRow) onRemoveRow();
          handleBackspaceFocusPrev(e, true);
        }}
        min={minPage}
        max={maxPage}
        initialScrollValue={lastPage !== null ? lastPage : minPage}
        placeholder="--"
        className="w-full h-full p-0 min-h-0"
        wrapperClassName="w-full h-full"
        inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
      />
    </div>
  );

  const ayahBoxes = (rowData.ayahs || []).map((ayah, aIdx) => {
    const isLastAyah = aIdx === (rowData.ayahs?.length || 0) - 1;
    return (
      <div key={ayah.id || aIdx} className="flex items-center gap-1.5 shrink-0">
        <div className="theme-bg-sub rounded-lg border theme-border hover:border-[var(--border-hover)] focus-within:border-[var(--accent-main)] overflow-hidden h-10 w-12 sm:w-14 shrink-0 transition-all flex items-center justify-center">
          <CustomInput
            id={`ayah-${ayah.id}`}
            type="number"
            variant="borderless"
            scrollable={true}
            allowDecimals={false}
            value={ayah.value}
            onChange={(val) => handleAyahChange(aIdx, val)}
            onBlur={() => handleAyahBlur(aIdx)}
            onEnter={(e: any) => handleAyahEnter(aIdx, e, isLastAyah)}
            onAdd={addAyah}
            onAddShift={addAyah}
            onEmptyBackspace={(e: any) => {
              if (aIdx > 0) removeAyah(aIdx);
              handleBackspaceFocusPrev(e, true);
            }}
            min={QURAN_RULES.MIN_AYAH}
            max={QURAN_RULES.MAX_AYAH}
            initialScrollValue={lastAyah !== null ? lastAyah : QURAN_RULES.MIN_AYAH}
            placeholder="--"
            className="w-full h-full p-0 min-h-0"
            wrapperClassName="w-full h-full"
            inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
          />
        </div>
        {!isLastAyah && (
          <span className="theme-text-secondary font-semibold text-xs sm:text-sm select-none -ml-0.5">
            ,
          </span>
        )}
        {isLastAyah && (
          <IconButton
            icon={PlusIcon}
            size="xs"
            variant="ghost"
            shape="circle"
            onClick={addAyah}
            title="Add another Ayah"
            ariaLabel="Add another Ayah"
            className="border theme-border hover:theme-bg-surface hover:theme-text-primary shrink-0"
          />
        )}
      </div>
    );
  });

  return (
    <div
      data-detail-row="true"
      data-list-type={listType}
      data-row-index={index}
      onDragOver={handleRowDragOver}
      onDragLeave={() => setDropPosition(null)}
      onDrop={handleRowDrop}
      className={`flex items-start gap-2 sm:gap-3 w-full py-1.5 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-xl relative group transition-all duration-150 select-none ${
        isDragging ? "opacity-35 scale-[0.98] border border-dashed theme-border theme-bg-sub" : "hover:theme-bg-elevated"
      }`}
    >
      {dropPosition === "before" && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent-main)] rounded-full z-20 pointer-events-none" />
      )}
      {dropPosition === "after" && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--accent-main)] rounded-full z-20 pointer-events-none" />
      )}

      <div
        draggable={true}
        onDragStart={(e) => onDragStart && onDragStart(e, listType, index)}
        onDragEnd={() => {
          setDropPosition(null);
          onDragEnd && onDragEnd();
        }}
        className="w-5 h-10 flex items-center justify-center cursor-grab active:cursor-grabbing theme-text-secondary hover:theme-text-primary shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
        title="Drag to reorder"
      >
        <DragHandleIcon className="w-3.5 h-3.5" />
      </div>

      {hasMultiJuz && (
        <div className="flex items-center gap-1 shrink-0 h-10 self-start">
          <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary">Juz</label>
          <div className="h-10 w-12 sm:w-14">
            <CustomSelect
              value={effectiveJuz}
              onChange={(val) => onChange((prev) => ({ ...prev, juz: val }))}
              options={availableJuzs.map((j) => ({ value: String(j), label: `${j}` }))}
              compactMode={true}
              showChevron={false}
            />
          </div>
        </div>
      )}

      <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary shrink-0 h-10 flex items-center self-start">
        Page
      </label>

      {hasMultiJuz ? (
        <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
          {pageInputBlock}
          <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary shrink-0 h-10 flex items-center">
            Ayah
          </label>
          {ayahBoxes}
        </div>
      ) : (
        <>
          {pageInputBlock}
          <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary shrink-0 h-10 flex items-center self-start">
            Ayah
          </label>
          <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
            {ayahBoxes}
          </div>
        </>
      )}

      <RowRemoveButton onRemove={onRemoveRow} title={`Remove ${listType === "mistake" ? "Mistake" : "Stuck"} Row`} />
    </div>
  );
}

export function DetailSection({
  title,
  listType,
  data,
  onChange,
  availableJuzs,
  juzPageData,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
  onReset,
}: {
  title: string;
  listType: "mistake" | "stuck" | string;
  data: DetailRowData[];
  onChange: (updater: DetailRowData[] | ((prevData: DetailRowData[]) => DetailRowData[])) => void;
  availableJuzs?: (string | number)[];
  juzPageData?: any[];
  draggedItem?: { listType: string; index: number } | null;
  onDragStart?: (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, listType: string, index?: number) => void;
  onReorderRows?: (sourceListType: string, sourceIndex: number, targetListType: string, targetIndex?: number, isCopy?: boolean) => void;
  onReset?: () => void;
}) {
  const addRow = () => {
    const newId = crypto.randomUUID();
    onChange((prevData) => {
      const defaultJuz =
        (availableJuzs && availableJuzs.length > 0 ? availableJuzs[0] : "") ||
        (juzPageData?.find((r) => r.juz && String(r.juz).trim() !== "")?.juz || "");
      const lastJuz =
        prevData.length > 0 && prevData[prevData.length - 1].juz
          ? prevData[prevData.length - 1].juz
          : defaultJuz;
      const rowJuz =
        availableJuzs && availableJuzs.length === 1
          ? availableJuzs[0]
          : availableJuzs && availableJuzs.length > 1
          ? (lastJuz && availableJuzs.some((j) => String(j) === String(lastJuz)) ? lastJuz : availableJuzs[0])
          : (lastJuz || defaultJuz);
      return [
        ...prevData,
        {
          id: newId,
          juz: rowJuz,
          page: "",
          ayahs: [{ id: crypto.randomUUID(), value: "" }],
        },
      ];
    });

    setTimeout(() => {
      const el = document.getElementById(`page-${newId}`);
      if (el) {
        el.focus();
        if (typeof (el as HTMLInputElement).select === "function") (el as HTMLInputElement).select();
      }
    }, 60);
  };

  const handleRemoveRow = (index: number) => {
    onChange((prevData) => {
      if (prevData.length > 1) {
        return prevData.filter((_, idx) => idx !== index);
      }
      return prevData;
    });
  };

  const handleRowChange = (index: number, newRow: DetailRowData | ((prevRow: DetailRowData) => DetailRowData)) => {
    onChange((prevData) => {
      const newData = [...prevData];
      const oldRow = newData[index];
      const updated = typeof newRow === "function" ? newRow(oldRow) : newRow;
      newData[index] = {
        ...oldRow,
        ...updated,
        id: oldRow.id || updated.id || `detail-row-${index}`,
      };
      return newData;
    });
  };

  const totalCount = (data || []).reduce((sum, row) => {
    if (row.page && String(row.page).trim() !== "") {
      const filledAyahs = (row.ayahs || []).filter((a) => a.value && String(a.value).trim() !== "");
      return sum + filledAyahs.length;
    }
    return sum;
  }, 0);

  const hasDetailData =
    (data || []).length > 1 ||
    (data || []).some(
      (row) =>
        Boolean(row.page !== undefined && row.page !== null && String(row.page).trim() !== "") ||
        (row.ayahs || []).some((a) => Boolean(a.value !== undefined && a.value !== null && String(a.value).trim() !== ""))
    );

  return (
    <div className="relative">
      <SectionHeaderBar
        title={title}
        count={totalCount}
        showReset={hasDetailData}
        onReset={onReset}
        resetTitle={`Reset ${title}`}
      />

      <div className="space-y-1 sm:space-y-1.5">
        {data.map((row, index) => (
          <DetailRow
            key={row.id || index}
            rowData={row}
            onChange={(updater) => handleRowChange(index, updater)}
            onRemoveRow={data.length > 1 ? () => handleRemoveRow(index) : undefined}
            onAddNewRow={index === data.length - 1 ? addRow : undefined}
            availableJuzs={availableJuzs}
            juzPageData={juzPageData}
            listType={listType}
            index={index}
            isLastRow={index === data.length - 1}
            draggedItem={draggedItem}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onReorderRows={onReorderRows}
          />
        ))}
      </div>

      <AddMoreSectionButton onClick={addRow} label={`+ Add More`} />
    </div>
  );
}
