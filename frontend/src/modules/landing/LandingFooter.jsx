import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth as authStore } from '../../utils/localStore';
import { SparklesIcon } from '../../components/ui/Icons';
import { useScrollReveal, getRevealClass } from './useScrollReveal';

export default function LandingFooter() {
  const navigate = useNavigate();
  const isLoggedIn = authStore.isLoggedIn();
  const [footerRef, isVisible] = useScrollReveal({ threshold: 0.1 });

  const handleLaunchClick = () => {
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer
      ref={footerRef}
      className="border-t theme-border select-none mt-16 theme-bg-sub/60 backdrop-blur-md overflow-hidden"
    >
      {/* Bottom Call to Action Section */}
      <div className={`py-20 px-4 text-center max-w-4xl mx-auto space-y-6 ${getRevealClass(isVisible, 'delay-0')}`}>
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full theme-bg-elevated border theme-border shadow-2xs">
          <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
          <span className="text-[11px] font-bold theme-text-primary uppercase tracking-wider">
            Enterprise Institutional Modernization
          </span>
        </div>

        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black theme-text-primary tracking-tight">
          Ready to Modernize Your Academic Operations?
        </h2>
        <p className="text-xs sm:text-sm md:text-base theme-text-secondary max-w-xl mx-auto leading-relaxed">
          Join educational institutions, schools, colleges, and madrasahs managing student admissions, 31-day attendance registers, dynamic examinations, and hostel life with effortless speed.
        </p>

        <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={handleLaunchClick}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl theme-bg-accent theme-accent-text text-xs sm:text-sm font-bold shadow-xl hover:opacity-95 active:scale-95 transition-all duration-200 cursor-pointer inline-flex items-center justify-center gap-2 group"
          >
            <SparklesIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span>{isLoggedIn ? 'Open Application Dashboard' : 'Launch SPR Note Free'}</span>
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleScrollTo('verification')}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl theme-bg-surface border theme-border theme-text-primary text-xs sm:text-sm font-bold hover:theme-bg-sub active:scale-95 transition-all duration-200 cursor-pointer"
          >
            Verify Transcript
          </button>
        </div>
      </div>

      {/* Footer Nav Links & Copyright */}
      <div className="border-t theme-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs theme-text-secondary">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl theme-bg-accent theme-accent-text flex items-center justify-center font-extrabold text-xs shadow-2xs">
              SPR
            </div>
            <span className="font-extrabold theme-text-primary text-sm tracking-wide">SPR Note</span>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 ml-2">
              v2.0 Enterprise
            </span>
          </div>

          {/* Copyright text */}
          <p className="text-[11px] text-center md:text-left">
            &copy; {new Date().getFullYear()} SPR Note Ecosystem. Engineered with institutional security and responsive architecture.
          </p>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => handleScrollTo('interactive-showcase')}
              className="hover:theme-text-primary transition cursor-pointer bg-transparent border-0 p-0 text-xs"
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('examinations')}
              className="hover:theme-text-primary transition cursor-pointer bg-transparent border-0 p-0 text-xs"
            >
              Examinations
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('attendance')}
              className="hover:theme-text-primary transition cursor-pointer bg-transparent border-0 p-0 text-xs"
            >
              Attendance
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('campus-hostel')}
              className="hover:theme-text-primary transition cursor-pointer bg-transparent border-0 p-0 text-xs"
            >
              Hostel
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('verification')}
              className="hover:theme-text-primary transition cursor-pointer bg-transparent border-0 p-0 text-xs"
            >
              Verification
            </button>
            <button
              type="button"
              onClick={() => navigate(isLoggedIn ? '/dashboard' : '/login')}
              className="hover:theme-text-primary transition cursor-pointer bg-transparent border-0 p-0 text-xs font-bold theme-text-primary"
            >
              {isLoggedIn ? 'Dashboard' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
