import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../../../context/ToastContext';
import { auth as authStore } from '../../../utils/localStore';
import { verifyPublicAdmissionToken } from '../../../api/admissions';
import FullAdmissionWizard from './FullAdmissionWizard';
import {
  AcademicCapIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LockIcon,
  UserCheckIcon,
  CopyIcon,
  DownloadIcon,
} from '../../../components/ui/Icons';
import CustomInput from '../../../components/ui/CustomInput';

export default function PublicOnlineAdmissionView() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [tokenMeta, setTokenMeta] = useState(null);
  const [tokenError, setTokenError] = useState('');

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => authStore.isLoggedIn());
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [submittedReceipt, setSubmittedReceipt] = useState(null);

  // Load Token Metadata
  useEffect(() => {
    if (!token) {
      setTokenError('No admission token provided. Please scan a valid admission QR code or use an official link.');
      setLoading(false);
      return;
    }

    const verify = async () => {
      setLoading(true);
      setTokenError('');
      try {
        const meta = await verifyPublicAdmissionToken(token);
        setTokenMeta(meta);
      } catch (err) {
        setTokenError(err.message || 'Invalid or expired admission link.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  // Auth Handler (Login or Quick Registration for Public Applicant)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (authMode === 'login') {
        const res = await fetch('/api/v1/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail.trim(), password: authPassword }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.error || 'Invalid email or password.');
        }

        const data = await res.json();
        authStore.setAuth(data);
        setIsAuthenticated(true);
        showToast('Authenticated successfully. You may now complete the admission.', 'success');
      } else {
        const res = await fetch('/api/v1/auth/register/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authEmail.trim(),
            password: authPassword,
            name: authName.trim() || 'Applicant Guardian',
            phone_number: authPhone.trim(),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.error || 'Registration failed. Please check details.');
        }

        const data = await res.json();
        authStore.setAuth(data);
        setIsAuthenticated(true);
        showToast('Account created and verified successfully.', 'success');
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCopyReceipt = () => {
    if (!submittedReceipt) return;
    const text = `Admission Confirmation Receipt\nStudent: ${submittedReceipt.name || submittedReceipt.name_en}\nTracking ID: ${submittedReceipt.uniq_id || submittedReceipt.id}\nRoll: ${submittedReceipt.roll_number}\nInstitution: ${tokenMeta?.institution_name}\nSession: ${tokenMeta?.session_year}`;
    navigator.clipboard.writeText(text);
    showToast('Admission receipt copied to clipboard', 'success');
  };

  const handlePrintSlip = () => {
    window.print();
  };

  // ── Render Loading Screen ──
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center theme-bg-sub theme-text-primary p-4">
        <div className="w-12 h-12 rounded-full border-3 border-t-transparent theme-accent animate-spin" />
        <p className="mt-4 text-xs font-semibold theme-text-secondary">Verifying Admission Link &amp; Institute...</p>
      </div>
    );
  }

  // ── Render Token Error Screen ──
  if (tokenError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center theme-bg-sub theme-text-primary p-4">
        <div className="max-w-md w-full p-8 rounded-3xl theme-bg-surface border theme-border shadow-xl text-center space-y-4 animate-scale-up">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangleIcon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-rose-500">Invalid Admission Link</h2>
          <p className="text-xs theme-text-secondary leading-relaxed">{tokenError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-2xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
          >
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  // ── Render Confirmation Receipt / Voucher ──
  if (submittedReceipt) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 theme-bg-sub theme-text-primary flex items-center justify-center">
        <div className="max-w-lg w-full rounded-3xl theme-bg-surface border theme-border shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-up text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircleIcon className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Admission Submitted Successfully
            </span>
            <h2 className="text-2xl font-black tracking-tight mt-2">
              {submittedReceipt.name || submittedReceipt.name_en}
            </h2>
            {submittedReceipt.bangla_name && (
              <p className="text-sm font-semibold theme-text-secondary mt-0.5">{submittedReceipt.bangla_name}</p>
            )}
            <p className="text-xs font-medium theme-accent mt-1">
              {tokenMeta?.institution_name || 'Academic Institution'}
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="p-4 rounded-2xl theme-bg-sub border theme-border text-xs text-left space-y-2.5">
            <div className="flex justify-between items-center border-b theme-border pb-2">
              <span className="theme-text-secondary">Tracking Roll / ID:</span>
              <span className="font-mono font-black text-sm theme-accent">
                {submittedReceipt.roll_number || submittedReceipt.uniq_id || 'PROVISIONAL'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="theme-text-secondary">Assigned Class:</span>
              <span className="font-bold">
                {submittedReceipt.education_status || submittedReceipt.student_class_name || tokenMeta?.target_class_name || 'Assigned'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="theme-text-secondary">Academic Session:</span>
              <span className="font-bold">{tokenMeta?.session_year || '2026-2027'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="theme-text-secondary">Admission Date:</span>
              <span className="font-bold">{new Date().toISOString().split('T')[0]}</span>
            </div>

            {/* QR Verification Badge */}
            <div className="flex items-center justify-center pt-2">
              <QRCodeSVG
                value={`${window.location.origin}/verify-admission/${submittedReceipt.uniq_id || submittedReceipt.id}`}
                size={90}
                level="M"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#0F172A"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="w-full sm:flex-1 py-3 rounded-2xl theme-bg-accent font-bold text-xs theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Print Application Slip</span>
            </button>
            <button
              type="button"
              onClick={handleCopyReceipt}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl theme-bg-sub border theme-border font-bold text-xs theme-text-primary hover:theme-bg-elevated transition cursor-pointer flex items-center justify-center gap-2"
            >
              <CopyIcon className="w-4 h-4" />
              <span>Copy</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render Step 1: Mandatory Email Authentication Gate ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 theme-bg-sub theme-text-primary flex items-center justify-center">
        <div className="max-w-md w-full rounded-3xl theme-bg-surface border theme-border shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-up">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center mx-auto theme-accent shadow-inner">
              <LockIcon className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Guardian Portal Authentication
            </h1>
            <p className="text-xs theme-text-secondary leading-relaxed">
              Please sign in with your email or register a guardian account to proceed with student admission at{' '}
              <strong className="theme-text-primary">{tokenMeta?.institution_name}</strong>.
            </p>
          </div>

          {/* Auth Mode Toggle */}
          <div className="flex rounded-2xl theme-bg-sub border theme-border p-1">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                authMode === 'login'
                  ? 'theme-bg-surface theme-text-primary shadow-xs border theme-border'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                authMode === 'register'
                  ? 'theme-bg-surface theme-text-primary shadow-xs border theme-border'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Create Account
            </button>
          </div>

          {authError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <>
                <CustomInput
                  label="Guardian Full Name *"
                  name="name"
                  value={authName}
                  onChange={(val) => setAuthName(val)}
                  placeholder="e.g. Mohammad Rafiqul Islam"
                  required
                />
                <CustomInput
                  label="Guardian Contact Phone *"
                  name="phone"
                  type="phone"
                  value={authPhone}
                  onChange={(val) => setAuthPhone(val)}
                  placeholder="017XXXXXXXX"
                  required
                />
              </>
            )}

            <CustomInput
              label="Email Address *"
              name="email"
              type="email"
              value={authEmail}
              onChange={(val) => setAuthEmail(val)}
              placeholder="guardian@example.com"
              required
            />

            <CustomInput
              label="Password *"
              name="password"
              type="password"
              value={authPassword}
              onChange={(val) => setAuthPassword(val)}
              placeholder="••••••••"
              required
            />

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 rounded-2xl theme-bg-accent font-bold text-xs theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authLoading ? (
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" />
              ) : (
                <>
                  <UserCheckIcon className="w-4 h-4" />
                  <span>{authMode === 'login' ? 'Continue with Email' : 'Register & Proceed'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Render Step 2: Fully Reused 4-Step FullAdmissionWizard ──
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 theme-bg-sub theme-text-primary">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Institution Banner Card */}
        <div className="p-6 sm:p-8 rounded-3xl theme-bg-surface border theme-border shadow-xs flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent shrink-0 shadow-inner">
              <AcademicCapIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="px-3 py-0.5 rounded-full text-[11px] font-bold theme-bg-accent-soft theme-accent inline-block border theme-border">
                {tokenMeta?.session_year} Academic Session
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                {tokenMeta?.institution_name || 'Academic Institution'}
              </h1>
              {tokenMeta?.institution_bangla_name && (
                <p className="text-xs theme-text-secondary mt-0.5">{tokenMeta.institution_bangla_name}</p>
              )}
              <p className="text-xs font-semibold theme-accent mt-1">{tokenMeta?.title}</p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Active Online Portal
            </span>
          </div>
        </div>

        {/* 100% Reused Enterprise Full Admission Wizard */}
        <div className="rounded-3xl theme-bg-surface border theme-border shadow-xs p-5 sm:p-7 md:p-8">
          <FullAdmissionWizard
            isPublicOnlineMode={true}
            tokenMeta={tokenMeta}
            token={token}
            onCancel={() => window.location.reload()}
            onSuccess={(receipt) => setSubmittedReceipt(receipt)}
          />
        </div>
      </div>
    </div>
  );
}
