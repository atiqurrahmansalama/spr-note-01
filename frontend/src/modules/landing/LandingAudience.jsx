import React from "react";
import { SparklesIcon, BuildingOfficeIcon } from "../../components/ui/Icons";

export default function LandingAudience() {
  return (
    <section id="overview" className="py-20 px-4 max-w-6xl mx-auto space-y-12 select-none scroll-mt-10">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-main)] theme-bg-accent-soft px-3 py-1 rounded-full border theme-border">
          Flexible Architecture
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold theme-text-primary tracking-tight">
          Tailored to Your Teaching Environment
        </h2>
        <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
          Whether you operate a single hifz circle, an independent coaching center, or a multi-department madrasah network, SPR Note adapts to your daily routine.
        </p>
      </div>

      {/* Roster Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Tutor/Hifz Mode Card */}
        <div className="theme-bg-surface border theme-border rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between hover:border-[var(--accent-main)]/35 transition duration-300 relative group">
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft text-[var(--accent-main)] flex items-center justify-center border theme-border shrink-0 shadow-md">
              <SparklesIcon className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold theme-text-primary">
                Individual Teachers &amp; Hifz Maktabs
              </h3>
              <p className="text-xs theme-text-secondary leading-relaxed">
                Maximize speed and eliminate paper grading friction. Rapidly log daily sabaq, sabqi, amokhta, and generate instant report slips for guardians.
              </p>
            </div>

            <ul className="space-y-3 text-xs theme-text-primary font-medium">
              <li className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-main)] shrink-0" />
                <span>1-Click Fast Student Registration</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-main)] shrink-0" />
                <span>Frictionless Daily Recitation Logs &amp; Mistake Counters</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-main)] shrink-0" />
                <span>Instant Digital Report Card Sharing</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t theme-border">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--accent-main)]">
              Lightweight • Lightning Fast
            </span>
          </div>
        </div>

        {/* Institutional Mode Card */}
        <div className="theme-bg-surface border theme-border rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between hover:border-[var(--accent-main)]/35 transition duration-300 relative group">
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft text-[var(--accent-main)] flex items-center justify-center border theme-border shrink-0 shadow-md">
              <BuildingOfficeIcon className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold theme-text-primary">
                Institutional Campus &amp; Madrasah Network
              </h3>
              <p className="text-xs theme-text-secondary leading-relaxed">
                Scale your entire academic operations with autonomous tenant separation, department rosters, teacher assignment matrix, and student migration tools.
              </p>
            </div>

            <ul className="space-y-3 text-xs theme-text-primary font-medium">
              <li className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span>Comprehensive Multi-Step Student Admissions</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span>Departmental Hierarchy &amp; Staff Assignment</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span>Automated Monthly Attendance Matrices &amp; Verification</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t theme-border">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              Enterprise Grade • Multi-Tenant
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
