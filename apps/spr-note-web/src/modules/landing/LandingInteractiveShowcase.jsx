import React, { useState } from 'react';
import { useScrollReveal, getRevealClass } from './useScrollReveal';
import {
  AcademicCapIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ClockIcon,
  QrCodeIcon,
  SparklesIcon,
  GridIcon,
} from '../../components/ui/Icons';

const SHOWCASE_TABS = [
  {
    id: 'academic',
    title: 'Academic & Campus ERP',
    badge: 'Core Infrastructure',
    icon: BuildingOfficeIcon,
    tagline: 'Multi-campus structure, departmental hierarchies, and timetable routines.',
  },
  {
    id: 'examinations',
    title: 'Examinations & Transcripts',
    badge: 'Results Engine',
    icon: ChartBarIcon,
    tagline: 'Dynamic full marks, continuous assessment CA%, and instant grade sheets.',
  },
  {
    id: 'attendance',
    title: 'Attendance & Biometrics',
    badge: '31-Day Matrix',
    icon: ClockIcon,
    tagline: 'One-touch student rosters, staff duty tracking, and biometric device integration.',
  },
  {
    id: 'hostel',
    title: 'Residential & Hostel',
    badge: 'Campus Living',
    icon: GridIcon,
    tagline: 'Building hierarchies, room & bed allocations, and daily night headcount.',
  },
  {
    id: 'admissions',
    title: 'Admissions & Role QR',
    badge: 'Zero Friction',
    icon: QrCodeIcon,
    tagline: '64-district geo-hierarchy, online admissions, and tokenized QR self-onboarding.',
  },
  {
    id: 'specialized',
    title: 'Quranic & Specialized Tracks',
    badge: 'Dual Curriculum',
    icon: AcademicCapIcon,
    tagline: '30-Juz Sabaq/Sabqi/Amokhta progress, Tajweed evaluation, and daily logs.',
  },
];

export default function LandingInteractiveShowcase() {
  const [activeTab, setActiveTab] = useState('academic');
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.1 });

  return (
    <section
      ref={sectionRef}
      id="interactive-showcase"
      className="py-24 px-4 theme-bg-sub/30 relative select-none scroll-mt-12 overflow-hidden"
    >
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[800px] h-[500px] sm:h-[800px] bg-[var(--accent-main)]/5 rounded-full blur-[160px] pointer-events-none -z-10" />

      <div className="max-w-6xl w-full mx-auto space-y-12">
        {/* Section Header */}
        <div className={`text-center space-y-3 max-w-3xl mx-auto ${getRevealClass(isVisible, 'delay-0')}`}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-2xs">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Interactive Platform Matrix</span>
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black theme-text-primary tracking-tight">
            An All-in-One Engine Engineered for Every Academic Dimension
          </h2>
          <p className="text-xs sm:text-sm md:text-base theme-text-secondary leading-relaxed">
            From modern schools and degree colleges to Islamic academies and multi-branch educational networks, explore how SPR Note unifies your institutional operations.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className={`flex flex-wrap justify-center gap-2 sm:gap-2.5 p-1.5 rounded-2xl theme-bg-surface/90 shadow-xs backdrop-blur-md max-w-4xl mx-auto border-0 ${getRevealClass(isVisible, 'delay-100')}`}>
          {SHOWCASE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-0 ${
                  isActive
                    ? 'theme-bg-accent theme-accent-text shadow-sm scale-102'
                    : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{tab.title}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Showcase Preview Screen */}
        <div className={`theme-bg-surface rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden transition-all duration-300 border-0 ${getRevealClass(isVisible, 'delay-200')}`}>
          {/* Top Accent Gradient Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent-main)] to-transparent opacity-75" />

          {/* 1. Academic & Campus ERP Tab */}
          {activeTab === 'academic' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="lg:col-span-6 space-y-5 text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-main)] theme-bg-accent-soft px-3 py-1 rounded-full border-0 shadow-2xs">
                  Campus &amp; Structure Hierarchy
                </span>
                <h3 className="text-xl sm:text-3xl font-black theme-text-primary tracking-tight">
                  Organize Infinite Campuses, Faculties &amp; Class Routines
                </h3>
                <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                  Model your institution with full structural fidelity. Configure academic years, semesters, departments, classes, sections, and automated teacher timetables in one unified workspace.
                </p>
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Multi-Campus &amp; Branch Isolation with Centralized Control</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cascading Academic Sessions, Semesters &amp; Terms</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Period-by-Period Subject Timetable Routine Matrix</span>
                  </div>
                </div>
              </div>

              {/* Visual Mockup Card */}
              <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl theme-bg-app space-y-4 shadow-inner border-0">
                <div className="flex items-center justify-between pb-3 border-b theme-border/40">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold theme-text-primary">Darus Salam Main Campus &amp; Branches</span>
                  </div>
                  <span className="text-[10px] font-bold theme-accent theme-bg-accent-soft px-2 py-0.5 rounded-md">
                    Session 2025-2026
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 rounded-xl theme-bg-surface border-0 shadow-2xs">
                    <div className="font-extrabold text-base theme-text-primary">14</div>
                    <div className="text-[10px] theme-text-secondary mt-0.5">Campus Units</div>
                  </div>
                  <div className="p-3 rounded-xl theme-bg-surface border-0 shadow-2xs">
                    <div className="font-extrabold text-base theme-text-primary">52</div>
                    <div className="text-[10px] theme-text-secondary mt-0.5">Classes &amp; Sections</div>
                  </div>
                  <div className="p-3 rounded-xl theme-bg-surface border-0 shadow-2xs">
                    <div className="font-extrabold text-base text-emerald-400">100%</div>
                    <div className="text-[10px] theme-text-secondary mt-0.5">Timetable Active</div>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl theme-bg-surface border-0 shadow-2xs space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="theme-text-primary">Faculty Load Distribution (126 Teachers)</span>
                    <span className="theme-accent font-bold">Optimal</span>
                  </div>
                  <div className="w-full h-2 rounded-full theme-bg-app overflow-hidden">
                    <div className="h-full rounded-full theme-bg-accent w-[94%]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Examinations & Transcripts Tab */}
          {activeTab === 'examinations' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="lg:col-span-6 space-y-5 text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-main)] theme-bg-accent-soft px-3 py-1 rounded-full border-0 shadow-2xs">
                  Assessment &amp; Transcript Engine
                </span>
                <h3 className="text-xl sm:text-3xl font-black theme-text-primary tracking-tight">
                  Dynamic Marks Scales, CA% &amp; Print-Ready Grade Sheets
                </h3>
                <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                  Break free from rigid 100-mark limits. Set custom baseline scales (50, 75, 100, 200 pts), combine Written/MCQ/Viva with Continuous Assessment (CA%), and output verified grade sheets with instant QR codes.
                </p>
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Dynamic Full Marks &amp; Multi-Component Assessment Breakdown</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Continuous Assessment Weightage (Daily 10% + Attend 10% + Exam 80%)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>6-Tier Institutional Grading Policy Scales &amp; GPA Calculation</span>
                  </div>
                </div>
              </div>

              {/* Visual Mockup Card */}
              <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl theme-bg-app space-y-3.5 shadow-inner border-0">
                <div className="flex items-center justify-between pb-3 border-b theme-border/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-main)]" />
                    <div>
                      <div className="text-xs font-bold theme-text-primary">Abdullah Ibn Omar (Roll: 101)</div>
                      <div className="text-[10px] theme-text-secondary">Class 10 - Section A (Science)</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    GPA: 4.80 (Mumtaz)
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl theme-bg-surface border-0 shadow-2xs flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold theme-text-primary">Quran Hifz &amp; Tajweed</div>
                      <div className="text-[10px] theme-text-secondary">Continuous Assessment: 9.8/10 • Exam: 87/90</div>
                    </div>
                    <span className="font-bold text-emerald-400">97/100 (A+)</span>
                  </div>
                  <div className="p-2.5 rounded-xl theme-bg-surface border-0 shadow-2xs flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold theme-text-primary">Arabic Grammar &amp; Nahw</div>
                      <div className="text-[10px] theme-text-secondary">Continuous Assessment: 9.5/10 • Exam: 81/90</div>
                    </div>
                    <span className="font-bold text-emerald-400">91/100 (A+)</span>
                  </div>
                  <div className="p-2.5 rounded-xl theme-bg-surface border-0 shadow-2xs flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold theme-text-primary">General Mathematics</div>
                      <div className="text-[10px] theme-text-secondary">Continuous Assessment: 9.2/10 • Exam: 85/90</div>
                    </div>
                    <span className="font-bold text-emerald-400">94/100 (A+)</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl theme-bg-surface border-0 shadow-2xs flex items-center justify-between text-xs">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <QrCodeIcon className="w-4 h-4" />
                    Anti-Fraud Stamp: VERIFIED-DOC-2026-X89
                  </span>
                  <span className="text-[11px] font-bold theme-accent">Rank: 1st</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Attendance & Biometrics Tab */}
          {activeTab === 'attendance' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="lg:col-span-6 space-y-5 text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-main)] theme-bg-accent-soft px-3 py-1 rounded-full border-0 shadow-2xs">
                  Real-time Attendance
                </span>
                <h3 className="text-xl sm:text-3xl font-black theme-text-primary tracking-tight">
                  31-Day Grid Registers, Staff Rosters &amp; Biometric Hardware
                </h3>
                <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                  Eliminate attendance register logbooks. Take one-touch student roll calls, manage daily teacher duty assignments, record hostel night headcounts, and sync with biometric punch devices.
                </p>
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>31-Day Student Attendance Matrix with Holiday &amp; Exam Indicators</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Teacher &amp; Staff Duty Roster Management with Real-time Status</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Automatic Attendance % Calculation &amp; Chronic Absence Alerts</span>
                  </div>
                </div>
              </div>

              {/* Visual Mockup Card */}
              <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl theme-bg-app space-y-4 shadow-inner border-0">
                <div className="flex items-center justify-between pb-3 border-b theme-border/40">
                  <div>
                    <span className="text-xs font-bold theme-text-primary">Muhammad Rayhan (Roll: 104)</span>
                    <div className="text-[10px] theme-text-secondary">Class 9 - Section B • Monthly Register</div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-400">96.2% On-Time Ratio</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl theme-bg-surface border-0 shadow-2xs">
                    <div className="font-bold text-emerald-400 text-sm">25 Days</div>
                    <div className="text-[10px] theme-text-secondary">Present</div>
                  </div>
                  <div className="p-2.5 rounded-xl theme-bg-surface border-0 shadow-2xs">
                    <div className="font-bold text-rose-400 text-sm">0 Days</div>
                    <div className="text-[10px] theme-text-secondary">Unexcused</div>
                  </div>
                  <div className="p-2.5 rounded-xl theme-bg-surface border-0 shadow-2xs">
                    <div className="font-bold text-amber-400 text-sm">1 Day</div>
                    <div className="text-[10px] theme-text-secondary">Sick Leave</div>
                  </div>
                  <div className="p-2.5 rounded-xl theme-bg-surface border-0 shadow-2xs">
                    <div className="font-bold text-sky-400 text-sm">126/126</div>
                    <div className="text-[10px] theme-text-secondary">Staff on Duty</div>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl theme-bg-surface border-0 shadow-2xs flex items-center justify-between">
                  <span className="text-xs font-semibold theme-text-primary">Biometric Device BIO-GATE-01</span>
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    <span>Punched: 08:42:15 AM</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Residential & Hostel Tab */}
          {activeTab === 'hostel' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="lg:col-span-6 space-y-5 text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-main)] theme-bg-accent-soft px-3 py-1 rounded-full border-0 shadow-2xs">
                  Residential Life &amp; Boarding
                </span>
                <h3 className="text-xl sm:text-3xl font-black theme-text-primary tracking-tight">
                  Hostel Buildings, Room Capacity &amp; Bed Allocation
                </h3>
                <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                  Manage campus residences and dormitories with precision. Organize residential buildings, floors, room capacities, and exact student bed assignments alongside nightly attendance checks.
                </p>
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Building &rarr; Floor &rarr; Room &rarr; Bed Hierarchical Mapping</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Real-time Bed Occupancy &amp; Vacancy Status Monitoring</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Nightly Dormitory Roll Call &amp; Resident Safety Audits</span>
                  </div>
                </div>
              </div>

              {/* Visual Mockup Card */}
              <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl theme-bg-app space-y-4 shadow-inner border-0">
                <div className="flex items-center justify-between pb-3 border-b theme-border/40">
                  <div>
                    <span className="text-xs font-bold theme-text-primary">Imam Bukhari Residential Hall</span>
                    <div className="text-[10px] theme-text-secondary">Level 3 • Room 304 (Deluxe 4-Bed Dorm)</div>
                  </div>
                  <span className="text-[10px] font-bold theme-accent theme-bg-accent-soft px-2 py-0.5 rounded-md">
                    Warden: M. Mahmudul Hasan
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl theme-bg-surface border-0 shadow-2xs space-y-1">
                    <div className="text-[11px] theme-text-secondary">Occupied Beds (Campus Wide)</div>
                    <div className="font-extrabold text-base theme-text-primary">486 / 500</div>
                    <div className="w-full h-1.5 rounded-full theme-bg-app">
                      <div className="h-full rounded-full bg-emerald-500 w-[97%]" />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl theme-bg-surface border-0 shadow-2xs space-y-1">
                    <div className="text-[11px] theme-text-secondary">Vacancies in Hall</div>
                    <div className="font-extrabold text-base text-sky-400">14 Beds Free</div>
                    <div className="text-[10px] theme-text-secondary">Ready for Allocation</div>
                  </div>
                </div>
                <div className="p-3 rounded-xl theme-bg-surface border-0 shadow-2xs flex items-center justify-between text-xs">
                  <span className="font-semibold theme-text-primary">Nightly Roll Call (10:15 PM)</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    <span>100% Verified in Dorm</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 5. Admissions & Role QR Tab */}
          {activeTab === 'admissions' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="lg:col-span-6 space-y-5 text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-main)] theme-bg-accent-soft px-3 py-1 rounded-full border-0 shadow-2xs">
                  Fast Onboarding &amp; Security
                </span>
                <h3 className="text-xl sm:text-3xl font-black theme-text-primary tracking-tight">
                  64-District Geo-Admissions &amp; Role-Based QR Invitations
                </h3>
                <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                  Admit students with structured Bangladesh 64-district geo-data or 1-click fast enrollment. Onboard teachers and administrators via instant encrypted QR invitation codes without credential sharing.
                </p>
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>64-District, 8-Division Hierarchical Bangladesh Geography</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Instant Tokenized Role QR Invite Generation &amp; Self-Onboarding</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Public Online Admission Portal with Auto-Generated IDs</span>
                  </div>
                </div>
              </div>

              {/* Visual Mockup Card */}
              <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl theme-bg-app space-y-4 shadow-inner border-0">
                <div className="flex items-center justify-between pb-3 border-b theme-border/40">
                  <span className="text-xs font-bold theme-text-primary">Role Invite Token &amp; QR Card</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    Encrypted Token
                  </span>
                </div>
                <div className="p-4 rounded-xl theme-bg-surface border-0 shadow-2xs flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl theme-bg-app border-0 flex items-center justify-center text-[var(--accent-main)] shrink-0 shadow-inner">
                    <QrCodeIcon className="w-9 h-9" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="font-bold theme-text-primary">Senior Academic Faculty Invite</div>
                    <div className="text-[11px] theme-text-secondary">Role: Faculty Teacher / Examiner</div>
                    <div className="text-[10px] font-bold text-emerald-400">Scan to Claim Permissions &rarr;</div>
                  </div>
                </div>
                <div className="p-3 rounded-xl theme-bg-surface border-0 shadow-2xs flex items-center justify-between text-xs">
                  <span className="theme-text-primary font-medium">Automatic Student ID Format</span>
                  <span className="font-bold theme-accent">STD-2026-0412</span>
                </div>
              </div>
            </div>
          )}

          {/* 6. Quranic & Specialized Tracks Tab */}
          {activeTab === 'specialized' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="lg:col-span-6 space-y-5 text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-main)] theme-bg-accent-soft px-3 py-1 rounded-full border-0 shadow-2xs">
                  Specialized Islamic Track
                </span>
                <h3 className="text-xl sm:text-3xl font-black theme-text-primary tracking-tight">
                  30-Juz Quran Progress, Sabaq/Sabqi &amp; Tajweed Matrix
                </h3>
                <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                  For institutions operating specialized Quranic and Hifz departments, SPR Note provides dedicated 30-Juz recitation trackers, daily lesson logs, rolling revision buffers, and instant error counters.
                </p>
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Precision Sabaq (Daily Lesson) with Ayah &amp; Surah Boundaries</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Rolling 5-to-10 Page Sabqi Revision Memory Buffer</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold theme-text-primary">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Full 30-Juz Amokhta Cycle Tracking &amp; Tajweed Accuracy Metrics</span>
                  </div>
                </div>
              </div>

              {/* Visual Mockup Card */}
              <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl theme-bg-app space-y-4 shadow-inner border-0">
                <div className="flex items-center justify-between pb-3 border-b theme-border/40">
                  <div>
                    <span className="text-xs font-bold theme-text-primary">Zubair Ahmad (Hifz Group A)</span>
                    <div className="text-[10px] theme-text-secondary">Ustad: Qari Abdul Latif • Morning Session</div>
                  </div>
                  <span className="text-[10px] font-bold theme-accent theme-bg-accent-soft px-2 py-0.5 rounded-md">
                    Juz 14 Active
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 rounded-xl theme-bg-surface border-0 shadow-2xs">
                    <div className="text-[10px] text-sky-400 font-bold">Sabaq (New)</div>
                    <div className="font-extrabold text-sm theme-text-primary mt-1">Al-Imran 102-110</div>
                    <div className="text-[10px] theme-text-secondary">p. 63 (0 Mistakes)</div>
                  </div>
                  <div className="p-3 rounded-xl theme-bg-surface border-0 shadow-2xs">
                    <div className="text-[10px] text-indigo-400 font-bold">Sabqi (Recent)</div>
                    <div className="font-extrabold text-sm theme-text-primary mt-1">Juz 3 (p. 55-62)</div>
                    <div className="text-[10px] text-emerald-400 font-semibold">0 Hesitations</div>
                  </div>
                  <div className="p-3 rounded-xl theme-bg-surface border-0 shadow-2xs">
                    <div className="text-[10px] text-emerald-400 font-bold">Amokhta (Revision)</div>
                    <div className="font-extrabold text-sm theme-text-primary mt-1">Juz 1 &amp; 2 (Full)</div>
                    <div className="text-[10px] theme-text-secondary">Grade: Mumtaz</div>
                  </div>
                </div>
                <div className="p-3 rounded-xl theme-bg-surface border-0 shadow-2xs flex items-center justify-between text-xs">
                  <span className="font-semibold theme-text-primary">Official Progress Slip Generator</span>
                  <span className="font-bold theme-accent">Ready for Guardian SMS &rarr;</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
