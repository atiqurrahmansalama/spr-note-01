import { AppGuideIcon } from "../../../components/ui/Icons";

export default function AppGuideView() {
  const steps = [
    {
      step: "1. Select Date & Student Name",
      detail: "Pick the session date and choose or type the student name from the autocomplete dropdown."
    },
    {
      step: "2. Input Juz & Page Ranges",
      detail: "Enter starting and ending page ranges. Use the '+' button to append additional rows when needed."
    },
    {
      step: "3. Log Mistakes & Stuck Count",
      detail: "Select session type and log exact page numbers and ayah counts for mistakes or stuck ayahs."
    },
    {
      step: "4. Generate & Export Progress Report",
      detail: "Click 'Make Report' to open the formatted modal preview. Copy plain text, share, or download a high-res PDF."
    }
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent">
            <AppGuideIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold theme-text-primary">User Guide & Walkthrough</h2>
            <p className="text-xs theme-text-secondary">
              Step-by-step instructions to get started with daily progress logging.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="space-y-3">
          {steps.map((item, idx) => (
            <div key={idx} className="p-4 theme-bg-sub rounded-xl space-y-1">
              <h3 className="text-sm font-bold theme-accent">{item.step}</h3>
              <p className="text-xs theme-text-secondary leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
