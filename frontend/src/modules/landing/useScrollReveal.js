import { useEffect, useRef, useState } from 'react';

/**
 * useScrollReveal
 * High-performance IntersectionObserver hook for scroll-driven reveals & animations.
 * 
 * @param {Object} options
 * @param {number} options.threshold - Visibility threshold (0 to 1)
 * @param {string} options.rootMargin - Root margin for earlier/later trigger
 * @param {boolean} options.triggerOnce - Whether to trigger only once
 * @returns {[React.RefObject, boolean]} [ref, isVisible]
 */
export function useScrollReveal({
  threshold = 0.15,
  rootMargin = '0px 0px -40px 0px',
  triggerOnce = true,
} = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check if IntersectionObserver is available
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isVisible];
}

/**
 * Helper utility to return standard reveal classnames based on visibility and delay
 */
export function getRevealClass(isVisible, delayClass = 'delay-0', variant = 'fade-up') {
  if (variant === 'fade-up') {
    return `transition-all duration-700 ease-out ${delayClass} ${
      isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.98] pointer-events-none'
    }`;
  }
  if (variant === 'fade-in') {
    return `transition-opacity duration-700 ease-out ${delayClass} ${
      isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`;
  }
  if (variant === 'scale-up') {
    return `transition-all duration-700 ease-out ${delayClass} ${
      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
    }`;
  }
  return isVisible ? 'opacity-100' : 'opacity-0';
}
