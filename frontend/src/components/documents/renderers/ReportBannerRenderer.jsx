import React from 'react';

export default function ReportBannerRenderer({
  institution = {},
  layoutConfig = {},
  scale = 1,
  className = '',
}) {
  const cfg = {
    theme_color: layoutConfig.theme_color || '#0f172a',
    accent_color: layoutConfig.accent_color || '#10b981',
    text_color: layoutConfig.text_color || '#0f172a',
    show_bismillah: layoutConfig.show_bismillah !== false,
    show_logo: layoutConfig.show_logo !== false,
    header_bn: layoutConfig.header_bn || institution.bangla_name || '',
    header_en: layoutConfig.header_en || institution.name || 'ACADEMIC INSTITUTION',
    subtitle: layoutConfig.subtitle || 'Student Academic Progress & Memorization Performance Docket',
  };

  return (
    <div
      className={`w-full max-w-4xl bg-white text-zinc-900 rounded-2xl border border-zinc-300 shadow-md p-5 select-none font-sans transition-transform origin-center ${className}`}
      style={{ transform: `scale(${scale})` }}
    >
      {cfg.show_bismillah && (
        <div className="text-center text-xs font-serif italic text-zinc-500 mb-1">
          بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pb-3 border-b-2" style={{ borderColor: cfg.accent_color }}>
        {cfg.show_logo && (
          <div
            className="w-14 h-14 rounded-2xl bg-zinc-100 border border-zinc-300 flex items-center justify-center font-black text-xl text-zinc-700 overflow-hidden shrink-0 shadow-xs"
          >
            {institution.logo_url || institution.logo_data ? (
              <img src={institution.logo_url || institution.logo_data} alt="" className="w-full h-full object-cover" />
            ) : (
              institution.name?.charAt(0) || 'J'
            )}
          </div>
        )}

        <div className="text-center flex-1 space-y-0.5">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight" style={{ color: cfg.theme_color }}>
            {cfg.header_en}
          </h2>
          {cfg.header_bn && (
            <p className="text-sm font-semibold text-zinc-700">{cfg.header_bn}</p>
          )}
          <p className="text-xs font-medium text-emerald-700">
            {cfg.subtitle}
          </p>
          <p className="text-[11px] text-zinc-500">
            {institution.address || 'Campus Location'}, {institution.district || 'Dhaka, Bangladesh'} • Tel: {institution.phone || '01700000000'}
          </p>
        </div>

        <div className="text-right shrink-0 text-[10px] font-mono text-zinc-500 border border-zinc-200 rounded-xl p-2 bg-zinc-50">
          <div>REG: <strong>{institution.eiin_or_reg_no || '102938'}</strong></div>
          <div>SESSION: <strong>2026</strong></div>
        </div>
      </div>
    </div>
  );
}
