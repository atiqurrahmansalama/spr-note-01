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
  }, [token, tp]);

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
    const institutionLabel =
      tokenMeta?.institution_name || tp('academicInstitutionFallback', 'Academic Institution');
    const text = `Staff Onboarding Confirmation Receipt\nCandidate: ${staff.name}\nEmployee ID: ${staff.employee_id}\nDesignation: ${staff.designation}\nInstitution: ${institutionLabel}`;
    navigator.clipboard.writeText(text);
    showToast(tp('copiedReceiptToast', 'Onboarding receipt copied to clipboard'), 'success');
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const portalBrandName =
    tokenMeta?.institution_name || tp('facultyPortalBadge', 'Faculty Recruitment Portal');
  const portalBrandBadge =
    tokenMeta?.designation ||
    tokenMeta?.staff_type ||
    tp('facultyPortalBadge', 'Faculty Recruitment Portal');

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

  // Render Confirmation Receipt / Voucher
  if (submittedReceipt) {
    const staff = submittedReceipt.staff || submittedReceipt;
    const formattedJoiningDate = formatDate(staff.joining_date || new Date());
    const hasCustomRank = Boolean(tokenMeta?.rank_order && tokenMeta.rank_order !== 99);

    return (
      <PublicPortalShell
        brandName={portalBrandName}
        brandBadge={portalBrandBadge}
        brandIcon={TeacherIcon}
        maxWidth="lg"
      >
        <div className="rounded-3xl theme-bg-surface shadow-2xl p-6 sm:p-8 space-y-6 animate-zoom-in text-center border-0 ring-0">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto shadow-inner border-0">
            <CheckCircleIcon className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border-0 inline-block">
              {tp('receiptBadge', 'Staff Profile Onboarded Successfully')}
            </span>
            <h1 className="text-2xl font-black tracking-tight mt-2 theme-text-primary">
              {staff.name}
            </h1>
            {staff.bangla_name && (
              <p className="text-sm font-semibold theme-text-secondary mt-0.5">
                {staff.bangla_name}
              </p>
            )}
            <p className="text-xs font-medium theme-accent mt-1">
              {tokenMeta?.institution_name ||
                tp('academicInstitutionFallback', 'Academic Institution')}
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="p-5 rounded-2xl theme-bg-app text-xs text-start space-y-3 border-0">
            <div className="flex justify-between items-center pb-2 gap-3 border-0">
              <span className="theme-text-secondary">
                {tp('officialEmployeeId', 'Official Employee ID')}:
              </span>
              <span className="font-mono font-black text-sm theme-accent">
                {staff.employee_id || tp('registeredFallback', 'REGISTERED')}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="theme-text-secondary">
                {tp('designationAndRank', 'Designation & Rank')}:
              </span>
              <span className="font-bold theme-text-primary text-end">
                {staff.designation || tokenMeta?.designation || 'Staff'}{' '}
                {hasCustomRank ? `[${formatNumber(tokenMeta.rank_order)}]` : ''}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="theme-text-secondary">
                {tp('staffCategory', 'Staff Category')}:
              </span>
              <span className="font-bold theme-text-primary text-end">
                {staff.staff_type || tokenMeta?.staff_type || 'Faculty'}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="theme-text-secondary">
                {tp('joiningDate', 'JOINING DATE')}:
              </span>
              <span className="font-bold theme-text-primary text-end">
                {formattedJoiningDate}
              </span>
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
              className="w-full sm:flex-1 py-3 rounded-2xl theme-bg-accent font-bold text-xs theme-accent-text hover:opacity-95 transition cursor-pointer shadow-md flex items-center justify-center gap-2 border-0"
            >
              <DownloadIcon className="w-4 h-4 shrink-0" />
              <span>{tp('printSlip', 'Print Application Slip')}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyReceipt}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl theme-bg-app font-bold text-xs theme-text-primary hover:theme-bg-elevated/40 transition cursor-pointer flex items-center justify-center gap-2 border-0 shadow-xs"
            >
              <CopyIcon className="w-4 h-4 shrink-0" />
              <span>{tp('copy', 'Copy')}</span>
            </button>
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
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl theme-bg-accent-soft border-0 shadow-xs mx-auto">
              <LockIcon className="w-6 h-6 theme-accent" />
            </div>
            {tokenMeta?.institution_name && (
              <div>
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold theme-bg-accent-soft theme-accent border-0">
                  {tokenMeta.institution_name}
                </span>
              </div>
            )}
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
      <div className="space-y-6 select-none border-0">
        <div className="p-6 sm:p-8 rounded-3xl theme-bg-surface shadow-xs flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 border-0">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-start">
            <div className="w-14 h-14 rounded-2xl theme-bg-accent-soft flex items-center justify-center theme-accent shrink-0 shadow-inner border-0">
              <TeacherIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="px-3 py-0.5 rounded-full text-[11px] font-bold theme-bg-accent-soft theme-accent inline-block border-0">
                {portalBrandBadge}
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1 theme-text-primary">
                {tokenMeta?.institution_name ||
                  tp('academicInstitutionFallback', 'Academic Institution')}
              </h1>
              {tokenMeta?.institution_bangla_name && (
                <p className="text-xs theme-text-secondary mt-0.5">
                  {tokenMeta.institution_bangla_name}
                </p>
              )}
              {tokenMeta?.title && (
                <p className="text-xs font-semibold theme-accent mt-1">{tokenMeta.title}</p>
              )}
            </div>
          </div>

          <div className="text-center sm:text-end shrink-0">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border-0 inline-block">
              {tp('activeOnlinePortal', 'Active Online Portal')}
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
