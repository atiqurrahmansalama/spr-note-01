import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function CertificateRenderer({
  student = {},
  institution = {},
  layoutConfig = {},
  scale = 1,
  className = '',
}) {
  const cfg = {
    theme_color: layoutConfig.theme_color || '#1e3a8a',
    accent_color: layoutConfig.accent_color || '#b45309',
    text_color: layoutConfig.text_color || '#0f172a',
    show_bismillah: layoutConfig.show_bismillah !== false,
    show_logo: layoutConfig.show_logo !== false,
    show_qr_code: layoutConfig.show_qr_code !== false,
    header_bn: layoutConfig.header_bn || institution.bangla_name || '',
    header_en: layoutConfig.header_en || institution.name || 'ACADEMIC INSTITUTION',
    certificate_title: layoutConfig.certificate_title || 'TESTIMONIAL & CERTIFICATE OF APPRECIATION',
    signature_title: layoutConfig.signature_title || 'Principal / Muhtamim',
    exam_controller_title: layoutConfig.exam_controller_title || 'Controller of Examinations',
  };

  const studentIdNumber = student.student_id_card_number || student.uniq_id || `STU-${student.id || '2026-0042'}`;
  const qrValue = student.uniq_id
    ? `${window.location.origin}/verify/certificate/${encodeURIComponent(student.uniq_id)}`
    : `CERT-VERIFY-${student.id || '2026-001'}`;

  return (
    <div
      className={`w-full max-w-4xl bg-[#fdfbf7] text-zinc-900 rounded-2xl border-8 p-8 sm:p-10 shadow-2xl relative select-none font-serif transition-transform origin-center ${className}`}
      style={{
        borderColor: cfg.theme_color,
        boxShadow: `0 20px 50px rgba(0,0,0,0.15), inset 0 0 0 3px ${cfg.accent_color}`,
        transform: `scale(${scale})`,
      }}
    >
      {/* Watermarked Center Monogram */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none">
        <span className="text-[220px] font-black">{institution.name?.charAt(0) || 'J'}</span>
      </div>

      {/* Certificate Header */}
      <div className="text-center space-y-2 pb-6 border-b-2" style={{ borderColor: `${cfg.accent_color}50` }}>
        {cfg.show_bismillah && (
          <div className="text-sm italic font-serif opacity-80 mb-1">
            بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          {cfg.show_logo && (
            <div
              className="w-16 h-16 rounded-full border-2 flex items-center justify-center font-bold text-xl overflow-hidden shrink-0 shadow-md bg-white"
              style={{ borderColor: cfg.accent_color }}
            >
              {institution.logo_url || institution.logo_data ? (
                <img src={institution.logo_url || institution.logo_data} alt="" className="w-full h-full object-cover" />
              ) : (
                institution.name?.charAt(0) || 'J'
              )}
            </div>
          )}

          <div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wide" style={{ color: cfg.theme_color }}>
              {cfg.header_en}
            </h2>
            {cfg.header_bn && (
              <p className="text-base font-semibold font-sans text-zinc-700">{cfg.header_bn}</p>
            )}
            <p className="text-xs font-sans text-zinc-600 mt-0.5">
              {institution.address || 'Campus Location'}, {institution.district || 'Dhaka, Bangladesh'}
            </p>
          </div>
        </div>

        {/* Certificate Ribbon Title */}
        <div className="pt-4">
          <span
            className="inline-block px-6 py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest text-white shadow-md font-sans"
            style={{ backgroundColor: cfg.accent_color }}
          >
            {cfg.certificate_title}
          </span>
        </div>
      </div>

      {/* Main Certificate Content */}
      <div className="py-8 px-4 text-center space-y-5 text-sm sm:text-base leading-relaxed text-zinc-800">
        <p className="italic">
          This is to certify with honor and institutional appreciation that
        </p>

        <div className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: cfg.theme_color }}>
          {student.name || 'Ahmad Abdullah'}
        </div>

        {student.bangla_name && (
          <div className="text-lg font-bold font-sans text-zinc-700 -mt-2">
            ({student.bangla_name})
          </div>
        )}

        <p className="max-w-2xl mx-auto text-sm sm:text-base">
          Son/Daughter of <strong>{student.father_name || 'Maulana Abu Bakr'}</strong> and <strong>{student.mother_name || 'Amena Begum'}</strong>, 
          bearing Student ID <strong className="font-mono">{studentIdNumber}</strong>, has successfully demonstrated exemplary academic diligence, memorization proficiency, and commendable character in the{' '}
          <strong>{student.department_name || student.department || 'Hifzul Quran Department'}</strong>, Class <strong>{student.student_class_name || student.student_class || 'Standard Hifz'}</strong>.
        </p>

        <p className="text-xs sm:text-sm italic text-zinc-600 pt-1">
          We pray for their continuous prosperity, righteous wisdom, and success in both worlds.
        </p>
      </div>

      {/* Verification & Signatories Footer */}
      <div className="pt-6 border-t-2 flex items-end justify-between px-2 font-sans" style={{ borderColor: `${cfg.accent_color}50` }}>
        {/* Verification QR */}
        {cfg.show_qr_code && (
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-white border border-zinc-300 shadow-2xs">
              <QRCodeSVG value={qrValue} size={48} level="M" />
            </div>
            <div className="text-left text-[9px] text-zinc-500">
              <span className="font-bold block text-zinc-800">OFFICIAL VERIFICATION</span>
              <span className="font-mono">{studentIdNumber}</span>
              <span className="block">Issue Date: 2026</span>
            </div>
          </div>
        )}

        {/* Examination Controller */}
        <div className="text-center space-y-2">
          <div className="w-36 border-b border-zinc-400 mx-auto" />
          <span className="text-xs font-bold text-zinc-700 block uppercase tracking-tight">
            {cfg.exam_controller_title}
          </span>
        </div>

        {/* Principal Stamp / Signature */}
        <div className="text-center space-y-2">
          <div className="w-36 border-b border-zinc-400 mx-auto" />
          <span className="text-xs font-bold text-zinc-700 block uppercase tracking-tight">
            {cfg.signature_title}
          </span>
        </div>
      </div>
    </div>
  );
}
