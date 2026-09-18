import React, { useMemo } from "react";
import AutocompleteDropdown, { AutocompleteOption } from "../../../../components/ui/AutocompleteDropdown";

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
 * inline autocomplete, and top-right header save action.
 */
export default function SessionInputSection({
  sessionList = [],
  selectedSession = "",
  onSessionChange,
  onSaveSession,
}: SessionInputSectionProps) {
  const sessionOptions: AutocompleteOption[] = useMemo(() => {
    return sessionList.map((s) => ({
      label: typeof s === "object" ? (s.name || s.label || "") : String(s),
      value: typeof s === "object" ? (s.name || s.value || "") : String(s),
    }));
  }, [sessionList]);

  const trimmedSession = (selectedSession || "").trim();
  const isExistingSession = useMemo(() => {
    if (!trimmedSession) return false;
    const lower = trimmedSession.toLowerCase();
    return sessionList.some((s) => {
      const name = (typeof s === "object" ? (s.name || s.label || "") : String(s)).toLowerCase();
      return name === lower;
    });
  }, [trimmedSession, sessionList]);

  const handleSelectOption = (option: AutocompleteOption) => {
    if (onSessionChange) {
      onSessionChange(option.value || option.label);
    }
  };

  const handleQueryChange = (val: string) => {
    if (onSessionChange) {
      onSessionChange(val);
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (trimmedSession && !isExistingSession && onSaveSession) {
      onSaveSession(trimmedSession);
    }
  };

  const headerAction = trimmedSession && !isExistingSession && onSaveSession ? (
    <button
      type="button"
      onClick={handleSaveClick}
      className="text-xs font-semibold theme-accent hover:underline cursor-pointer transition-colors"
      title="Save new session"
    >
      + Save
    </button>
  ) : undefined;

  return (
    <div className="w-full">
      <AutocompleteDropdown
        options={sessionOptions}
        value={selectedSession}
        onChange={handleSelectOption}
        onQueryChange={handleQueryChange}
        placeholder="e.g. Sobok, Dour..."
        label="SESSION"
        headerAction={headerAction}
        size="md"
      />
    </div>
  );
}
