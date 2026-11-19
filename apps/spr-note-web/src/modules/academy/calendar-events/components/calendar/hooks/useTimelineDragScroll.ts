import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import type { CalendarDisplayMode } from '../../../types';

interface UseTimelineDragScrollProps {
  displayMode: CalendarDisplayMode;
  selectedDateObj: Date;
  currentDate: Date;
  selectedDay: number;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

export function useTimelineDragScroll({
  displayMode,
  selectedDateObj,
  currentDate,
  selectedDay,
  setCurrentDate,
}: UseTimelineDragScrollProps) {
  const dayStripRef = useRef<HTMLDivElement | null>(null);
  const [isTodayScrolledOutOfView, setIsTodayScrolledOutOfView] = useState(false);
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRafIdRef = useRef<number | null>(null);

  const checkTodayVisibility = useCallback(() => {
    if (!dayStripRef.current || displayMode !== 'timeline') {
      setIsTodayScrolledOutOfView(false);
      return;
    }
    const container = dayStripRef.current;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const todayEl = (container.querySelector(`[data-datestr="${todayStr}"]`) as HTMLElement | null) ||
                    (container.querySelector(`[data-date="${todayStr}"]`) as HTMLElement | null) ||
                    (container.querySelector('[data-today="true"]') as HTMLElement | null);
    if (!todayEl) {
      setIsTodayScrolledOutOfView(true);
      return;
    }

    if (container.clientWidth > 0 && todayEl.offsetWidth > 0) {
      const scrollLeft = container.scrollLeft;
      const clientWidth = container.clientWidth;
      const elLeft = todayEl.offsetLeft;
      const elWidth = todayEl.offsetWidth;

      const isOutScroll = (elLeft + elWidth <= scrollLeft + 8) || (elLeft >= scrollLeft + clientWidth - 8);
      setIsTodayScrolledOutOfView(isOutScroll);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const todayRect = todayEl.getBoundingClientRect();
    if (containerRect.width > 0 && todayRect.width > 0) {
      const isOut = todayRect.right <= containerRect.left + 8 || todayRect.left >= containerRect.right - 8;
      setIsTodayScrolledOutOfView(isOut);
    }
  }, [displayMode]);

  const scrollToTimelineDate = useCallback((date: Date, behavior: ScrollBehavior = 'smooth') => {
    if (!dayStripRef.current || displayMode !== 'timeline') return;
    isProgrammaticScrollRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const targetStr = `${y}-${m}-${d}`;

    const el = dayStripRef.current;
    const targetEl = (el.querySelector(`[data-datestr="${targetStr}"]`) as HTMLElement | null) ||
                     (el.querySelector(`[data-date="${targetStr}"]`) as HTMLElement | null);
    if (targetEl) {
      const targetCenter = targetEl.offsetLeft - (el.clientWidth / 2) + (targetEl.offsetWidth / 2);
      const distance = Math.abs(el.scrollLeft - targetCenter);

      if (behavior === 'auto' || distance > 800) {
        el.scrollLeft = Math.max(0, targetCenter);
      } else {
        targetEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      checkTodayVisibility();
    }, behavior === 'smooth' ? 250 : 20);
  }, [displayMode, checkTodayVisibility]);

  const setupHorizontalScroll = useCallback((el: HTMLElement | null) => {
    if (!el) return () => {};

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const handleWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta !== 0) {
        e.preventDefault();
        e.stopPropagation();
        el.scrollLeft += delta;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const handleMouseLeave = () => {
      isDown = false;
    };
    const handleMouseUp = () => {
      isDown = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('mousemove', handleMouseMove);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleScroll = useCallback(() => {
    checkTodayVisibility();

    if (isProgrammaticScrollRef.current || displayMode !== 'timeline') return;

    if (scrollRafIdRef.current) {
      cancelAnimationFrame(scrollRafIdRef.current);
    }

    scrollRafIdRef.current = requestAnimationFrame(() => {
      const el = dayStripRef.current;
      if (!el || el.children.length === 0) return;

      const centerScroll = el.scrollLeft + el.clientWidth / 2;
      const firstChild = el.children[0] as HTMLElement;
      const itemTotalWidth = firstChild.offsetWidth + 6;
      if (itemTotalWidth <= 0) return;

      const centerIdx = Math.max(
        0,
        Math.min(el.children.length - 1, Math.round(centerScroll / itemTotalWidth))
      );
      const centerEl = el.children[centerIdx] as HTMLElement;
      if (!centerEl) return;

      const y = Number(centerEl.getAttribute('data-year'));
      const m = Number(centerEl.getAttribute('data-month'));
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentDate((prev) => {
          if (prev.getFullYear() === y && prev.getMonth() === m) {
            return prev;
          }
          return new Date(y, m, prev.getDate());
        });
      }
    });
  }, [checkTodayVisibility, displayMode, setCurrentDate]);

  useEffect(() => {
    const el = dayStripRef.current;
    const cleanupDay = setupHorizontalScroll(el);

    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;

    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll, { passive: true });

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          checkTodayVisibility();
        });
        resizeObserver.observe(el);
      }
    }

    const attachIntersectionObserver = () => {
      if (!el || displayMode !== 'timeline') return;
      const todayEl = (el.querySelector('[data-today="true"]') as HTMLElement | null) ||
                      (el.querySelector(`[data-datestr="${new Date().toISOString().split('T')[0]}"]`) as HTMLElement | null);
      if (!todayEl) {
        setIsTodayScrolledOutOfView(true);
        return;
      }

      if (typeof IntersectionObserver !== 'undefined') {
        if (intersectionObserver) intersectionObserver.disconnect();
        intersectionObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const isVisible = entry.isIntersecting && entry.intersectionRatio > 0.15;
              setIsTodayScrolledOutOfView(!isVisible);
            }
          },
          {
            root: el,
            threshold: [0, 0.15, 0.5, 1.0],
          }
        );
        intersectionObserver.observe(todayEl);
      }
    };

    checkTodayVisibility();
    attachIntersectionObserver();

    const t1 = setTimeout(() => {
      checkTodayVisibility();
      attachIntersectionObserver();
    }, 60);
    const t2 = setTimeout(() => {
      checkTodayVisibility();
      attachIntersectionObserver();
    }, 200);
    const t3 = setTimeout(() => {
      checkTodayVisibility();
      attachIntersectionObserver();
    }, 500);

    return () => {
      cleanupDay();
      if (el) {
        el.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleScroll);
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (scrollRafIdRef.current) cancelAnimationFrame(scrollRafIdRef.current);
    };
  }, [displayMode, handleScroll, checkTodayVisibility, setupHorizontalScroll]);

  useLayoutEffect(() => {
    if (displayMode === 'timeline' && dayStripRef.current) {
      const targetDate = selectedDateObj || currentDate;
      scrollToTimelineDate(targetDate, 'auto');
    }
  }, [displayMode, scrollToTimelineDate, selectedDateObj, currentDate]);

  useEffect(() => {
    if (dayStripRef.current && displayMode === 'timeline' && !isProgrammaticScrollRef.current) {
      const activeEl = dayStripRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
      const t1 = setTimeout(checkTodayVisibility, 80);
      const t2 = setTimeout(checkTodayVisibility, 250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [selectedDay, displayMode, checkTodayVisibility]);

  return {
    dayStripRef,
    isTodayScrolledOutOfView,
    scrollToTimelineDate,
    checkTodayVisibility,
  };
}
