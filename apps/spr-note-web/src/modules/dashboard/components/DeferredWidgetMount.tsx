import React, { useState, useEffect, useRef } from 'react';
import WidgetSkeleton from './WidgetSkeleton';

export interface DeferredWidgetMountProps {
  children: React.ReactNode;
  isImmediate?: boolean;
  title?: string;
  minHeight?: string;
  rootMargin?: string;
}

/**
 * Enterprise Viewport-Aware Deferred Widget Hydrator (Rule 10 & 13)
 * Defers below-the-fold widget instantiation and execution until near viewport,
 * dropping T=0 React mount duration and main-thread blockage on 4x CPU slowdown.
 */
export default function DeferredWidgetMount({
  children,
  isImmediate = false,
  title,
  minHeight = 'min-h-[220px]',
  rootMargin = '250px 0px',
}: DeferredWidgetMountProps) {
  const [shouldMount, setShouldMount] = useState<boolean>(isImmediate);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isImmediate || shouldMount) return;

    // Check if IntersectionObserver is available
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setShouldMount(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    const el = containerRef.current;
    if (el) {
      observer.observe(el);
    }

    // Safety fallback: Idle hydration after initial critical render completes (2s max)
    let idleId: number | null = null;
    let timerId: NodeJS.Timeout | null = null;

    if ('requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(
        () => setShouldMount(true),
        { timeout: 2500 }
      );
    } else {
      timerId = setTimeout(() => setShouldMount(true), 2000);
    }

    return () => {
      observer.disconnect();
      if (idleId !== null && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, [isImmediate, shouldMount, rootMargin]);

  if (isImmediate || shouldMount) {
    return (
      <React.Suspense fallback={<WidgetSkeleton title={title} minHeight={minHeight} />}>
        {children}
      </React.Suspense>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full min-w-0">
      <WidgetSkeleton title={title} minHeight={minHeight} />
    </div>
  );
}
