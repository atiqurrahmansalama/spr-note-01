import React from 'react';

/**
 * PrintCanvasViewer
 * Realistic physical paper simulation canvas with scaling, margins, orientation, and shadow.
 */
export default function PrintCanvasViewer({
  pageSize = 'A4', // 'A4' | 'LEGAL' | 'LETTER'
  orientation = 'PORTRAIT', // 'PORTRAIT' | 'LANDSCAPE'
  margin = 'NORMAL', // 'NORMAL' | 'NARROW' | 'WIDE' | 'NONE'
  density = 'NORMAL', // 'COMPACT' | 'NORMAL' | 'RELAXED'
  colorMode = 'FULL_COLOR', // 'FULL_COLOR' | 'INK_SAVER' | 'MONOCHROME'
  zoomLevel = 1, // 0.5 to 2.0
  onZoomChange,
  children,
  className = '',
}) {
  const containerRef = React.useRef(null);

  // Handle Ctrl + Scroll / Wheel for buttery smooth, precision page zoom
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !onZoomChange) return;

    let rafId = null;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        // Calculate smooth proportional delta for both trackpads and mouse wheels
        const intensity = Math.abs(e.deltaY) > 50 ? 0.0018 : 0.0035;
        const delta = -e.deltaY * intensity;

        if (rafId) cancelAnimationFrame(rafId);

        rafId = requestAnimationFrame(() => {
          onZoomChange((prev) => {
            const current = typeof prev === 'number' ? prev : zoomLevel;
            const target = current * (1 + delta);
            const clamped = Math.min(2.5, Math.max(0.3, target));
            return Math.round(clamped * 100) / 100;
          });
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [onZoomChange, zoomLevel]);

  return (
    <div
      ref={containerRef}
      className={`universal-print-canvas-wrapper w-full h-full overflow-auto flex justify-center items-start p-6 sm:p-10 select-none print:p-0 print:m-0 print:overflow-visible print:block print:bg-white ${className}`}
    >
      {/* Scalable Container with Native Crisp Vector Zoom */}
      <div
        style={{
          zoom: zoomLevel,
        }}
        className="universal-print-transform-wrapper pb-16 print:p-0 print:m-0 print:w-full print:block print:bg-transparent"
      >
        {/* Physical Paper Sheet Simulation */}
        <div
          id="universal-print-portal"
          className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white"
          data-size={pageSize}
          data-orientation={orientation}
          data-margin={margin}
          data-density={density}
          data-color-mode={colorMode}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
