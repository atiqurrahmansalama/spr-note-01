import React, { useMemo } from "react";
import AutocompleteDropdown, { AutocompleteOption } from "../../../../../components/ui/AutocompleteDropdown";

export interface SessionItem {
  name?: string;
  label?: string;
  value?: string;
}

export interface SessionInputSectionProps {
  sessionList?: (string | SessionItem)[];
  selectedSession?: string;
  onSessionChange?: (val: string) => void;
  onSaveSession?: (newSessionName: string) => void;
}

/**
 * Enterprise Reusable Session Input Section with Project Design Standard,
 * inline autocomplete, and top-right header action with Add Session link.
 */
export default function SessionInputSection({
  sessionList = [],
  selectedSession = "",
  onSessionChange,
}: SessionInputSectionProps) {
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

  const handleQueryChange = (val: string) => {
    if (onSessionChange) {
      onSessionChange(val || "");
    }
  };

  return (
    <div className="w-full">
      <AutocompleteDropdown
        options={sessionOptions}
        value={selectedSession}
        onChange={handleSelectOption}
        onQueryChange={handleQueryChange}
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
