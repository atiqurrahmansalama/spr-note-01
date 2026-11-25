import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  readStoredTokens,
  saveStoredTokens,
  universeRequest,
} from '../api/client';
import { useUniverseStore } from '../../stores/universeStore';
import type {
  UniverseModuleItem,
  UniverseProgress,
  UniverseSessionPayload,
  UniverseSpaceConfig,
  UniverseUser,
} from '../../types';

interface AuthContextValue {
  isHydrating: boolean;
  isAuthenticated: boolean;
  user: UniverseUser | null;
  space: UniverseSpaceConfig | null;
  progress: UniverseProgress | null;
  modules: UniverseModuleItem[];
  login: (identifier: string, password: string) => Promise<UniverseSessionPayload>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  verifyPin: (pin: string) => Promise<{ verified: boolean; progress?: UniverseProgress }>;
  syncRouteProgress: (routePath: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [user, setUser] = useState<UniverseUser | null>(null);
  const [space, setSpace] = useState<UniverseSpaceConfig | null>(null);
  const [progress, setProgress] = useState<UniverseProgress | null>(null);
  const [modules, setModules] = useState<UniverseModuleItem[]>([]);

  const hydrateStore = useUniverseStore((s) => s.hydrateFromSession);
  const resetStore = useUniverseStore((s) => s.resetSession);
  const userRef = useRef<UniverseUser | null>(null);
  userRef.current = user;

  const applySessionPayload = useCallback(
    (payload: UniverseSessionPayload) => {
      userRef.current = payload.user;
      setUser(payload.user);
      setSpace(payload.space);
      setProgress(payload.progress);
      setModules(payload.modules || []);
      hydrateStore(payload);
    },
    [hydrateStore]
  );

  const clearSession = useCallback(() => {
    saveStoredTokens(null);
    userRef.current = null;
    setUser(null);
    setSpace(null);
    setProgress(null);
    setModules([]);
    resetStore();
  }, [resetStore]);

  const refreshSession = useCallback(async () => {
    const tokens = readStoredTokens();
    if (!tokens?.access && !tokens?.refresh) {
      clearSession();
      return;
    }

    const attemptHydrate = async () => {
      const payload = await universeRequest<UniverseSessionPayload>('/api/v1/universe/auth/me/');
      applySessionPayload(payload);
    };

    try {
      await attemptHydrate();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearSession();
        return;
      }

      // Transient network / 5xx error during dev reload or temporary outage:
      // Retry once briefly on cold boot; NEVER wipe valid tokens from localStorage.
      if (!userRef.current) {
        await new Promise((resolve) => window.setTimeout(resolve, 900));
        try {
          await attemptHydrate();
        } catch (retryErr) {
          if (retryErr instanceof ApiError && (retryErr.status === 401 || retryErr.status === 403)) {
            clearSession();
          }
        }
      }
    }
  }, [applySessionPayload, clearSession]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refreshSession();
      } finally {
        if (active) setIsHydrating(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshSession]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const payload = await universeRequest<UniverseSessionPayload>('/api/v1/universe/auth/login/', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ identifier, password }),
      });
      if (payload.tokens) {
        saveStoredTokens(payload.tokens);
      }
      applySessionPayload(payload);
      return payload;
    },
    [applySessionPayload]
  );

  const logout = useCallback(async () => {
    const tokens = readStoredTokens();
    try {
      if (tokens?.access) {
        await universeRequest('/api/v1/universe/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh: tokens.refresh }),
        });
      }
    } catch {
      // ignore server logout errors and clear local session
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const verifyPin = useCallback(
    async (pin: string) => {
      const res = await universeRequest<{ verified: boolean; progress?: UniverseProgress }>(
        '/api/v1/universe/welcome/verify-pin/',
        {
          method: 'POST',
          body: JSON.stringify({ pin }),
        }
      );
      if (res.verified && res.progress) {
        setProgress(res.progress);
        if (user && space) {
          hydrateStore({ user, space, progress: res.progress, modules });
        }
      }
      return res;
    },
    [user, space, modules, hydrateStore]
  );

  const syncRouteProgress = useCallback(async (routePath: string) => {
    try {
      const next = await universeRequest<UniverseProgress>('/api/v1/universe/progress/', {
        method: 'PATCH',
        body: JSON.stringify({ last_visited_route: routePath }),
      });
      setProgress(next);
    } catch {
      // non-blocking progress sync
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrating,
      isAuthenticated: Boolean(user),
      user,
      space,
      progress,
      modules,
      login,
      logout,
      refreshSession,
      verifyPin,
      syncRouteProgress,
    }),
    [
      isHydrating,
      user,
      space,
      progress,
      modules,
      login,
      logout,
      refreshSession,
      verifyPin,
      syncRouteProgress,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
