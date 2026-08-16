import React from "react";
import { BookOpenIcon, CheckCircleIcon, SparklesIcon } from "../../components/ui/Icons";

export default function LandingHifzTracker() {
  return (
    <section className="min-h-screen flex flex-col justify-center items-center py-24 px-4 theme-bg-sub/30 relative select-none scroll-mt-10 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/3 right-1/4 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />

      <div className="max-w-6xl w-full mx-auto space-y-12 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-main)] theme-bg-accent-soft px-3.5 py-1 rounded-full border theme-border">
            Quranic Progress Tracking
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black theme-text-primary tracking-tight">
            30-Juz Quran &amp; Hifz Progress Matrix
          </h2>
          <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
            Record, evaluate, and monitor daily Sabaq, Sabqi, and Amokhta recitations with precision accuracy and instant hesitation counters.
          </p>
        </div>

        {/* 3 Pillars Grid with Micro-Animations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Sabaq Card */}
          <div className="theme-bg-surface border theme-border rounded-3xl p-6 sm:p-8 shadow-xl hover:-translate-y-2.5 hover:shadow-2xl hover:border-sky-500/40 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-black text-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-inner">
                1
              </div>
              <h3 className="text-lg font-bold theme-text-primary group-hover:text-sky-400 transition-colors">
                Sabaq (New Daily Lesson)
              </h3>
              <p className="text-xs theme-text-secondary leading-relaxed">
                Log exact Surah, Ayah ranges, and page boundaries. Mark memory fluency, tajweed quality, and daily target completions.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t theme-border flex items-center gap-2 text-xs font-semibold text-sky-400">
              <CheckCircleIcon className="w-4 h-4" />
              <span>Real-time Page &amp; Ayah Counter</span>
            </div>
          </div>

          {/* Sabqi Card */}
          <div className="theme-bg-surface border theme-border rounded-3xl p-6 sm:p-8 shadow-xl hover:-translate-y-2.5 hover:shadow-2xl hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-inner">
                2
              </div>
              <h3 className="text-lg font-bold theme-text-primary group-hover:text-indigo-400 transition-colors">
                Sabqi (Recent Revision)
              </h3>
              <p className="text-xs theme-text-secondary leading-relaxed">
                Track the rolling 5 to 10 pages preceding the current lesson. Measure retention decay and prevent memory gaps before they expand.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t theme-border flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <CheckCircleIcon className="w-4 h-4" />
              <span>Rolling 5-Page Memory Buffer</span>
            </div>
          </div>

          {/* Amokhta Card */}
          <div className="theme-bg-surface border theme-border rounded-3xl p-6 sm:p-8 shadow-xl hover:-translate-y-2.5 hover:shadow-2xl hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-inner">
                3
              </div>
              <h3 className="text-lg font-bold theme-text-primary group-hover:text-emerald-400 transition-colors">
                Amokhta (Past Juz Cycle)
              </h3>
              <p className="text-xs theme-text-secondary leading-relaxed">
                Track full Juz revisions (Quarter, Half, Full Para) per session. Automatically flags students needing reinforcement on past Juz.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t theme-border flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircleIcon className="w-4 h-4" />
              <span>Full 30-Juz Cycle Tracking</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
