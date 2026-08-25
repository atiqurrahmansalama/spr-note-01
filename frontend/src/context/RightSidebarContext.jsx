import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

/**
 * Standard drawer width presets:
 * - sm (Small): 420px -> Quick filters, lightweight forms, confirmation screens
 * - md (Medium): 560px -> Standard forms, event/schedule creation, entity profiles
 * - lg (Big / Large): 760px -> Multi-column forms, detailed logs, complex matrices
 */
export const DRAWER_SIZES = {
  sm: 440,
  small: 440,
  md: 580,
  medium: 580,
  lg: 760,
  big: 760,
  large: 760,
  xl: 960,
};

export function resolveDrawerWidth(sizeOrWidth) {
  if (typeof sizeOrWidth === 'number' && sizeOrWidth > 0) return sizeOrWidth;
  if (typeof sizeOrWidth === 'string') {
    const key = sizeOrWidth.toLowerCase();
    if (DRAWER_SIZES[key]) return DRAWER_SIZES[key];
    const parsed = parseInt(sizeOrWidth, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DRAWER_SIZES.md;
}

// Global registry for drawer renderers
const drawerRegistry = new Map();

/**
 * Helper to update URL search parameters without triggering a hard page refresh
 */
function updateUrlParams(updater) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    updater(url.searchParams);
    window.history.replaceState({}, '', url.toString());
  } catch (e) {
    console.warn('Failed to update URL parameters:', e);
  }
}

/**
 * Helper to get current URL search parameters
 */
function getUrlParams() {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

const RightSidebarContext = createContext({
  isRightSidebarOpen: false,
  rightSidebarConfig: null,
  drawerWidth: 580,
  setDrawerWidth: () => {},
  openRightSidebar: () => {},
  closeRightSidebar: () => {},
  openDrawer: () => {},
  closeDrawer: () => {},
});

export function RightSidebarProvider({ children }) {
  const [rightSidebarConfig, setRightSidebarConfig] = useState(null);
  const [drawerWidth, setDrawerWidthState] = useState(580);

  const setDrawerWidth = useCallback((widthOrFn) => {
    setDrawerWidthState((prev) => {
      const next = typeof widthOrFn === 'function' ? widthOrFn(prev) : widthOrFn;
      try {
        localStorage.setItem('spr_right_drawer_width', String(next));
      } catch {}
      return next;
    });
  }, []);

  const configRef = useRef(null);
  configRef.current = rightSidebarConfig;

  const closeRightSidebar = useCallback((skipUrlClean = false) => {
    if (!skipUrlClean) {
      updateUrlParams((params) => {
        params.delete('drawer');
        params.delete('drawerId');
        params.delete('mode');
        params.delete('date');
        params.delete('eventId');
        params.delete('targetId');
        params.delete('classId');
        params.delete('type');
      });
    }

    if (configRef.current?.onClose) {
      try {
        configRef.current.onClose();
      } catch (err) {
        console.warn('Error during right sidebar onClose callback:', err);
      }
    }
    setRightSidebarConfig(null);
  }, []);

  const openRightSidebar = useCallback((config) => {
    if (!config) {
      closeRightSidebar();
      return;
    }
    const { title, content, size = 'md', width, onClose, ownerId, drawerKey, ...restConfig } = config;

    const resolvedWidth = resolveDrawerWidth(width || size);
    setDrawerWidth(resolvedWidth);

    if (drawerKey) {
      updateUrlParams((params) => {
        params.set('drawer', drawerKey);
      });
    }

    setRightSidebarConfig({
      title: title || 'Action Panel',
      content: content || null,
      size: size || 'md',
      width: resolvedWidth,
      drawerKey: drawerKey || null,
      onClose: onClose || null,
      ownerId: ownerId || null,
      ...restConfig,
    });
  }, [setDrawerWidth]);

  /**
   * openDrawer
   * Industry-standard: opens a registered drawer by key and syncs query params to the URL
   */
  const openDrawer = useCallback((drawerKeyOrConfig, queryParams = {}) => {
    if (!drawerKeyOrConfig) return;

    if (typeof drawerKeyOrConfig === 'object' && drawerKeyOrConfig !== null) {
      openRightSidebar(drawerKeyOrConfig);
      return;
    }

    const drawerKey = drawerKeyOrConfig;

    updateUrlParams((params) => {
      params.set('drawer', drawerKey);
      Object.entries(queryParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.set(k, String(v));
        } else {
          params.delete(k);
        }
      });
    });

    const renderer = drawerRegistry.get(drawerKey);
    if (renderer) {
      const currentParams = getUrlParams();
      const config = renderer(currentParams);
      if (config) {
        openRightSidebar({
          ...config,
          drawerKey,
        });
      }
    }
  }, [openRightSidebar]);

  const closeDrawer = useCallback(() => {
    closeRightSidebar(false);
  }, [closeRightSidebar]);

  // Listen to browser Back/Forward popstate to close drawer naturally
  useEffect(() => {
    const handlePopState = () => {
      const currentDrawer = getUrlParams().get('drawer');
      if (!currentDrawer && configRef.current) {
        closeRightSidebar(true);
      } else if (currentDrawer && drawerRegistry.has(currentDrawer)) {
        const renderer = drawerRegistry.get(currentDrawer);
        const config = renderer(getUrlParams());
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

  return (
    <RightSidebarContext.Provider
      value={{
        isRightSidebarOpen,
        rightSidebarConfig,
        drawerWidth,
        setDrawerWidth,
        openRightSidebar,
        closeRightSidebar,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </RightSidebarContext.Provider>
  );
}

export function useRightSidebar() {
  const context = useContext(RightSidebarContext);
  if (!context) {
    return {
      isRightSidebarOpen: false,
      rightSidebarConfig: null,
      drawerWidth: 560,
      setDrawerWidth: () => {},
      openRightSidebar: () => {},
      closeRightSidebar: () => {},
      openDrawer: () => {},
      closeDrawer: () => {},
    };
  }
  return context;
}

/**
 * useScopedRightSidebar
 * A hook for components that open the right sidebar and want it to automatically
 * close whenever the parent component unmounts.
 */
export function useScopedRightSidebar() {
  const { openRightSidebar, closeRightSidebar, isRightSidebarOpen, ...rest } = useRightSidebar();
  const isOwnerRef = useRef(false);

  const openScopedRightSidebar = useCallback(
    (config) => {
      isOwnerRef.current = true;
      openRightSidebar({
        ...config,
        onClose: () => {
          isOwnerRef.current = false;
          if (config.onClose) config.onClose();
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

export function useDrawerRegistration(drawerKey, rendererFn, _dependencies = []) {
  const { openRightSidebar } = useRightSidebar();
  const rendererRef = useRef(rendererFn);
  rendererRef.current = rendererFn;
  const initialCheckedRef = useRef(false);

  useEffect(() => {
    if (!drawerKey) return;

    // Register renderer in global map
    drawerRegistry.set(drawerKey, (params) => {
      if (rendererRef.current) {
        return rendererRef.current(params);
      }
      return null;
    });

    // Check if the current URL has this drawer requested on initial mount
    if (!initialCheckedRef.current) {
      initialCheckedRef.current = true;
      const currentParams = getUrlParams();
      if (currentParams.get('drawer') === drawerKey) {
        const config = rendererRef.current(currentParams);
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
}
