import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export const DRAWER_SIZES = {
  xs: 360,
  sm: 460,
  md: 580,
  lg: 720,
  xl: 900,
  full: 1120,
} as const;

export type DrawerSize = keyof typeof DRAWER_SIZES;

export interface RightSidebarConfig {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  category?: React.ReactNode;
  parentTitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  content?: React.ReactNode;
  size?: DrawerSize | string;
  width?: number;
  drawerKey?: string | null;
  onClose?: (() => void) | null;
  onBack?: (() => void) | null;
  showCloseButton?: boolean;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  formId?: string;
  onSave?: ((e: React.SyntheticEvent) => void) | null;
  onCancel?: (() => void) | null;
  saveLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  isSaveDisabled?: boolean;
  ownerId?: string | null;
  syncUrl?: boolean;
  _renderKey?: string;
  [key: string]: unknown;
}

export interface RightSidebarContextValue {
  isRightSidebarOpen: boolean;
  rightSidebarConfig: RightSidebarConfig | null;
  drawerWidth: number;
  setDrawerWidth: (widthOrFn: number | ((prev: number) => number)) => void;
  openRightSidebar: (config: RightSidebarConfig | null) => void;
  closeRightSidebar: (skipUrlClean?: boolean) => void;
  openDrawer: (
    drawerKeyOrConfig: string | RightSidebarConfig,
    queryParams?: Record<string, string | number | boolean | null | undefined | Array<string | number>>,
    options?: { syncUrl?: boolean }
  ) => void;
  closeDrawer: () => void;
}

export function resolveDrawerWidth(sizeOrWidth?: DrawerSize | string | number): number {
  if (typeof sizeOrWidth === 'number') {
    return Math.max(360, Math.min(1200, sizeOrWidth));
  }
  if (sizeOrWidth && sizeOrWidth in DRAWER_SIZES) {
    return DRAWER_SIZES[sizeOrWidth as DrawerSize];
  }
  return DRAWER_SIZES.md;
}

export function getSavedDrawerWidth(
  drawerKey: string | null | undefined,
  fallbackSizeOrWidth?: DrawerSize | string | number,
  storageKeyPrefix = 'spr_right_drawer_width'
): number {
  try {
    if (drawerKey) {
      const specificSaved = localStorage.getItem(`${storageKeyPrefix}_${drawerKey}`);
      if (specificSaved) {
        const parsed = parseInt(specificSaved, 10);
        if (!isNaN(parsed) && parsed >= 360 && parsed <= 1200) return parsed;
      }
    }
    const globalSaved = localStorage.getItem(storageKeyPrefix);
    if (!drawerKey && globalSaved) {
      const parsed = parseInt(globalSaved, 10);
      if (!isNaN(parsed) && parsed >= 360 && parsed <= 1200) return parsed;
    }
  } catch {
    // Ignore storage quota or SSR errors
  }
  return resolveDrawerWidth(fallbackSizeOrWidth);
}

export function saveDrawerWidthToStorage(
  drawerKey: string | null | undefined,
  width: number,
  storageKeyPrefix = 'spr_right_drawer_width'
): void {
  try {
    const rounded = Math.round(width);
    if (drawerKey) {
      localStorage.setItem(`${storageKeyPrefix}_${drawerKey}`, String(rounded));
    }
    localStorage.setItem(storageKeyPrefix, String(rounded));
  } catch {
    // Ignore storage errors
  }
}

type DrawerRendererFn = (params: URLSearchParams) => RightSidebarConfig | null;
const drawerRegistry = new Map<string, DrawerRendererFn>();

function getUrlParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function updateUrlParams(updater: (params: URLSearchParams) => void, replace = true): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  updater(params);
  const newSearch = params.toString();
  const nextUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
  if (nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    if (replace) {
      window.history.replaceState(window.history.state, '', nextUrl);
    } else {
      window.history.pushState(window.history.state, '', nextUrl);
    }
  }
}

function pushUrlParams(
  updater: (params: URLSearchParams) => void,
  stateData: Record<string, unknown> = {}
): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  updater(params);
  const newSearch = params.toString();
  const nextUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
  window.history.pushState({ ...(window.history.state || {}), ...stateData }, '', nextUrl);
}

function createEnrichedDrawerParams(
  currentParams: URLSearchParams,
  explicitQueryParams: Record<string, unknown> = {}
): URLSearchParams {
  const enriched = new URLSearchParams(currentParams.toString());
  Object.entries(explicitQueryParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      enriched.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
  });
  return enriched;
}

const RightSidebarContext = createContext<RightSidebarContextValue | null>(null);

export interface RightSidebarProviderProps {
  children: React.ReactNode;
  storageKeyPrefix?: string;
  defaultWidth?: number;
}

/**
 * Shared Right Sidebar / Drawer Context Provider.
 * Supports registered drawers, URL parameter synchronization, browser history back closing,
 * and per-drawer resizable width persistence.
 */
export function RightSidebarProvider({
  children,
  storageKeyPrefix = 'spr_right_drawer_width',
  defaultWidth = 580,
}: RightSidebarProviderProps) {
  const [rightSidebarConfig, setRightSidebarConfig] = useState<RightSidebarConfig | null>(null);
  const [drawerWidth, setDrawerWidthState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKeyPrefix);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 360 && parsed <= 1200) return parsed;
      }
    } catch {
      // Ignore
    }
    return defaultWidth;
  });

  const activeDrawerRef = useRef<string | null>(null);
  const configRef = useRef<RightSidebarConfig | null>(null);
  configRef.current = rightSidebarConfig;

  const setDrawerWidth = useCallback((widthOrFn: number | ((prev: number) => number)) => {
    setDrawerWidthState((prev) => (typeof widthOrFn === 'function' ? widthOrFn(prev) : widthOrFn));
  }, []);

  const closeRightSidebar = useCallback((optionsOrSkip: boolean | unknown = false) => {
    const prevConfig = configRef.current;
    const skipUrlClean = optionsOrSkip === true;

    activeDrawerRef.current = null;
    configRef.current = null;
    setRightSidebarConfig(null);

    if (!skipUrlClean) {
      if (typeof window !== 'undefined' && (window.history.state as Record<string, unknown> | null)?.sprDrawer) {
        try {
          const nextState = { ...(window.history.state || {}) } as Record<string, unknown>;
          delete nextState.sprDrawer;
          window.history.replaceState(nextState, '', window.location.href);
        } catch {
          // Ignore
        }
      }

      updateUrlParams((params) => {
        const drawerKeysToRemove = [
          'drawer',
          'drawerId',
          'mode',
          'id',
          'tab',
          'moduleId',
          'letterId',
          'category',
          'targetId',
        ];
        drawerKeysToRemove.forEach((key) => params.delete(key));
      }, true);
    }

    if (prevConfig?.onClose) {
      try {
        prevConfig.onClose();
      } catch (err) {
        console.warn('Error during right sidebar onClose callback:', err);
      }
    }
  }, []);

  const openRightSidebar = useCallback(
    (config: RightSidebarConfig | null) => {
      if (!config) {
        closeRightSidebar();
        return;
      }
      const {
        title,
        content,
        size = 'md',
        width,
        onClose,
        ownerId,
        drawerKey,
        syncUrl = true,
        ...restConfig
      } = config;

      activeDrawerRef.current = drawerKey || 'open';

      const resolvedWidth = getSavedDrawerWidth(drawerKey, width || size || 'md', storageKeyPrefix);
      setDrawerWidth(resolvedWidth);

      if (drawerKey && syncUrl) {
        updateUrlParams((params) => {
          params.set('drawer', drawerKey);
        });
      }

      setRightSidebarConfig((prev) => ({
        title: title || 'Details',
        content: content || null,
        size: size || 'md',
        width: resolvedWidth,
        drawerKey: drawerKey || null,
        onClose: onClose || null,
        ownerId: ownerId || null,
        syncUrl,
        _renderKey:
          prev && drawerKey && prev.drawerKey === drawerKey && prev._renderKey
            ? prev._renderKey
            : `${drawerKey || 'panel'}-${Date.now()}`,
        ...restConfig,
      }));
    },
    [closeRightSidebar, setDrawerWidth, storageKeyPrefix]
  );

  const openDrawer = useCallback(
    (
      drawerKeyOrConfig: string | RightSidebarConfig,
      queryParams: Record<string, unknown> = {},
      options: { syncUrl?: boolean } = {}
    ) => {
      if (!drawerKeyOrConfig) return;

      if (typeof drawerKeyOrConfig !== 'string') {
        openRightSidebar(drawerKeyOrConfig);
        return;
      }

      const drawerKey: string = drawerKeyOrConfig;
      const syncUrl = options.syncUrl !== undefined ? options.syncUrl : true;

      if (syncUrl) {
        pushUrlParams(
          (params) => {
            ['id', 'mode', 'moduleId', 'letterId', 'category', 'targetId'].forEach((k) =>
              params.delete(k)
            );
            params.set('drawer', drawerKey);
            Object.entries(queryParams).forEach(([k, v]) => {
              if (v !== undefined && v !== null && v !== '') {
                if (typeof v !== 'object') {
                  params.set(k, String(v));
                } else if (Array.isArray(v)) {
                  params.set(k, v.join(','));
                }
              } else {
                params.delete(k);
              }
            });
          },
          { sprDrawer: drawerKey }
        );
      }

      const renderer = drawerRegistry.get(drawerKey);
      if (renderer) {
        const currentParams = getUrlParams();
        const paramsToPass = createEnrichedDrawerParams(currentParams, queryParams);
        const config = renderer(paramsToPass);
        if (config) {
          openRightSidebar({
            ...config,
            drawerKey,
            syncUrl,
          });
        }
      }
    },
    [openRightSidebar]
  );

  const closeDrawer = useCallback(() => {
    closeRightSidebar(false);
  }, [closeRightSidebar]);

  useEffect(() => {
    const handlePopState = () => {
      const currentDrawer = getUrlParams().get('drawer');
      if (!currentDrawer && configRef.current) {
        closeRightSidebar(true);
      } else if (currentDrawer && drawerRegistry.has(currentDrawer)) {
        const renderer = drawerRegistry.get(currentDrawer);
        const config = renderer?.(getUrlParams());
        if (config) {
          openRightSidebar({
            ...config,
            drawerKey: currentDrawer,
          });
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [closeRightSidebar, openRightSidebar]);

  const isRightSidebarOpen = Boolean(rightSidebarConfig);

  const contextValue = React.useMemo<RightSidebarContextValue>(
    () => ({
      isRightSidebarOpen,
      rightSidebarConfig,
      drawerWidth,
      setDrawerWidth,
      openRightSidebar,
      closeRightSidebar,
      openDrawer,
      closeDrawer,
    }),
    [
      isRightSidebarOpen,
      rightSidebarConfig,
      drawerWidth,
      setDrawerWidth,
      openRightSidebar,
      closeRightSidebar,
      openDrawer,
      closeDrawer,
    ]
  );

  return (
    <RightSidebarContext.Provider value={contextValue}>
      {children}
    </RightSidebarContext.Provider>
  );
}

export function useRightSidebar(): RightSidebarContextValue {
  const context = useContext(RightSidebarContext);
  if (!context) {
    return {
      isRightSidebarOpen: false,
      rightSidebarConfig: null,
      drawerWidth: 580,
      setDrawerWidth: () => {},
      openRightSidebar: () => {},
      closeRightSidebar: () => {},
      openDrawer: () => {},
      closeDrawer: () => {},
    };
  }
  return context;
}

export function useScopedRightSidebar() {
  const { openRightSidebar, closeRightSidebar, isRightSidebarOpen, ...rest } = useRightSidebar();
  const isOwnerRef = useRef(false);

  const openScopedRightSidebar = useCallback(
    (config: RightSidebarConfig) => {
      isOwnerRef.current = true;
      openRightSidebar({
        ...config,
        onClose: () => {
          isOwnerRef.current = false;
          config.onClose?.();
        },
      });
    },
    [openRightSidebar]
  );

  const closeScopedRightSidebar = useCallback(() => {
    isOwnerRef.current = false;
    closeRightSidebar();
  }, [closeRightSidebar]);

  useEffect(() => {
    return () => {
      if (isOwnerRef.current) {
        closeRightSidebar();
      }
    };
  }, [closeRightSidebar]);

  return {
    ...rest,
    isRightSidebarOpen,
    openRightSidebar: openScopedRightSidebar,
    closeRightSidebar: closeScopedRightSidebar,
  };
}

export function useDrawerRegistration(
  drawerKey: string,
  rendererFn: DrawerRendererFn,
  dependencies: unknown[] = []
): void {
  const { openRightSidebar, rightSidebarConfig } = useRightSidebar();
  const rendererRef = useRef(rendererFn);
  rendererRef.current = rendererFn;
  const initialCheckedRef = useRef(false);

  useEffect(() => {
    if (!drawerKey) return;

    drawerRegistry.set(drawerKey, (params) => rendererRef.current?.(params) ?? null);

    if (!initialCheckedRef.current) {
      initialCheckedRef.current = true;
      const currentParams = getUrlParams();
      if (currentParams.get('drawer') === drawerKey) {
        const config = rendererRef.current(createEnrichedDrawerParams(currentParams));
        if (config) {
          openRightSidebar({
            ...config,
            drawerKey,
          });
        }
      }
    }

    return () => {
      drawerRegistry.delete(drawerKey);
    };
  }, [drawerKey, openRightSidebar]);

  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (!drawerKey) return;
    if (rightSidebarConfig?.drawerKey !== drawerKey) return;
    if (isUpdatingRef.current) return;

    const currentParams = getUrlParams();
    if (currentParams.get('drawer') !== drawerKey) return;

    const config = rendererRef.current?.(createEnrichedDrawerParams(currentParams));
    if (config) {
      isUpdatingRef.current = true;
      openRightSidebar({
        ...config,
        drawerKey,
      });
      const timer = setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
