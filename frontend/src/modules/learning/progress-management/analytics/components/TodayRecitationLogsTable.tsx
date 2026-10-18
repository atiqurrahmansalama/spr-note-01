import React, { useState, useMemo } from "react";
import { TodayRecitationRecord } from "../types";
import { SearchIcon, InfoIcon, DotsVerticalIcon, CheckIcon, CloseIcon } from "@/components/ui/Icons";

export interface TodayRecitationLogsTableProps {
  records: TodayRecitationRecord[];
  onViewRecord?: (record: TodayRecitationRecord) => void;
}

export const TodayRecitationLogsTable: React.FC<TodayRecitationLogsTableProps> = ({
  records,
  onViewRecord,
}) => {
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // Unique session list
  const sessions = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.sessionName).filter(Boolean)));
  }, [records]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return records.filter((r) => {
      const q = search.toLowerCase().trim();
      const name = r.studentName.toLowerCase();
      const roll = (r.rollNumber || "").toLowerCase();
      const portion = r.portionTitle.toLowerCase();

      const matchesSearch = !q || name.includes(q) || roll.includes(q) || portion.includes(q);
      const matchesSession = sessionFilter === "ALL" || r.sessionName === sessionFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "clean" && r.isClean) ||
        (statusFilter === "errors" && !r.isClean);

      return matchesSearch && matchesSession && matchesStatus;
    });
  }, [records, search, sessionFilter, statusFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const toggleSelectOne = (id: string | number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const getStatusBadge = (r: TodayRecitationRecord) => {
    if (r.isClean) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Completed</span>
        </span>
      );
    }
    if (r.mistakesCount <= 2 && r.stucksCount <= 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Passed</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        <span>Remedial</span>
      </span>
    );
  };

  return (
    <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm space-y-4">
      {/* 1. Header Toolbar (Matching RECENT TRANSACTIONS from reference image) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider uppercase theme-text-secondary">
            Today's Recitations & Progress Logs
          </span>
          <InfoIcon className="w-3.5 h-3.5 theme-text-secondary opacity-60" />
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold theme-bg-sub border theme-border theme-text-secondary">
            {filtered.length} of {records.length}
          </span>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Search Input */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 theme-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch}
              placeholder="Search student, roll, or para..."
              className="w-full h-9 pl-8 pr-3 text-xs rounded-xl theme-bg-sub border theme-border hover:border-[var(--border-hover)] focus:border-[var(--accent-main)] focus:outline-none theme-text-primary transition placeholder:theme-text-secondary/60"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 theme-text-secondary hover:theme-text-primary"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Session Filter */}
          {sessions.length > 1 && (
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-xl theme-bg-sub border theme-border theme-text-primary cursor-pointer focus:outline-none"
            >
              <option value="ALL">All Sessions</option>
              {sessions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs rounded-xl theme-bg-sub border theme-border theme-text-primary cursor-pointer focus:outline-none"
          >
            <option value="ALL">All Accuracy</option>
            <option value="clean">0 Errors Only</option>
            <option value="errors">With Errors</option>
          </select>

          <button
            type="button"
            className="p-2 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-secondary transition"
            title="Table Options"
          >
            <DotsVerticalIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Responsive Table Container */}
      <div className="w-full overflow-x-auto rounded-xl border theme-border theme-bg-sub/30">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b theme-border font-bold uppercase tracking-wider text-[11px] theme-text-secondary theme-bg-sub/80 select-none">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleSelectAll}
                  className="rounded theme-border text-[var(--accent-main)] cursor-pointer"
                />
              </th>
              <th className="py-3 px-3 w-20">ID / Roll</th>
              <th className="py-3 px-3 min-w-[160px]">Student</th>
              <th className="py-3 px-3 min-w-[150px]">Portion / Surah</th>
              <th className="py-3 px-3 min-w-[120px]">Session</th>
              <th className="py-3 px-3 min-w-[100px] text-center">Status</th>
              <th className="py-3 px-3 w-20 text-center">Pages</th>
              <th className="py-3 px-3 min-w-[100px] text-center">Mistakes / Stucks</th>
              <th className="py-3 px-3 w-16 text-center">Score</th>
              <th className="py-3 px-3 w-12 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y theme-border font-medium">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center theme-text-secondary">
                  <div className="space-y-1">
                    <p className="font-semibold text-xs theme-text-primary">No recitation records found</p>
                    <p className="text-[11px]">No recitation logs matching active filters for this period.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const isSelected = selectedIds.has(r.id);
                return (
                  <tr
                    key={r.id}
                    className={`transition-colors duration-150 ${
                      isSelected
                        ? "theme-bg-accent-soft/40"
                        : "hover:theme-bg-elevated/40"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(r.id)}
                        className="rounded theme-border text-[var(--accent-main)] cursor-pointer"
                      />
                    </td>

                    {/* ID / Roll */}
                    <td className="py-3 px-3 font-mono text-[11px] theme-text-secondary">
                      #{r.rollNumber || String(r.id).slice(-4)}
                    </td>

                    {/* Student Name */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full theme-bg-sub border theme-border flex items-center justify-center font-bold text-[10px] theme-accent shrink-0">
                          {r.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <span className="font-bold theme-text-primary block truncate max-w-[140px]">
                            {r.studentName}
                          </span>
                          {r.groupName && (
                            <span className="text-[10px] theme-text-secondary block truncate">
                              {r.groupName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Portion / Lesson */}
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <span className="font-bold theme-text-primary block truncate max-w-[160px]">
                          {r.portionTitle}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded theme-bg-sub theme-text-secondary border theme-border inline-block">
                          {r.portionType === "new_lesson" ? "সবক (New)" : "সবকী (Revision)"}
                        </span>
                      </div>
                    </td>

                    {/* Session Name */}
                    <td className="py-3 px-3 theme-text-secondary text-[11px]">
                      {r.sessionName}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center">
                      {getStatusBadge(r)}
                    </td>

                    {/* Volume (Pages) */}
                    <td className="py-3 px-3 text-center font-mono font-bold theme-text-primary">
                      {r.totalPages}p
                    </td>

                    {/* Mistakes / Stucks */}
                    <td className="py-3 px-3 text-center font-mono text-[11px]">
                      {r.isClean ? (
                        <span className="text-emerald-400 font-bold">0 Errors</span>
                      ) : (
                        <span className="theme-text-secondary">
                          <span className={r.mistakesCount > 0 ? "text-rose-400 font-bold" : ""}>
                            {r.mistakesCount}m
                          </span>{" "}
                          •{" "}
                          <span className={r.stucksCount > 0 ? "text-amber-400 font-bold" : ""}>
                            {r.stucksCount}s
                          </span>
                        </span>
                      )}
                    </td>

                    {/* Score / Grade */}
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      <span className="px-2 py-0.5 rounded-md theme-bg-sub border theme-border text-[11px] theme-accent">
                        {r.score || "A"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onViewRecord && onViewRecord(r)}
                        className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
                        title="View details"
                      >
                        <DotsVerticalIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TodayRecitationLogsTable;
