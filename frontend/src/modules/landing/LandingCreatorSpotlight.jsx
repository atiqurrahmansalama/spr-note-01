import React from 'react';
import { SparklesIcon, ShieldCheckIcon, AcademicCapIcon, BuildingOfficeIcon } from '../../components/ui/Icons';
import { useScrollReveal, getRevealClass } from './useScrollReveal';

export default function LandingCreatorSpotlight() {
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.1 });

  return (
    <section
      ref={sectionRef}
      id="creator"
      className="py-24 px-4 theme-bg-app relative overflow-hidden select-none scroll-mt-12"
    >
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] sm:w-[700px] h-[450px] sm:h-[700px] bg-[var(--accent-main)]/10 rounded-full blur-[140px] sm:blur-[180px] pointer-events-none -z-10 animate-pulse duration-1000" />
      <div className="absolute bottom-1/3 left-1/4 w-[300px] h-[300px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-bounce duration-1000" />

      <div className="max-w-5xl w-full mx-auto space-y-12 relative z-10">
        {/* Creator Badge Header */}
        <div className={`text-center space-y-4 max-w-2xl mx-auto ${getRevealClass(isVisible, 'delay-0')}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full theme-bg-elevated border theme-border shadow-md backdrop-blur-md hover:scale-105 transition-transform duration-300">
            <span className="w-2 h-2 rounded-full theme-bg-accent animate-ping" />
            <span className="text-[11px] sm:text-xs font-bold theme-text-primary uppercase tracking-widest">
              Lead Architect &amp; Software Engineer
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black theme-text-primary tracking-tight">
            Engineered by <span className="bg-gradient-to-r from-[var(--accent-main)] via-sky-400 to-indigo-400 bg-clip-text text-transparent">Atiqur Rahman</span>
          </h2>

          <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed max-w-xl mx-auto">
            Crafted with architectural precision, high-speed responsiveness, and dedication to modernizing educational institutions and academic operations worldwide.
          </p>
        </div>

        {/* Creator Showcase Card */}
        <div className={`theme-bg-surface border theme-border rounded-3xl p-6 sm:p-10 shadow-2xl hover:border-[var(--accent-main)]/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden ${getRevealClass(isVisible, 'delay-150')}`}>
          {/* Subtle Ambient Top Accent Light */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent-main)] to-transparent opacity-80" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Avatar & Identity Summary */}
            <div className="lg:col-span-5 flex flex-col items-center text-center space-y-4 sm:space-y-5 border-b lg:border-b-0 lg:border-r theme-border pb-8 lg:pb-0 lg:pr-8">
              <div className="relative">
                {/* Glowing Avatar Frame */}
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl theme-bg-elevated border-2 theme-border flex items-center justify-center text-3xl sm:text-4xl font-black text-[var(--accent-main)] shadow-2xl relative group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                  AR
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-2xl theme-bg-accent theme-accent-text flex items-center justify-center shadow-lg animate-bounce">
                  <SparklesIcon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
                  Atiqur Rahman
                </h3>
                <p className="text-xs font-bold text-[var(--accent-main)] mt-0.5 uppercase tracking-wider">
                  Full-Stack Software Engineer &amp; EdTech Architect
                </p>
                <p className="text-[11px] theme-text-secondary mt-1 font-medium">
                  Lead System Architect of the SPR Note Ecosystem
                </p>
              </div>

              {/* Core Attributes Badges */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {['Enterprise SIS & ERP', 'Modern React & Full-Stack', 'Multi-Tenant Security', 'High-Speed EdTech'].map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-bold theme-bg-sub theme-text-secondary border theme-border hover:theme-text-primary hover:border-[var(--accent-main)]/40 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Vision, Biography & Mission Highlights */}
            <div className="lg:col-span-7 space-y-5 text-left">
              <div className="space-y-3">
                <h4 className="text-sm sm:text-base font-bold theme-text-primary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-main)] animate-ping"></span>
                  <span>About the Creator &amp; Engineering Vision</span>
                </h4>
                <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                  <strong>Atiqur Rahman</strong> is an accomplished software engineer focused on building resilient, high-speed, and human-centric software for schools, colleges, madrasahs, and educational foundations.
                </p>
                <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                  With SPR Note, the goal was ambitious: eliminate paperwork chaos and clumsy spreadsheets by providing educational institutions with an enterprise-grade, privacy-first management suite that operates seamlessly on desktop, tablet, and mobile.
                </p>
              </div>

              {/* Engineering Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3">
                <div className="p-4 rounded-2xl theme-bg-sub border theme-border space-y-1 hover:-translate-y-1 hover:border-emerald-500/40 transition-all duration-300">
                  <div className="flex items-center gap-2 font-bold text-xs theme-text-primary">
                    <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Security-First Architecture</span>
                  </div>
                  <p className="text-[11px] theme-text-secondary leading-snug">
                    Strict multi-tenant database isolation, encrypted QR invites, and granular role permissions.
                  </p>
                </div>

                <div className="p-4 rounded-2xl theme-bg-sub border theme-border space-y-1 hover:-translate-y-1 hover:border-sky-500/40 transition-all duration-300">
                  <div className="flex items-center gap-2 font-bold text-xs theme-text-primary">
                    <AcademicCapIcon className="w-4 h-4 text-sky-400" />
                    <span>Dynamic Examination Engine</span>
                  </div>
                  <p className="text-[11px] theme-text-secondary leading-snug">
                    Real-time GPA computation, continuous assessment CA% weightage, and instant QR-verified transcripts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
