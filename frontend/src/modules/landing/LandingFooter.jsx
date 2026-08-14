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
    <footer className="border-t theme-border select-none mt-12 bg-slate-950/20 backdrop-blur-md">
      
      {/* Bottom CTA Block */}
      <div className="py-20 px-4 text-center max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl sm:text-4xl font-extrabold theme-text-primary tracking-tight">
          Ready to Streamline Your Recordkeeping?
        </h2>
        <p className="text-xs sm:text-sm theme-text-secondary max-w-lg mx-auto leading-relaxed">
          Join teachers and institutions saving hours of grading time and organizing student directories efficiently.
        </p>
        <button
          type="button"
          onClick={handleLaunchClick}
          className="px-8 py-3.5 rounded-xl theme-bg-accent theme-accent-text text-xs sm:text-sm font-bold shadow-xl shadow-sky-500/10 hover:opacity-95 active:scale-98 transition duration-200 cursor-pointer"
        >
          {isLoggedIn ? "Go to Dashboard ⚡" : "Launch Application Free ⚡"}
        </button>
      </div>

      {/* Footer Sub-links */}
      <div className="border-t theme-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs theme-text-secondary">
          
          <div className="flex items-center gap-2.5">
            <div className="w-6.5 h-6.5 rounded-lg theme-bg-accent theme-accent-text flex items-center justify-center font-bold text-[10px] shadow-sm">
              SPR
            </div>
            <span className="font-bold theme-text-primary text-sm tracking-wide">SPR Note</span>
          </div>

          <p className="text-[11px] text-center md:text-left">
            &copy; {new Date().getFullYear()} SPR Note. Designed and developed with modern UI/UX architecture.
          </p>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="hover:theme-text-primary transition cursor-pointer bg-transparent border-0 p-0"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="hover:theme-text-primary transition cursor-pointer bg-transparent border-0 p-0"
            >
              Create Account
            </button>
            <a
              href="https://github.com/atiqurrahmansalama/spr-note-01"
              target="_blank"
              rel="noreferrer"
              className="hover:theme-text-primary transition"
            >
              Source Code
            </a>
          </div>

        </div>
      </div>

    </footer>
  );
}
