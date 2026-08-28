import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * Barcode Vector Generator component
 */
function SimpleBarcode({ code = 'STU-1001', height = 24, className = '' }) {
  // Generate deterministic bar widths from string hash
  const bars = [];
  let sum = 0;
  for (let i = 0; i < code.length; i++) {
    sum += code.charCodeAt(i);
  }
  for (let i = 0; i < 36; i++) {
    const isThick = ((sum + i * 7) % 3 === 0);
    const isSpace = ((sum + i * 11) % 5 === 0);
    bars.push({ isThick, isSpace });
  }

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div className="flex items-end gap-[1.5px]" style={{ height: `${height}px` }}>
        {bars.map((bar, idx) => (
          <div
            key={idx}
            className={`h-full ${bar.isSpace ? 'w-[1.5px] bg-transparent' : bar.isThick ? 'w-[2.5px] bg-current' : 'w-[1px] bg-current'}`}
          />
        ))}
      </div>
      <span className="text-[8px] font-mono tracking-widest mt-0.5 opacity-80">{code}</span>
    </div>
  );
}

/**
 * Enterprise CR80 ID Card Renderer
 * Standard physical card size: 54mm x 85.6mm (ratio approx 1 : 1.585)
 */
export default function IdCardRenderer({
  student = {},
  institution = {},
  layoutConfig = {},
  orientation = 'PORTRAIT',
  side = 'front', // 'front' | 'back' | 'both'
  scale = 1,
  isOverlayMode = false,
  className = '',
}) {
  const cfg = {
    theme_color: layoutConfig.theme_color || '#064e3b',
    accent_color: layoutConfig.accent_color || '#10b981',
    text_color: layoutConfig.text_color || '#ffffff',
    bg_style: layoutConfig.bg_style || 'GRADIENT',
    overlay_only_mode: layoutConfig.overlay_only_mode || isOverlayMode,
    photo_frame_style: layoutConfig.photo_frame_style || 'ROUNDED',
    show_bismillah: layoutConfig.show_bismillah !== false,
    show_logo: layoutConfig.show_logo !== false,
    show_qr_code: layoutConfig.show_qr_code !== false,
    show_barcode: layoutConfig.show_barcode !== false,
    show_blood_group: layoutConfig.show_blood_group !== false,
    show_guardian_contact: layoutConfig.show_guardian_contact !== false,
    show_dob: layoutConfig.show_dob !== false,
    show_district: layoutConfig.show_district !== false,
    show_student_id: layoutConfig.show_student_id !== false,
    show_department: layoutConfig.show_department !== false,
    show_class: layoutConfig.show_class !== false,
    show_group: layoutConfig.show_group !== false,
    header_bn: layoutConfig.header_bn || institution.bangla_name || '',
    header_en: layoutConfig.header_en || institution.name || 'ACADEMIC INSTITUTION',
    back_terms: layoutConfig.back_terms || 'This identity card is property of the institution. If found, please return to campus office.',
    signature_title: layoutConfig.signature_title || 'Principal / Muhtamim',
    signature_url: layoutConfig.signature_url || null,
    emergency_contact: layoutConfig.emergency_contact || institution.phone || '01700000000',
    field_order: layoutConfig.field_order || [
      'student_name',
      'student_id',
      'department',
      'class',
      'group',
      'blood_group',
      'guardian_phone',
    ],
  };

  const isLandscape = orientation === 'LANDSCAPE';
  const overlay = cfg.overlay_only_mode;

  // CR80 dimensions in pixels (ratio 54mm x 85.6mm)
  // Portrait: 260px wide x 412px high
  // Landscape: 412px wide x 260px high
  const cardWidth = isLandscape ? 412 : 260;
  const cardHeight = isLandscape ? 260 : 412;

  const qrValue = student.uniq_id
    ? `${window.location.origin}/verify/student/${encodeURIComponent(student.uniq_id)}`
    : `STU-VERIFY-${student.id || '2026-001'}`;

  const studentIdNumber = student.student_id_card_number || student.uniq_id || `STU-${student.id || '2026-0042'}`;
  const studentPhoto = student.profile_image || student.photo_url || null;

  // Background styling logic
  const getBackgroundStyle = () => {
    if (overlay) {
      return {
        backgroundColor: 'transparent',
        border: '1.5px dashed #94a3b8',
        color: '#0f172a',
      };
    }
    if (cfg.bg_style === 'CLEAN_WHITE') {
      return {
        backgroundColor: '#ffffff',
        color: '#0f172a',
        border: `1px solid ${cfg.accent_color}40`,
      };
    }
    if (cfg.bg_style === 'SOLID') {
      return {
        backgroundColor: cfg.theme_color,
        color: cfg.text_color,
      };
    }
    // Default GRADIENT
    return {
      background: `linear-gradient(145deg, ${cfg.theme_color} 0%, #0f172a 100%)`,
      color: cfg.text_color,
    };
  };

  const photoFrameClass = () => {
    switch (cfg.photo_frame_style) {
      case 'CIRCLE':
        return 'rounded-full';
      case 'SQUARE_SHADOW':
        return 'rounded-lg shadow-lg';
      case 'SQUARE':
        return 'rounded-none';
      case 'ROUNDED':
      default:
        return 'rounded-2xl';
    }
  };

  const renderFront = () => (
    <div
      className="relative flex flex-col justify-between p-3.5 select-none overflow-hidden shrink-0 shadow-xl"
      style={{
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        borderRadius: overlay ? '8px' : '16px',
        ...getBackgroundStyle(),
      }}
    >
      {/* Decorative modern ambient glow (if not overlay mode) */}
      {!overlay && (
        <>
          <div
            className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40"
            style={{ backgroundColor: cfg.accent_color }}
          />
          <div
            className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-20"
            style={{ backgroundColor: cfg.theme_color }}
          />
        </>
      )}

      {/* Top Header */}
      <div>
        {cfg.show_bismillah && !overlay && (
          <div className="text-[8px] font-serif italic text-center opacity-75 mb-0.5 tracking-wider">
            بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
          </div>
        )}

        <div className={`flex items-center gap-2 pb-2 ${!overlay ? 'border-b border-white/15' : 'border-b border-slate-300'}`}>
          {cfg.show_logo && !overlay && (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs overflow-hidden shrink-0 shadow-xs border border-white/20"
              style={{ backgroundColor: `${cfg.accent_color}25`, color: cfg.accent_color }}
            >
              {institution.logo_url || institution.logo_data ? (
                <img src={institution.logo_url || institution.logo_data} alt="" className="w-full h-full object-cover" />
              ) : (
                institution.name?.charAt(0) || 'J'
              )}
            </div>
          )}

          <div className="flex-1 text-center min-w-0">
            <h3 className={`text-[11px] font-black uppercase tracking-tight truncate leading-tight ${overlay ? 'text-slate-800' : ''}`}>
              {cfg.header_en}
            </h3>
            {cfg.header_bn && (
              <p className={`text-[9px] font-semibold truncate leading-tight opacity-90 ${overlay ? 'text-slate-600' : ''}`}>
                {cfg.header_bn}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Body (Portrait vs Landscape Layout) */}
      {isLandscape ? (
        <div className="grid grid-cols-12 gap-3 items-center my-auto">
          {/* Photo & Badge */}
          <div className="col-span-4 flex flex-col items-center">
            <div
              className={`w-20 h-24 overflow-hidden border-2 flex items-center justify-center font-bold text-lg bg-black/20 ${photoFrameClass()}`}
              style={{ borderColor: cfg.accent_color }}
            >
              {studentPhoto ? (
                <img src={studentPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="opacity-60">{student.name?.charAt(0) || 'S'}</span>
              )}
            </div>
            {cfg.show_blood_group && student.blood_group && (
              <span
                className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border"
                style={{
                  backgroundColor: `${cfg.accent_color}25`,
                  color: overlay ? '#b91c1c' : cfg.accent_color,
                  borderColor: `${cfg.accent_color}60`,
                }}
              >
                {student.blood_group}
              </span>
            )}
          </div>

          {/* Details Column */}
          <div className="col-span-8 space-y-1 text-[10px]">
            <div>
              <h4 className="text-xs font-black truncate leading-snug">
                {student.name || 'Ahmad Abdullah'}
              </h4>
              {student.bangla_name && (
                <p className="text-[9px] opacity-80 truncate">{student.bangla_name}</p>
              )}
            </div>

            <div className="space-y-0.5 pt-0.5">
              {cfg.show_student_id && (
                <div className="flex justify-between border-b border-current/10 pb-0.5">
                  <span className="opacity-65 text-[9px]">ID No:</span>
                  <strong className="font-mono text-[9.5px]">{studentIdNumber}</strong>
                </div>
              )}
              {cfg.show_department && (
                <div className="flex justify-between border-b border-current/10 pb-0.5">
                  <span className="opacity-65 text-[9px]">Dept:</span>
                  <span className="font-semibold truncate max-w-[130px]">{student.department_name || student.department || 'Hifz'}</span>
                </div>
              )}
              {cfg.show_class && (
                <div className="flex justify-between border-b border-current/10 pb-0.5">
                  <span className="opacity-65 text-[9px]">Class:</span>
                  <span className="font-semibold truncate max-w-[130px]">{student.student_class_name || student.student_class || 'Standard'}</span>
                </div>
              )}
              {cfg.show_guardian_contact && (
                <div className="flex justify-between">
                  <span className="opacity-65 text-[9px]">Emergency:</span>
                  <strong className="font-mono text-[9px]">{student.guardian_phone || student.phone_number || cfg.emergency_contact}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Portrait Middle */
        <div className="flex flex-col items-center my-auto space-y-2">
          {/* Avatar Photo */}
          <div className="relative">
            <div
              className={`w-20 h-22 overflow-hidden border-2 flex items-center justify-center font-bold text-xl bg-black/20 ${photoFrameClass()}`}
              style={{ borderColor: cfg.accent_color }}
            >
              {studentPhoto ? (
                <img src={studentPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="opacity-60">{student.name?.charAt(0) || 'S'}</span>
              )}
            </div>

            {cfg.show_blood_group && student.blood_group && (
              <span
                className="absolute -bottom-1.5 -right-2 px-1.5 py-0.2 rounded-md text-[8px] font-black tracking-wider uppercase border shadow-sm"
                style={{
                  backgroundColor: overlay ? '#ffffff' : cfg.accent_color,
                  color: overlay ? '#dc2626' : '#ffffff',
                  borderColor: `${cfg.accent_color}80`,
                }}
              >
                {student.blood_group}
              </span>
            )}
          </div>

          {/* Student Names */}
          <div className="text-center w-full px-1">
            <h4 className="text-[11.5px] font-black truncate leading-snug">
              {student.name || 'Ahmad Abdullah'}
            </h4>
            {student.bangla_name && (
              <p className="text-[9px] opacity-80 truncate">{student.bangla_name}</p>
            )}
            {cfg.show_student_id && (
              <div
                className="inline-block mt-0.5 px-2 py-0.2 rounded text-[8.5px] font-mono font-bold uppercase tracking-wider border"
                style={{
                  backgroundColor: `${cfg.accent_color}20`,
                  color: overlay ? '#0f172a' : cfg.accent_color,
                  borderColor: `${cfg.accent_color}40`,
                }}
              >
                {studentIdNumber}
              </div>
            )}
          </div>

          {/* Metadata Table */}
          <div className="w-full space-y-0.5 text-[9.5px] px-1 pt-1 border-t border-current/10">
            {cfg.show_department && (
              <div className="flex justify-between">
                <span className="opacity-65 text-[8.5px]">Dept:</span>
                <span className="font-semibold truncate max-w-[150px]">{student.department_name || student.department || 'Hifzul Quran'}</span>
              </div>
            )}
            {cfg.show_class && (
              <div className="flex justify-between">
                <span className="opacity-65 text-[8.5px]">Class:</span>
                <span className="font-semibold truncate max-w-[150px]">{student.student_class_name || student.student_class || 'Standard Hifz'}</span>
              </div>
            )}
            {cfg.show_group && (student.student_group_name || student.student_group) && (
              <div className="flex justify-between">
                <span className="opacity-65 text-[8.5px]">Group:</span>
                <span className="font-semibold truncate max-w-[150px]">{student.student_group_name || student.student_group}</span>
              </div>
            )}
            {cfg.show_guardian_contact && (
              <div className="flex justify-between">
                <span className="opacity-65 text-[8.5px]">Guardian:</span>
                <strong className="font-mono text-[8.5px]">{student.guardian_phone || cfg.emergency_contact}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Footer: Barcode / QR / Signature */}
      <div className={`pt-1.5 flex items-end justify-between ${!overlay ? 'border-t border-white/15' : 'border-t border-slate-300'}`}>
        {cfg.show_barcode ? (
          <SimpleBarcode code={studentIdNumber} height={18} />
        ) : (
          <div className="text-[7.5px] opacity-70 font-mono">
            EXP: 2026-2027
          </div>
        )}

        <div className="text-right">
          {cfg.signature_url ? (
            <img src={cfg.signature_url} alt="" className="h-5 max-w-[60px] object-contain ml-auto opacity-90" />
          ) : (
            <div className="w-14 border-b border-current opacity-40 mb-0.5 ml-auto" />
          )}
          <span className="text-[7.5px] font-bold opacity-80 uppercase tracking-tighter block">
            {cfg.signature_title}
          </span>
        </div>
      </div>
    </div>
  );

  const renderBack = () => (
    <div
      className="relative flex flex-col justify-between p-3.5 select-none overflow-hidden shrink-0 shadow-xl"
      style={{
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        borderRadius: overlay ? '8px' : '16px',
        ...getBackgroundStyle(),
      }}
    >
      {/* Top Header of Back */}
      <div className={`text-center pb-1.5 ${!overlay ? 'border-b border-white/15' : 'border-b border-slate-300'}`}>
        <h4 className="text-[10px] font-black uppercase tracking-wider">
          Institutional Security & Notice
        </h4>
      </div>

      {/* Middle Terms & Conditions */}
      <div className="space-y-2 my-auto px-1">
        <p className="text-[8.5px] leading-relaxed text-justify opacity-85">
          {cfg.back_terms}
        </p>

        <div className="p-2 rounded-xl bg-black/15 border border-current/10 space-y-1 text-[8.5px]">
          <div className="flex justify-between">
            <span className="opacity-70">Helpline:</span>
            <strong className="font-mono">{cfg.emergency_contact}</strong>
          </div>
          <div className="flex justify-between">
            <span className="opacity-70">Campus:</span>
            <span className="truncate max-w-[140px] font-medium">{institution.district || 'Dhaka, Bangladesh'}</span>
          </div>
        </div>

        {/* Dynamic QR Code */}
        {cfg.show_qr_code && (
          <div className="flex items-center justify-center gap-3 pt-1">
            <div className="p-1 rounded-lg bg-white shadow-xs">
              <QRCodeSVG value={qrValue} size={48} level="M" />
            </div>
            <div className="text-left text-[7.5px] opacity-80 space-y-0.5">
              <div className="font-bold">Scan to Verify</div>
              <div className="font-mono">{studentIdNumber}</div>
              <div>Official Academic Seal</div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Authority Seal */}
      <div className={`pt-1.5 flex justify-between items-center text-[7.5px] opacity-75 font-semibold ${!overlay ? 'border-t border-white/15' : 'border-t border-slate-300'}`}>
        <span>Card Issue Date: 2026</span>
        <span>Valid for Active Session</span>
      </div>
    </div>
  );

  return (
    <div
      className={`inline-flex gap-4 items-center justify-center transition-transform origin-center ${className}`}
      style={{ transform: `scale(${scale})` }}
    >
      {(side === 'front' || side === 'both') && renderFront()}
      {(side === 'back' || side === 'both') && renderBack()}
    </div>
  );
}
