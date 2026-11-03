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

    if (valA !== valB) {
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
    }

    // Deterministic tiebreaker when primary sort keys are equal:
    // Compare timestamp / created_at / client_updated_at descending, then id
    const tA = new Date((a as any).date || (a as any).client_updated_at || (a as any).created_at || 0).getTime();
    const tB = new Date((b as any).date || (b as any).client_updated_at || (b as any).created_at || 0).getTime();
    if (!isNaN(tA) && !isNaN(tB) && tA !== tB) {
      return isAsc ? tA - tB : tB - tA;
    }

    const idA = String((a as any).server_id || (a as any).id || (a as any).report_unique_id || "");
    const idB = String((b as any).server_id || (b as any).id || (b as any).report_unique_id || "");
    return idA.localeCompare(idB, undefined, { numeric: true });
  });
}
