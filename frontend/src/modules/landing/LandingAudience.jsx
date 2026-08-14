export default function LandingAudience() {
  return (
    <section id="overview" className="py-20 px-4 max-w-6xl mx-auto space-y-12 select-none scroll-mt-10">
      
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-4xl font-extrabold theme-text-primary tracking-tight">
          Tailored to Your Teaching Environment
        </h2>
        <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
          Whether you run a private tuition center or manage an entire institution, SPR Note adapts to your daily workflow.
        </p>
      </div>

      {/* Roster Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        
        {/* Tutor/Hifz Mode Card */}
        <div className="theme-bg-surface border theme-border rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between hover:border-[var(--accent-main)]/35 transition duration-300 relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition pointer-events-none" />
          
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shrink-0 shadow-md">
              ⚡
            </div>
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold theme-text-primary">
                Private Tutors & Hifz Teachers
              </h3>
              <p className="text-xs theme-text-secondary leading-relaxed">
                Maximize speed and eliminate administrative overhead. Easily manage students and log recitations during busy sessions.
              </p>
            </div>

            <ul className="space-y-3 text-xs theme-text-primary font-medium">
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                <span>1-Click Fast Student Admission</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                <span>Frictionless Daily Recitation Logs</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                <span>Clean & Intuitively Organized UI</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t theme-border">
            <span className="text-[10px] uppercase font-bold tracking-wider theme-accent">
              Perfect for Quick Mode
            </span>
          </div>
        </div>

        {/* Institutional Mode Card */}
        <div className="theme-bg-surface border theme-border rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between hover:border-[var(--accent-main)]/35 transition duration-300 relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition pointer-events-none" />

          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shrink-0 shadow-md">
              🏢
            </div>
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold theme-text-primary">
                School & Madrasah Administration
              </h3>
              <p className="text-xs theme-text-secondary leading-relaxed">
                Scale your administration efficiently. Collect full admissions profiles, assign teachers, and monitor multiple student batches.
              </p>
            </div>

            <ul className="space-y-3 text-xs theme-text-primary font-medium">
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                <span>Comprehensive 5-Step Admission & Profile</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                <span>4-Tier Hierarchy Roles & Permissions</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                <span>Batch & Group Performance Analytics</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t theme-border">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
              Perfect for Institutional Mode
            </span>
          </div>
        </div>

      </div>

    </section>
  );
}
