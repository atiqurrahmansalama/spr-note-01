import { useState } from "react";
import { CopyIcon } from "../ui/Icons";
import { copyReportSettings as copyStore } from "../../utils/localStore";

export default function CopyReportSettingsView() {
  const [includeGroup, setIncludeGroup] = useState(() => copyStore.getIncludeGroup());
  const [includeTeacher, setIncludeTeacher] = useState(() => copyStore.getIncludeTeacher());
  const [autoCopy, setAutoCopy] = useState(() => copyStore.getAutoCopy());

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

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4">
      {/* Header */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent">
            <CopyIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold theme-text-primary">Copy Report Settings</h2>
            <p className="text-xs theme-text-secondary">
              Configure default toggles and copy preferences for generated progress reports.
            </p>
          </div>
        </div>
      </div>

      {/* Options Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="space-y-3">
          
          {/* Include Group Mention */}
          <div className="flex items-center justify-between p-4 theme-bg-sub rounded-xl hover:theme-bg-elevated transition">
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

          {/* Include Teacher Mention */}
          <div className="flex items-center justify-between p-4 theme-bg-sub rounded-xl hover:theme-bg-elevated transition">
            <div className="space-y-0.5">
              <div className="text-xs font-bold theme-text-primary">Include Teacher Tag (@Mustafa)</div>
              <div className="text-[11px] theme-text-secondary">Include teacher handle in footer when group is enabled</div>
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

          {/* Auto Copy to Clipboard */}
          <div className="flex items-center justify-between p-4 theme-bg-sub rounded-xl hover:theme-bg-elevated transition">
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

        </div>
      </div>
    </div>
  );
}
