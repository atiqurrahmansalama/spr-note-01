import React from "react";
import {
  BookOpenIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
} from "../../components/ui/Icons";

export default function LandingFeatures() {
  const featuresList = [
    {
      icon: BookOpenIcon,
      title: "Daily Recitation & Matrix Tracking",
      desc: "Log daily lessons, revisions, page numbers, mistakes, and hesitation markers. Monitor student progress in real-time with visual indicators.",
    },
    {
      icon: BuildingOfficeIcon,
      title: "Academic Hierarchy & Departments",
      desc: "Customize multi-branch and multi-department structures. Isolate sessions, classes, and teacher rosters under autonomous governance.",
    },
    {
      icon: AcademicCapIcon,
      title: "Print-Ready Reports & ID Slips",
      desc: "Generate professional report cards, verification tokens, and performance transcripts instantly with automated calculation matrices.",
    },
    {
      icon: ShieldCheckIcon || AcademicCapIcon,
      title: "Role QR & One-Click Onboarding",
      desc: "Distribute role-specific invite links and printable QR cards. Allow staff and teachers to self-register securely with tokenized permissions.",
    },
  ];

  return (
    <section className="py-20 px-4 theme-bg-sub/30 select-none">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-main)] theme-bg-accent-soft px-3 py-1 rounded-full border theme-border">
            Core Platform Capabilities
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold theme-text-primary tracking-tight">
            Engineered for Modern Academic Administration
          </h2>
          <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
            A comprehensive suite of tools built for madrasas, schools, academies, and educational programs.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuresList.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="theme-bg-surface border theme-border rounded-3xl p-6 shadow-md hover:-translate-y-1 hover:shadow-xl hover:border-[var(--accent-main)]/30 transition duration-300 flex flex-col justify-start text-left space-y-4"
              >
                <div className="w-11 h-11 rounded-2xl theme-bg-sub flex items-center justify-center border theme-border shadow-inner text-[var(--accent-main)] shrink-0">
                  <Icon className="w-5 h-5" />
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
