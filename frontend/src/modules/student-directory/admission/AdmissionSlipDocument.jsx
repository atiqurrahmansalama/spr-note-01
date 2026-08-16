import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTenant } from "../../../context/TenantContext";

export default function AdmissionSlipDocument({ student, onClose }) {
  const { currentInstitution } = useTenant();
  if (!student) return null;

  const instName = student.institution_name || currentInstitution?.name || "DARUL ULOOM ISLAMIA";
  const instBanglaName = currentInstitution?.bangla_name || "";
  const instAddress = currentInstitution?.address || "Bismillah Road, Sector 10, Uttara, Dhaka";
  const instPhone = currentInstitution?.phone || "01799999999";

  const qrValue = `${window.location.origin}/verify-admission/${student.uniq_id || student.id}`;

  const renderHalf = (title, subtitle) => (
    <div className="w-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-6 rounded-2xl bg-white text-zinc-900 flex flex-col justify-between min-h-[480px]">
      <div>
        {/* Header */}
        <div className="text-center space-y-1 relative mb-4">
          <div className="text-xs font-serif font-semibold italic text-zinc-500">Bismillahir Rahmanir Rahim</div>
          <h2 className="text-lg font-extrabold tracking-tight uppercase">{instName}</h2>
          <p className="text-[10px] text-zinc-500 font-medium">{instAddress} | Contact: {instPhone}</p>
          <div className="absolute right-0 top-0 flex flex-col items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-[9px] font-bold uppercase tracking-wider text-zinc-700">
              {title}
            </span>
            {subtitle && <span className="text-[8px] font-bold text-zinc-400">{subtitle}</span>}
          </div>
        </div>

        {/* Content Body Grid */}
        <div className="grid grid-cols-4 gap-4 items-start pt-3 border-t border-zinc-200">
          {/* Photo & QR */}
          <div className="col-span-1 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-lg bg-zinc-100 border border-zinc-300 flex items-center justify-center overflow-hidden">
              {student.photo ? (
                <img src={student.photo} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] text-zinc-400 font-bold">No Photo</span>
              )}
            </div>
            <div className="p-1.5 border border-zinc-200 rounded-lg bg-white">
              <QRCodeSVG value={qrValue} size={64} level="M" />
            </div>
          </div>

          {/* Details Table */}
          <div className="col-span-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Student Name</span>
              <span className="font-bold text-zinc-800">{student.name_en || student.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Bangla Name</span>
              <span className="font-semibold text-zinc-800">{student.bangla_name || "--"}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Student ID / Roll</span>
              <span className="font-mono font-bold text-zinc-800">{student.uniq_id} {student.roll_number ? `(Roll: #${student.roll_number})` : ""}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Class / Group</span>
              <span className="font-bold text-sky-600">{student.education_status || "Standard Program"} / {student.group_name || "General Group"}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Guardian Name</span>
              <span className="font-semibold text-zinc-800">{student.guardian_detail?.primary_guardian_name || student.guardian_name || "--"}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Guardian Phone</span>
              <span className="font-bold text-zinc-800">{student.guardian_detail?.primary_guardian_phone || student.guardian_phone || "--"}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Address</span>
              <span className="font-medium text-zinc-700 leading-relaxed">
                {student.present_address 
                  ? `${student.present_address.street_address || ""}, ${student.present_address.thana_or_upazila || ""}, ${student.present_address.district || ""}`
                  : "No address registered."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-6 pt-6 border-t border-zinc-200 text-center text-[10px] font-bold text-zinc-500 mt-6">
        <div className="border-t border-zinc-300 pt-1.5">Admission Officer</div>
        <div className="border-t border-zinc-300 pt-1.5">Guardian Signature</div>
        <div className="border-t border-zinc-300 pt-1.5">Principal / Muhtamim</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/75 backdrop-blur-sm p-4 md:p-8 flex justify-center items-start">
      <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 print:p-0 print:border-0 print:bg-white print:shadow-none">
        
        {/* Actions Bar */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4 print:hidden">
          <div>
            <h3 className="font-bold text-base text-white">Print Preview: Official Admission Slip</h3>
            <p className="text-xs text-zinc-400 mt-0.5">A4 Portrait format with dual copies</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-md cursor-pointer transition-all"
            >
              Print Document
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>

        {/* Print slip content */}
        <div className="w-full flex flex-col gap-8 print:gap-4 font-sans select-none">
          {/* Top Half: Office Copy */}
          {renderHalf("Office Copy", "Institutional Copy")}

          {/* Dotted Cut Line */}
          <div className="w-full flex items-center justify-between gap-4 text-zinc-500 dark:text-zinc-600 text-xs font-mono select-none py-1 print:py-2">
            <span className="flex-1 border-t border-dashed border-zinc-400 dark:border-zinc-600" />
            <span>Cut Line / Tear Off</span>
            <span className="flex-1 border-t border-dashed border-zinc-400 dark:border-zinc-600" />
          </div>

          {/* Bottom Half: Student Copy */}
          {renderHalf("Student Copy", "Student / Guardian Copy")}
        </div>
      </div>
    </div>
  );
}
