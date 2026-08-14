import { useNavigate } from "react-router-dom";
import { auth as authStore } from "../../utils/localStore";

export default function LandingHero() {
  const navigate = useNavigate();
  const isLoggedIn = authStore.isLoggedIn();

  const handlePrimaryClick = () => {
    if (isLoggedIn) {
      navigate("/report-builder");
    } else {
      navigate("/login");
    }
  };

  const handleScrollToOverview = () => {
    const el = document.getElementById("overview");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden select-none">
      
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-sky-500/10 rounded-full blur-[100px] sm:blur-[160px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/3 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-indigo-500/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none -z-10" />
      
      {/* Pill Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full theme-bg-surface border theme-border shadow-lg animate-fade-in mb-6 sm:mb-8 backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full theme-bg-accent animate-pulse" />
        <span className="text-[10px] sm:text-xs font-bold theme-text-primary tracking-wide uppercase">
          ✨ Simple • Organized • Modern Student Management
        </span>
      </div>

      {/* Main Headline */}
      <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold theme-text-primary tracking-tight max-w-4xl leading-[1.15] mb-6 animate-fade-in">
        From Solo Teachers to Full Institutions — <span className="bg-gradient-to-r from-sky-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">Tracking Made Effortless</span>
      </h1>

      {/* Sub-headline */}
      <p className="text-sm sm:text-base md:text-lg theme-text-secondary max-w-2xl leading-relaxed mb-8 sm:mb-10 animate-fade-in duration-300">
        Register students in 1 click, track daily lessons, mistakes & stucks, and generate instant, print-ready digital report cards without any complex setup.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col xs:flex-row items-center gap-4 animate-fade-in duration-500 w-full xs:w-auto px-4">
        <button
          type="button"
          onClick={handlePrimaryClick}
          className="w-full xs:w-auto px-8 py-3.5 rounded-xl theme-bg-accent theme-accent-text text-xs sm:text-sm font-bold shadow-xl shadow-sky-500/10 hover:opacity-95 active:scale-98 transition duration-200 cursor-pointer"
        >
          {isLoggedIn ? "Go to Dashboard ⚡" : "Get Started Free ⚡"}
        </button>

        <button
          type="button"
          onClick={handleScrollToOverview}
          className="w-full xs:w-auto px-8 py-3.5 rounded-xl theme-bg-surface border theme-border theme-text-primary text-xs sm:text-sm font-bold hover:theme-bg-sub active:scale-98 transition duration-200 cursor-pointer"
        >
          Explore Features ↓
        </button>
      </div>

      {/* Floating Scroll Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-bounce opacity-50 hover:opacity-100 transition duration-300 cursor-pointer" onClick={handleScrollToOverview}>
        <span className="text-[10px] uppercase font-bold tracking-widest theme-text-secondary">Scroll</span>
        <svg className="w-4 h-4 theme-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

    </section>
  );
}
