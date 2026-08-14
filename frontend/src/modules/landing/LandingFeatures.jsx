export default function LandingFeatures() {
  const featuresList = [
    {
      icon: "📊",
      title: "Daily Recitation & Hifz Tracking",
      desc: "Log daily lessons, revisions, page numbers, mistakes, and hesitation markers. Monitor progress in real-time with visual indicators."
    },
    {
      icon: "⚙️",
      title: "4-Tier Section Control Panel",
      desc: "Customize the platform features for your school. Toggle sections on or off dynamically for specific classes, teachers, or administrators."
    },
    {
      icon: "📄",
      title: "Print-Ready Reports & ID Cards",
      desc: "Generate professional student report cards and identity slips instantly. Export to print-ready PDF formats or share digital copy links with parents."
    },
    {
      icon: "🔒",
      title: "Data Isolation & Cloud Sync",
      desc: "Keep records secure. Each teacher has private, isolated databases. Auto-synchronize data in the background once you get back online."
    }
  ];

  return (
    <section className="py-20 px-4 theme-bg-sub/30 select-none">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest theme-accent bg-sky-500/10 px-3 py-1 rounded-full">
            Core Features
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold theme-text-primary tracking-tight">
            Designed to Simplify Classroom Recordkeeping
          </h2>
          <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
            A comprehensive suite of tools specifically built for modern religious and academic educational programs.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuresList.map((f, i) => (
            <div
              key={i}
              className="theme-bg-surface border theme-border rounded-2xl p-6 shadow-md hover:-translate-y-1 hover:shadow-xl hover:border-[var(--accent-main)]/20 transition duration-300 flex flex-col justify-start text-left space-y-4"
            >
              <div className="text-2xl w-10 h-10 rounded-xl theme-bg-sub flex items-center justify-center border theme-border shadow-inner shrink-0">
                {f.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold theme-text-primary">
                  {f.title}
                </h3>
                <p className="text-xs theme-text-secondary leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
