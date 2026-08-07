import AutocompleteDropdown from "../../../components/ui/AutocompleteDropdown";

export default function SessionInputSection({
  sessionList = [],
  selectedSession = "",
  onSessionChange,
  onSaveSession,
}) {
  const sessionOptions = sessionList.map((s) => ({
    label: typeof s === "object" ? (s.name || s.label) : s,
    value: typeof s === "object" ? (s.name || s.value) : s,
  }));

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-4">
      <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary w-full sm:w-20 sm:mt-3 shrink-0">
        SESSION
      </label>
      <div className="flex-1 w-full min-w-0">
        <AutocompleteDropdown
          options={sessionOptions}
          value={selectedSession}
          onChange={(item) => {
            const val = typeof item === "object" ? (item.label || item.value) : item;
            if (onSessionChange) onSessionChange(val);
          }}
          onAddNew={(newSessionName) => {
            if (onSaveSession) onSaveSession(newSessionName);
          }}
          placeholder="Select or type session..."
        />
      </div>
    </div>
  );
}
