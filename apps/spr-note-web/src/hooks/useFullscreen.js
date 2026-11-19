import { useState, useEffect, useCallback } from 'react';

/**
 * Universal Fullscreen State Management Hook
 * Enterprise helper for toggling full screen / maximized view states
 * with automatic Escape key listener and unmount cleanup.
 *
 * @param {Object} options
 * @param {boolean} [options.initialState=false] - Initial fullscreen state
 * @param {Function} [options.onChange] - Optional callback fired on state change
 * @returns {{
 *   isFullscreen: boolean,
 *   setIsFullscreen: Function,
 *   toggleFullscreen: Function,
 *   enterFullscreen: Function,
 *   exitFullscreen: Function
 * }}
 */
export function useFullscreen({ initialState = false, onChange } = {}) {
  const [isFullscreen, setIsFullscreenState] = useState(initialState);

  const setIsFullscreen = useCallback(
    (valOrFn) => {
      setIsFullscreenState((prev) => {
        const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
        if (onChange && next !== prev) {
          onChange(next);
        }
        return next;
      });
    },
    [onChange]
  );

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, [setIsFullscreen]);

  const enterFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, [setIsFullscreen]);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, [setIsFullscreen]);

  // Listen to Escape key to exit fullscreen smoothly
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, setIsFullscreen]);

  return {
    isFullscreen,
    setIsFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}

export default useFullscreen;
