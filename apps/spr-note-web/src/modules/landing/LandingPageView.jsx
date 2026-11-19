import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth as authStore } from '../../utils/localStore';
import { useTheme } from '../../context/useTheme';
import { LanguageSelector } from '../../i18n';
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
import {
  SparklesIcon,
  SunIcon,
  MoonIcon,
  MenuIcon,
  CloseIcon,
  ShieldCheckIcon,
} from '../../components/ui/Icons';

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
      <header className="theme-bg-surface/90 border-0 px-4 py-3 sticky top-0 z-40 backdrop-blur-md select-none transition-colors duration-300 shadow-xs">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center gap-3">
          {/* Logo Branding */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 rounded-xl theme-bg-accent theme-accent-text flex items-center justify-center font-black text-xs shadow-md group-hover:scale-105 transition-all duration-300">
              SPR
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold theme-text-primary text-base tracking-wide group-hover:theme-accent transition-colors duration-200">
                SPR Note
              </span>
              <span className="text-[9px] font-bold text-[var(--accent-main)] uppercase tracking-wider hidden sm:block">
                Academic ERP &amp; Campus SIS
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
              System Matrix
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('examinations')}
              className="hover:theme-text-primary hover:text-[var(--accent-main)] transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              Examinations &amp; Grading
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('attendance')}
              className="hover:theme-text-primary hover:text-[var(--accent-main)] transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              Attendance &amp; Biometrics
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('campus-hostel')}
              className="hover:theme-text-primary hover:text-[var(--accent-main)] transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              Campus &amp; Hostel
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
              onClick={() => handleNavClick('features')}
              className="hover:theme-text-primary hover:text-[var(--accent-main)] transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              All Features
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('verification')}
              className="hover:theme-text-primary hover:text-[var(--accent-main)] transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              Verify Document
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('creator')}
              className="hover:theme-text-primary text-[var(--accent-main)] transition-colors duration-200 flex items-center gap-1 font-extrabold cursor-pointer bg-transparent border-0"
            >
              <span>Lead Architect</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-main)] animate-ping" />
            </button>
          </nav>

          {/* Navigation Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Multi-Language Switcher */}
            <LanguageSelector />

            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const nextMode = themeContext.modeId === 'dark' ? 'light' : 'dark';
                themeContext.setModeId(nextMode);
              }}
              className="p-2 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition border-0 bg-transparent flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs"
              title={themeContext.modeId === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme Mode"
            >
              {themeContext.modeId === 'dark' ? (
                <SunIcon className="w-4 h-4 text-amber-400" />
              ) : (
                <MoonIcon className="w-4 h-4 text-indigo-500" />
              )}
            </button>

            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-95 shadow-sm active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-1.5 border-0"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Go to Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="hidden sm:block px-3.5 py-2 rounded-xl theme-text-primary hover:theme-bg-elevated text-xs font-bold transition cursor-pointer bg-transparent border-0"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-95 shadow-sm active:scale-95 transition-all duration-200 cursor-pointer border-0"
                >
                  Launch Workspace
                </button>
              </>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl theme-bg-elevated theme-text-primary cursor-pointer active:scale-95 transition-colors border-0 shadow-2xs"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <CloseIcon className="w-4 h-4" />
              ) : (
                <MenuIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden mt-3 p-3 rounded-2xl theme-bg-elevated shadow-lg space-y-2 text-left animate-fade-in border-0">
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleNavClick('interactive-showcase')}
                className="p-2.5 rounded-xl theme-bg-surface theme-text-primary text-left border-0 cursor-pointer"
              >
                Platform Matrix
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('examinations')}
                className="p-2.5 rounded-xl theme-bg-surface theme-text-primary text-left border-0 cursor-pointer"
              >
                Examinations
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('attendance')}
                className="p-2.5 rounded-xl theme-bg-surface theme-text-primary text-left border-0 cursor-pointer"
              >
                Attendance
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('campus-hostel')}
                className="p-2.5 rounded-xl theme-bg-surface theme-text-primary text-left border-0 cursor-pointer"
              >
                Hostel Living
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('hifz-tracker')}
                className="p-2.5 rounded-xl theme-bg-surface theme-text-primary text-left border-0 cursor-pointer"
              >
                Hifz Track
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('audience')}
                className="p-2.5 rounded-xl theme-bg-surface theme-text-primary text-left border-0 cursor-pointer"
              >
                Institutions
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('features')}
                className="p-2.5 rounded-xl theme-bg-surface theme-text-primary text-left border-0 cursor-pointer"
              >
                All Features
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('verification')}
                className="p-2.5 rounded-xl theme-bg-surface text-[var(--accent-main)] text-left border-0 cursor-pointer"
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
