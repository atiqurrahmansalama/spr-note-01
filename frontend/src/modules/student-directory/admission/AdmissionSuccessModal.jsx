import React, { useState } from "react";
import AdmissionSlipDocument from "./AdmissionSlipDocument";

export default function AdmissionSuccessModal({ student, onReset, onClose }) {
  const [showPrintSlip, setShowPrintSlip] = useState(false);

  if (!student) return null;

  const handlePrint = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.write(`
      <html>
        <head>
          <title>Admission Slip - ${student.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
            .slip { border: 1px solid #e5e7eb; padding: 30px; border-radius: 16px; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .title { text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 15px; margin-bottom: 20px; }
            .title h2 { margin: 0; font-size: 20px; color: #111827; }
            .title p { margin: 5px 0 0 0; font-size: 12px; color: #6b7280; }
            .field-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
            .field-label { font-weight: 600; color: #4b5563; }
            .field-val { text-align: right; color: #111827; }
            .footer { text-align: center; margin-top: 25px; font-size: 11px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="slip">
            <div class="title">
              <h2>Student Admission Slip</h2>
              <p>Suffah Hifz Management System</p>
            </div>
            <div class="field-row"><span class="field-label">Student Name:</span><span class="field-val">${student.name || ""}</span></div>
            ${student.bangla_name ? `<div class="field-row"><span class="field-label">Native Name:</span><span class="field-val">${student.bangla_name}</span></div>` : ''}
            <div class="field-row"><span class="field-label">Student ID:</span><span class="field-val">${student.student_id_card_number || student.uniq_id || ""}</span></div>
            <div class="field-row"><span class="field-label">Class / Group:</span><span class="field-val">${student.group_name || "General Group"}</span></div>
            <div class="field-row"><span class="field-label">Admission Mode:</span><span class="field-val">${student.admission_mode || "QUICK"}</span></div>
            <div class="field-row"><span class="field-label">Gender:</span><span class="field-val">${student.gender || "MALE"}</span></div>
            <div class="field-row"><span class="field-label">Guardian Phone:</span><span class="field-val">${student.guardian_detail?.primary_guardian_phone || "-"}</span></div>
            <div class="footer">Thank you for registering. Keep this receipt for reference.</div>
          </div>
        </body>
      </html>
    `);
    doc.close();
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  };

  return (
    <div className="text-center py-6 space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold theme-text-primary">Admission Successful!</h3>
        <p className="text-xs theme-text-secondary">
          Student has been enrolled and profile record is successfully registered in the directory.
        </p>
      </div>

      {/* ID Badge Preview */}
      <div className="max-w-xs mx-auto border theme-border rounded-2xl p-4 theme-bg-sub shadow-sm space-y-3">
        <div className="text-left">
          <span className="text-[9px] font-mono uppercase tracking-wider theme-accent font-bold">
            Student Badge
          </span>
          <h4 className="text-sm font-bold theme-text-primary truncate">{student.name}</h4>
          <p className="text-xs font-mono theme-text-secondary mt-1">
            ID: {student.student_id_card_number || student.uniq_id}
          </p>
          <p className="text-[11px] theme-text-secondary mt-0.5">
            Class: {student.group_name || "General Group"}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 max-w-xs mx-auto pt-4">
        <button
          type="button"
          onClick={() => setShowPrintSlip(true)}
          className="w-full py-2.5 text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 rounded-xl transition cursor-pointer"
        >
          Print Admission Slip / Profile Card
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full py-2 text-xs font-semibold theme-bg-sub theme-text-primary hover:theme-bg-sub-hover rounded-xl border theme-border transition cursor-pointer"
        >
          Admit Another Student
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-xs font-medium theme-text-secondary hover:theme-text-primary transition cursor-pointer"
        >
          View in Student Directory
        </button>
      </div>

      {showPrintSlip && (
        <AdmissionSlipDocument student={student} onClose={() => setShowPrintSlip(false)} />
      )}
    </div>
  );
}
