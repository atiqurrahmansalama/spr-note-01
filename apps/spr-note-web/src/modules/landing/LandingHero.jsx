import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth as authStore } from '../../utils/localStore';
import {
  SparklesIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  QrCodeIcon,
} from '../../components/ui/Icons';
import { useScrollReveal, getRevealClass } from './useScrollReveal';

export default function LandingHero() {
  const navigate = useNavigate();
  const isLoggedIn = authStore.isLoggedIn();
  const [heroRef, isVisible] = useScrollReveal({ threshold: 0.05 });

  const handlePrimaryClick = () => {
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleScrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={heroRef}
      className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden select-none pt-16 pb-20 sm:pt-24 sm:pb-28"
    >
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[750px] h-[380px] sm:h-[750px] bg-[var(--accent-main)]/10 rounded-full blur-[120px] sm:blur-[180px] pointer-events-none -z-10 animate-pulse duration-1000" />
      <div className="absolute bottom-1/4 right-1/4 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-sky-500/10 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none -z-10 animate-bounce duration-1000" />

      {/* Pill Badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full theme-bg-surface shadow-xs mb-6 sm:mb-8 backdrop-blur-md hover:scale-105 transition-all duration-300 border-0 ${getRevealClass(isVisible, 'delay-0')}`}>
        <span className="w-2 h-2 rounded-full theme-bg-accent animate-ping" />
        <span className="text-[10px] sm:text-xs font-bold theme-text-primary tracking-wide uppercase">
          Official National Educational ERP &amp; Campus SIS
        </span>
      </div>

      {/* Main Headline */}
      <h1 className={`text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black theme-text-primary tracking-tight max-w-5xl leading-[1.12] mb-6 ${getRevealClass(isVisible, 'delay-100')}`}>
        Unified Operating System for{' '}
        <span className="bg-gradient-to-r from-[var(--accent-main)] via-sky-400 to-indigo-400 bg-clip-text text-transparent">
          Modern Institutions
        </span>
      </h1>

      {/* Sub-headline */}
      <p className={`text-xs sm:text-base md:text-lg theme-text-secondary max-w-3xl leading-relaxed mb-8 sm:mb-10 ${getRevealClass(isVisible, 'delay-150')}`}>
        The national enterprise management suite for Schools, Colleges, Academies, and Madrasahs. Seamlessly orchestrate 64-district admissions, class timetables, automated 31-day attendance matrices, dynamic examination GPA scoring, residential hostel boarding, and fraud-proof QR document verification.
      </p>

      {/* Action Buttons */}
      <div className={`flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto px-4 ${getRevealClass(isVisible, 'delay-200')}`}>
        <button
          type="button"
          onClick={handlePrimaryClick}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl theme-bg-accent theme-accent-text text-xs sm:text-sm font-bold shadow-md hover:opacity-95 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 group border-0"
        >
          <SparklesIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          <span>{isLoggedIn ? 'Go to Dashboard' : 'Launch Platform Workspace'}</span>
          <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
        </button>

        <button
          type="button"
          onClick={() => handleScrollToSection('interactive-showcase')}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl theme-bg-surface theme-text-primary text-xs sm:text-sm font-bold hover:theme-bg-elevated active:scale-95 transition-all duration-200 cursor-pointer border-0 shadow-xs"
        >
          Explore System Architecture ↓
        </button>

        <button
          type="button"
          onClick={() => handleScrollToSection('verification')}
          className="w-full sm:w-auto px-6 py-4 rounded-2xl theme-bg-elevated theme-text-secondary hover:theme-text-primary text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 border-0 shadow-xs"
        >
          <QrCodeIcon className="w-4 h-4 text-[var(--accent-main)]" />
          <span>Verify Official Document</span>
        </button>
      </div>

      {/* Interactive Live Dashboard Mockup Preview Card */}
      <div className={`mt-14 sm:mt-18 max-w-5xl w-full mx-auto p-4 sm:p-6 rounded-3xl theme-bg-surface/90 shadow-xl backdrop-blur-xl relative overflow-hidden border-0 ${getRevealClass(isVisible, 'delay-300')}`}>
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-main)] via-sky-400 to-emerald-400 opacity-90" />

        <div className="flex items-center justify-between pb-3.5 mb-4 border-b theme-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-bold theme-text-secondary ml-2">
              Darus Salam Model Academy &amp; Research Institute • Live Operational Hub
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-bold text-emerald-400">PostgreSQL Cloud + SQLite Edge Synced</span>
          </div>
        </div>

        {/* 4 Interactive Live Metric Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left text-xs">
          {/* Card 1: SIS Admissions */}
          <div className="p-3.5 rounded-2xl theme-bg-app space-y-1.5 border-0 shadow-2xs hover:theme-bg-elevated transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">Admissions</span>
              <AcademicCapIcon className="w-4 h-4 text-[var(--accent-main)]" />
            </div>
            <div className="font-black text-base sm:text-lg theme-text-primary">3,480 Enrolled</div>
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircleIcon className="w-3 h-3" />
              <span>64-District Geo Verified</span>
            </div>
          </div>

          {/* Card 2: 31-Day Attendance */}
          <div className="p-3.5 rounded-2xl theme-bg-app space-y-1.5 border-0 shadow-2xs hover:theme-bg-elevated transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">Today Attendance</span>
              <ClockIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-black text-base sm:text-lg text-emerald-400">98.7% Present</div>
            <div className="text-[10px] theme-text-secondary">ZKTeco Biometrics • 08:42 AM</div>
          </div>

          {/* Card 3: Examination Engine */}
          <div className="p-3.5 rounded-2xl theme-bg-app space-y-1.5 border-0 shadow-2xs hover:theme-bg-elevated transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">Examination</span>
              <ChartBarIcon className="w-4 h-4 text-sky-400" />
            </div>
            <div className="font-black text-base sm:text-lg theme-text-primary">Dynamic GPA 5.00</div>
            <div className="text-[10px] text-sky-400 font-semibold">CA% + Dars-e-Nizami Scales</div>
          </div>

          {/* Card 4: Hostel Living */}
          <div className="p-3.5 rounded-2xl theme-bg-app space-y-1.5 border-0 shadow-2xs hover:theme-bg-elevated transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">Residential Living</span>
              <BuildingOfficeIcon className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="font-black text-base sm:text-lg theme-text-primary">486 / 500 Beds</div>
            <div className="text-[10px] theme-text-secondary">Night Headcount 100% Verified</div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className={`mt-14 sm:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-6 max-w-4xl w-full mx-auto pt-8 border-t theme-border/30 ${getRevealClass(isVisible, 'delay-300')}`}>
        <div className="text-center p-4 rounded-2xl theme-bg-surface shadow-xs border-0 hover:-translate-y-1 transition-all duration-300">
          <div className="text-xl sm:text-3xl font-black theme-text-primary">100%</div>
          <div className="text-[11px] theme-text-secondary mt-0.5 font-medium">Multi-Tenant Isolation</div>
        </div>
        <div className="text-center p-4 rounded-2xl theme-bg-surface shadow-xs border-0 hover:-translate-y-1 transition-all duration-300">
          <div className="text-xl sm:text-3xl font-black theme-text-primary">0ms</div>
          <div className="text-[11px] theme-text-secondary mt-0.5 font-medium">Offline-First Edge Latency</div>
        </div>
        <div className="text-center p-4 rounded-2xl theme-bg-surface shadow-xs border-0 hover:-translate-y-1 transition-all duration-300">
          <div className="text-xl sm:text-3xl font-black theme-text-primary">64</div>
          <div className="text-[11px] theme-text-secondary mt-0.5 font-medium">National Districts Coverage</div>
        </div>
        <div className="text-center p-4 rounded-2xl theme-bg-surface shadow-xs border-0 hover:-translate-y-1 transition-all duration-300">
          <div className="text-xl sm:text-3xl font-black text-emerald-400">Fraud-Proof</div>
          <div className="text-[11px] theme-text-secondary mt-0.5 font-medium">QR Document Verification</div>
        </div>
      </div>
    </section>
  );
}
