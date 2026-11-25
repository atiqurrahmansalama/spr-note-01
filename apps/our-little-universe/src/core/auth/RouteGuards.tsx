import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CustomButton } from '@repo/ui';
import { useAuth } from './AuthContext';
import { ArrowLeftNavIcon, LockClosedIcon, SparklesIcon } from '../../components/icons/UniverseIcons';
import AccessDeniedView from '../../modules/recipient/AccessDeniedView';

export const UniverseLoadingScreen: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
    <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft flex items-center justify-center animate-pulse">
      <SparklesIcon className="w-6 h-6 theme-accent" />
    </div>
  </div>
);

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isHydrating, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isHydrating) return <UniverseLoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
};

export const RequireEntryUnlocked: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isHydrating, isAuthenticated, progress, user } = useAuth();

  if (isHydrating) return <UniverseLoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role !== 'OWNER' && !progress?.entry_unlocked) {
    return <Navigate to="/welcome" replace />;
  }
  return <>{children}</>;
};

export const RequireModuleAccess: React.FC<{
  moduleKey: string;
  children: React.ReactNode;
}> = ({ moduleKey, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isHydrating, isAuthenticated, progress, user, modules, syncRouteProgress } = useAuth();

  const mod = modules.find((m) => m.module_key === moduleKey);
  const isBlocked =
    user?.role !== 'OWNER' && (!mod || !mod.is_enabled || mod.is_locked);

  useEffect(() => {
    if (!isHydrating && isAuthenticated && (user?.role === 'OWNER' || progress?.entry_unlocked) && !isBlocked) {
      void syncRouteProgress(location.pathname);
    }
  }, [isHydrating, isAuthenticated, user?.role, progress?.entry_unlocked, isBlocked, location.pathname, syncRouteProgress]);

  if (isHydrating) return <UniverseLoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role !== 'OWNER' && !progress?.entry_unlocked) {
    return <Navigate to="/welcome" replace />;
  }

  if (isBlocked) {
      return (
        <div className="@container flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-7 rounded-3xl theme-bg-surface shadow-xs space-y-4 border-0">
            <div className="w-14 h-14 mx-auto rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center">
              <LockClosedIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full theme-bg-app theme-text-secondary">
                {mod && !mod.is_enabled ? 'Coming Soon' : 'Locked World'}
              </span>
              <h2 className="text-lg font-extrabold theme-text-primary">
                {mod?.title || 'Protected Sanctuary'}
              </h2>
              <p className="text-xs theme-text-secondary leading-relaxed">
                This world is currently sealed. Explore unlocked chapters or ask the Universe Owner to unlock it.
              </p>
            </div>
            <CustomButton
              variant="soft"
              size="sm"
              icon={ArrowLeftNavIcon}
              onClick={() => navigate('/dashboard')}
            >
              Return to Love Universe Dashboard
            </CustomButton>
          </div>
        </div>
      );
  }

  return <>{children}</>;
};

export const RequireOwner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isHydrating, isAuthenticated, user } = useAuth();

  if (isHydrating) return <UniverseLoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'OWNER') {
    return <AccessDeniedView />;
  }
  return <>{children}</>;
};
