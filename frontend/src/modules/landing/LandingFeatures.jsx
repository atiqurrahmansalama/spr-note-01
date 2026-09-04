import React from 'react';
import { useScrollReveal, getRevealClass } from './useScrollReveal';
import {
  AcademicCapIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ClockIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  CalendarIcon,
  GridIcon,
} from '../../components/ui/Icons';

export default function LandingFeatures() {
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.1 });

  const featuresList = [
    {
      icon: ChartBarIcon,
      title: 'Dynamic Examination Engine',
      desc: 'Set custom full marks (50, 100, 200 pts), combine Written/MCQ/Viva with CA% weightage, and compute GPAs instantly.',
    },
    {
      icon: ClockIcon,
      title: '31-Day Attendance & Biometrics',
      desc: 'One-touch student roll calls, teacher duty rosters, residential night checks, and biometric hardware device sync.',
    },
    {
      icon: BuildingOfficeIcon,
      title: '64-District Geo-Admissions',
      desc: 'Structured Bangladesh geographic hierarchy across all 8 divisions and 64 districts for clean SIS student profiles.',
    },
    {
      icon: QrCodeIcon,
      title: 'Tokenized Role QR Onboarding',
      desc: 'Generate dynamic encrypted QR codes for instant self-onboarding of teachers, administrators, and nazims in 1 scan.',
    },
    {
      icon: GridIcon,
      title: 'Hostel & Bed Living Allocation',
      desc: 'Organize residential buildings, floors, room capacities, and individual bed allocations with night headcount registers.',
    },
    {
      icon: AcademicCapIcon,
      title: 'Subject Routine Timetable Matrix',
      desc: 'Automated period-by-period class timetables, teacher workload balancing, and study prep gap scheduling.',
    },
    {
      icon: CalendarIcon,
      title: 'Two-Way Master Calendar Sync',
      desc: 'Institutional event calendar that automatically syncs exam sessions, preparation gap days, and official holidays.',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Multi-Tenant Data Isolation',
      desc: 'Enterprise security: each institution runs in isolated database tenancy with independent staff rosters and audit logs.',
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="features"
      className="py-24 px-4 theme-bg-sub/30 select-none scroll-mt-12 overflow-hidden"
    >
      <div className="max-w-6xl w-full mx-auto space-y-12">
        {/* Header */}
        <div className={`text-center space-y-3 max-w-3xl mx-auto ${getRevealClass(isVisible, 'delay-0')}`}>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-main)] theme-bg-accent-soft px-3.5 py-1 rounded-full border theme-border shadow-2xs">
            Comprehensive Platform Suite
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black theme-text-primary tracking-tight">
            Enterprise Infrastructure for Every Academic Pillar
          </h2>
          <p className="text-xs sm:text-sm md:text-base theme-text-secondary leading-relaxed">
            Everything your institution needs to eliminate paper friction, automate grading calculations, and manage multi-campus academic operations.
          </p>
        </div>

        {/* 8-Card Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {featuresList.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className={`theme-bg-surface border theme-border rounded-3xl p-6 sm:p-7 shadow-md hover:-translate-y-2 hover:shadow-2xl hover:border-[var(--accent-main)]/40 transition-all duration-300 flex flex-col justify-start text-left space-y-4 group ${getRevealClass(
                  isVisible,
                  `delay-${(i % 4) * 100}`
                )}`}
              >
                <div className="w-12 h-12 rounded-2xl theme-bg-sub flex items-center justify-center border theme-border shadow-inner text-[var(--accent-main)] group-hover:scale-110 transition-transform duration-300 shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold theme-text-primary group-hover:theme-accent transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-xs theme-text-secondary leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
