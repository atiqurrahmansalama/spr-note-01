import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function AdmissionSlipRenderer({
  student = {},
  institution = {},
  layoutConfig = {},
  scale = 1,
  className = '',
}) {
  const cfg = {
    theme_color: layoutConfig.theme_color || '#0369a1',
    accent_color: layoutConfig.accent_color || '#0ea5e9',
    text_color: layoutConfig.text_color || '#0f172a',
    bg_style: layoutConfig.bg_style || 'CLEAN_WHITE',
    show_bismillah: layoutConfig.show_bismillah !== false,
    show_logo: layoutConfig.show_logo !== false,
    show_qr_code: layoutConfig.show_qr_code !== false,
    header_bn: layoutConfig.header_bn || institution.bangla_name || '',
    header_en: layoutConfig.header_en || institution.name || 'ACADEMIC INSTITUTION',
    signature_title: layoutConfig.signature_title || 'Principal / Muhtamim',
    accountant_title: layoutConfig.accountant_title || 'Accounts Officer',
    field_order: layoutConfig.field_order || [
      'student_name',
      'student_id',
      'department',
      'class',
      'group',
      'guardian_name',
      'guardian_phone',
      'admission_date',
    ],
  };

  const studentIdNumber = student.student_id_card_number || student.uniq_id || `STU-${student.id || '2026-0042'}`;
  const qrValue = student.uniq_id
    ? `${window.location.origin}/verify/student/${encodeURIComponent(student.uniq_id)}`
    : `STU-VERIFY-${student.id || '2026-001'}`;

  const renderVoucherCopy = (copyType, badgeColor) => (
    <div className="flex-1 p-4 rounded-xl border border-zinc-300 bg-zinc-50/80 flex flex-col justify-between space-y-4">
      {/* Voucher Sub-Header */}
      <div>
        <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
          <span className={`text-[10.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${badgeColor}`}>
            {copyType}
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            SLIP NO: <strong>ADM-{student.id || '8842'}</strong>
          </span>
        </div>

        {/* Data Fields */}
        <div className="space-y-2 text-xs pt-3">
          <div className="flex justify-between border-b border-zinc-200/80 pb-1">
            <span className="text-zinc-500 font-medium">Student Name:</span>
            <strong className="text-zinc-900">{student.name || 'Ahmad Abdullah'}</strong>
          </div>
          {student.bangla_name && (
            <div className="flex justify-between border-b border-zinc-200/80 pb-1">
              <span className="text-zinc-500 font-medium">Native Name:</span>
              <span className="font-semibold text-zinc-800">{student.bangla_name}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-zinc-200/80 pb-1">
            <span className="text-zinc-500 font-medium">Student ID / Roll:</span>
            <strong className="font-mono text-zinc-900">{studentIdNumber} {student.roll_number ? `(Roll: ${student.roll_number})` : ''}</strong>
          </div>
          <div className="flex justify-between border-b border-zinc-200/80 pb-1">
            <span className="text-zinc-500 font-medium">Department:</span>
            <span className="font-semibold text-zinc-900">{student.department_name || student.department || 'Hifzul Quran Division'}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-200/80 pb-1">
            <span className="text-zinc-500 font-medium">Class & Group:</span>
            <span className="font-semibold text-zinc-900">
              {student.student_class_name || student.student_class || 'Standard Hifz'} {student.student_group_name ? `— ${student.student_group_name}` : ''}
            </span>
          </div>
          <div className="flex justify-between border-b border-zinc-200/80 pb-1">
            <span className="text-zinc-500 font-medium">Guardian:</span>
            <span className="font-medium text-zinc-800">{student.guardian_name || student.father_name || 'Guardian'} ({student.guardian_phone || '01800000000'})</span>
          </div>
          <div className="flex justify-between border-b border-zinc-200/80 pb-1">
            <span className="text-zinc-500 font-medium">Admission Date:</span>
            <span className="font-mono text-zinc-800">{student.admission_date || '2026-01-10'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 font-medium">Admission Status:</span>
            <span className="font-bold text-emerald-700">Verified & Enrolled</span>
          </div>
        </div>
      </div>

      {/* QR & Signatures Footer */}
      <div className="pt-4 border-t border-zinc-300">
        <div className="flex items-center justify-between">
          {cfg.show_qr_code && (
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-white border border-zinc-200 shadow-2xs">
                <QRCodeSVG value={qrValue} size={38} level="M" />
              </div>
              <span className="text-[8px] text-zinc-500 font-mono">
                SECURE<br />VERIFIED
              </span>
            </div>
          )}

          <div className="text-right text-[9.5px] text-zinc-600 font-bold space-y-3">
            <div className="w-24 border-b border-zinc-400 ml-auto" />
            <span>{copyType.includes('Institutional') ? cfg.accountant_title : 'Guardian Signature'}</span>
          </div>

          <div className="text-right text-[9.5px] text-zinc-600 font-bold space-y-3">
            <div className="w-24 border-b border-zinc-400 ml-auto" />
            <span>{cfg.signature_title}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`w-full max-w-4xl bg-white text-zinc-900 rounded-2xl border-2 border-dashed border-zinc-300 shadow-xl p-6 sm:p-8 space-y-6 select-none font-sans transition-transform origin-center ${className}`}
      style={{ transform: `scale(${scale})` }}
    >
      {/* Document Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-zinc-800">
        {cfg.show_logo && (
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-300 flex items-center justify-center font-black text-xl text-zinc-700 overflow-hidden shrink-0 shadow-xs">
            {institution.logo_url || institution.logo_data ? (
              <img src={institution.logo_url || institution.logo_data} alt="" className="w-full h-full object-cover" />
            ) : (
              institution.name?.charAt(0) || 'J'
            )}
          </div>
        )}

        <div className="text-center flex-1 space-y-0.5">
          {cfg.show_bismillah && (
            <div className="text-xs font-serif italic text-zinc-500">
              بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
            </div>
          )}
          <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-zinc-900" style={{ color: cfg.theme_color }}>
            {cfg.header_en}
          </h3>
          {cfg.header_bn && (
            <p className="text-sm font-semibold text-zinc-700">{cfg.header_bn}</p>
          )}
          <p className="text-[11px] text-zinc-600">
            {institution.address || 'Campus Street Address'}, {institution.district || 'District, Bangladesh'} • Tel: {institution.phone || '01700000000'} {institution.email ? `• ${institution.email}` : ''}
          </p>
        </div>

        <div className="text-right shrink-0 text-[10px] font-mono text-zinc-500 border border-zinc-200 rounded-xl p-2.5 bg-zinc-50">
          <div>EIIN / REG: <strong>{institution.eiin_or_reg_no || 'REG-102938'}</strong></div>
          <div>TYPE: <strong>{institution.institution_type || 'MADRASA'}</strong></div>
          <div>SESSION: <strong>2026</strong></div>
        </div>
      </div>

      {/* Dual Copy Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
        {renderVoucherCopy('Institutional Copy', 'text-sky-700 bg-sky-100 border border-sky-200')}
        {renderVoucherCopy('Student / Guardian Copy', 'text-emerald-700 bg-emerald-100 border border-emerald-200')}
      </div>
    </div>
  );
}
