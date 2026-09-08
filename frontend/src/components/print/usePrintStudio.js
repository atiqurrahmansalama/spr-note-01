import React, { useState, useCallback } from 'react';
import UniversalPrintModal from './UniversalPrintModal';

/**
 * usePrintStudio
 * Reusable hook to trigger the Universal Fullscreen Print Studio from any component.
 *
 * Usage:
 * ```jsx
 * const { openPrint, PrintStudioComponent } = usePrintStudio();
 *
 * const handlePrint = () => {
 *   openPrint({
 *     title: 'Teacher Award List & Marksheet',
 *     subtitle: 'Annual Evaluation 2026',
 *     data: studentsList,
 *     columns: tableColumns,
 *     metaItems: [{ label: 'Subject', value: 'Arabic' }],
 *   });
 * };
 *
 * return (
 *   <>
 *     <button onClick={handlePrint}>Print</button>
 *     {PrintStudioComponent}
 *   </>
 * );
 * ```
 */
export function usePrintStudio(initialConfig = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState(initialConfig);

  const openPrint = useCallback((newConfig = {}) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
    setIsOpen(true);
  }, []);

  const closePrint = useCallback(() => {
    setIsOpen(false);
  }, []);

  const PrintStudioComponent = (
    <UniversalPrintModal
      isOpen={isOpen}
      onClose={closePrint}
      {...config}
    />
  );

  return {
    isOpen,
    openPrint,
    closePrint,
    PrintStudioComponent,
    setConfig,
  };
}

export default usePrintStudio;
