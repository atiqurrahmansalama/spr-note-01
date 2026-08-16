import React from "react";
import {
  BookOpenIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  KeyIcon,
  QrCodeIcon,
  ShieldCheckIcon,
} from "../../components/ui/Icons";

export default function LandingFeatures() {
  const featuresList = [
    {
      icon: QrCodeIcon,
      title: "Role QR & Instant Self-Onboarding",
      desc: "Generate dynamic role-based QR codes and invite tokens. Teachers, administrators, and nazims can claim their permissions with one scan.",
    },
    {
      icon: BuildingOfficeIcon,
      title: "64 Districts & Geo-Hierarchy",
      desc: "Structured Bangladesh geographic data across all 8 divisions, 64 districts, and upazilas for accurate student and campus records.",
    },
    {
      icon: AcademicCapIcon,
      title: "Automated Report Slips & Cards",
      desc: "Instantly compile student daily marks, tajweed evaluations, and attendance summaries into verifiable print-ready digital cards.",
    },
    {
      icon: ShieldCheckIcon,
      title: "Multi-Tenant Data Isolation",
      desc: "Enterprise privacy: each institution runs in isolated database tenancy with independent staff rosters, session records, and audit logs.",
    },
  ];

  return (
    <section id="features" className="min-h-screen flex flex-col justify-center items-center py-24 px-4 theme-bg-sub/30 select-none scroll-mt-10">
      <div className="max-w-6xl w-full mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-main)] theme-bg-accent-soft px-3.5 py-1 rounded-full border theme-border">
            Enterprise Infrastructure
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black theme-text-primary tracking-tight">
            Comprehensive Suite of Core Features
          </h2>
          <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
            Everything your institution needs to eliminate manual paperwork, standardize grading, and securely manage academic operations.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {featuresList.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="theme-bg-surface border theme-border rounded-3xl p-6 sm:p-7 shadow-md hover:-translate-y-2 hover:shadow-2xl hover:border-[var(--accent-main)]/40 transition-all duration-300 flex flex-col justify-start text-left space-y-4 group"
              >
                <div className="w-12 h-12 rounded-2xl theme-bg-sub flex items-center justify-center border theme-border shadow-inner text-[var(--accent-main)] group-hover:scale-110 transition-transform duration-300 shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold theme-text-primary">
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
