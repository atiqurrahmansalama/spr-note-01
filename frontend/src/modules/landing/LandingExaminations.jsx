import React from 'react';
import { useScrollReveal, getRevealClass } from './useScrollReveal';
import {
  ChartBarIcon,
  CheckCircleIcon,
  QrCodeIcon,
} from '../../components/ui/Icons';

export default function LandingExaminations() {
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.1 });

  const examFeatures = [
    {
      title: 'Dynamic Full Marks System',
      desc: 'Set baseline examination scales to 50, 75, 100, 200, or any custom mark capacity with automatic live component sum validation.',
      badge: 'Zero Hardcoded Limits',
    },
    {
      title: 'Continuous Assessment (CA%)',
      desc: 'Automatically blend daily classroom marks (10%), attendance scores (10%), and written exams (80%) into accurate final GPAs.',
      badge: 'Balanced Weightage',
    },
    {
      title: 'Multi-Tier Grading Policies',
      desc: 'Support traditional Dars-e-Nizami (Mumtaz, Jayyid Jiddan), National Board GPA 5.00 scales, and custom institutional grade bands.',
      badge: 'Flexible Scales',
    },
    {
      title: 'Interactive Routine & Shifts Matrix',
      desc: 'Map multi-shift daily exam routines, assign subject examiners, full/pass marks, and track study prep gaps seamlessly.',
      badge: 'Day-by-Day Mapping',
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="examinations"
      className="py-24 px-4 theme-bg-app relative select-none scroll-mt-12 overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 right-1/4 w-[380px] sm:w-[600px] h-[380px] sm:h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-6xl w-full mx-auto space-y-12">
        {/* Header */}
        <div className={`text-center space-y-3 max-w-3xl mx-auto ${getRevealClass(isVisible, 'delay-0')}`}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-2xs">
            <ChartBarIcon className="w-3.5 h-3.5" />
            <span>Next-Gen Assessment Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black theme-text-primary tracking-tight">
            Institutional Examination &amp; Transcript Studio
          </h2>
          <p className="text-xs sm:text-sm md:text-base theme-text-secondary leading-relaxed">
            From exam session creation and multi-shift routines to instant GPA calculation and print-ready transcripts with fraud-proof QR verification.
          </p>
        </div>

        {/* 2-Column Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Feature Pillars */}
          <div className={`lg:col-span-6 space-y-4 ${getRevealClass(isVisible, 'delay-100')}`}>
            {examFeatures.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl theme-bg-surface border theme-border hover:border-[var(--accent-main)]/40 hover:-translate-y-1 transition-all duration-300 shadow-md group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-sm theme-text-primary group-hover:theme-accent transition-colors">
                    {item.title}
                  </h4>
                  <span className="text-[10px] font-bold theme-bg-sub theme-text-secondary border theme-border px-2.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs theme-text-secondary leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Right: Realistic Transcript & Routine Card Mockup */}
          <div className={`lg:col-span-6 theme-bg-surface border theme-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-5 ${getRevealClass(isVisible, 'delay-200')}`}>
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center font-bold text-xs">
                  SPR
                </div>
                <div>
                  <div className="text-xs font-bold theme-text-primary">Official Academic Grade Sheet</div>
                  <div className="text-[10px] theme-text-secondary">Semester Final Evaluation • Batch 2026</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                Published
              </span>
            </div>

            {/* Subject Routine Scorecard */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl theme-bg-sub/60 border theme-border flex items-center justify-between">
                <div>
                  <div className="font-bold theme-text-primary">Applied Physics &amp; Mathematics</div>
                  <div className="text-[10px] theme-text-secondary">Written (70) + Practical (20) + CA (10)</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-emerald-400">94 / 100</div>
                  <div className="text-[10px] theme-text-secondary font-bold">Grade: A+</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl theme-bg-sub/60 border theme-border flex items-center justify-between">
                <div>
                  <div className="font-bold theme-text-primary">Arabic Language &amp; Grammar</div>
                  <div className="text-[10px] theme-text-secondary">Written (40) + Oral / Viva (10)</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-emerald-400">48 / 50</div>
                  <div className="text-[10px] theme-text-secondary font-bold">Grade: A+</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl theme-bg-sub/60 border theme-border flex items-center justify-between">
                <div>
                  <div className="font-bold theme-text-primary">Computer Science &amp; IT</div>
                  <div className="text-[10px] theme-text-secondary">Theory (50) + Lab (25) + Assignment (25)</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-emerald-400">91 / 100</div>
                  <div className="text-[10px] theme-text-secondary font-bold">Grade: A+</div>
                </div>
              </div>
            </div>

            {/* Overall Result & QR Verification Summary */}
            <div className="p-4 rounded-2xl theme-bg-elevated border theme-border flex items-center justify-between text-xs">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Aggregate Cumulative GPA
                </div>
                <div className="text-lg font-black theme-text-primary">
                  5.00 / 5.00 <span className="text-xs font-bold text-emerald-400">(First Class / Mumtaz)</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl theme-bg-sub border theme-border flex items-center justify-center text-[var(--accent-main)] shrink-0 shadow-inner">
                <QrCodeIcon className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
