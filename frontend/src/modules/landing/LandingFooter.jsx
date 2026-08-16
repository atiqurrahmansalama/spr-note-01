import { useNavigate } from "react-router-dom";
import { auth as authStore } from "../../utils/localStore";

export default function LandingFooter() {
  const navigate = useNavigate();
  const isLoggedIn = authStore.isLoggedIn();

  const handleLaunchClick = () => {
    if (isLoggedIn) {
      navigate("/report-builder");
    } else {
      navigate("/login");
    }
  };

  return (
    <footer className="border-t theme-border select-none mt-16 theme-bg-sub/60 backdrop-blur-md">
      {/* Bottom Call to Action Section */}
      <div className="py-20 px-4 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full theme-bg-elevated border theme-border shadow-xs">
          <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
          <span className="text-[11px] font-bold theme-text-primary uppercase tracking-wider">
            Modern Institutional Management
          </span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-extrabold theme-text-primary tracking-tight">
          Ready to Modernize Your Academic Recordkeeping?
        </h2>
        <p className="text-xs sm:text-sm theme-text-secondary max-w-lg mx-auto leading-relaxed">
          Join educational institutions, academies, and teachers managing students, daily attendance matrices, and automated report generation with effortless speed.
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleLaunchClick}
            className="px-8 py-3.5 rounded-2xl theme-bg-accent theme-accent-text text-xs sm:text-sm font-bold shadow-xl hover:opacity-95 active:scale-98 transition duration-200 cursor-pointer inline-flex items-center gap-2"
          >
            <span>{isLoggedIn ? "Open Application Dashboard" : "Launch SPR Note Free"}</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* Footer Nav Links & Copyright */}
      <div className="border-t theme-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs theme-text-secondary">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl theme-bg-accent theme-accent-text flex items-center justify-center font-extrabold text-xs shadow-xs">
              SPR
            </div>
            <span className="font-extrabold theme-text-primary text-sm tracking-wide">SPR Note</span>
          </div>

          {/* Copyright text */}
          <p className="text-[11px] text-center md:text-left">
            &copy; {new Date().getFullYear()} SPR Note Ecosystem. Built with institutional-grade security and modern responsive architecture.
          </p>

          {/* Quick Links (GitHub link removed) */}
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("verification");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:theme-text-primary transition cursor-pointer bg-transparent border-0 p-0 text-xs"
            >
              Verify Report
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("overview");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:theme-text-primary transition cursor-pointer bg-transparent border-0 p-0 text-xs"
            >
              Features
            </button>

            <button
              type="button"
              onClick={() => navigate(isLoggedIn ? "/report-builder" : "/login")}
              className="hover:theme-text-primary transition cursor-pointer bg-transparent border-0 p-0 text-xs font-semibold theme-text-primary"
            >
              {isLoggedIn ? "Dashboard" : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
