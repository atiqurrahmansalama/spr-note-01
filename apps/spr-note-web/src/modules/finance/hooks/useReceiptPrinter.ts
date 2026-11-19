import { useState, useCallback } from 'react';
import { financeApi } from '../../../api/financeApi';
import type { MoneyReceipt } from '../types';

export function useReceiptPrinter() {
  const [activeReceipt, setActiveReceipt] = useState<MoneyReceipt | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [printFormat, setPrintFormat] = useState<'A4' | 'POS_80MM'>('A4');

  const openPrintModal = useCallback((receipt: MoneyReceipt, format: 'A4' | 'POS_80MM' = 'A4') => {
    setActiveReceipt(receipt);
    setPrintFormat(format);
    setPrintModalOpen(true);
  }, []);

  const closePrintModal = useCallback(() => {
    setPrintModalOpen(false);
    setActiveReceipt(null);
  }, []);

  const triggerPrint = useCallback(async () => {
    if (!activeReceipt) return;
    try {
      await financeApi.recordReceiptPrint(activeReceipt.id);
      window.print();
    } catch (e) {
      console.error('Failed to log print count audit:', e);
      window.print();
    }
  }, [activeReceipt]);

  return {
    activeReceipt,
    printModalOpen,
    printFormat,
    setPrintFormat,
    openPrintModal,
    closePrintModal,
    triggerPrint,
  };
}
