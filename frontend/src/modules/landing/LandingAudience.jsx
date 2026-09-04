import React from 'react';
import { useScrollReveal, getRevealClass } from './useScrollReveal';
import {
  AcademicCapIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  SparklesIcon,
  GridIcon,
} from '../../components/ui/Icons';

export default function LandingAudience() {
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.1 });

  const audiences = [
    {
      title: 'Schools, High Schools & Colleges',
      badge: 'General & Modern Education',
      icon: AcademicCapIcon,
      desc: 'National Board grading scales (GPA 5.00), period-by-period class timetables, automated monthly attendance, and digital progress report slips for guardians.',
      points: [
        'Multi-Step 64-District Student Admissions',
        'Continuous Assessment (CA%) & Examination Engine',
        'Teacher Class Load & Subject Timetable Routine',
      ],
    },
    {
      title: 'Madrasahs & Islamic Seminaries',
      badge: 'Traditional & Dual Curriculum',
      icon: SparklesIcon,
      desc: 'Dars-e-Nizami Mumtaz/Jayyid grading bands, 30-Juz Sabaq/Sabqi/Amokhta progress matrices, residential hostel bed allocations, and daily night safety headcounts.',
      points: [
        '30-Juz Quranic Recitation & Tajweed Tracker',
        'Dars-e-Nizami 6-Tier Examination Grading Scale',
        'Residential Hostel & Dormitory Bed Management',
      ],
    },
    {
      title: 'Multi-Branch Educational Networks',
      badge: 'Enterprise Scalability',
      icon: BuildingOfficeIcon,
      desc: 'Centralized HQ oversight with branch-level autonomous permissions, teacher re-assignment, student migration tools, and consolidated academic performance reports.',
      points: [
        '100% Multi-Tenant Database Isolation',
        'Branch-level Access & Tokenized Role QR Invites',
        'Centralized Event Calendar & Master Routine Sync',
      ],
    },
    {
      title: 'Coaching Centers & Hifz Academies',
      badge: 'High Speed & Frictionless',
      icon: GridIcon,
      desc: 'Lightning-fast 1-click student registration, instantaneous one-touch attendance roll calls, and fast print-ready QR report card generation with zero overhead.',
      points: [
        '1-Click Instant Student Enrollment',
        'One-Touch Classroom Attendance Matrix',
        'Instant QR-Verified Digital Report Slips',
      ],
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="audience"
      className="py-24 px-4 max-w-6xl mx-auto space-y-12 select-none scroll-mt-12 overflow-hidden"
    >
      {/* Header */}
      <div className={`text-center space-y-3 max-w-3xl mx-auto ${getRevealClass(isVisible, 'delay-0')}`}>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-main)] theme-bg-accent-soft px-3.5 py-1 rounded-full border theme-border shadow-2xs">
          Built for Every Educational Environment
        </span>
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black theme-text-primary tracking-tight">
          Scales Effortlessly from Single Circles to Large Academic Networks
        </h2>
        <p className="text-xs sm:text-sm md:text-base theme-text-secondary leading-relaxed">
          Whether you manage a private academy, a premier secondary school, or a multi-department residential madrasah network, SPR Note adapts to your daily institutional workflow.
        </p>
      </div>

      {/* 4-Card Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full">
        {audiences.map((aud, idx) => {
          const Icon = aud.icon;
          return (
            <div
              key={idx}
              className={`theme-bg-surface border theme-border rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between hover:border-[var(--accent-main)]/40 hover:-translate-y-1.5 transition-all duration-300 group ${getRevealClass(
                isVisible,
                idx % 2 === 0 ? 'delay-100' : 'delay-200'
              )}`}
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center text-[var(--accent-main)] shadow-md group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold theme-bg-sub theme-text-secondary border theme-border px-3 py-1 rounded-full">
                    {aud.badge}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-bold theme-text-primary">
                    {aud.title}
                  </h3>
                  <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                    {aud.desc}
                  </p>
                </div>

                <ul className="space-y-2.5 text-xs theme-text-primary font-medium pt-2 border-t theme-border">
                  {aud.points.map((pt, pIdx) => (
                    <li key={pIdx} className="flex items-center gap-2.5">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t theme-border flex items-center justify-between text-[11px] font-bold text-[var(--accent-main)]">
                <span>Optimized Experience</span>
                <span>Learn More &rarr;</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
