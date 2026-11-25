import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CustomButton, PortalInputField, useToast } from '@repo/ui';
import { useAuth } from '../../core/auth/AuthContext';
import { ApiError } from '../../core/api/client';
import {
  ArrowRightIcon,
  HeartIcon,
  LockClosedIcon,
  MailIcon,
  ShieldCheckIcon,
} from '../../components/icons/UniverseIcons';
import { useAuthTranslation } from './locales';

export const PrivateLoginView: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, login } = useAuth();
  const { showToast } = useToast();
  const { t } = useAuthTranslation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<{ identifier: boolean; password: boolean }>({
    identifier: false,
    password: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'OWNER' ? '/admin' : '/welcome'} replace />;
  }

  const identifierError = !identifier.trim()
    ? t('identifierRequired', 'Please enter your email or access ID.')
    : null;
  const passwordError = !password
    ? t('passwordRequired', 'Please enter your private password.')
    : null;

  const showIdentifierError = Boolean((touched.identifier || submitAttempted) && identifierError);
  const showPasswordError = Boolean((touched.password || submitAttempted) && passwordError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setErrorMessage('');

    if (identifierError || passwordError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await login(identifier.trim(), password);
      showToast(t('submitButton', 'Session unlocked'), 'success');
      if (session.user.role === 'OWNER') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/welcome', { replace: true });
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : t('errorFallback', 'Unable to sign in. Please verify your private credentials.');
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="@container flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md rounded-3xl theme-bg-surface love-glow-card p-6 sm:p-8 space-y-6 animate-cosmic-reveal border-0">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl theme-bg-accent-soft flex items-center justify-center theme-accent animate-cosmic-float">
            <HeartIcon className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-extrabold theme-text-primary tracking-tight">
            {t('title', 'Sign In to Our Little Universe')}
          </h2>
          <p className="text-xs theme-text-secondary leading-relaxed">
            {t(
              'subtitle',
              'Private access only. Public registration is disabled to protect personal memories.'
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <PortalInputField
            name="identifier"
            type="email"
            label={t('identifierLabel', 'Email or Access ID')}
            placeholder={t('identifierPlaceholder', 'recipient@ouruniverse.local')}
            autoComplete="username"
            icon={<MailIcon className="w-4 h-4" />}
            value={identifier}
            onChange={(val) => {
              setIdentifier(val);
              if (errorMessage) setErrorMessage('');
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, identifier: true }))}
            error={identifierError}
            showError={showIdentifierError}
            required
            disabled={isSubmitting}
          />

          <PortalInputField
            name="password"
            type="password"
            label={t('passwordLabel', 'Private Password')}
            placeholder={t('passwordPlaceholder', 'Enter your private password')}
            autoComplete="current-password"
            icon={<LockClosedIcon className="w-4 h-4" />}
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (errorMessage) setErrorMessage('');
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            error={passwordError}
            showError={showPasswordError}
            required
            disabled={isSubmitting}
          />

          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-2xl theme-bg-danger-soft theme-danger text-xs font-semibold text-center"
            >
              {errorMessage}
            </div>
          )}

          <CustomButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            loadingText={t('signingIn', 'Verifying private access...')}
            iconRight={ArrowRightIcon}
          >
            {t('submitButton', 'Unlock Private Session')}
          </CustomButton>
        </form>

        <div className="pt-2 flex items-center justify-center gap-2 text-[11px] theme-text-secondary text-center">
          <ShieldCheckIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span>
            {t(
              'securityNote',
              'Protected by server-side authorization and PostgreSQL Row-Level Security'
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PrivateLoginView;
