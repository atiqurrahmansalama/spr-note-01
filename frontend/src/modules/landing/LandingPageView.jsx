import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth as authStore } from '../../utils/localStore';
import { useTheme } from '../../context/useTheme';
import LandingHero from './LandingHero';
import LandingInteractiveShowcase from './LandingInteractiveShowcase';
import LandingExaminations from './LandingExaminations';
import LandingAttendanceMatrix from './LandingAttendanceMatrix';
import LandingCampusHostel from './LandingCampusHostel';
import LandingHifzTracker from './LandingHifzTracker';
import LandingAudience from './LandingAudience';
import LandingFeatures from './LandingFeatures';
import LandingVerifySearch from './LandingVerifySearch';
import LandingCreatorSpotlight from './LandingCreatorSpotlight';
import LandingFooter from './LandingFooter';
import { SparklesIcon } from '../../components/ui/Icons';

export default function LandingPageView() {
  const navigate = useNavigate();
  const isLoggedIn = authStore.isLoggedIn();
  const themeContext = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Track scroll progress for top progress indicator
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (windowHeight > 0) {
        const scroll = (totalScroll / windowHeight) * 100;
        setScrollProgress(scroll);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (sectionId) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen theme-bg-app theme-text-primary overflow-x-hidden relative font-sans scroll-smooth selection:bg-[var(--accent-main)] selection:text-white">
      {/* Top Scroll Progress Bar */}
      <div
        className="fixed top-0 left-0 h-0.5 bg-gradient-to-r from-[var(--accent-main)] via-sky-400 to-emerald-400 z-50 transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Floating Modern Header */}
      <header className="theme-bg-surface/85 border-b theme-border px-4 py-3 sticky top-0 z-40 backdrop-blur-md select-none transition-colors duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          {/* Logo Branding */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 rounded-xl theme-bg-accent theme-accent-text flex items-center justify-center font-black text-xs shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              SPR
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold theme-text-primary text-base tracking-wide group-hover:theme-accent transition-colors duration-200">
                SPR Note
              </span>
              <span className="text-[9px] font-bold text-[var(--accent-main)] uppercase tracking-wider hidden sm:block">
                Academic ERP
              </span>
            </div>
          </div>

          {/* Quick Nav Links (Desktop) */}
          <nav className="hidden xl:flex items-center gap-5 text-xs font-bold theme-text-secondary">
            <button
              type="button"
              onClick={() => handleNavClick('interactive-showcase')}
              className="hover:theme-text-primary hover:text-[var(--accent-main)] transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              Matrix
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('examinations')}
              className="hover:theme-text-primary hover:text-[var(--accent-main)] transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              Examinations
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('attendance')}
              className="hover:theme-text-primary hover:text-[var(--accent-main)] transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              Attendance
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('campus-hostel')}
              className="hover:theme-text-primary hover:text-[var(--accent-main)] transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              Hostel
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('hifz-tracker')}
              className="hover:theme-text-primary hover:text-[var(--accent-main)] transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              Hifz Track
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('audience')}
              className="hover:theme-text-primary hover:text-[var(--accent-main)] transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              Institutions
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('features')}
              className="hover:theme-text-primary hover:text-[var(--accent-main)] transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('verification')}
              className="hover:theme-text-primary hover:text-[var(--accent-main)] transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              Verify
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('creator')}
              className="hover:theme-text-primary text-[var(--accent-main)] transition-colors duration-200 flex items-center gap-1 font-extrabold cursor-pointer bg-transparent border-0"
            >
              <span>Creator</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-main)] animate-ping" />
            </button>
          </nav>

          {/* Navigation Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const nextMode = themeContext.modeId === 'dark' ? 'light' : 'dark';
                themeContext.setModeId(nextMode);
              }}
              className="p-2 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition border-0 bg-transparent flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
              title={themeContext.modeId === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {themeContext.modeId === 'dark' ? (
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-95 shadow-md active:scale-95 hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="hidden sm:block px-3.5 py-2 rounded-xl theme-text-primary hover:theme-bg-sub text-xs font-bold transition cursor-pointer bg-transparent border-0"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-95 shadow-md active:scale-95 hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  Get Started
                </button>
              </>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl theme-bg-sub border theme-border theme-text-primary cursor-pointer active:scale-95 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t theme-border mt-3 pt-3 pb-2 space-y-2 text-left animate-fade-in">
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleNavClick('interactive-showcase')}
                className="p-2.5 rounded-xl theme-bg-sub/80 theme-text-primary text-left"
              >
                Platform Matrix
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('examinations')}
                className="p-2.5 rounded-xl theme-bg-sub/80 theme-text-primary text-left"
              >
                Examinations
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('attendance')}
                className="p-2.5 rounded-xl theme-bg-sub/80 theme-text-primary text-left"
              >
                Attendance
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('campus-hostel')}
                className="p-2.5 rounded-xl theme-bg-sub/80 theme-text-primary text-left"
              >
                Hostel Living
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('hifz-tracker')}
                className="p-2.5 rounded-xl theme-bg-sub/80 theme-text-primary text-left"
              >
                Hifz Track
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('audience')}
                className="p-2.5 rounded-xl theme-bg-sub/80 theme-text-primary text-left"
              >
                Institutions
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('features')}
                className="p-2.5 rounded-xl theme-bg-sub/80 theme-text-primary text-left"
              >
                All Features
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('verification')}
                className="p-2.5 rounded-xl theme-bg-sub/80 text-[var(--accent-main)] text-left"
              >
                Verify Document
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Full-Screen Animated Sections Breakdown */}
      <main className="space-y-0">
        <LandingHero />
        <LandingInteractiveShowcase />
        <LandingExaminations />
        <LandingAttendanceMatrix />
        <LandingCampusHostel />
        <LandingHifzTracker />
        <LandingAudience />
        <LandingFeatures />
        <LandingVerifySearch />
        <LandingCreatorSpotlight />
      </main>

      <LandingFooter />
    </div>
  );
}
