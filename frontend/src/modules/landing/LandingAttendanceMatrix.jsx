import React from 'react';
import { useScrollReveal, getRevealClass } from './useScrollReveal';
import {
  ClockIcon,
  CheckCircleIcon,
} from '../../components/ui/Icons';

export default function LandingAttendanceMatrix() {
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.1 });

  return (
    <section
      ref={sectionRef}
      id="attendance"
      className="py-24 px-4 theme-bg-app relative select-none scroll-mt-12 overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/3 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-6xl w-full mx-auto space-y-12">
        {/* Header */}
        <div className={`text-center space-y-3 max-w-3xl mx-auto ${getRevealClass(isVisible, 'delay-0')}`}>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20 shadow-2xs">
            Attendance &amp; Biometric Hardware Sync
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black theme-text-primary tracking-tight">
            Unified 31-Day Attendance &amp; Staff Duty Matrix
          </h2>
          <p className="text-xs sm:text-sm md:text-base theme-text-secondary leading-relaxed">
            Eliminate bulky paper registers. Manage student classes, teacher shifts, residential hostel dormitories, and hardware biometric logs in one unified stream.
          </p>
        </div>

        {/* 3 Pillar Cards Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${getRevealClass(isVisible, 'delay-100')}`}>
          <div className="p-6 rounded-3xl theme-bg-surface border theme-border space-y-3 shadow-lg hover:border-emerald-500/40 hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm group-hover:scale-110 transition-transform">
              P
            </div>
            <h4 className="font-bold text-sm sm:text-base theme-text-primary group-hover:text-emerald-400 transition-colors">
              Instant One-Touch Marking
            </h4>
            <p className="text-xs theme-text-secondary leading-relaxed">
              Mark entire classes in seconds with smart 'Mark All Present', toggle switches, and quick absent/leave reason tags.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircleIcon className="w-3.5 h-3.5" />
              <span>&lt; 5 Seconds per Class</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl theme-bg-surface border theme-border space-y-3 shadow-lg hover:border-sky-500/40 hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold text-sm group-hover:scale-110 transition-transform">
              31
            </div>
            <h4 className="font-bold text-sm sm:text-base theme-text-primary group-hover:text-sky-400 transition-colors">
              31-Day Monthly Register Matrix
            </h4>
            <p className="text-xs theme-text-secondary leading-relaxed">
              Full-month calendar view highlighting weekly off-days, official institutional holidays, and exam schedule windows.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-sky-400 flex items-center gap-1.5">
              <CheckCircleIcon className="w-3.5 h-3.5" />
              <span>Full Month at a Glance</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl theme-bg-surface border theme-border space-y-3 shadow-lg hover:border-indigo-500/40 hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm group-hover:scale-110 transition-transform">
              %
            </div>
            <h4 className="font-bold text-sm sm:text-base theme-text-primary group-hover:text-indigo-400 transition-colors">
              Automated Analytics &amp; CA% Sync
            </h4>
            <p className="text-xs theme-text-secondary leading-relaxed">
              Calculates total working days, attendance percentages, chronic absenteeism warnings, and links directly to Exam CA% scores.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-indigo-400 flex items-center gap-1.5">
              <CheckCircleIcon className="w-3.5 h-3.5" />
              <span>Continuous Assessment Synced</span>
            </div>
          </div>
        </div>

        {/* Live Attendance Table Simulation */}
        <div className={`theme-bg-surface border theme-border rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 ${getRevealClass(isVisible, 'delay-200')}`}>
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold theme-text-primary">Multi-Class Daily Attendance Monitor</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Live Real-Time Sync
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-2xl theme-bg-sub/60 border theme-border flex items-center justify-between">
              <div>
                <div className="font-bold theme-text-primary">Grade 10 - Science (A)</div>
                <div className="text-[10px] theme-text-secondary">42 Students Enrolled</div>
              </div>
              <span className="font-bold text-emerald-400">41/42 (97.6%)</span>
            </div>
            <div className="p-3 rounded-2xl theme-bg-sub/60 border theme-border flex items-center justify-between">
              <div>
                <div className="font-bold theme-text-primary">Alim 1st Year - General</div>
                <div className="text-[10px] theme-text-secondary">38 Students Enrolled</div>
              </div>
              <span className="font-bold text-emerald-400">38/38 (100%)</span>
            </div>
            <div className="p-3 rounded-2xl theme-bg-sub/60 border theme-border flex items-center justify-between">
              <div>
                <div className="font-bold theme-text-primary">Staff &amp; Faculty Roster</div>
                <div className="text-[10px] theme-text-secondary">Full Campus Teaching Staff</div>
              </div>
              <span className="font-bold text-emerald-400">28/28 On Duty</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
