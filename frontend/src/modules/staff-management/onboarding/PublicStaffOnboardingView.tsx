import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/context/ToastContext';
import { auth as authStore } from '@/utils/localStore';
import { verifyPublicStaffToken } from '@/api/staffOnboarding';
import { StaffOnboardingWizard } from './StaffOnboardingWizard';
import {
  TeacherIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LockIcon,
  UserCheckIcon,
  CopyIcon,
  DownloadIcon,
} from '@/components/ui/Icons';
import CustomInput from '@/components/ui/CustomInput';

export const PublicStaffOnboardingView: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [tokenMeta, setTokenMeta] = useState<any>(null);
  const [tokenError, setTokenError] = useState('');

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => authStore.isLoggedIn());
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [submittedReceipt, setSubmittedReceipt] = useState<any>(null);

  // Load Token Metadata
  useEffect(() => {
    if (!token) {
      setTokenError('No onboarding token provided. Please scan a valid QR code or use an official invitation link.');
      setLoading(false);
      return;
    }

    const verify = async () => {
      setLoading(true);
      setTokenError('');
      try {
        const meta = await verifyPublicStaffToken(token);
        setTokenMeta(meta);
      } catch (err: any) {
        setTokenError(err.message || 'Invalid or expired staff invitation link.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  // Auth Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
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
        if (data.access) authStore.saveTokens(data.access, data.refresh);
        if (data.user) authStore.saveUser(data.user);
        setIsAuthenticated(true);
        showToast('Authenticated successfully. You may now complete onboarding.', 'success');
      } else {
        const res = await fetch('/api/v1/auth/register/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authEmail.trim(),
            password: authPassword,
            name: authName.trim() || 'Faculty Candidate',
            phone_number: authPhone.trim(),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.error || 'Registration failed. Please check details.');
        }

        const data = await res.json();
        if (data.access) authStore.saveTokens(data.access, data.refresh);
        if (data.user) authStore.saveUser(data.user);
        setIsAuthenticated(true);
        showToast('Account created and verified successfully.', 'success');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCopyReceipt = () => {
    if (!submittedReceipt) return;
    const staff = submittedReceipt.staff || submittedReceipt;
    const text = `Staff Onboarding Confirmation Receipt\nCandidate: ${staff.name}\nEmployee ID: ${staff.employee_id}\nDesignation: ${staff.designation}\nInstitution: ${tokenMeta?.institution_name}`;
    navigator.clipboard.writeText(text);
    showToast('Onboarding receipt copied to clipboard', 'success');
  };

  const handlePrintSlip = () => {
    window.print();
  };

  // Render Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center theme-bg-app theme-text-primary p-4 border-0">
        <div className="w-12 h-12 rounded-full border-3 border-t-transparent theme-accent animate-spin" />
        <p className="mt-4 text-xs font-semibold theme-text-secondary">Verifying Onboarding Invitation &amp; Institute...</p>
      </div>
    );
  }

  // Render Token Error Screen
  if (tokenError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center theme-bg-app theme-text-primary p-4 select-none border-0">
        <div className="max-w-md w-full p-8 rounded-3xl theme-bg-surface shadow-xl text-center space-y-4 animate-zoom-in border-0">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner border-0">
            <AlertTriangleIcon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-rose-500">Invalid Onboarding Link</h2>
          <p className="text-xs theme-text-secondary leading-relaxed">{tokenError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-2xl theme-bg-app text-xs font-bold theme-text-primary hover:theme-bg-elevated/40 transition cursor-pointer border-0 shadow-xs"
          >
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  // Render Confirmation Receipt / Voucher
  if (submittedReceipt) {
    const staff = submittedReceipt.staff || submittedReceipt;
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 theme-bg-app theme-text-primary flex items-center justify-center border-0">
        <div className="max-w-lg w-full rounded-3xl theme-bg-surface shadow-2xl p-6 sm:p-8 space-y-6 animate-zoom-in text-center border-0">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto shadow-inner border-0">
            <CheckCircleIcon className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border-0">
              Staff Profile Onboarded Successfully
            </span>
            <h2 className="text-2xl font-black tracking-tight mt-2 theme-text-primary">
              {staff.name}
            </h2>
            {staff.bangla_name && (
              <p className="text-sm font-semibold theme-text-secondary mt-0.5">{staff.bangla_name}</p>
            )}
            <p className="text-xs font-medium theme-accent mt-1">
              {tokenMeta?.institution_name || 'Academic Institution'}
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="p-5 rounded-2xl theme-bg-app text-xs text-left space-y-3 border-0">
            <div className="flex justify-between items-center pb-2 border-0">
              <span className="theme-text-secondary">Official Employee ID:</span>
              <span className="font-mono font-black text-sm theme-accent">
                {staff.employee_id || 'REGISTERED'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="theme-text-secondary">Designation &amp; Rank:</span>
              <span className="font-bold theme-text-primary">
                {staff.designation || tokenMeta?.designation || 'Staff'} {tokenMeta?.rank_order && tokenMeta.rank_order !== 99 && `[Rank ${tokenMeta.rank_order}]`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="theme-text-secondary">Staff Category:</span>
              <span className="font-bold theme-text-primary">{staff.staff_type || tokenMeta?.staff_type || 'Faculty'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="theme-text-secondary">Joining Date:</span>
              <span className="font-bold theme-text-primary">{staff.joining_date || new Date().toISOString().split('T')[0]}</span>
            </div>

            {/* QR Verification Badge */}
            <div className="flex items-center justify-center pt-2">
              <QRCodeSVG
                value={`${window.location.origin}/verify-staff/${staff.employee_id || staff.id}`}
                size={90}
                level="M"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#0F172A"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 border-0">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="w-full sm:flex-1 py-3 rounded-2xl theme-bg-accent font-bold text-xs theme-accent-text hover:opacity-90 transition cursor-pointer shadow-md flex items-center justify-center gap-2 border-0"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Print Application Slip</span>
            </button>
            <button
              type="button"
              onClick={handleCopyReceipt}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl theme-bg-app font-bold text-xs theme-text-primary hover:theme-bg-elevated/40 transition cursor-pointer flex items-center justify-center gap-2 border-0 shadow-xs"
            >
              <CopyIcon className="w-4 h-4" />
              <span>Copy</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Step 1: Authentication Gate (If not logged in)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 theme-bg-app theme-text-primary flex items-center justify-center border-0">
        <div className="max-w-md w-full rounded-3xl theme-bg-surface shadow-2xl p-6 sm:p-8 space-y-6 animate-zoom-in border-0">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl theme-bg-accent-soft flex items-center justify-center mx-auto theme-accent shadow-inner border-0">
              <LockIcon className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight theme-text-primary">
              {authMode === 'login' ? 'Faculty Portal Login' : 'Create Candidate Account'}
            </h2>
            <p className="text-xs theme-text-secondary">
              {authMode === 'login'
                ? 'Sign in to access your recruitment onboarding application.'
                : 'Create an account to securely save and submit your onboarding form.'}
            </p>
          </div>

          <div className="p-1 rounded-2xl theme-bg-app grid grid-cols-2 gap-1 text-xs font-bold border-0">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`py-2 rounded-xl transition cursor-pointer border-0 ${
                authMode === 'login' ? 'theme-bg-surface theme-text-primary shadow-xs' : 'theme-text-secondary'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={`py-2 rounded-xl transition cursor-pointer border-0 ${
                authMode === 'register' ? 'theme-bg-surface theme-text-primary shadow-xs' : 'theme-text-secondary'
              }`}
            >
              New Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-medium border-0">
                {authError}
              </div>
            )}

            {authMode === 'register' && (
              <>
                <CustomInput
                  label="Candidate Full Name"
                  name="name"
                  value={authName}
                  onChange={(val) => setAuthName(val)}
                  placeholder="e.g. Mufti Muhammad Abdullah"
                  required
                />
                <CustomInput
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={authPhone}
                  onChange={(val) => setAuthPhone(val)}
                  placeholder="017XXXXXXXX"
                  required
                />
              </>
            )}

            <CustomInput
              label="Email Address"
              name="email"
              type="email"
              value={authEmail}
              onChange={(val) => setAuthEmail(val)}
              placeholder="candidate@example.com"
              required
            />

            <CustomInput
              label="Password"
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
              className="w-full py-3.5 rounded-2xl theme-bg-accent font-bold text-xs theme-accent-text hover:opacity-90 transition cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50 border-0"
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

  // Render Step 2: Fully Reused 5-Step StaffOnboardingWizard
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 theme-bg-app theme-text-primary select-none border-0">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="p-6 sm:p-8 rounded-3xl theme-bg-surface shadow-xs flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 border-0">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl theme-bg-accent-soft flex items-center justify-center theme-accent shrink-0 shadow-inner border-0">
              <TeacherIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="px-3 py-0.5 rounded-full text-[11px] font-bold theme-bg-accent-soft theme-accent inline-block border-0">
                {tokenMeta?.designation || tokenMeta?.staff_type || 'Faculty & Personnel Onboarding'}
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1 theme-text-primary">
                {tokenMeta?.institution_name || 'Academic Institution'}
              </h1>
              {tokenMeta?.institution_bangla_name && (
                <p className="text-xs theme-text-secondary mt-0.5">{tokenMeta.institution_bangla_name}</p>
              )}
              <p className="text-xs font-semibold theme-accent mt-1">{tokenMeta?.title}</p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border-0">
              Active Online Portal
            </span>
          </div>
        </div>

        <div className="rounded-3xl theme-bg-surface shadow-xs p-5 sm:p-7 md:p-8 border-0">
          <StaffOnboardingWizard
            isPublic={true}
            tokenMeta={tokenMeta}
            onCancel={() => window.location.reload()}
            onCompleted={(receipt) => setSubmittedReceipt(receipt)}
          />
        </div>
      </div>
    </div>
  );
};

export default PublicStaffOnboardingView;
