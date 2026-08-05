import { useState } from "react";
import { CopyIcon } from "../ui/Icons";
import AutocompleteDropdown from "../ui/AutocompleteDropdown";
import { DATE_FORMAT_LIST } from "../../constants/calendarConstants";
import { copyReportSettings as copyStore, calendarSettings, dateTimeSettings } from "../../utils/localStore";

export default function CopyReportSettingsView() {
  const [includeGroup, setIncludeGroup] = useState(() => copyStore.getIncludeGroup());
  const [includeTeacher, setIncludeTeacher] = useState(() => copyStore.getIncludeTeacher());
  const [teacherName, setTeacherName] = useState(() => copyStore.getTeacherName());
  const [autoCopy, setAutoCopy] = useState(() => copyStore.getAutoCopy());
  const [dateFormat, setDateFormat] = useState(() => calendarSettings.getDateFormat());

  const handleDateFormatChange = (e) => {
    const val = e.target.value;
    setDateFormat(val);
    calendarSettings.saveDateFormat(val);
  };

  const handleTeacherNameChange = (e) => {
    const val = e.target.value;
    setTeacherName(val);
    copyStore.saveTeacherName(val);
  };

  const toggleGroup = () => {
    const val = !includeGroup;
    setIncludeGroup(val);
    copyStore.saveIncludeGroup(val);
  };

  const toggleTeacher = () => {
    const val = !includeTeacher;
    setIncludeTeacher(val);
    copyStore.saveIncludeTeacher(val);
  };

  const toggleAutoCopy = () => {
    const val = !autoCopy;
    setAutoCopy(val);
    copyStore.saveAutoCopy(val);
  };

  const cleanTeacherDisplay = teacherName.replace(/^@+/, "").trim() || "Mustafa";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">
      {/* Header */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent">
            <CopyIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold theme-text-primary">Copy Report Settings</h2>
            <p className="text-xs theme-text-secondary">
              Configure default toggles, teacher tags, and copy preferences for generated progress reports.
            </p>
          </div>
        </div>
      </div>

      {/* Options Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="space-y-3">
          
          {/* Include Group Mention */}
          <div className="flex items-center justify-between p-4 theme-bg-sub rounded-xl hover:theme-bg-elevated transition border theme-border">
            <div className="space-y-0.5">
              <div className="text-xs font-bold theme-text-primary">Include Student Group by Default</div>
              <div className="text-[11px] theme-text-secondary">Append group name line at footer of progress reports</div>
            </div>
            <button
              type="button"
              onClick={toggleGroup}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                includeGroup ? "theme-bg-accent" : "theme-bg-elevated"
              }`}
            >
              <div className={`w-4 h-4 rounded-full theme-bg-surface transition-transform absolute top-1 ${
                includeGroup ? "right-1" : "left-1"
              }`} />
            </button>
          </div>

          {/* Include Teacher Mention & Name Input */}
          <div className="p-4 theme-bg-sub rounded-xl hover:theme-bg-elevated transition space-y-3 border theme-border">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold theme-text-primary">
                  Mention Teacher Tag
                </div>
                <div className="text-[11px] theme-text-secondary">Include teacher handle in report footer with @ tag</div>
              </div>
              <button
                type="button"
                onClick={toggleTeacher}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  includeTeacher ? "theme-bg-accent" : "theme-bg-elevated"
                }`}
              >
                <div className={`w-4 h-4 rounded-full theme-bg-surface transition-transform absolute top-1 ${
                  includeTeacher ? "right-1" : "left-1"
                }`} />
              </button>
            </div>

            {/* Teacher Name Input Field */}
            {includeTeacher && (
              <div className="pt-2 border-t theme-border flex items-center gap-3">
                <label className="text-xs font-semibold theme-text-secondary shrink-0">
                  Teacher Name:
                </label>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold theme-accent">@</span>
                  <input
                    type="text"
                    value={teacherName.replace(/^@+/, "")}
                    onChange={handleTeacherNameChange}
                    placeholder="Enter teacher name..."
                    className="w-full theme-bg-app border theme-border theme-text-primary pl-7 pr-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Auto Copy to Clipboard */}
          <div className="flex items-center justify-between p-4 theme-bg-sub rounded-xl hover:theme-bg-elevated transition border theme-border">
            <div className="space-y-0.5">
              <div className="text-xs font-bold theme-text-primary">Auto Copy on Report Generation</div>
              <div className="text-[11px] theme-text-secondary">Automatically copy text to clipboard when report modal opens</div>
            </div>
            <button
              type="button"
              onClick={toggleAutoCopy}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                autoCopy ? "theme-bg-accent" : "theme-bg-elevated"
              }`}
            >
              <div className={`w-4 h-4 rounded-full theme-bg-surface transition-transform absolute top-1 ${
                autoCopy ? "right-1" : "left-1"
              }`} />
            </button>
          </div>

          {/* Report Date Format Dropdown (Custom AutocompleteDropdown) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 theme-bg-sub rounded-xl gap-3 hover:theme-bg-elevated transition border theme-border">
            <div className="space-y-0.5">
              <div className="text-xs font-bold theme-text-primary">Report Date Format</div>
              <div className="text-[11px] theme-text-secondary">Choose default date pattern used in generated reports</div>
            </div>
            <div className="w-full sm:w-72">
              <AutocompleteDropdown
                readOnly={true}
                disableSaveButton={true}
                showAllOptionsOnFocus={true}
                onNextFocus={() => {}}
                options={DATE_FORMAT_LIST.map((fmt) => ({
                  label: `${fmt.name} (${fmt.sample})`,
                  value: fmt.id,
                }))}
                value={
                  DATE_FORMAT_LIST.find((f) => f.id === dateFormat)
                    ? `${DATE_FORMAT_LIST.find((f) => f.id === dateFormat).name} (${DATE_FORMAT_LIST.find((f) => f.id === dateFormat).sample})`
                    : dateFormat
                }
                onChange={(sel) => {
                  const val = typeof sel === "object" ? sel.value : sel;
                  if (val) {
                    const matched = DATE_FORMAT_LIST.find((f) => f.id === val || `${f.name} (${f.sample})` === val);
                    const targetId = matched ? matched.id : val;
                    setDateFormat(targetId);
                    calendarSettings.saveDateFormat(targetId);
                  }
                }}
                placeholder="Select date format..."
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
