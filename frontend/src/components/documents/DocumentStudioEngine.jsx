import React, { useState, useEffect, useMemo } from 'react';
import {
  getDocumentTemplatesByType,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  setDefaultDocumentTemplate,
  getDocumentSampleData,
} from '../../api/documentTemplates';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { fetchWithAuth } from '../../utils/authService';
import IdCardRenderer from './renderers/IdCardRenderer';
import AdmissionSlipRenderer from './renderers/AdmissionSlipRenderer';
import CertificateRenderer from './renderers/CertificateRenderer';
import ReportBannerRenderer from './renderers/ReportBannerRenderer';
import {
  EditIcon,
  SaveIcon,
  TrashIcon,
  CheckCircleIcon,
  SearchIcon,
  PlusIcon,
  UploadIcon,
  UsersIcon,
  ClassIcon,
  SparklesIcon,
} from '../ui/Icons';

// Color Palette Presets
const THEME_PRESETS = [
  { name: 'Classic Emerald', theme: '#064e3b', accent: '#10b981', text: '#ffffff', bg: 'GRADIENT' },
  { name: 'Navy Horizon', theme: '#0f172a', accent: '#0284c7', text: '#ffffff', bg: 'GRADIENT' },
  { name: 'Dark Slate & Amber', theme: '#1e293b', accent: '#f59e0b', text: '#ffffff', bg: 'GRADIENT' },
  { name: 'Royal Gold & Indigo', theme: '#1e1b4b', accent: '#d97706', text: '#ffffff', bg: 'GRADIENT' },
  { name: 'Minimal Clean White', theme: '#0369a1', accent: '#0ea5e9', text: '#0f172a', bg: 'CLEAN_WHITE' },
  { name: 'Crimson Velvet', theme: '#881337', accent: '#f43f5e', text: '#ffffff', bg: 'GRADIENT' },
];

export default function DocumentStudioEngine({
  documentType = 'ID_CARD', // 'ID_CARD' | 'ADMISSION_SLIP' | 'TESTIMONIAL_CERTIFICATE' | 'REPORT_BANNER'
  onSaveTemplate,
  initialTemplateId = null,
  selectedStudentId = null,
  embeddedMode = false,
  className = '',
}) {
  const { showToast } = useToast();
  const { currentInstitution } = useTenant();

  // Studio State
  const [activeTab, setActiveTab] = useState('layout'); // 'layout' | 'fields' | 'branding' | 'back' | 'presets'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [cardSide, setCardSide] = useState('both'); // 'front' | 'back' | 'both'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Templates Data
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);

  // Preview Data
  const [samplePayload, setSamplePayload] = useState(null);
  const [realStudents, setRealStudents] = useState([]);
  const [selectedStudentMode, setSelectedStudentMode] = useState('SAMPLE'); // 'SAMPLE' | studentId

  // Live Inspector Layout Config
  const [layoutConfig, setLayoutConfig] = useState({
    theme_color: '#064e3b',
    accent_color: '#10b981',
    text_color: '#ffffff',
    bg_style: 'GRADIENT',
    overlay_only_mode: false,
    photo_frame_style: 'ROUNDED',
    show_bismillah: true,
    show_logo: true,
    show_qr_code: true,
    show_barcode: true,
    show_blood_group: true,
    show_guardian_contact: true,
    show_dob: true,
    show_halqa: true,
    show_district: true,
    show_student_id: true,
    show_department: true,
    show_class: true,
    show_group: true,
    header_bn: '',
    header_en: '',
    back_terms: 'This identity card is property of the institution. If found, please return to campus office.',
    signature_title: 'Principal / Muhtamim',
    signature_url: null,
    emergency_contact: '',
    field_order: ['student_name', 'student_id', 'department', 'class', 'group', 'blood_group', 'guardian_phone'],
  });

  const [orientation, setOrientation] = useState('PORTRAIT');
  const [pageSize, setPageSize] = useState('CR80_PVC');

  // Load templates & sample data on mount or documentType change
  useEffect(() => {
    loadStudioData();
  }, [documentType]);

  const loadStudioData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch templates
      const res = await getDocumentTemplatesByType(documentType);
      const list = res.templates || [];
      setTemplates(list);

      const activeTpl = list.find((t) => t.id === initialTemplateId) || res.default_template || list[0];
      if (activeTpl) {
        applyTemplateToState(activeTpl);
      }

      // 2. Fetch sample data
      const sample = await getDocumentSampleData();
      setSamplePayload(sample);

      // 3. Fetch real students for preview dropdown
      try {
        const stuRes = await fetchWithAuth('/api/v1/students/?page_size=15');
        if (stuRes.ok) {
          const stuData = await stuRes.json();
          setRealStudents(Array.isArray(stuData) ? stuData : stuData.results || []);
        }
      } catch {}
    } catch (err) {
      console.error('[DocumentStudioEngine] Load error:', err);
      showToast('Failed to load document studio data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const applyTemplateToState = (tpl) => {
    setSelectedTemplate(tpl);
    setOrientation(tpl.orientation || 'PORTRAIT');
    setPageSize(tpl.page_size || (documentType === 'ID_CARD' ? 'CR80_PVC' : 'A4'));
    if (tpl.layout_config) {
      setLayoutConfig((prev) => ({
        ...prev,
        ...tpl.layout_config,
      }));
    }
  };

  // Preview Student Object
  const currentPreviewStudent = useMemo(() => {
    if (selectedStudentMode !== 'SAMPLE') {
      const found = realStudents.find((s) => String(s.id) === String(selectedStudentMode));
      if (found) return found;
    }
    return samplePayload?.sample_student || {
      id: 101,
      uniq_id: 'STU-2026-0042',
      name: 'Ahmad Abdullah',
      bangla_name: 'মুহাম্মাদ আব্দুল্লাহ',
      blood_group: 'B+',
      guardian_name: 'Maulana Abu Bakr',
      guardian_phone: '01812-345678',
      department_name: 'Hifzul Quran Division',
      student_class_name: 'Standard Hifz',
      student_group_name: 'Halqa A',
      admission_date: '2026-01-10',
    };
  }, [selectedStudentMode, realStudents, samplePayload]);

  const institutionData = useMemo(() => {
    return {
      name: currentInstitution?.name || samplePayload?.institution?.name || 'JAMIA DARUL QURAN',
      bangla_name: currentInstitution?.bangla_name || samplePayload?.institution?.bangla_name || 'جامعة دار القرآن الإسلامية',
      logo_url: currentInstitution?.logo_url || currentInstitution?.logo_data || samplePayload?.institution?.logo_url || '',
      phone: currentInstitution?.phone || samplePayload?.institution?.phone || '01700000000',
      email: currentInstitution?.email || samplePayload?.institution?.email || '',
      address: currentInstitution?.address || samplePayload?.institution?.address || 'Campus Location',
      district: currentInstitution?.district || samplePayload?.institution?.district || 'Dhaka, Bangladesh',
      eiin_or_reg_no: currentInstitution?.eiin_or_reg_no || samplePayload?.institution?.eiin_or_reg_no || 'REG-102938',
      institution_type: currentInstitution?.institution_type || 'MADRASA',
    };
  }, [currentInstitution, samplePayload]);

  // Handler: Update Layout Field
  const updateCfg = (key, value) => {
    setLayoutConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Handler: Apply Theme Preset
  const applyThemePreset = (preset) => {
    setLayoutConfig((prev) => ({
      ...prev,
      theme_color: preset.theme,
      accent_color: preset.accent,
      text_color: preset.text,
      bg_style: preset.bg,
    }));
  };

  // Handler: Save / Update Current Preset
  const handleUpdateCurrentPreset = async () => {
    if (!selectedTemplate) return;
    try {
      setIsSaving(true);
      const payload = {
        template_name: selectedTemplate.template_name,
        document_type: documentType,
        orientation,
        page_size: pageSize,
        layout_config: layoutConfig,
      };
      const updated = await updateDocumentTemplate(selectedTemplate.id, payload);
      showToast(`Template '${updated.template_name}' updated successfully.`, 'success');
      setSelectedTemplate(updated);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (onSaveTemplate) onSaveTemplate(updated);
    } catch (err) {
      showToast(err.message || 'Failed to save template changes.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Save as New Preset
  const handleSaveAsNewPreset = async () => {
    if (!newPresetName.trim()) {
      showToast('Please enter a template preset name.', 'error');
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        template_name: newPresetName.trim(),
        document_type: documentType,
        orientation,
        page_size: pageSize,
        is_default: false,
        layout_config: layoutConfig,
      };
      const created = await createDocumentTemplate(payload);
      showToast(`New preset '${created.template_name}' created!`, 'success');
      setTemplates((prev) => [created, ...prev]);
      setSelectedTemplate(created);
      setShowSaveAsModal(false);
      setNewPresetName('');
      if (onSaveTemplate) onSaveTemplate(created);
    } catch (err) {
      showToast(err.message || 'Failed to create new preset.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Set as Default
  const handleSetDefault = async (tpl) => {
    try {
      setIsSaving(true);
      const res = await setDefaultDocumentTemplate(tpl.id);
      showToast(`'${tpl.template_name}' is now the default template.`, 'success');
      setTemplates((prev) =>
        prev.map((t) => ({
          ...t,
          is_default: t.id === tpl.id,
        }))
      );
      setSelectedTemplate({ ...tpl, is_default: true });
    } catch (err) {
      showToast(err.message || 'Failed to set default template.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Delete Preset
  const handleDeletePreset = async (tpl) => {
    if (!window.confirm(`Are you sure you want to delete template '${tpl.template_name}'?`)) return;
    try {
      await deleteDocumentTemplate(tpl.id);
      showToast(`Template '${tpl.template_name}' deleted.`, 'success');
      const filtered = templates.filter((t) => t.id !== tpl.id);
      setTemplates(filtered);
      if (filtered.length > 0) {
        applyTemplateToState(filtered[0]);
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete template.', 'error');
    }
  };

  // Handler: Print Test PDF / Window
  const handlePrintTest = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocker prevented print window. Please allow popups.', 'error');
      return;
    }

    const isCard = documentType === 'ID_CARD';
    const orientationStyle = orientation === 'LANDSCAPE' ? '@page { size: landscape; margin: 5mm; }' : '@page { size: portrait; margin: 5mm; }';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${selectedTemplate?.template_name || 'Document Print Preview'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            ${orientationStyle}
            body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; background: #fff; }
            @media print {
              body { padding: 0; background: transparent; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body class="flex flex-col items-center justify-center min-h-screen">
          <div class="no-print mb-6 p-4 rounded-xl bg-slate-900 text-white flex items-center gap-4 shadow-xl">
            <span class="text-sm font-bold">Document Print Ready (${pageSize} — ${orientation})</span>
            <button onclick="window.print()" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer">
              🖨️ Confirm Print
            </button>
          </div>
          <div id="print-root" class="flex justify-center items-center">
            ${document.getElementById('studio-canvas-stage')?.innerHTML || 'Loading preview...'}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Render Visual Canvas based on Document Type
  const renderCanvasDocument = () => {
    switch (documentType) {
      case 'ID_CARD':
        return (
          <IdCardRenderer
            student={currentPreviewStudent}
            institution={institutionData}
            layoutConfig={layoutConfig}
            orientation={orientation}
            side={cardSide}
            scale={zoomLevel}
            isOverlayMode={layoutConfig.overlay_only_mode}
          />
        );
      case 'ADMISSION_SLIP':
        return (
          <AdmissionSlipRenderer
            student={currentPreviewStudent}
            institution={institutionData}
            layoutConfig={layoutConfig}
            scale={zoomLevel}
          />
        );
      case 'TESTIMONIAL_CERTIFICATE':
        return (
          <CertificateRenderer
            student={currentPreviewStudent}
            institution={institutionData}
            layoutConfig={layoutConfig}
            scale={zoomLevel}
          />
        );
      case 'REPORT_BANNER':
      default:
        return (
          <ReportBannerRenderer
            institution={institutionData}
            layoutConfig={layoutConfig}
            scale={zoomLevel}
          />
        );
    }
  };

  return (
    <div
      className={`flex flex-col w-full theme-bg-app rounded-3xl border theme-border overflow-hidden shadow-2xl ${
        isFullscreen ? 'fixed inset-0 z-[9999] rounded-none border-none' : 'h-[780px]'
      } ${className}`}
    >
      {/* Studio Header Toolbar */}
      <div className="p-4 sm:px-6 py-3.5 border-b theme-border theme-bg-elevated flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl theme-bg-accent/15 border border-[var(--accent-main)]/30 flex items-center justify-center text-[var(--accent-main)] shadow-xs shrink-0">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black theme-text-primary tracking-tight flex items-center gap-2">
              <span>Universal Document & Smart ID Card Studio</span>
              {layoutConfig.overlay_only_mode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  PVC Wireframe Overlay
                </span>
              )}
            </h3>
            <p className="text-[11px] theme-text-secondary">
              Active Preset: <strong className="theme-text-primary">{selectedTemplate?.template_name || 'Custom Configuration'}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset Selector Dropdown */}
          <select
            value={selectedTemplate?.id || ''}
            onChange={(e) => {
              const found = templates.find((t) => t.id === e.target.value);
              if (found) applyTemplateToState(found);
            }}
            className="px-3 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] cursor-pointer"
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.template_name} {tpl.is_default ? '★ (Default)' : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleUpdateCurrentPreset}
            disabled={isSaving || !selectedTemplate}
            className="px-3.5 py-1.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 disabled:opacity-50 text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <SaveIcon className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSaveAsModal(true)}
            className="px-3.5 py-1.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-primary transition cursor-pointer flex items-center gap-1.5"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Save As New</span>
          </button>

          <button
            type="button"
            onClick={handlePrintTest}
            className="px-3.5 py-1.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold text-sky-400 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>Print Test</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>
        </div>
      </div>

      {/* Main Dual Pane Studio Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* ========================================================================= */}
        {/* LEFT PANE: LIVE INTERACTIVE WYSIWYG CANVAS */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full border-r theme-border overflow-hidden theme-bg-app">
          {/* Canvas Sub-Toolbar */}
          <div className="p-3 px-4 border-b theme-border theme-bg-sub/40 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
            {/* ID Card Front/Back Toggle */}
            {documentType === 'ID_CARD' ? (
              <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-xl border theme-border">
                <button
                  type="button"
                  onClick={() => setCardSide('front')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    cardSide === 'front' ? 'theme-bg-elevated theme-text-primary shadow-xs' : 'theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  Front Side
                </button>
                <button
                  type="button"
                  onClick={() => setCardSide('back')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    cardSide === 'back' ? 'theme-bg-elevated theme-text-primary shadow-xs' : 'theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  Back Side
                </button>
                <button
                  type="button"
                  onClick={() => setCardSide('both')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    cardSide === 'both' ? 'theme-bg-elevated theme-text-primary shadow-xs' : 'theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  Both Sides
                </button>
              </div>
            ) : (
              <span className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
                {documentType.replace('_', ' ')} Studio Canvas
              </span>
            )}

            {/* Student Preview Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] theme-text-secondary font-medium">Data:</span>
              <select
                value={selectedStudentMode}
                onChange={(e) => setSelectedStudentMode(e.target.value)}
                className="px-2.5 py-1 rounded-lg theme-bg-sub border theme-border text-xs font-medium theme-text-primary focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                <option value="SAMPLE">✨ Sample Mock Student</option>
                {realStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.roll_number || s.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Zoom Slider */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] theme-text-secondary font-medium">Zoom:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel(0.75)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${zoomLevel === 0.75 ? 'theme-bg-accent theme-accent-text' : 'theme-bg-sub theme-text-secondary'}`}
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${zoomLevel === 1 ? 'theme-bg-accent theme-accent-text' : 'theme-bg-sub theme-text-secondary'}`}
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1.25)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${zoomLevel === 1.25 ? 'theme-bg-accent theme-accent-text' : 'theme-bg-sub theme-text-secondary'}`}
                >
                  125%
                </button>
              </div>
            </div>
          </div>

          {/* Live Stage Container */}
          <div className="flex-1 overflow-auto p-6 sm:p-10 flex items-center justify-center bg-dot-grid relative">
            <div id="studio-canvas-stage" className="flex items-center justify-center p-4">
              {renderCanvasDocument()}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANE: TABBED TEMPLATE INSPECTOR */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full theme-bg-surface overflow-hidden">
          {/* Inspector Tabs */}
          <div className="flex items-center border-b theme-border theme-bg-elevated p-1 gap-1 overflow-x-auto shrink-0">
            {[
              { id: 'layout', label: 'Layout' },
              { id: 'fields', label: 'Fields' },
              { id: 'branding', label: 'Colors' },
              { id: 'back', label: 'Terms' },
              { id: 'presets', label: 'Presets' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold tracking-tight transition cursor-pointer text-center whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'theme-bg-accent theme-accent-text shadow-xs'
                    : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Inspector Form Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
            {/* --- TAB 1: LAYOUT & DIMENSIONS --- */}
            {activeTab === 'layout' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Card Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setOrientation('PORTRAIT')}
                      className={`p-3 rounded-2xl border text-center font-bold transition cursor-pointer ${
                        orientation === 'PORTRAIT'
                          ? 'border-[var(--accent-main)] bg-[var(--accent-main)]/15 theme-text-primary'
                          : 'theme-border theme-bg-sub theme-text-secondary hover:theme-text-primary'
                      }`}
                    >
                      <span>📱 Portrait (Vertical)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation('LANDSCAPE')}
                      className={`p-3 rounded-2xl border text-center font-bold transition cursor-pointer ${
                        orientation === 'LANDSCAPE'
                          ? 'border-[var(--accent-main)] bg-[var(--accent-main)]/15 theme-text-primary'
                          : 'theme-border theme-bg-sub theme-text-secondary hover:theme-text-primary'
                      }`}
                    >
                      <span>💻 Landscape (Horizontal)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Target Print Size
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] cursor-pointer"
                  >
                    <option value="CR80_PVC">CR80 Standard PVC Card (54 × 85.6 mm)</option>
                    <option value="A4">A4 Standard Document Sheet</option>
                    <option value="A5">A5 Half-Page Voucher</option>
                    <option value="CUSTOM">Custom Sized Canvas</option>
                  </select>
                </div>

                {/* Pre-Printed PVC Wireframe Overlay Toggle */}
                <div className="p-4 rounded-2xl border theme-border theme-bg-sub/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold theme-text-primary">
                        Pre-Printed Plastic Card Overlay Mode
                      </h4>
                      <p className="text-[11px] theme-text-secondary mt-0.5">
                        Omit background gradients & static headers for direct PVC tray printing.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="overlay_mode_check"
                      checked={Boolean(layoutConfig.overlay_only_mode)}
                      onChange={(e) => updateCfg('overlay_only_mode', e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 theme-bg-elevated theme-border cursor-pointer shrink-0"
                    />
                  </div>
                </div>

                {/* Background Styling */}
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Background Aesthetic Style
                  </label>
                  <select
                    value={layoutConfig.bg_style || 'GRADIENT'}
                    onChange={(e) => updateCfg('bg_style', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] cursor-pointer"
                  >
                    <option value="GRADIENT">Ambient Linear Gradient</option>
                    <option value="SOLID">Solid Primary Color</option>
                    <option value="CLEAN_WHITE">Minimal Clean White</option>
                    <option value="ORNATE_BORDER">Ornate Academic Border</option>
                  </select>
                </div>
              </div>
            )}

            {/* --- TAB 2: FIELDS & VISIBILITY --- */}
            {activeTab === 'fields' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Photo Frame Geometry
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'ROUNDED', label: 'Rounded Square' },
                      { id: 'CIRCLE', label: 'Circular Avatar' },
                      { id: 'SQUARE_SHADOW', label: 'Elevated Shadow' },
                      { id: 'SQUARE', label: 'Sharp Rectangle' },
                    ].map((shape) => (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => updateCfg('photo_frame_style', shape.id)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition cursor-pointer ${
                          layoutConfig.photo_frame_style === shape.id
                            ? 'border-[var(--accent-main)] bg-[var(--accent-main)]/15 theme-text-primary'
                            : 'theme-border theme-bg-sub theme-text-secondary hover:theme-text-primary'
                        }`}
                      >
                        {shape.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t theme-border">
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-3">
                    Active Visible Fields
                  </label>
                  <div className="space-y-2">
                    {[
                      { key: 'show_bismillah', label: 'Bismillah Calligraphy Header' },
                      { key: 'show_logo', label: 'Institutional Emblem / Logo' },
                      { key: 'show_student_id', label: 'Student Unique ID / Roll Badge' },
                      { key: 'show_blood_group', label: 'Blood Group Indicator Badge' },
                      { key: 'show_guardian_contact', label: 'Guardian Emergency Contact' },
                      { key: 'show_department', label: 'Department / Division Name' },
                      { key: 'show_class', label: 'Class & Standard Grade' },
                      { key: 'show_halqa', label: 'Halqa / Section Group' },
                      { key: 'show_qr_code', label: 'Dynamic Verification QR Code' },
                      { key: 'show_barcode', label: 'Vector Scannable Barcode' },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center justify-between p-2.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated cursor-pointer transition"
                      >
                        <span className="font-semibold theme-text-primary">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(layoutConfig[item.key])}
                          onChange={(e) => updateCfg(item.key, e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 theme-bg-elevated theme-border cursor-pointer shrink-0"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB 3: BRANDING & COLORS --- */}
            {activeTab === 'branding' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Color Palette Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyThemePreset(preset)}
                        className="p-3 rounded-2xl border theme-border theme-bg-sub hover:theme-bg-elevated transition cursor-pointer flex items-center gap-2.5 text-left"
                      >
                        <div className="flex gap-1 shrink-0">
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.theme }} />
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.accent }} />
                        </div>
                        <span className="font-bold text-[11px] theme-text-primary truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Hex Pickers */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t theme-border">
                  <div>
                    <label className="block text-[11px] font-bold theme-text-secondary mb-1">
                      Theme Primary
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={layoutConfig.theme_color || '#064e3b'}
                        onChange={(e) => updateCfg('theme_color', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border theme-border bg-transparent shrink-0"
                      />
                      <input
                        type="text"
                        value={layoutConfig.theme_color || ''}
                        onChange={(e) => updateCfg('theme_color', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg theme-bg-sub border theme-border font-mono text-[11px] theme-text-primary uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold theme-text-secondary mb-1">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={layoutConfig.accent_color || '#10b981'}
                        onChange={(e) => updateCfg('accent_color', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border theme-border bg-transparent shrink-0"
                      />
                      <input
                        type="text"
                        value={layoutConfig.accent_color || ''}
                        onChange={(e) => updateCfg('accent_color', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg theme-bg-sub border theme-border font-mono text-[11px] theme-text-primary uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Header Overrides */}
                <div className="space-y-3 pt-2 border-t theme-border">
                  <div>
                    <label className="block text-[11px] font-bold theme-text-secondary mb-1">
                      Header Title (English)
                    </label>
                    <input
                      type="text"
                      value={layoutConfig.header_en}
                      onChange={(e) => updateCfg('header_en', e.target.value)}
                      placeholder={institutionData.name}
                      className="w-full px-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold theme-text-secondary mb-1">
                      Native / Arabic / Bengali Header
                    </label>
                    <input
                      type="text"
                      value={layoutConfig.header_bn}
                      onChange={(e) => updateCfg('header_bn', e.target.value)}
                      placeholder={institutionData.bangla_name}
                      className="w-full px-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB 4: BACK TERMS & SIGNATURES --- */}
            {activeTab === 'back' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Card Back Terms / Notice Text
                  </label>
                  <textarea
                    rows={3}
                    value={layoutConfig.back_terms || ''}
                    onChange={(e) => updateCfg('back_terms', e.target.value)}
                    placeholder="Enter guidelines, card retention notice, or terms..."
                    className="w-full px-3 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Emergency Hotline / Phone
                  </label>
                  <input
                    type="text"
                    value={layoutConfig.emergency_contact || ''}
                    onChange={(e) => updateCfg('emergency_contact', e.target.value)}
                    placeholder="01700-000000"
                    className="w-full px-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Official Signatory Title
                  </label>
                  <input
                    type="text"
                    value={layoutConfig.signature_title || ''}
                    onChange={(e) => updateCfg('signature_title', e.target.value)}
                    placeholder="Principal / Muhtamim"
                    className="w-full px-3 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* --- TAB 5: PRESETS MANAGEMENT --- */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
                    Saved Templates ({templates.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSaveAsModal(true)}
                    className="px-2.5 py-1 rounded-lg theme-bg-accent theme-accent-text text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <PlusIcon className="w-3 h-3" />
                    <span>New Preset</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        selectedTemplate?.id === tpl.id
                          ? 'border-[var(--accent-main)] bg-[var(--accent-main)]/10 theme-text-primary'
                          : 'theme-border theme-bg-sub hover:theme-bg-elevated'
                      }`}
                    >
                      <div
                        className="cursor-pointer flex-1 min-w-0"
                        onClick={() => applyTemplateToState(tpl)}
                      >
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs truncate theme-text-primary">{tpl.template_name}</h4>
                          {tpl.is_default && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] theme-text-secondary mt-0.5">
                          {tpl.orientation} • {tpl.page_size}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!tpl.is_default && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(tpl)}
                            title="Set as Default Template"
                            className="px-2 py-1 rounded-lg theme-bg-elevated border theme-border hover:border-amber-500/40 text-[10px] font-bold theme-text-secondary hover:text-amber-400 cursor-pointer"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(tpl)}
                          title="Delete Template"
                          className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save As New Preset Modal */}
      {showSaveAsModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="relative w-full max-w-md rounded-3xl theme-bg-elevated border theme-border shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black theme-text-primary">Save Current Design as New Preset</h3>
            <p className="text-xs theme-text-secondary">
              Enter a recognizable name for this template configuration.
            </p>

            <div>
              <label className="block text-xs font-bold theme-text-secondary mb-1.5">Preset Name</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. VIP Gold Standard ID (2026)"
                className="w-full px-4 py-3 rounded-2xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveAsModal(false)}
                className="px-4 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-secondary hover:theme-text-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsNewPreset}
                disabled={isSaving || !newPresetName.trim()}
                className="px-5 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Confirm Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
