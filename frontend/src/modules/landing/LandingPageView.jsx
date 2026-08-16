import { useNavigate } from "react-router-dom";
import { auth as authStore } from "../../utils/localStore";
import { useTheme } from "../../context/useTheme";
import LandingHero from "./LandingHero";
import LandingHifzTracker from "./LandingHifzTracker";
import LandingAttendanceMatrix from "./LandingAttendanceMatrix";
import LandingAudience from "./LandingAudience";
import LandingFeatures from "./LandingFeatures";
import LandingVerifySearch from "./LandingVerifySearch";
import LandingCreatorSpotlight from "./LandingCreatorSpotlight";
import LandingFooter from "./LandingFooter";
import { SparklesIcon } from "../../components/ui/Icons";

export default function LandingPageView() {
  const navigate = useNavigate();
  const isLoggedIn = authStore.isLoggedIn();
  const themeContext = useTheme();

  return (
    <div className="min-h-screen theme-bg-app theme-text-primary overflow-x-hidden relative font-sans scroll-smooth">
      {/* Sleek Landing Header */}
      <header className="theme-bg-surface/85 border-b theme-border px-4 py-3 flex justify-between items-center z-30 shadow-md sticky top-0 backdrop-blur-md select-none">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          {/* Logo Branding */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => navigate("/")}
          >
            <div className="w-8 h-8 rounded-xl theme-bg-accent theme-accent-text flex items-center justify-center font-black text-xs shadow-md group-hover:scale-105 transition-transform">
              SPR
            </div>
            <span className="font-extrabold theme-text-primary text-base sm:text-lg tracking-wide group-hover:theme-accent transition">
              SPR Note
            </span>
          </div>

          {/* Quick Nav Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold theme-text-secondary">
            <a href="#hifz-tracker" className="hover:theme-text-primary transition">
              হিফজ ট্র্যাকার
            </a>
            <a href="#audience" className="hover:theme-text-primary transition">
              ইনস্টিটিউশন
            </a>
            <a href="#features" className="hover:theme-text-primary transition">
              ফিচারসমূহ
            </a>
            <a href="#verification" className="hover:theme-text-primary transition">
              ভেরিফিকেশন
            </a>
            <a href="#creator" className="hover:theme-text-primary transition text-[var(--accent-main)]">
              ক্রিয়েটর
            </a>
          </nav>

          {/* Navigation CTAs */}
          <div className="flex items-center gap-3">
            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const nextMode = themeContext.modeId === "dark" ? "light" : "dark";
                themeContext.setModeId(nextMode);
              }}
              className="p-2 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition border-0 bg-transparent flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
              title={themeContext.modeId === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {themeContext.modeId === "dark" ? (
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
                onClick={() => navigate("/report-builder")}
                className="px-4.5 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-95 shadow-md active:scale-98 transition cursor-pointer flex items-center gap-1.5"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>হিফজ রিপোর্ট জেনারেটর</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="px-3.5 py-2 rounded-xl theme-text-primary hover:theme-bg-sub text-xs font-bold transition cursor-pointer bg-transparent border-0"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-95 shadow-md active:scale-98 transition cursor-pointer"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Full-Screen Sections Breakdown */}
      <main className="space-y-0">
        <LandingHero />
        <div id="hifz-tracker">
          <LandingHifzTracker />
        </div>
        <LandingAttendanceMatrix />
        <LandingAudience />
        <LandingFeatures />
        <LandingVerifySearch />
        <LandingCreatorSpotlight />
      </main>

      <LandingFooter />
    </div>
  );
}
