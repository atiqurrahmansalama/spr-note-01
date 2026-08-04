import { ShortcutsIcon } from "../ui/Icons";

export default function ShortcutsGuide() {
  const formFlowShortcuts = [
    { key: "Default Focus", desc: "Form opens with initial cursor focused in Student Name Input" },
    { key: "+ (Plus Key)", desc: "Open 'Save Student Card' modal while typing a new student name" },
    { key: "Arrow Left / Right", desc: "Toggle between '+ Add as New' and '⇄ Replace Existing' in Save Student Card" },
    { key: "Enter (in Save Panel)", desc: "Confirm mode -> Student Name -> Group / Course -> Save & Close card" },
    { key: "Arrow Up / Down & Enter", desc: "Navigate & select options in Student, Session & all dropdowns" },
    { key: "Enter", desc: "Advance focus sequentially (Student -> Session -> Juz -> Page Start/End -> Ayah)" },
    { key: "+ (in Page / Ayah)", desc: "Insert new Page Range row or new Ayah box in row" },
    { key: "Shift + +", desc: "Insert new Juz section row" },
    { key: "Enter (in Ayah Box)", desc: "Insert new Mistake or Stuck detail row" },
    { key: "Shift + Enter", desc: "Jump section (Mistake Detail -> Stuck Detail -> Comments Textarea)" },
  ];

  const submitShortcuts = [
    { key: "Ctrl + S / Cmd + S", desc: "Make Report (Open formatted preview modal & export report)" },
    { key: "Alt + S / Ctrl + Enter", desc: "Add Record (Save current report entry directly to record log)" },
    { key: "Ctrl + Z / Cmd + Z", desc: "Undo Form Changes (Restore previous draft state)" },
    { key: "Alt + Ctrl + Z / Ctrl + Shift + Z", desc: "Redo Form Changes (Restore next redone state)" },
  ];

  const themeShortcuts = [
    { key: "Alt + L / Ctrl + Shift + L", desc: "Toggle Dark / Light Mode instantly" },
    { key: "Alt + T / Ctrl + Shift + T", desc: "Cycle color theme palette (Slate, Emerald, Indigo, Amber, Rose, Cyan)" },
  ];

  const globalShortcuts = [
    { key: "Ctrl + M / Cmd + M", desc: "Toggle Left Navigation Sidebar Menu" },
    { key: "Ctrl + K / Cmd + K", desc: "Focus Quick Search / Student Input" },
    { key: "Escape (Esc)", desc: "Close Active Modal / Return to Dashboard" },
    { key: "Ctrl + Shift + D", desc: "Switch to Main Dashboard" },
    { key: "Ctrl + Shift + G", desc: "Open Groups & Students Directory" },
    { key: "Ctrl + Shift + S", desc: "Open Sessions & Comments Manager" },
    { key: "Ctrl + Shift + B", desc: "Open Data & Backup View" },
    { key: "Ctrl + Shift + A", desc: "Open Appearance & Themes Settings" },
    { key: "Ctrl + Shift + K", desc: "Open Keyboard Shortcuts Guide" },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">
      {/* 1. Header Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent">
            <ShortcutsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold theme-text-primary">Keyboard Shortcuts Guide</h2>
            <p className="text-xs theme-text-secondary">
              Comprehensive report form keyboard navigation flow & system hotkeys guide.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Report Form Sequential Navigation */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider theme-accent pb-1 border-b theme-border">
          1. Report Form Keyboard Focus Flow
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {formFlowShortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 theme-bg-sub rounded-xl hover:theme-bg-elevated transition gap-3"
            >
              <span className="text-xs theme-text-primary font-medium flex-1">{sc.desc}</span>
              <kbd className="px-2.5 py-1 theme-bg-elevated border theme-border rounded-lg text-xs font-mono font-bold theme-accent shrink-0 shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Form Submit & Save */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider theme-accent pb-1 border-b theme-border">
          2. Report Generation & Record Submission
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {submitShortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 theme-bg-sub rounded-xl hover:theme-bg-elevated transition gap-3"
            >
              <span className="text-xs theme-text-primary font-medium flex-1">{sc.desc}</span>
              <kbd className="px-2.5 py-1 theme-bg-elevated border theme-border rounded-lg text-xs font-mono font-bold theme-accent shrink-0 shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Appearance & Theme Toggles */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider theme-accent pb-1 border-b theme-border">
          3. Dark Mode & Color Theme Toggles
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {themeShortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 theme-bg-sub rounded-xl hover:theme-bg-elevated transition gap-3"
            >
              <span className="text-xs theme-text-primary font-medium flex-1">{sc.desc}</span>
              <kbd className="px-2.5 py-1 theme-bg-elevated border theme-border rounded-lg text-xs font-mono font-bold theme-accent shrink-0 shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Global Application Hotkeys */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider theme-accent pb-1 border-b theme-border">
          4. Global Application Hotkeys
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {globalShortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 theme-bg-sub rounded-xl hover:theme-bg-elevated transition gap-3"
            >
              <span className="text-xs theme-text-primary font-medium flex-1">{sc.desc}</span>
              <kbd className="px-2.5 py-1 theme-bg-elevated border theme-border rounded-lg text-xs font-mono font-bold theme-accent shrink-0 shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
