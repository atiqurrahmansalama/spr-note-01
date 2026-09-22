import { AlertCircleIcon } from "@/components/ui/Icons";

interface ErrorDensityIndexProps {
  totalPages: number;
  totalMistakes: number;
  totalStucks: number;
  avgMistakesPerPage: string;
  avgStucksPerPage: string;
  pagesPerMistake: string;
  pagesPerStuck: string;
  purityScore: number;
}

export const ErrorDensityIndex: React.FC<ErrorDensityIndexProps> = ({
  totalPages,
  totalMistakes,
  totalStucks,
  avgMistakesPerPage,
  avgStucksPerPage,
  pagesPerMistake,
  pagesPerStuck,
  purityScore,
}) => {
  return (
    <div className="space-y-4 @container">
      {/* Density Index Summary Card */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg theme-bg-subtle border theme-border">
              <AlertCircleIcon className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold theme-text-primary">
                Pacing Error Density Index & Recitation Purity
              </h3>
              <p className="text-[11px] theme-text-secondary">
                Mistakes and teacher stucks / lukmahs incurred per incremental page
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] theme-text-secondary">Purity Index:</span>
            <span
              className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full border ${
                purityScore >= 80
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : purityScore >= 60
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {purityScore} / 100
            </span>
          </div>
        </div>

        {/* Dual Progress Gauges */}
        <div className="grid grid-cols-1 @[640px]:grid-cols-2 gap-4 pt-1">
          {/* Mistakes Per Page */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="theme-text-primary">Average Mistakes Per Page</span>
              <span className="text-rose-400 font-mono font-bold">{avgMistakesPerPage}</span>
            </div>
            <div className="w-full bg-slate-700/20 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, parseFloat(avgMistakesPerPage) * 50)}%` }}
              />
            </div>
            <span className="text-[10px] theme-text-secondary block">
              Benchmark: &lt; 0.5 mistakes per page
            </span>
          </div>

          {/* Stucks Per Page */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="theme-text-primary">Average Stucks (Lukmahs) Per Page</span>
              <span className="text-amber-400 font-mono font-bold">{avgStucksPerPage}</span>
            </div>
            <div className="w-full bg-slate-700/20 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, parseFloat(avgStucksPerPage) * 50)}%` }}
              />
            </div>
            <span className="text-[10px] theme-text-secondary block">
              Benchmark: &lt; 0.3 stucks per page
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Detailed Breakdown */}
      <div className="grid grid-cols-1 @[768px]:grid-cols-2 gap-4">
        {/* Mistakes Metrics */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b theme-border pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Mistakes Frequency Analysis</span>
            </h4>
            <span className="text-xs font-mono font-bold text-rose-400">{totalMistakes} Total</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">Total Recited Pages:</span>
              <span className="font-bold font-mono theme-accent">{totalPages} Pages</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">Average Mistakes Per Page:</span>
              <span className="font-bold font-mono text-rose-400">{avgMistakesPerPage}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="theme-text-secondary font-medium">Recited Per Mistake:</span>
              <span className="font-bold font-mono theme-text-primary">
                Every {pagesPerMistake} page(s)
              </span>
            </div>
          </div>
        </div>

        {/* Stucks Metrics */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b theme-border pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Stucks / Lukmah Frequency Analysis</span>
            </h4>
            <span className="text-xs font-mono font-bold text-amber-400">{totalStucks} Total</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">Total Recited Pages:</span>
              <span className="font-bold font-mono theme-accent">{totalPages} Pages</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">Average Stucks Per Page:</span>
              <span className="font-bold font-mono text-amber-400">{avgStucksPerPage}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="theme-text-secondary font-medium">Recited Per Stuck:</span>
              <span className="font-bold font-mono theme-text-primary">
                Every {pagesPerStuck} page(s)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
