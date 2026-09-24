import React, { useMemo } from "react";
import AutocompleteDropdown, { type AutocompleteOption } from "@/components/ui/AutocompleteDropdown";
import type { SessionItem } from "../types";

export function SessionInputSection({
  sessionList = [],
  selectedSession = "",
  onSessionChange,
}: {
  sessionList?: (string | SessionItem)[];
  selectedSession?: string;
  onSessionChange?: (val: string) => void;
}) {
  const sessionOptions: AutocompleteOption[] = useMemo(() => {
    return sessionList.map((s) => ({
      label: typeof s === "object" ? (s.name || s.label || "") : String(s),
      value: typeof s === "object" ? (s.name || s.value || "") : String(s),
    }));
  }, [sessionList]);

  const handleSelectOption = (option: any) => {
    if (!onSessionChange) return;
    if (typeof option === "string") {
      onSessionChange(option);
    } else if (typeof option === "object" && option !== null) {
      onSessionChange(option.value || option.label || "");
    }
  };

  return (
    <div className="w-full">
      <AutocompleteDropdown
        options={sessionOptions}
        value={selectedSession}
        onChange={handleSelectOption}
        onQueryChange={(val) => onSessionChange && onSessionChange(val || "")}
        placeholder="e.g. Sobok, Dour..."
        label="SESSION"
        actionLabel="+ Add Session"
        actionTo="/admin-tools?tab=report-sessions"
        actionTitle="Add or manage sessions"
        size="md"
      />
    </div>
  );
}
