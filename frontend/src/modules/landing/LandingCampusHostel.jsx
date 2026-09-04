import React from 'react';
import { useScrollReveal, getRevealClass } from './useScrollReveal';
import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  GridIcon,
} from '../../components/ui/Icons';

export default function LandingCampusHostel() {
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.1 });

  return (
    <section
      ref={sectionRef}
      id="campus-hostel"
      className="py-24 px-4 theme-bg-sub/30 relative select-none scroll-mt-12 overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div className="absolute bottom-1/4 left-1/4 w-[380px] sm:w-[600px] h-[380px] sm:h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-6xl w-full mx-auto space-y-12">
        {/* Header */}
        <div className={`text-center space-y-3 max-w-3xl mx-auto ${getRevealClass(isVisible, 'delay-0')}`}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-2xs">
            <BuildingOfficeIcon className="w-3.5 h-3.5" />
            <span>Campus &amp; Residential Infrastructure</span>
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black theme-text-primary tracking-tight">
            Multi-Campus Hierarchy &amp; Residential Hostel Management
          </h2>
          <p className="text-xs sm:text-sm md:text-base theme-text-secondary leading-relaxed">
            Manage multi-branch institutions, departmental faculties, academic sections, and residential student boarding facilities with seamless clarity.
          </p>
        </div>

        {/* 2 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Multi-Campus & Faculty Hierarchy */}
          <div className={`p-6 sm:p-8 rounded-3xl theme-bg-surface border theme-border shadow-xl hover:border-[var(--accent-main)]/40 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group ${getRevealClass(isVisible, 'delay-100')}`}>
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shadow-md group-hover:scale-110 transition-transform">
                <BuildingOfficeIcon className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-black theme-text-primary">
                  Multi-Campus &amp; Faculty Architecture
                </h3>
                <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                  Structure your institution across multiple geographic campuses and branches. Configure academic years, faculties, departments, and class sections with autonomous permission boundaries.
                </p>
              </div>
              <div className="space-y-2.5 pt-2 border-t theme-border text-xs theme-text-primary font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Centralized HQ Administration with Branch-level Permissions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Faculty &amp; Department Auto-Cascading to Classes &amp; Sections</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Student Grouping (Science, Humanities, Hifz, General)</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t theme-border flex items-center justify-between text-[11px] font-bold text-[var(--accent-main)]">
              <span>Campus Management Module</span>
              <span>Enterprise Scale &rarr;</span>
            </div>
          </div>

          {/* Card 2: Hostel & Residential Boarding */}
          <div className={`p-6 sm:p-8 rounded-3xl theme-bg-surface border theme-border shadow-xl hover:border-emerald-500/40 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group ${getRevealClass(isVisible, 'delay-200')}`}>
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-md group-hover:scale-110 transition-transform">
                <GridIcon className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-black theme-text-primary">
                  Hostel &amp; Residential Dormitory Engine
                </h3>
                <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                  Complete oversight of student residential accommodations. Track residential building capacities, room allocations, individual bed assignments, and nocturnal roll calls for total student safety.
                </p>
              </div>
              <div className="space-y-2.5 pt-2 border-t theme-border text-xs theme-text-primary font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Building &rarr; Floor &rarr; Room &rarr; Bed Allocation Hierarchy</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Real-time Vacancy &amp; Bed Occupancy Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Daily Nightly Attendance &amp; Residential Headcount Register</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t theme-border flex items-center justify-between text-[11px] font-bold text-emerald-400">
              <span>Residential Module</span>
              <span>100% Boarding Safety &rarr;</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
