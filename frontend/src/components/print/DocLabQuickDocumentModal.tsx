import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSavedTemplatesForScope,
  getDefaultTemplateIdForScope,
  type CustomDocxTemplate,
} from './scopeTemplateStore';
import {
  mergeTemplateWithData,
  parseDocxDocument,
  saveDocxTemplate,
  getDocxPaperDimensions,
  getDocxPaperPadding,
  type DocxParseResult,
} from './docxTemplateEngine';
import { convertDocumentToPlainText } from './docLabTextConverter';
import { printDocument } from './docLabExportUtils';
import DocxLiveRenderer from './DocxLiveRenderer';
import {
  FileIcon,
  UploadIcon,
  SparklesIcon,
  ChevronDownIcon,
  PrinterIcon,
  CopyIcon,
  CheckIcon,
  EditIcon,
  TrashIcon,
} from '../ui/Icons';
import Modal from '../ui/Modal';
import CustomButton from '../ui/CustomButton';
import CustomInput from '../ui/CustomInput';
import { useToast } from '../../context/ToastContext';

export interface DocLabQuickDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
  scopeName?: string;
  dataRecord?: Record<string, string>;
  title?: string;
  returnUrl?: string;
  onNavigateToDocLab?: () => void;
}

/**
 * DocLabQuickDocumentModal
 * 
 * Reusable, template-driven Document Modal for external modules.
 * Companion to DocLabQuickReportModal (which handles plain text).
 * - Renders high-fidelity Word (.docx) document layouts on canvas.
 * - Dynamically merges template placeholders with module dataRecord.
 * - Reuses DocxTemplateModal ingestion engine for on-the-fly .docx upload.
 * - Supports template selection, live preview, direct printing, and DocLab Studio handoff.
 */
export default function DocLabQuickDocumentModal({
  isOpen,
  onClose,
  scopeId,
  scopeName = 'Document',
  dataRecord = {},
  title,
  returnUrl,
  onNavigateToDocLab,
}: DocLabQuickDocumentModalProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [savedTemplates, setSavedTemplates] = useState<CustomDocxTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);

  // New template upload form state
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');

  const templateMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevDataHashRef = useRef<string>('');

  // 1. Fetch available templates for this scope whenever modal opens
  const refreshTemplates = React.useCallback(() => {
    if (!scopeId) return;
    const templates = getSavedTemplatesForScope(scopeId);
    setSavedTemplates(templates);

    const defaultTmplId = getDefaultTemplateIdForScope(scopeId);
    if (defaultTmplId && templates.some((t) => t.id === defaultTmplId)) {
      setSelectedTemplateId(defaultTmplId);
      setIsUploadMode(false);
    } else if (templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
      setIsUploadMode(false);
    } else {
      setSelectedTemplateId(null);
      setIsUploadMode(true);
    }
  }, [scopeId]);

  useEffect(() => {
    if (!isOpen || !scopeId) {
      prevDataHashRef.current = '';
      return;
    }
    refreshTemplates();
    setIsTemplateMenuOpen(false);
    setCopied(false);
  }, [isOpen, scopeId, refreshTemplates]);

  // 2. Active Template derivation
  const activeTemplate = useMemo(() => {
    if (!selectedTemplateId || savedTemplates.length === 0) return null;
    return savedTemplates.find((t) => t.id === selectedTemplateId) || savedTemplates[0] || null;
  }, [selectedTemplateId, savedTemplates]);

  // 3. Merge template with live data
  const mergedHtml = useMemo(() => {
    if (!activeTemplate || !activeTemplate.rawHtml) return '';
    return mergeTemplateWithData(activeTemplate.rawHtml, dataRecord);
  }, [activeTemplate, dataRecord]);

  // 4. Paper Dimensions & Padding
  const paperDimensions = useMemo(() => {
    if (!activeTemplate) return { width: '794px', minHeight: '520px', height: '1123px', maxWidth: '794px' };
    return getDocxPaperDimensions(activeTemplate.pageSize || 'A4', activeTemplate.orientation || 'PORTRAIT');
  }, [activeTemplate]);

  const previewPadding = useMemo(() => {
    if (!activeTemplate) return '20mm';
    return getDocxPaperPadding(activeTemplate.pageProperties, activeTemplate.margin || 'NORMAL');
  }, [activeTemplate]);

  // 5. Close template dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setIsTemplateMenuOpen(false);
      }
    };
    if (isTemplateMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTemplateMenuOpen]);

  // 6. Handle Direct .docx File Upload
  const handleFileSelected = async (selectedFile: File) => {
    if (!selectedFile || !/\.docx$/i.test(selectedFile.name)) {
      showToast('Please upload a valid Microsoft Word (.docx) document.', 'warning');
      return;
    }

    setIsParsing(true);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const parseResult: DocxParseResult = await parseDocxDocument(arrayBuffer);

      const templateId = `docx_${scopeId}_${Date.now()}`;
      const cleanName = uploadName.trim() || selectedFile.name.replace(/\.docx$/i, '');
      const now = new Date().toISOString();

      const newTemplate: CustomDocxTemplate = {
        id: templateId,
        name: cleanName,
        description: uploadDescription.trim() || `Custom ${scopeName} template`,
        rawHtml: parseResult.html,
        detectedPlaceholders: parseResult.detectedPlaceholders,
        isTableDocument: parseResult.isTableDocument,
        sampleColumns: parseResult.extractedColumns,
        sampleData: parseResult.extractedRows,
        pageSize: parseResult.pageSize,
        orientation: parseResult.orientation,
        margin: parseResult.margin,
        pageProperties: parseResult.pageProperties,
        createdAt: now,
        updatedAt: now,
      };
      (newTemplate as any).scopeId = scopeId;

      saveDocxTemplate(newTemplate);
      showToast(`Template "${cleanName}" uploaded successfully.`, 'success');

      // Refresh list and select the newly uploaded template
      const updatedList = getSavedTemplatesForScope(scopeId);
      setSavedTemplates(updatedList);
      setSelectedTemplateId(templateId);
      setIsUploadMode(false);
      setUploadName('');
      setUploadDescription('');
    } catch (err) {
      console.error('Failed to parse and save docx template:', err);
      showToast('Failed to parse Word document. Please ensure the file is valid.', 'error');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // 7. Print Handler
  const handlePrint = () => {
    if (!activeTemplate) return;
    printDocument({
      pageSize: activeTemplate.pageSize || 'A4',
      orientation: activeTemplate.orientation || 'PORTRAIT',
      margin: activeTemplate.margin || 'NORMAL',
    });
  };

  // 8. Copy Text Content Handler
  const handleCopy = async () => {
    if (!mergedHtml) return;
    try {
      const text = convertDocumentToPlainText(mergedHtml);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('Document text copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  // 9. Navigate to Full DocLab Studio Handoff
  const handleCustomizeInDocLab = () => {
    onClose();
    if (dataRecord && Object.keys(dataRecord).length > 0) {
      try {
        sessionStorage.setItem(`spr_doclab_scope_data_${scopeId}`, JSON.stringify([dataRecord]));
      } catch (e) {
        console.warn('Failed to store doclab scope data in sessionStorage', e);
      }
    }
    if (onNavigateToDocLab) {
      onNavigateToDocLab();
      return;
    }
    const params = new URLSearchParams();
    if (scopeId) params.set('scope', scopeId);
    if (selectedTemplateId) params.set('templateId', selectedTemplateId);
    if (returnUrl) params.set('returnUrl', returnUrl);
    navigate(`/print-studio?${params.toString()}`);
  };

  if (!isOpen) return null;

  const isLandscape = activeTemplate?.orientation === 'LANDSCAPE';
  const isLegal = activeTemplate?.pageSize === 'LEGAL';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={9999}
      size={isUploadMode ? '2xl' : isLandscape || isLegal ? 'full' : '5xl'}
      title={title || `${scopeName} Document`}
      subtitle={`Template-driven document view for ${scopeName}`}
      headerActions={
        <div className="flex items-center gap-2">
          {/* DocLab Studio shortcut button */}
          <CustomButton
            type="button"
            variant="soft"
            size="xs"
            icon={SparklesIcon}
            onClick={handleCustomizeInDocLab}
            title="Open and customize in DocLab Studio"
            className="font-semibold text-xs"
          >
            DocLab
          </CustomButton>

          {!isUploadMode && (
            <>
              {/* Template Selector Dropdown */}
              {savedTemplates.length > 0 && (
                <div className="relative" ref={templateMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsTemplateMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold theme-bg-sub border theme-border theme-text-primary hover:theme-border-accent/40 shadow-2xs transition-all cursor-pointer"
                  title="Switch Document Template"
                >
                  <FileIcon className="w-3.5 h-3.5 theme-accent" />
                  <span className="max-w-[160px] truncate">{activeTemplate?.name || 'Select Template'}</span>
                  <ChevronDownIcon className="w-3 h-3 theme-text-secondary" />
                </button>

                {isTemplateMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-64 rounded-2xl theme-bg-surface border theme-border shadow-xl p-1.5 z-50 animate-fade-in text-left">
                    <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider theme-text-secondary border-b theme-border mb-1">
                      Available Templates ({savedTemplates.length})
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                      {savedTemplates.map((t) => {
                        const isSelected = t.id === selectedTemplateId;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTemplateId(t.id);
                              setIsTemplateMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                              isSelected
                                ? 'theme-bg-accent-soft theme-accent font-bold'
                                : 'theme-text-primary hover:theme-bg-sub'
                            }`}
                          >
                            <span className="truncate">{t.name}</span>
                            {isSelected && <CheckIcon className="w-3.5 h-3.5 theme-accent shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t theme-border mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsTemplateMenuOpen(false);
                          setIsUploadMode(true);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold theme-accent hover:theme-bg-accent-soft transition-all text-left cursor-pointer"
                      >
                        <UploadIcon className="w-3.5 h-3.5" />
                        <span>Upload New (.docx) Template</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload Action Button */}
            <CustomButton
              variant="sub"
              size="sm"
              icon={UploadIcon}
              onClick={() => setIsUploadMode(true)}
              className="text-xs"
              title="Upload another Word (.docx) template"
            >
              Upload Template
            </CustomButton>
          </>
        )}
      </div>
    }
      bodyClassName="p-4 sm:p-6 space-y-4"
      footer={
        <div className="flex items-center justify-between w-full flex-wrap gap-2">
          {/* Left Actions */}
          <div className="flex items-center gap-2">
            {!isUploadMode && activeTemplate && (
              <CustomButton
                variant="sub"
                size="sm"
                icon={SparklesIcon}
                onClick={handleCustomizeInDocLab}
                title="Open and edit this template inside DocLab Studio"
              >
                Customize in DocLab
              </CustomButton>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {isUploadMode && savedTemplates.length > 0 && (
              <CustomButton
                variant="outline"
                size="sm"
                onClick={() => setIsUploadMode(false)}
              >
                Back to Document
              </CustomButton>
            )}

            {!isUploadMode && activeTemplate && (
              <>
                <CustomButton
                  variant="sub"
                  size="sm"
                  icon={copied ? CheckIcon : CopyIcon}
                  onClick={handleCopy}
                  title="Copy document text to clipboard"
                >
                  {copied ? 'Copied' : 'Copy Text'}
                </CustomButton>

                <CustomButton
                  variant="primary"
                  size="sm"
                  icon={PrinterIcon}
                  onClick={handlePrint}
                  title="Print official document sheet"
                >
                  Print Document
                </CustomButton>
              </>
            )}

            <CustomButton
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Close
            </CustomButton>
          </div>
        </div>
      }
    >
      {/* ── MODE 1: Upload .docx Template Dropzone ── */}
      {isUploadMode ? (
        <div className="space-y-4 animate-fade-in text-left">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] ${
              dragOver
                ? 'border-[var(--accent-main)] bg-[var(--accent-main)]/5 scale-[1.01]'
                : 'theme-border hover:theme-border-accent/40 theme-bg-sub/40 hover:theme-bg-sub/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            <div className="w-14 h-14 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center mb-3 shadow-xs">
              <UploadIcon className="w-7 h-7" />
            </div>

            <h3 className="text-sm font-bold theme-text-primary">
              {isParsing ? 'Parsing Word Document...' : `Upload a Word document (.docx) for ${scopeName}`}
            </h3>
            <p className="text-xs theme-text-secondary mt-1 max-w-sm">
              Upload your official template to format and print high-fidelity documents for this scope.
            </p>

            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold theme-bg-surface border theme-border theme-text-secondary">
              <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Supports dynamic placeholders and Bengali/English typography</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CustomInput
              label="Template Name (Optional)"
              placeholder={`e.g. Official ${scopeName} Template`}
              value={uploadName}
              onChange={(val: any) => setUploadName(typeof val === 'string' ? val : val?.target?.value ?? '')}
            />
            <CustomInput
              label="Description (Optional)"
              placeholder="e.g. Standard institutional design"
              value={uploadDescription}
              onChange={(val: any) => setUploadDescription(typeof val === 'string' ? val : val?.target?.value ?? '')}
            />
          </div>
        </div>
      ) : !activeTemplate ? (
        /* ── Empty State: No Template Found ── */
        <div className="py-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center mx-auto theme-text-secondary">
            <FileIcon className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold theme-text-primary">No Template Found for {scopeName}</div>
          <p className="text-xs theme-text-secondary max-w-md mx-auto">
            Please upload a Word (.docx) document template to generate and print documents for this module.
          </p>
          <CustomButton
            variant="primary"
            size="sm"
            icon={UploadIcon}
            onClick={() => setIsUploadMode(true)}
            className="mt-2"
          >
            Upload Template
          </CustomButton>
        </div>
      ) : (
        /* ── MODE 2: Active Document High-Fidelity Canvas Preview ── */
        <div className="space-y-3 animate-fade-in text-left">
          {/* Paper Metadata Badge Bar */}
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl theme-bg-sub/60 border theme-border text-xs">
            <div className="flex items-center gap-2 font-medium theme-text-secondary">
              <span className="font-bold theme-text-primary">{activeTemplate.name}</span>
              <span>•</span>
              <span className="uppercase">{activeTemplate.pageSize || 'A4'}</span>
              <span>•</span>
              <span className="capitalize">{(activeTemplate.orientation || 'PORTRAIT').toLowerCase()}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] theme-accent font-semibold">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>DocLab Live Render</span>
            </div>
          </div>

          {/* Workbench Paper Sheet */}
          <div className="p-4 sm:p-8 rounded-2xl theme-bg-app border theme-border flex justify-center items-start shadow-inner overflow-x-auto max-h-[calc(85vh-160px)]">
            <div
              id="doclab-quick-document-canvas"
              className="paper-sheet docx-paper-sheet w-full !bg-white !text-slate-900 rounded-sm shadow-lg border theme-border transition-all box-border shrink-0 text-left"
              data-size={activeTemplate.pageSize || 'A4'}
              data-orientation={activeTemplate.orientation || 'PORTRAIT'}
              data-margin={activeTemplate.margin || 'NORMAL'}
              style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                width: paperDimensions.width,
                maxWidth: paperDimensions.maxWidth,
                minHeight: paperDimensions.minHeight,
                padding: previewPadding,
                textAlign: 'left',
                boxSizing: 'border-box',
              }}
            >
              <DocxLiveRenderer
                htmlContent={mergedHtml}
                isEditable={false}
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
