import React from "react";
import { DutyIcon, CheckCircleIcon, UsersIcon } from "../../components/ui/Icons";

export default function LandingAttendanceMatrix() {
  return (
    <section className="min-h-screen flex flex-col justify-center items-center py-24 px-4 theme-bg-app relative select-none">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/3 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-6xl w-full mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
            Attendance &amp; Biometrics
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black theme-text-primary tracking-tight">
            Comprehensive Monthly Attendance Register
          </h2>
          <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
            Eliminate bulky attendance paper sheets. Seamlessly mark daily present, absent, leave, and late states with automatic monthly percentage computation.
          </p>
        </div>

        {/* Attendance Visual Preview Matrix Card */}
        <div className="theme-bg-surface border theme-border rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl theme-bg-sub border theme-border space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                P
              </div>
              <h4 className="font-bold text-sm theme-text-primary">Instant One-Touch Marking</h4>
              <p className="text-xs theme-text-secondary leading-relaxed">
                Mark entire classes in seconds with smart 'Mark All Present' and instant toggle switches.
              </p>
            </div>

            <div className="p-5 rounded-2xl theme-bg-sub border theme-border space-y-2">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold">
                M
              </div>
              <h4 className="font-bold text-sm theme-text-primary">31-Day Grid Matrix</h4>
              <p className="text-xs theme-text-secondary leading-relaxed">
                Full-month grid view highlighting Fridays, official institutional holidays, and exam dates.
              </p>
            </div>

            <div className="p-5 rounded-2xl theme-bg-sub border theme-border space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                %
              </div>
              <h4 className="font-bold text-sm theme-text-primary">Automated Analytics</h4>
              <p className="text-xs theme-text-secondary leading-relaxed">
                Calculates total working days, attendance percentage, and warning flags for chronic absenteeism.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
