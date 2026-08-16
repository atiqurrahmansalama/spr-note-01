import { useNavigate } from "react-router-dom";
import { auth as authStore } from "../../utils/localStore";
import { SparklesIcon } from "../../components/ui/Icons";

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
    const el = document.getElementById("hifz-tracker");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden select-none py-20">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[650px] h-[350px] sm:h-[650px] bg-[var(--accent-main)]/10 rounded-full blur-[100px] sm:blur-[160px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[250px] sm:w-[450px] h-[250px] sm:h-[450px] bg-sky-500/10 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none -z-10" />

      {/* Pill Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full theme-bg-surface border theme-border shadow-md animate-fade-in mb-6 sm:mb-8 backdrop-blur-md hover:scale-105 transition-transform">
        <span className="w-2 h-2 rounded-full theme-bg-accent animate-ping" />
        <span className="text-[11px] sm:text-xs font-bold theme-text-primary tracking-wide uppercase">
          Unified Academic Management &amp; Daily Progress Tracking
        </span>
      </div>

      {/* Main Headline */}
      <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black theme-text-primary tracking-tight max-w-5xl leading-[1.12] mb-6 animate-fade-in">
        Smart Academic Management for{" "}
        <span className="text-[var(--accent-main)]">Modern Institutions</span>
      </h1>

      {/* Sub-headline */}
      <p className="text-sm sm:text-base md:text-lg theme-text-secondary max-w-2xl leading-relaxed mb-8 sm:mb-10 animate-fade-in duration-300">
        Register students in 1 click, track daily attendance &amp; 30-Juz recitation matrices, manage institutional departments, and generate instant, verifiable digital report cards with zero friction.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in duration-500 w-full sm:w-auto px-4">
        <button
          type="button"
          onClick={handlePrimaryClick}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl theme-bg-accent theme-accent-text text-xs sm:text-sm font-bold shadow-xl hover:opacity-95 active:scale-98 transition duration-200 cursor-pointer flex items-center justify-center gap-2"
        >
          <SparklesIcon className="w-4 h-4" />
          <span>{isLoggedIn ? "হিফজ রিপোর্ট জেনারেটর" : "লগইন করে শুরু করুন"}</span>
          <span>&rarr;</span>
        </button>

        <button
          type="button"
          onClick={handleScrollToOverview}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl theme-bg-surface border theme-border theme-text-primary text-xs sm:text-sm font-bold hover:theme-bg-sub active:scale-98 transition duration-200 cursor-pointer"
        >
          Explore Features ↓
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="mt-16 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-4xl w-full mx-auto pt-8 border-t theme-border">
        <div className="text-center p-3 rounded-2xl theme-bg-surface/50 border theme-border">
          <div className="text-xl sm:text-3xl font-black theme-text-primary">100%</div>
          <div className="text-[11px] theme-text-secondary mt-0.5 font-medium">Secure Multi-Tenant</div>
        </div>
        <div className="text-center p-3 rounded-2xl theme-bg-surface/50 border theme-border">
          <div className="text-xl sm:text-3xl font-black theme-text-primary">0s</div>
          <div className="text-[11px] theme-text-secondary mt-0.5 font-medium">Report Calculation</div>
        </div>
        <div className="text-center p-3 rounded-2xl theme-bg-surface/50 border theme-border">
          <div className="text-xl sm:text-3xl font-black theme-text-primary">64</div>
          <div className="text-[11px] theme-text-secondary mt-0.5 font-medium">Districts Supported</div>
        </div>
        <div className="text-center p-3 rounded-2xl theme-bg-surface/50 border theme-border">
          <div className="text-xl sm:text-3xl font-black theme-text-primary">Instant</div>
          <div className="text-[11px] theme-text-secondary mt-0.5 font-medium">QR Verification</div>
        </div>
      </div>
    </section>
  );
}
