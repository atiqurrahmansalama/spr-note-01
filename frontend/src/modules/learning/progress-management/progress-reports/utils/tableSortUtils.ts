import { Column } from "@/components/ui/DataTable";

export interface TableSortConfig {
  key: string | null;
  direction: "asc" | "desc" | null;
}

/**
 * Universal Dataset Sorter for Enterprise DataTables
 * Supports custom sortValue extractors, natural alphanumeric comparison, numeric ranking, and null handling.
 */
export function sortDataset<T>(
  data: T[],
  sortConfig: TableSortConfig,
  columns: Column<T>[]
): T[] {
  if (!sortConfig.key || !sortConfig.direction) {
    return data;
  }

  const activeSortColumn = columns.find(
    (c: any) =>
      (c.sortKey || c.accessor || c.key || c.id || c.dataIndex) === sortConfig.key
  ) as any;

  if (!activeSortColumn) return data;

  const { direction } = sortConfig;
  const isAsc = direction === "asc";
  const shallow = [...data];

  return shallow.sort((a, b) => {
    let valA: any;
    let valB: any;

    if (typeof activeSortColumn.sortValue === "function") {
      valA = activeSortColumn.sortValue(a);
      valB = activeSortColumn.sortValue(b);
    } else {
      const key = activeSortColumn.sortKey || activeSortColumn.key;
      valA = (a as any)[key];
      valB = (b as any)[key];
    }

    if (valA === valB) return 0;
    if (valA === null || valA === undefined || valA === "") return 1;
    if (valB === null || valB === undefined || valB === "") return -1;

    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB) && typeof valA !== "boolean" && typeof valB !== "boolean") {
      return isAsc ? numA - numB : numB - numA;
    }

    return isAsc
      ? String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: "base" })
      : String(valB).localeCompare(String(valA), undefined, { numeric: true, sensitivity: "base" });
  });
}
