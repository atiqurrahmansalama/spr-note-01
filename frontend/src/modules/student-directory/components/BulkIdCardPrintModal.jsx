import React, { useState, useEffect, useMemo } from 'react';
import { getDocumentTemplatesByType } from '../../../api/documentTemplates';
import { useTenant } from '../../../context/TenantContext';
import { useToast } from '../../../context/ToastContext';
import IdCardRenderer from '../../../components/documents/renderers/IdCardRenderer';
import { CloseIcon, SparklesIcon, CheckCircleIcon } from '../../../components/ui/Icons';

export default function BulkIdCardPrintModal({
  isOpen,
  onClose,
  selectedStudentIds = [],
  allStudents = [],
}) {
  const { showToast } = useToast();
  const { currentInstitution } = useTenant();

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Print Configuration
  const [printLayout, setPrintLayout] = useState('A4_SHEET'); // 'A4_SHEET' | 'PVC_TRAY'
  const [cardSide, setCardSide] = useState('front'); // 'front' | 'back' | 'both'
  const [overlayMode, setOverlayMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await getDocumentTemplatesByType('ID_CARD');
      const list = res.templates || [];
      setTemplates(list);
      const defaultTpl = res.default_template || list[0];
      setSelectedTemplate(defaultTpl);
      if (defaultTpl?.layout_config?.overlay_only_mode) {
        setOverlayMode(true);
      }
    } catch (err) {
      console.error('[BulkIdCardPrintModal] Error:', err);
      showToast('Failed to load ID card templates.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedStudents = useMemo(() => {
    if (!selectedStudentIds.length) return [];
    return allStudents.filter((s) => selectedStudentIds.includes(s.id));
  }, [selectedStudentIds, allStudents]);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocker prevented print window.', 'error');
      return;
    }

    const orientation = selectedTemplate?.orientation || 'PORTRAIT';
    const isLandscape = orientation === 'LANDSCAPE';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bulk ID Cards Print - ${selectedStudents.length} Students</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: ${printLayout === 'PVC_TRAY' ? (isLandscape ? '86mm 54mm' : '54mm 86mm') : 'A4 portrait'};
              margin: ${printLayout === 'PVC_TRAY' ? '0mm' : '8mm'};
            }
            body {
              margin: 0;
              padding: ${printLayout === 'PVC_TRAY' ? '0' : '10px'};
              font-family: system-ui, -apple-system, sans-serif;
              background: #fff;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .card-item {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            ${printLayout === 'PVC_TRAY' ? '.card-item { page-break-after: always; break-after: page; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }' : ''}
            @media print {
              .no-print { display: none !important; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="no-print mb-6 p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-2xl max-w-3xl mx-auto">
            <div>
              <h3 class="font-bold text-sm">Bulk Print Ready (${selectedStudents.length} Students)</h3>
              <p class="text-xs text-slate-400">Layout: ${printLayout === 'PVC_TRAY' ? 'Single Plastic PVC Card Tray' : 'Standard A4 Multi-Card Sheet'}</p>
            </div>
            <button onclick="window.print()" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg">
              🖨️ Confirm & Print
            </button>
          </div>
          <div class="${printLayout === 'PVC_TRAY' ? 'block' : 'grid grid-cols-2 gap-4 justify-items-center max-w-4xl mx-auto'}">
            ${document.getElementById('bulk-cards-print-area')?.innerHTML || ''}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-5xl h-[90vh] rounded-3xl theme-bg-elevated border theme-border shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
        {/* Modal Top Header */}
        <div className="p-4 sm:px-6 border-b theme-border flex items-center justify-between gap-4 shrink-0 theme-bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black theme-text-primary tracking-tight">
                Bulk Smart ID Card Generator & Print Manager
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                Ready to generate ID badges for <strong className="theme-text-primary">{selectedStudents.length} selected students</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Settings Bar */}
        <div className="p-3.5 px-6 border-b theme-border theme-bg-sub/50 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Template Selector */}
            <div className="flex items-center gap-2">
              <span className="font-bold theme-text-secondary">Template:</span>
              <select
                value={selectedTemplate?.id || ''}
                onChange={(e) => {
                  const t = templates.find((tpl) => tpl.id === e.target.value);
                  if (t) setSelectedTemplate(t);
                }}
                className="px-3 py-1.5 rounded-xl theme-bg-elevated border theme-border font-semibold theme-text-primary focus:outline-none cursor-pointer"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.template_name} {t.is_default ? '★ (Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Print Sheet Mode */}
            <div className="flex items-center gap-2">
              <span className="font-bold theme-text-secondary">Layout:</span>
              <select
                value={printLayout}
                onChange={(e) => setPrintLayout(e.target.value)}
                className="px-3 py-1.5 rounded-xl theme-bg-elevated border theme-border font-semibold theme-text-primary focus:outline-none cursor-pointer"
              >
                <option value="A4_SHEET">A4 Multi-Card Sheet (Grid)</option>
                <option value="PVC_TRAY">Single Plastic Card PVC Tray</option>
              </select>
            </div>

            {/* Card Sides Toggle */}
            <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-xl border theme-border">
              <button
                type="button"
                onClick={() => setCardSide('front')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  cardSide === 'front' ? 'theme-bg-elevated theme-text-primary shadow-xs' : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => setCardSide('back')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  cardSide === 'back' ? 'theme-bg-elevated theme-text-primary shadow-xs' : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCardSide('both')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  cardSide === 'both' ? 'theme-bg-elevated theme-text-primary shadow-xs' : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                Both
              </button>
            </div>

            {/* Overlay Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer font-bold theme-text-primary">
              <input
                type="checkbox"
                checked={overlayMode}
                onChange={(e) => setOverlayMode(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 theme-bg-elevated theme-border cursor-pointer"
              />
              <span>Pre-Printed PVC Overlay</span>
            </label>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 rounded-2xl theme-bg-accent theme-accent-text text-xs font-black shadow-md transition cursor-pointer hover:opacity-90 flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>Print All ({selectedStudents.length})</span>
          </button>
        </div>

        {/* Live Grid Preview */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 theme-bg-app">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <div className="w-8 h-8 border-3 border-[var(--accent-main)] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs theme-text-secondary">Preparing ID card templates...</p>
            </div>
          ) : selectedStudents.length === 0 ? (
            <div className="text-center py-20 theme-text-secondary text-xs">
              No students selected. Please select at least one student from the directory.
            </div>
          ) : (
            <div
              id="bulk-cards-print-area"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center"
            >
              {selectedStudents.map((student) => (
                <div key={student.id} className="card-item flex justify-center">
                  <IdCardRenderer
                    student={student}
                    institution={currentInstitution || {}}
                    layoutConfig={{
                      ...(selectedTemplate?.layout_config || {}),
                      overlay_only_mode: overlayMode,
                    }}
                    orientation={selectedTemplate?.orientation || 'PORTRAIT'}
                    side={cardSide}
                    scale={0.9}
                    isOverlayMode={overlayMode}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t theme-border theme-bg-surface flex items-center justify-between shrink-0 text-xs">
          <span className="theme-text-secondary">
            Total Cards: <strong className="theme-text-primary">{selectedStudents.length}</strong> • Template: <strong className="theme-text-primary">{selectedTemplate?.template_name}</strong>
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl theme-bg-sub border theme-border text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-2.5 rounded-2xl theme-bg-accent theme-accent-text text-xs font-black shadow-md transition cursor-pointer hover:opacity-90 flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>Open Print Dialog</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
