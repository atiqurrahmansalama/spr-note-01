import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/i18n/useTranslation';
import { auth as authStore } from '@/utils/localStore';
import { verifyPublicStaffToken } from '@/api/staffOnboarding';
import { PublicPortalShell } from '@/components/layout';
import {
  GoogleSignInButton,
  PortalInputField,
  extractAuthErrorMessage,
  isValidEmailAddress,
  isValidPhoneNumber,
} from '@/components/auth';
import { QuickStaffOnboardingForm } from './QuickStaffOnboardingForm';
import { StaffOnboardingWizard } from './StaffOnboardingWizard';
import { useStaffTranslation } from '../locales';
import {
  buildCandidateInitialData,
  splitCandidateFullName,
} from './utils/candidateIdentity';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  LockClosedIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SpinnerIcon,
  TeacherIcon,
  UserCheckIcon,
  UserIcon,
} from '@/components/ui/Icons';

export const PublicStaffOnboardingView: React.FC = () => {
  const { user: authUser, isAuthenticated: ctxAuthenticated, login, register } = useAuth() as {
    user: any;
    isAuthenticated: boolean;
    login: (
      usernameOrEmail: string,
      password: string
    ) => Promise<{ success: boolean; error?: string; user?: any }>;
    register: (payload: {
      email: string;
      phone_number: string;
      password: string;
      first_name: string;
      last_name: string;
    }) => Promise<{ success: boolean; data?: any; errors?: unknown }>;
  };
  const { showToast } = useToast();
  const { t, formatDate, formatNumber } = useStaffTranslation();
  const { t: tAuth } = useTranslation('auth');

  // Helper scoping keys cleanly inside registered 'staffManagement.publicPortal'
  const tp = useCallback(
    (key: string, defaultText: string, params?: Record<string, string | number>) =>
      t(`staffManagement.publicPortal.${key}`, defaultText, params),
    [t]
  );

  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [tokenMeta, setTokenMeta] = useState<any>(null);
  const [tokenError, setTokenError] = useState('');

  // Authentication gate state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [touched, setTouched] = useState<{
    name: boolean;
    phone: boolean;
    email: boolean;
    password: boolean;
  }>({
    name: false,
    phone: false,
    email: false,
    password: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [submittedReceipt, setSubmittedReceipt] = useState<any>(null);

  const isAuthenticated = Boolean(ctxAuthenticated || authStore.isLoggedIn());
  const activeUser = authUser || authStore.getUser();

  const candidateInitialData = useMemo(
    () => buildCandidateInitialData(activeUser),
    [activeUser]
  );

  // Load & verify public invitation token metadata
  useEffect(() => {
    if (!token) {
      setTokenError(
        tp(
          'noTokenError',
          'No onboarding token provided. Please scan a valid QR code or use an official invitation link.'
        )
      );
      setLoading(false);
      return;
    }

    let isCancelled = false;
    const verify = async () => {
      setLoading(true);
      setTokenError('');
      try {
        const meta = await verifyPublicStaffToken(token);
        if (!isCancelled) {
          setTokenMeta(meta);
          if (meta?.candidate_application) {
            const app = meta.candidate_application;
            if (app.lifecycle_level === 2 || app.lifecycle_level === 3) {
              setSubmittedReceipt({
                status: app.status.toLowerCase(),
                approval_status: app.status,
                tracking_code: app.tracking_code,
                staff: app.staff,
                lifecycle_level: app.lifecycle_level,
              });
            } else if (app.lifecycle_level === 4) {
              setSubmittedReceipt({
                status: 'rejected',
                approval_status: 'REJECTED',
                tracking_code: app.tracking_code,
                rejection_reason: app.rejection_reason,
                lifecycle_level: 4,
              });
            } else {
              setSubmittedReceipt(null);
            }
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setTokenError(
            err?.message ||
              tp('invalidTokenFallback', 'Invalid or expired staff invitation link.')
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    verify();
    return () => {
      isCancelled = true;
    };
  }, [token, isAuthenticated, tp]);

  // Deferred validation errors (shown strictly after blur or failed submit)
  const nameError =
    authMode === 'register' && !authName.trim()
      ? tp('fieldRequiredError', 'Please fill in this required field.')
      : null;

  const phoneError =
    authMode === 'register'
      ? !authPhone.trim()
        ? tp('fieldRequiredError', 'Please fill in this required field.')
        : !isValidPhoneNumber(authPhone)
          ? tp('invalidPhoneError', 'Please enter a valid mobile phone number.')
          : null
      : null;

  const emailError = !authEmail.trim()
    ? tp('fieldRequiredError', 'Please fill in this required field.')
    : !isValidEmailAddress(authEmail)
      ? tp('invalidEmailError', 'Enter an email address in the format you@example.com.')
      : null;

  const passwordError = !authPassword
    ? tp('fieldRequiredError', 'Please fill in this required field.')
    : authMode === 'register' && authPassword.length < 8
      ? tp('passwordLengthError', 'Password must be at least 8 characters.')
      : null;

  const switchAuthMode = (nextMode: 'login' | 'register') => {
    setAuthMode(nextMode);
    setAuthError('');
    setSubmitAttempted(false);
    setTouched({ name: false, phone: false, email: false, password: false });
  };

  // Email / Registration Submit Handler wired cleanly to AuthContext
  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setAuthError('');

    if (authMode === 'register' && nameError) {
      nameInputRef.current?.focus();
      return;
    }
    if (authMode === 'register' && phoneError) {
      phoneInputRef.current?.focus();
      return;
    }
    if (emailError) {
      emailInputRef.current?.focus();
      return;
    }
    if (passwordError) {
      passwordInputRef.current?.focus();
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const res = await login(authEmail.trim(), authPassword);
        if (res.success) {
          showToast(
            tp('loginSuccess', 'Authenticated successfully. You may now complete onboarding.'),
            'success'
          );
          try {
            const updatedMeta = await verifyPublicStaffToken(token);
            setTokenMeta(updatedMeta);
            if (updatedMeta?.candidate_application) {
              const app = updatedMeta.candidate_application;
              if (app.lifecycle_level === 2 || app.lifecycle_level === 3) {
                setSubmittedReceipt({
                  status: app.status.toLowerCase(),
                  approval_status: app.status,
                  tracking_code: app.tracking_code,
                  staff: app.staff,
                  lifecycle_level: app.lifecycle_level,
                });
              } else if (app.lifecycle_level === 4) {
                setSubmittedReceipt({
                  status: 'rejected',
                  approval_status: 'REJECTED',
                  tracking_code: app.tracking_code,
                  rejection_reason: app.rejection_reason,
                  lifecycle_level: 4,
                });
              }
            }
          } catch {
            // fallback
          }
        } else {
          const msg =
            res.error ||
            tp('authFailed', 'Authentication failed. Please check your credentials and try again.');
          setAuthError(msg);
          showToast(msg, 'error');
        }
      } else {
        const { firstName, lastName } = splitCandidateFullName(authName);
        const regRes = await register({
          email: authEmail.trim(),
          phone_number: authPhone.trim(),
          password: authPassword,
          first_name: firstName,
          last_name: lastName,
        });

        if (!regRes.success) {
          const msg = extractAuthErrorMessage(
            regRes.errors,
            tp('registrationFailed', 'Registration failed. Please verify your details.')
          );
          setAuthError(msg);
          showToast(msg, 'error');
          return;
        }

        // RegisterView does not issue JWT pairs directly; authenticate immediately so JWT is present
        const loginRes = await login(authEmail.trim(), authPassword);
        if (loginRes.success) {
          showToast(
            tp('registerSuccess', 'Account created and authenticated successfully.'),
            'success'
          );
          try {
            const updatedMeta = await verifyPublicStaffToken(token);
            setTokenMeta(updatedMeta);
          } catch {
            // fallback
          }
        } else {
          const msg =
            loginRes.error ||
            tp('authFailed', 'Authentication failed. Please check your credentials and try again.');
          setAuthError(msg);
          showToast(msg, 'error');
        }
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCopyReceipt = () => {
    if (!submittedReceipt) return;
    const staff = submittedReceipt.staff || submittedReceipt;
    const isPending =
      submittedReceipt.status === 'pending' ||
      submittedReceipt.approval_status === 'PENDING' ||
      Boolean(staff.is_pending_review);

    const candidateName =
      staff.name ||
      staff.name_en ||
      submittedReceipt.applicant_name ||
      staff.applicant_name ||
      '';
    const employeeIdOrRef =
      staff.employee_id || staff.tracking_code || submittedReceipt.tracking_code || '';
    const designation = staff.designation || tokenMeta?.designation || 'Staff';
    const departmentName = staff.department_name || tokenMeta?.department_name || '';
    const staffCategory = staff.staff_type || tokenMeta?.staff_type || 'Faculty';
    const formattedJoiningDate = formatDate(staff.joining_date || new Date());
    const institutionLabel =
      tokenMeta?.institution_name ||
      staff.institution_name ||
      tp('academicInstitutionFallback', 'Academic Institution');

    const lines = [
      isPending
        ? tp('applicationSubmittedBadge', 'Staff Onboarding Application Receipt')
        : tp('receiptBadge', 'Staff Onboarding Confirmation Receipt'),
      `Candidate: ${candidateName || 'N/A'}`,
      `${isPending ? tp('applicationRef', 'Application Reference') : tp('officialEmployeeId', 'Employee ID')}: ${employeeIdOrRef || 'N/A'}`,
      `Designation: ${designation}`,
      departmentName ? `Department: ${departmentName}` : null,
      `Staff Category: ${staffCategory}`,
      `Joining Date: ${formattedJoiningDate}`,
      `Institution: ${institutionLabel}`,
      `Status: ${isPending ? tp('pendingReview', 'Pending Review') : tp('activeRegistered', 'Active Registered')}`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(lines);
    showToast(tp('copiedReceiptToast', 'Onboarding receipt copied to clipboard'), 'success');
  };

  const handlePrintSlip = () => {
    const cardEl = document.getElementById('onboarding-slip-printable-card');
    if (!cardEl) {
      window.print();
      return;
    }

    const staff = submittedReceipt?.staff || submittedReceipt || {};
    const isPending =
      submittedReceipt?.status === 'pending' ||
      submittedReceipt?.approval_status === 'PENDING' ||
      Boolean(staff.is_pending_review);

    const candidateName =
      staff.name ||
      staff.name_en ||
      submittedReceipt?.applicant_name ||
      staff.applicant_name ||
      '';
    const candidateBnName = staff.bangla_name || '';
    const employeeIdOrRef =
      staff.employee_id || staff.tracking_code || submittedReceipt?.tracking_code || '';
    const designation = staff.designation || tokenMeta?.designation || 'Staff';
    const departmentName = staff.department_name || tokenMeta?.department_name || '';
    const staffCategory = staff.staff_type || tokenMeta?.staff_type || 'Faculty';
    const formattedJoiningDate = formatDate(staff.joining_date || new Date());
    const hasCustomRank = Boolean(
      (staff.rank_order && staff.rank_order !== 99) ||
      (tokenMeta?.rank_order && tokenMeta.rank_order !== 99)
    );
    const rankOrder = staff.rank_order || tokenMeta?.rank_order;
    const institutionLabel =
      tokenMeta?.institution_name ||
      staff.institution_name ||
      tp('academicInstitutionFallback', 'Academic Institution');
    const institutionAddress =
      tokenMeta?.institution_address || tokenMeta?.address || '';

    const qrSvg = cardEl.querySelector('svg')?.outerHTML || '';

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Application Slip - ${candidateName || 'Staff'}</title>
            <style>
              @page { size: auto; margin: 12mm; }
              * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                margin: 0;
                padding: 16px;
                display: flex;
                justify-content: center;
                align-items: center;
                background: #ffffff;
                color: #0f172a;
              }
              .slip-wrapper {
                width: 100%;
                max-width: 440px;
                margin: 0 auto;
                border: 1px solid #cbd5e1;
                border-radius: 20px;
                padding: 28px 24px;
                text-align: center;
                background: #ffffff;
              }
              .check-icon {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #f1f5f9;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 12px;
              }
              .check-icon svg {
                width: 28px;
                height: 28px;
                color: #10b981;
              }
              .slip-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 9999px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                background: #f1f5f9;
                color: #475569;
                margin-bottom: 10px;
              }
              .slip-title {
                font-size: 22px;
                font-weight: 800;
                color: #0f172a;
                margin: 0 0 4px 0;
                line-height: 1.25;
              }
              .slip-subtitle {
                font-size: 13px;
                font-weight: 600;
                color: #4338ca;
                margin: 0 0 2px 0;
              }
              .slip-address {
                font-size: 11px;
                color: #64748b;
                margin: 0 0 16px 0;
              }
              .slip-table {
                width: 100%;
                background: #f8fafc;
                border-radius: 14px;
                padding: 14px 16px;
                margin-bottom: 16px;
                text-align: left;
                font-size: 12px;
              }
              .slip-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                border-bottom: 1px solid #f1f5f9;
              }
              .slip-row:last-child {
                border-bottom: none;
              }
              .slip-label {
                color: #64748b;
                font-weight: 500;
              }
              .slip-val {
                color: #0f172a;
                font-weight: 700;
                text-align: right;
              }
              .slip-val-accent {
                color: #4338ca;
                font-family: monospace;
                font-weight: 800;
                font-size: 13px;
              }
              .slip-qr {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                margin-top: 10px;
                padding-top: 8px;
              }
              .slip-qr svg {
                max-width: 90px;
                max-height: 90px;
              }
              .slip-footer {
                margin-top: 14px;
                font-size: 10px;
                color: #94a3b8;
              }
            </style>
          </head>
          <body>
            <div class="slip-wrapper">
              <div class="check-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div>
                <div class="slip-badge">${isPending ? 'Application Submitted for Review' : 'Staff Profile Onboarded Successfully'}</div>
                <h1 class="slip-title">${candidateName || 'Candidate'}</h1>
                ${candidateBnName ? `<div style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 4px;">${candidateBnName}</div>` : ''}
                <div class="slip-subtitle">${institutionLabel}</div>
                ${institutionAddress ? `<div class="slip-address">${institutionAddress}</div>` : ''}
              </div>
              <div class="slip-table">
                <div class="slip-row">
                  <span class="slip-label">${isPending ? 'Application Reference' : 'Official Employee ID'}:</span>
                  <span class="slip-val slip-val-accent">${employeeIdOrRef || 'REGISTERED'}</span>
                </div>
                <div class="slip-row">
                  <span class="slip-label">Designation & Rank:</span>
                  <span class="slip-val">${designation} ${hasCustomRank ? `[${rankOrder}]` : ''}</span>
                </div>
                ${departmentName ? `
                <div class="slip-row">
                  <span class="slip-label">Department:</span>
                  <span class="slip-val">${departmentName}</span>
                </div>` : ''}
                <div class="slip-row">
                  <span class="slip-label">Staff Category:</span>
                  <span class="slip-val">${staffCategory}</span>
                </div>
                <div class="slip-row">
                  <span class="slip-label">Joining Date:</span>
                  <span class="slip-val">${formattedJoiningDate}</span>
                </div>
                <div class="slip-row">
                  <span class="slip-label">Status:</span>
                  <span class="slip-val" style="color: #4338ca;">${isPending ? 'Pending Review' : 'Active Registered'}</span>
                </div>
                <div class="slip-qr">
                  ${qrSvg}
                  <div style="font-size: 10px; font-family: monospace; color: #64748b; margin-top: 4px;">${employeeIdOrRef}</div>
                </div>
              </div>
              <div class="slip-footer">
                Official Institutional Onboarding Record • Generated on ${new Date().toLocaleDateString()}
              </div>
            </div>
          </body>
        </html>
      `);
      frameDoc.close();
      printFrame.contentWindow?.focus();
      setTimeout(() => {
        printFrame.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 1500);
      }, 300);
    }
  };

  const portalBrandName =
    tokenMeta?.institution_name || tp('facultyPortalBadge', 'Faculty Recruitment Portal');
  const portalBrandBadge =
    tokenMeta?.institution_address || tokenMeta?.address || '';

  // Render Loading Screen
  if (loading) {
    return (
      <PublicPortalShell
        brandName={portalBrandName}
        brandBadge={portalBrandBadge}
        brandIcon={TeacherIcon}
        maxWidth="md"
      >
        <div className="theme-bg-surface rounded-3xl shadow-2xl p-8 text-center space-y-4 border-0 ring-0">
          <SpinnerIcon className="w-8 h-8 theme-accent mx-auto" />
          <p className="text-xs sm:text-sm font-semibold theme-text-secondary">
            {tp('verifyingLink', 'Verifying Onboarding Invitation & Institute...')}
          </p>
        </div>
      </PublicPortalShell>
    );
  }

  // Render Token Error Screen
  if (tokenError) {
    return (
      <PublicPortalShell
        brandName={portalBrandName}
        brandBadge={portalBrandBadge}
        brandIcon={TeacherIcon}
        maxWidth="md"
      >
        <div className="p-6 sm:p-8 rounded-3xl theme-bg-surface shadow-2xl text-center space-y-4 animate-zoom-in border-0 ring-0">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner border-0">
            <AlertTriangleIcon className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-rose-500">
            {tp('invalidTitle', 'Invalid Onboarding Link')}
          </h1>
          <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">{tokenError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-2xl theme-bg-app text-xs font-bold theme-text-primary hover:theme-bg-elevated/40 transition cursor-pointer border-0 shadow-xs"
          >
            {tp('retryVerification', 'Retry Verification')}
          </button>
        </div>
      </PublicPortalShell>
    );
  }

  // Render Step: Rejected Status Screen (Level 4)
  if (
    submittedReceipt &&
    (submittedReceipt.status === 'rejected' ||
      submittedReceipt.approval_status === 'REJECTED' ||
      submittedReceipt.lifecycle_level === 4)
  ) {
    return (
      <PublicPortalShell
        brandName={portalBrandName}
        brandBadge={portalBrandBadge}
        brandIcon={TeacherIcon}
        maxWidth="lg"
      >
        <div className="rounded-3xl theme-bg-surface shadow-2xl p-6 sm:p-8 space-y-6 animate-zoom-in text-center border-0 ring-0">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner border-0">
            <AlertTriangleIcon className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border-0 inline-block shadow-xs">
              {tp('applicationRejectedBadge', 'Application Not Approved')}
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-2.5 theme-text-primary">
              {tp('applicationDeclinedTitle', 'Onboarding Application Declined')}
            </h1>
            <p className="text-xs sm:text-sm theme-text-secondary mt-1.5 leading-relaxed max-w-md mx-auto">
              {submittedReceipt.rejection_reason ||
                tp(
                  'applicationDeclinedNotice',
                  'Your onboarding application could not be approved by the institutional administration at this time.'
                )}
            </p>
          </div>
          <div className="p-4 rounded-2xl theme-bg-app text-xs text-start space-y-2 border-0 shadow-xs max-w-sm mx-auto">
            <div className="flex justify-between items-center">
              <span className="theme-text-secondary">{tp('referenceCode', 'Reference Code')}:</span>
              <span className="font-mono font-bold theme-text-primary">
                {submittedReceipt.tracking_code || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </PublicPortalShell>
    );
  }

  // Render Confirmation Receipt / Voucher (Level 2: Pending Review, Level 3: Approved)
  if (submittedReceipt) {
    const staff = submittedReceipt.staff || submittedReceipt;
    const isPending =
      submittedReceipt.status === 'pending' ||
      submittedReceipt.approval_status === 'PENDING' ||
      submittedReceipt.lifecycle_level === 2 ||
      Boolean(staff.is_pending_review);

    const isApproved =
      submittedReceipt.status === 'approved' ||
      submittedReceipt.approval_status === 'APPROVED' ||
      submittedReceipt.lifecycle_level === 3 ||
      (!isPending && Boolean(staff.employee_id && String(staff.employee_id).startsWith('STF-')));

    const candidateName =
      staff.name ||
      staff.name_en ||
      submittedReceipt.applicant_name ||
      staff.applicant_name ||
      activeUser?.name ||
      activeUser?.full_name ||
      tp('candidateFallback', 'Applicant');
    const candidateBnName = staff.bangla_name || activeUser?.name_bn || '';
    const employeeIdOrRef =
      staff.employee_id ||
      staff.tracking_code ||
      submittedReceipt.tracking_code ||
      submittedReceipt.employee_id ||
      (isPending ? 'PENDING' : 'REGISTERED');
    const designation = staff.designation || tokenMeta?.designation || 'Faculty Member';
    const departmentName = staff.department_name || tokenMeta?.department_name || '';
    const staffCategory = staff.staff_type || tokenMeta?.staff_type || 'Faculty';
    const formattedJoiningDate = formatDate(staff.joining_date || new Date());
    const hasCustomRank = Boolean(
      (staff.rank_order && staff.rank_order !== 99) ||
      (tokenMeta?.rank_order && tokenMeta.rank_order !== 99)
    );
    const rankOrder = staff.rank_order || tokenMeta?.rank_order;
    const institutionLabel =
      tokenMeta?.institution_name ||
      staff.institution_name ||
      submittedReceipt.institution_name ||
      tp('academicInstitutionFallback', 'Academic Institution');
    const institutionAddress =
      tokenMeta?.institution_address || tokenMeta?.address || staff.institution_address || '';

    return (
      <PublicPortalShell
        brandName={portalBrandName}
        brandBadge={portalBrandBadge}
        brandIcon={TeacherIcon}
        maxWidth="lg"
      >
        <div
          id="onboarding-slip-printable-card"
          className="rounded-3xl theme-bg-surface shadow-2xl p-6 sm:p-8 space-y-6 animate-zoom-in text-center border-0 ring-0"
        >
          {/* Circle wrapper: Theme background, icon green as requested */}
          <div className="w-16 h-16 rounded-3xl theme-bg-app flex items-center justify-center mx-auto shadow-xs border-0">
            <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
          </div>

          <div>
            {/* Status badge: Theme background & theme text */}
            <span className="px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider theme-bg-app theme-text-secondary border-0 inline-block shadow-xs">
              {isPending
                ? tp('applicationSubmittedBadge', 'Application Submitted for Review')
                : tp('receiptBadge', 'Staff Profile Onboarded Successfully')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2.5 theme-text-primary">
              {candidateName}
            </h1>
            {candidateBnName && (
              <p className="text-sm font-semibold theme-text-secondary mt-0.5">
                {candidateBnName}
              </p>
            )}
            <p className="text-xs font-bold theme-accent mt-1.5">
              {institutionLabel}
            </p>
            {institutionAddress && (
              <p className="text-[11px] theme-text-secondary mt-0.5">
                {institutionAddress}
              </p>
            )}
          </div>

          {/* Receipt Breakdown Card */}
          <div className="p-5 rounded-2xl theme-bg-app text-xs text-start space-y-3.5 border-0 shadow-xs">
            <div className="flex justify-between items-center pb-2.5 gap-3 border-b theme-border">
              <span className="theme-text-secondary">
                {isPending
                  ? tp('applicationRef', 'Application Reference')
                  : tp('officialEmployeeId', 'Official Employee ID')}:
              </span>
              <span className="font-mono font-black text-sm theme-accent">
                {employeeIdOrRef}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="theme-text-secondary">
                {tp('designationAndRank', 'Designation & Rank')}:
              </span>
              <span className="font-bold theme-text-primary text-end">
                {designation}{' '}
                {hasCustomRank ? `[${formatNumber(rankOrder)}]` : ''}
              </span>
            </div>
            {departmentName && (
              <div className="flex justify-between items-center gap-3">
                <span className="theme-text-secondary">
                  {tp('department', 'Department')}:
                </span>
                <span className="font-bold theme-text-primary text-end">
                  {departmentName}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center gap-3">
              <span className="theme-text-secondary">
                {tp('staffCategory', 'Staff Category')}:
              </span>
              <span className="font-bold theme-text-primary text-end">
                {staffCategory}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="theme-text-secondary">
                {tp('joiningDate', 'Joining Date')}:
              </span>
              <span className="font-bold theme-text-primary text-end">
                {formattedJoiningDate}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="theme-text-secondary">
                {tp('status', 'Status')}:
              </span>
              <span className="font-bold theme-accent text-end">
                {isPending
                  ? tp('pendingReview', 'Pending Review')
                  : tp('activeRegistered', 'Active Registered')}
              </span>
            </div>

            {/* QR Verification Badge */}
            <div className="flex flex-col items-center justify-center pt-2 gap-1.5 border-t theme-border">
              <div className="p-2 rounded-2xl bg-white shadow-xs inline-block">
                <QRCodeSVG
                  value={`${window.location.origin}/verify-staff/${employeeIdOrRef || staff.id}`}
                  size={96}
                  level="M"
                  includeMargin={false}
                  bgColor="#FFFFFF"
                  fgColor="#0F172A"
                />
              </div>
              <span className="text-[10px] theme-text-secondary font-mono tracking-wider">
                {employeeIdOrRef}
              </span>
            </div>
          </div>

          {/* Pending Review Guidance Note */}
          {isPending && (
            <p className="text-[11px] theme-text-secondary max-w-md mx-auto leading-relaxed">
              {tp(
                'pendingReviewNotice',
                'Your onboarding application has been submitted and is currently under administrative review. Please keep your Application Reference for future tracking.'
              )}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 border-0 no-print">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="w-full sm:flex-1 py-3 rounded-2xl theme-bg-accent font-bold text-xs theme-accent-text hover:opacity-95 transition cursor-pointer shadow-md flex items-center justify-center gap-2 border-0"
            >
              <DownloadIcon className="w-4 h-4 shrink-0" />
              <span>
                {isPending
                  ? tp('printSlip', 'Print Application Slip')
                  : tp('printOfficialSlip', 'Print Official Slip')}
              </span>
            </button>
            <button
              type="button"
              onClick={handleCopyReceipt}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl theme-bg-app font-bold text-xs theme-text-primary hover:theme-bg-elevated/40 transition cursor-pointer flex items-center justify-center gap-2 border-0 shadow-xs"
            >
              <CopyIcon className="w-4 h-4 shrink-0" />
              <span>{tp('copy', 'Copy')}</span>
            </button>
            {isApproved && (
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl theme-bg-app font-bold text-xs theme-accent hover:theme-bg-elevated/40 transition cursor-pointer flex items-center justify-center gap-2 border-0 shadow-xs"
              >
                <span>{tp('goToDashboard', 'Go to Staff Dashboard')}</span>
              </button>
            )}
          </div>
        </div>
      </PublicPortalShell>
    );
  }

  // Render Step 1: Borderless Authentication Gate (Identical architecture to LoginView)
  if (!isAuthenticated) {
    return (
      <PublicPortalShell
        brandName={portalBrandName}
        brandBadge={portalBrandBadge}
        brandIcon={TeacherIcon}
        maxWidth="md"
      >
        <div className="theme-bg-surface border-0 ring-0 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-zoom-in transition-all duration-200 backdrop-blur-md">
          {/* Header Stack */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl theme-bg-app border-0 shadow-xs mx-auto">
              <LockIcon className="w-6 h-6 theme-text-secondary" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary">
              {authMode === 'login'
                ? tp('loginTitle', 'Faculty Portal Login')
                : tp('registerTitle', 'Create Candidate Account')}
            </h1>
            <p className="text-xs sm:text-sm theme-text-secondary max-w-xs mx-auto">
              {authMode === 'login'
                ? tp(
                    'loginSubtitle',
                    'Sign in with your account or Google to complete your onboarding application.'
                  )
                : tp(
                    'registerSubtitle',
                    'Create an account or continue with Google to securely save and submit your onboarding form.'
                  )}
            </p>
          </div>

          {/* Segmented Log In / New Register Switcher */}
          <div
            role="tablist"
            aria-label={tp('facultyPortalBadge', 'Faculty Recruitment Portal')}
            className="grid grid-cols-2 p-1 rounded-2xl theme-bg-app border-0 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'login'}
              onClick={() => switchAuthMode('login')}
              className={`py-2.5 rounded-xl text-xs transition cursor-pointer border-0 ring-0 ${
                authMode === 'login'
                  ? 'theme-bg-surface theme-text-primary shadow-xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary font-semibold'
              }`}
            >
              {tp('loginTab', 'Log In')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'register'}
              onClick={() => switchAuthMode('register')}
              className={`py-2.5 rounded-xl text-xs transition cursor-pointer border-0 ring-0 ${
                authMode === 'register'
                  ? 'theme-bg-surface theme-text-primary shadow-xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary font-semibold'
              }`}
            >
              {tp('registerTab', 'New Register')}
            </button>
          </div>

          {/* Server Auth Error Banner */}
          {authError && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl theme-bg-danger-soft theme-danger border-0 text-xs flex items-center justify-between gap-2 animate-fade-in"
            >
              <span className="font-medium text-start">{authError}</span>
              <button
                type="button"
                onClick={() => setAuthError('')}
                aria-label={tAuth('dismissError', 'Dismiss error')}
                className="hover:opacity-80 transition-opacity p-1 cursor-pointer shrink-0 border-0"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Shared Reusable Google Social Sign-In */}
          <GoogleSignInButton
            label={tp('continueWithGoogle', 'Continue with Google')}
            connectingLabel={tp('connectingToGoogle', 'Connecting to Google...')}
            dividerLabel={tp('orContinueWithEmail', 'OR CONTINUE WITH EMAIL')}
            disabled={authLoading}
            onSuccess={() => {
              setAuthError('');
              showToast(
                tp(
                  'googleSuccess',
                  'Signed in with Google. Please complete your onboarding profile.'
                ),
                'success'
              );
            }}
            onError={(msg) => {
              setAuthError(msg);
              showToast(msg, 'error');
            }}
          />

          {/* Credentials / Candidate Account Form */}
          <form method="POST" noValidate onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <>
                <PortalInputField
                  name="name"
                  type="text"
                  label={tp('candidateFullName', 'Candidate Full Name')}
                  value={authName}
                  onChange={(val) => {
                    setAuthName(val);
                    if (authError) setAuthError('');
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                  placeholder={tp('candidateFullNamePlaceholder', 'e.g. Mufti Muhammad Abdullah')}
                  autoComplete="name"
                  required
                  disabled={authLoading}
                  icon={<UserIcon className="w-4 h-4" />}
                  error={nameError}
                  showError={(touched.name || submitAttempted) && Boolean(nameError)}
                  inputRef={nameInputRef}
                />

                <PortalInputField
                  name="phone"
                  type="tel"
                  label={tp('phoneNumber', 'Phone Number')}
                  value={authPhone}
                  onChange={(val) => {
                    setAuthPhone(val);
                    if (authError) setAuthError('');
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                  placeholder={tp('phoneNumberPlaceholder', '017XXXXXXXX')}
                  autoComplete="tel"
                  required
                  disabled={authLoading}
                  icon={<PhoneIcon className="w-4 h-4" />}
                  error={phoneError}
                  showError={(touched.phone || submitAttempted) && Boolean(phoneError)}
                  inputRef={phoneInputRef}
                />
              </>
            )}

            <PortalInputField
              name="email"
              type="email"
              label={tp('emailAddress', 'Email Address')}
              value={authEmail}
              onChange={(val) => {
                setAuthEmail(val);
                if (authError) setAuthError('');
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              placeholder={tp('emailPlaceholder', 'candidate@example.com')}
              autoComplete={authMode === 'login' ? 'username' : 'email'}
              required
              disabled={authLoading}
              icon={<MailIcon className="w-4 h-4" />}
              error={emailError}
              showError={(touched.email || submitAttempted) && Boolean(emailError)}
              inputRef={emailInputRef}
            />

            <PortalInputField
              name="password"
              type="password"
              label={tp('password', 'Password')}
              value={authPassword}
              onChange={(val) => {
                setAuthPassword(val);
                if (authError) setAuthError('');
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              placeholder={tp('passwordPlaceholder', '••••••••')}
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              required
              disabled={authLoading}
              icon={<LockClosedIcon className="w-4 h-4" />}
              hint={
                authMode === 'register'
                  ? tp('passwordMinHint', 'Minimum 8 characters required for a new account.')
                  : undefined
              }
              error={passwordError}
              showError={(touched.password || submitAttempted) && Boolean(passwordError)}
              inputRef={passwordInputRef}
              showPasswordLabel={tp('showPassword', 'Show password')}
              hidePasswordLabel={tp('hidePassword', 'Hide password')}
            />

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-2xl theme-bg-accent font-semibold text-sm theme-accent-text hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50 border-0 mt-2"
            >
              {authLoading ? (
                <>
                  <SpinnerIcon className="w-4 h-4 theme-accent-text shrink-0" />
                  <span>
                    {authMode === 'login'
                      ? tp('authenticating', 'Authenticating...')
                      : tp('creatingAccount', 'Creating Account...')}
                  </span>
                </>
              ) : (
                <>
                  <UserCheckIcon className="w-4 h-4 shrink-0" />
                  <span>
                    {authMode === 'login'
                      ? tp('continueWithEmail', 'Continue with Email')
                      : tp('registerAndProceed', 'Register & Proceed')}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Borderless Enterprise Security Badge */}
          <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] theme-text-secondary">
            <ShieldCheckIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
            <span>
              {tAuth('securityBadge', 'Protected by enterprise-grade 256-bit encryption')}
            </span>
          </div>
        </div>
      </PublicPortalShell>
    );
  }

  // Render Step 2: Unified Shared Shell + 5-Step StaffOnboardingWizard
  return (
    <PublicPortalShell
      brandName={portalBrandName}
      brandBadge={portalBrandBadge}
      brandIcon={TeacherIcon}
      maxWidth="5xl"
    >
      <div className="space-y-6 border-0">
        <div className="p-6 sm:p-8 rounded-3xl theme-bg-surface shadow-xs flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 border-0">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-start">
            <div className="w-14 h-14 rounded-2xl theme-bg-app flex items-center justify-center theme-text-secondary shrink-0 shadow-xs border-0">
              <TeacherIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight theme-text-primary leading-tight">
                {tokenMeta?.title || tp('staffOnboardingPortal', 'Staff & Faculty Onboarding')}
              </h1>
              <p className="text-xs sm:text-sm theme-text-secondary mt-1">
                {tokenMeta?.subtitle ||
                  tp(
                    'onboardingHeroSubtitle',
                    'Personnel registration, credential verification, and academic onboarding.'
                  )}
              </p>
            </div>
          </div>

          <div className="text-center sm:text-end shrink-0">
            <span className="px-3 py-1 rounded-full text-xs font-semibold theme-bg-app theme-text-secondary border-0 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span>{tp('activeOnlinePortal', 'Active Online Portal')}</span>
            </span>
          </div>
        </div>

        {tokenMeta?.onboarding_mode === 'QUICK' ? (
          <QuickStaffOnboardingForm
            isPublic={true}
            initialData={candidateInitialData}
            tokenMeta={tokenMeta}
            onCompleted={(receipt) => setSubmittedReceipt(receipt)}
          />
        ) : (
          <div className="rounded-3xl theme-bg-surface shadow-xs p-5 sm:p-7 md:p-8 border-0">
            <StaffOnboardingWizard
              isPublic={true}
              initialData={candidateInitialData}
              tokenMeta={tokenMeta}
              onCancel={() => window.location.reload()}
              onCompleted={(receipt) => setSubmittedReceipt(receipt)}
            />
          </div>
        )}
      </div>
    </PublicPortalShell>
  );
};

export default PublicStaffOnboardingView;
