import { useNavigate } from "react-router-dom";
import { auth as authStore } from "../../utils/localStore";
import { useTheme } from "../../context/useTheme";
import LandingHero from "./LandingHero";
import LandingAudience from "./LandingAudience";
import LandingFeatures from "./LandingFeatures";
import LandingVerifySearch from "./LandingVerifySearch";
import LandingFooter from "./LandingFooter";

export default function LandingPageView() {
  const navigate = useNavigate();
  const isLoggedIn = authStore.isLoggedIn();
  const themeContext = useTheme();

  return (
    <div className="min-h-screen theme-bg-app theme-text-primary overflow-x-hidden relative font-sans">
      
      {/* Sleek Landing Header */}
      <header className="theme-bg-surface border-b theme-border px-4 py-3.5 flex justify-between items-center z-30 shadow-sm sticky top-0 backdrop-blur-md bg-opacity-70 select-none">
        <div className="max-w-6xl mx-auto w-full flex justify-between items-center">
          
          {/* Logo Branding */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-lg theme-bg-accent theme-accent-text flex items-center justify-center font-bold text-xs shadow-sm">
              SPR
            </div>
            <span className="font-extrabold theme-text-primary text-base sm:text-lg tracking-wide hover:theme-accent transition">
              SPR Note
            </span>
          </div>

          {/* Navigation CTAs */}
          <div className="flex items-center gap-3">
            
            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const nextMode = themeContext.modeId === "dark" ? "light" : "dark";
                themeContext.setModeId(nextMode);
              }}
              className="p-2 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition border-0 bg-transparent flex items-center justify-center cursor-pointer active:scale-95"
              title={themeContext.modeId === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {themeContext.modeId === "dark" ? (
                <svg className="w-4 h-4 theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => navigate("/report-builder")}
                className="px-4.5 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-95 shadow-md active:scale-98 transition cursor-pointer"
              >
                Dashboard ⚡
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="px-4 py-2.5 rounded-xl theme-text-primary hover:theme-bg-sub text-xs font-bold transition cursor-pointer bg-transparent border-0"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="px-4.5 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-95 shadow-md active:scale-98 transition cursor-pointer"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

        </div>
      </header>

      {/* Sections Breakdown */}
      <main>
        <LandingHero />
        <LandingAudience />
        <LandingFeatures />
        <LandingVerifySearch />
      </main>

      <LandingFooter />

    </div>
  );
}
