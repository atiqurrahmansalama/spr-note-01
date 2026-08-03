import { ShortcutsIcon } from "../ui/Icons";

export default function ShortcutsGuide() {
  const shortcuts = [
    { key: "Arrow Up / Down", desc: "Increment or decrement page / ayah count on hover or focus" },
    { key: "Arrow Left / Right", desc: "Navigate focus between adjacent input fields" },
    { key: "Mouse Wheel", desc: "Scroll over number inputs for instant rapid adjustments" },
    { key: "+ (Plus)", desc: "Quickly insert a new ayah or range input row" },
    { key: "Backspace (on empty)", desc: "Remove current field when pressing backspace on empty input" },
    { key: "Enter", desc: "Advance cursor to next field or submit report modal" },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4">
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent">
            <ShortcutsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold theme-text-primary">Keyboard Shortcuts & Shortcuts Guide</h2>
            <p className="text-xs theme-text-secondary">
              Boost your data entry workflow speed with built-in keyboard navigation.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-3">
        <div className="grid grid-cols-1 gap-2.5">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3.5 theme-bg-sub rounded-xl hover:theme-bg-elevated transition"
            >
              <span className="text-xs theme-text-secondary font-medium">{sc.desc}</span>
              <kbd className="px-2.5 py-1 theme-bg-elevated rounded-lg text-xs font-mono font-bold theme-accent shrink-0">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
