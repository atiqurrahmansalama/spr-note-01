import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSavedTemplatesForScope,
  getDefaultTemplateIdForScope,
  type CustomDocxTemplate,
} from './scopeTemplateStore';
import { mergeTemplateWithData } from './docxTemplateEngine';
import { convertDocumentToPlainText } from './docLabTextConverter';
import {
  EditIcon,
  CopyIcon,
  SleekCheckIcon,
  ShareIcon,
  SparklesIcon,
  ChevronDownIcon,
  FileIcon,
} from '../ui/Icons';
import Modal from '../ui/Modal';
import CustomButton from '../ui/CustomButton';
import { useToast } from '../../context/ToastContext';

export interface DocLabQuickReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
  scopeName?: string;
  dataRecord: Record<string, string>;
  title?: string;
  returnUrl?: string;
  onNavigateToDocLab?: () => void;
}

/**
 * Built-in standard fallback template for Daily Progress reports when no custom Word
 * template is stored locally. Ensures instant 0ms report generation with zero empty states.
 */
const DEFAULT_DAILY_PROGRESS_TEMPLATE: CustomDocxTemplate = {
  id: 'builtin_daily_progress_report',
  name: 'Standard Daily Progress',
  description: 'System standard Daily Progress & Sabaq evaluation format',
  scopeId: 'hifz_daily_report',
  rawHtml: `
<p><strong>Daily Progress Evaluation Report</strong></p>
<p>Date: {{date}}</p>
<p>Student Name: {{student-name}}</p>
<p>Department: {{dept}} | Class: {{class}} | Section: {{section}}</p>
<p>Session: {{Session}}</p>
<p>Juz: {{juz-number}} | Page: {{juz-page}}</p>
<p>Total Mistakes: {{total-mis}}</p>
<p>Mistake Details:<br>{{detail-mis}}</p>
<p>Total Stuck: {{total-stuck}}</p>
<p>Stuck Details:<br>{{detail-stuck}}</p>
<p>Teacher: {{mention-teacher-name}}</p>
<p>Remarks: {{remarks}}</p>
  `.trim(),
  detectedPlaceholders: [
    'date',
    'student-name',
    'dept',
    'class',
    'section',
    'Session',
    'juz-number',
    'juz-page',
    'total-mis',
    'total-stuck',
    'detail-mis',
    'detail-stuck',
    'mention-teacher-name',
    'remarks',
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

/**
 * DocLabQuickReportModal
 * 
 * Enterprise-grade, lightweight, high-performance report modal for DocLab.
 * Uses the project's standard portaled Modal component to guarantee isolated GPU compositing,
 * zero layout thrashing, and robust lifecycle cleanup.
 */
export default function DocLabQuickReportModal({
  isOpen,
  onClose,
  scopeId,
  scopeName = 'Report',
  dataRecord = {},
  title,
  returnUrl,
  onNavigateToDocLab,
}: DocLabQuickReportModalProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [savedTemplates, setSavedTemplates] = useState<CustomDocxTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement | null>(null);

  // Hash ref to guard against infinite re-parsing loops and CPU/GPU thrashing
  const prevDataHashRef = useRef<string>('');

  // 1. Fetch available templates for this scope whenever modal opens
  useEffect(() => {
    if (!isOpen || !scopeId) {
      prevDataHashRef.current = '';
      return;
    }

    const templates = getSavedTemplatesForScope(scopeId);
    
    // Fallback to built-in template if scope is Daily Progress and no custom templates exist
    const effectiveTemplates =
      templates.length > 0
        ? templates
        : scopeId === 'hifz_daily_report'
        ? [DEFAULT_DAILY_PROGRESS_TEMPLATE]
        : [];

    setSavedTemplates(effectiveTemplates);

    const defaultTmplId = getDefaultTemplateIdForScope(scopeId);
    if (defaultTmplId && effectiveTemplates.some((t) => t.id === defaultTmplId)) {
      setSelectedTemplateId(defaultTmplId);
    } else if (effectiveTemplates.length > 0) {
      setSelectedTemplateId(effectiveTemplates[0].id);
    } else {
      setSelectedTemplateId(null);
    }

    setIsEditing(false);
    setCopied(false);
    setIsTemplateMenuOpen(false);
  }, [isOpen, scopeId]);

  // 2. Active Template derivation
  const activeTemplate = useMemo(() => {
    if (!selectedTemplateId || savedTemplates.length === 0) return null;
    return savedTemplates.find((t) => t.id === selectedTemplateId) || savedTemplates[0] || null;
  }, [selectedTemplateId, savedTemplates]);

  // 3. Populate template with data strictly when modal is open and data has genuinely changed
  useEffect(() => {
    if (!isOpen) return;

    if (!activeTemplate) {
      setCurrentText('');
      prevDataHashRef.current = '';
      return;
    }

    const templateRaw = activeTemplate.rawHtml || '';
    if (!templateRaw) {
      setCurrentText('');
      prevDataHashRef.current = '';
      return;
    }

    // Stable hash calculation to completely stop infinite DOMParser / regex execution
    const currentHash = `${activeTemplate.id}_${activeTemplate.updatedAt || ''}_${JSON.stringify(dataRecord)}`;
    if (prevDataHashRef.current === currentHash) {
      return;
    }
    prevDataHashRef.current = currentHash;

    // Merge template with live data
    const mergedHtml = mergeTemplateWithData(templateRaw, dataRecord);
    const plainText = convertDocumentToPlainText(mergedHtml);
    setCurrentText(plainText);
  }, [isOpen, activeTemplate, dataRecord]);

  // 4. Close dropdown on outside click
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

  // Copy handler with visual confirmation
  const handleCopy = async () => {
    if (!currentText) return;
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      showToast('Report copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  // Share handler
  const handleShare = async () => {
    if (!currentText) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || `${scopeName} Report`,
          text: currentText,
        });
      } catch (e) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  // Navigate to DocLab Studio workspace
  const handleGoToDocLab = () => {
    onClose();
    if (onNavigateToDocLab) {
      onNavigateToDocLab();
      return;
    }
    const targetUrl = returnUrl
      ? `/print-studio?scope=${encodeURIComponent(scopeId)}&returnUrl=${encodeURIComponent(returnUrl)}`
      : `/print-studio?scope=${encodeURIComponent(scopeId)}`;
    navigate(targetUrl);
  };

  const hasTemplates = savedTemplates.length > 0 && activeTemplate !== null;

  // Header DocLab Studio shortcut button
  const headerActions = (
    <div className="flex items-center gap-2">
      <CustomButton
        type="button"
        variant="soft"
        size="xs"
        icon={SparklesIcon}
        onClick={handleGoToDocLab}
        title="Open in DocLab Studio"
        className="font-semibold text-xs"
      >
        DocLab
      </CustomButton>
    </div>
  );

  // Footer action toolbar with project buttons
  const modalFooter = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
      {/* Template selector switcher in footer if multiple templates exist */}
      {hasTemplates && savedTemplates.length > 1 ? (
        <div ref={templateMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
            className="px-2.5 py-1.5 rounded-xl theme-bg-surface hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary text-xs font-semibold border theme-border flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="truncate max-w-[140px]">{activeTemplate?.name || 'Template'}</span>
            <ChevronDownIcon className="w-3.5 h-3.5 opacity-70" />
          </button>

          {isTemplateMenuOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-60 rounded-2xl theme-bg-surface border theme-border shadow-2xl py-1.5 z-50 overflow-hidden animate-fade-in">
              <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider theme-text-secondary border-b theme-border">
                Select Template
              </div>
              <div className="max-h-48 overflow-y-auto">
                {savedTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(t.id);
                      setIsTemplateMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      t.id === selectedTemplateId
                        ? 'theme-bg-accent-soft theme-accent font-semibold'
                        : 'hover:theme-bg-sub theme-text-primary'
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    {t.id === selectedTemplateId && (
                      <SleekCheckIcon className="w-3.5 h-3.5 shrink-0 ml-1.5 theme-accent" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-[11px] theme-text-secondary hidden sm:block truncate">
          {activeTemplate?.name ? `Template: ${activeTemplate.name}` : ''}
        </div>
      )}

      {/* Action Buttons: Edit, Copy, Share */}
      <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
        <CustomButton
          type="button"
          variant={isEditing ? 'primary' : 'sub'}
          size="sm"
          icon={EditIcon}
          onClick={() => setIsEditing(!isEditing)}
          disabled={!hasTemplates}
          className="flex-1 sm:flex-initial min-w-[85px]"
        >
          {isEditing ? 'Done' : 'Edit'}
        </CustomButton>

        <CustomButton
          type="button"
          variant={copied ? 'success' : 'primary'}
          size="sm"
          icon={copied ? SleekCheckIcon : CopyIcon}
          onClick={handleCopy}
          disabled={!hasTemplates || !currentText}
          className="flex-1 sm:flex-initial min-w-[95px]"
        >
          {copied ? 'Copied!' : 'Copy'}
        </CustomButton>

        <CustomButton
          type="button"
          variant="outline"
          size="sm"
          icon={ShareIcon}
          onClick={handleShare}
          disabled={!hasTemplates || !currentText}
          className="flex-1 sm:flex-initial min-w-[85px]"
        >
          Share
        </CustomButton>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      zIndex={10000}
      title={title || `${scopeName} Report`}
      subtitle="Preview, edit, copy or export formatted document."
      headerActions={headerActions}
      footer={modalFooter}
      bodyClassName="p-4 sm:p-5"
    >
      <div className="h-[420px] sm:h-[460px] relative flex flex-col rounded-2xl overflow-hidden border theme-border theme-bg-app">
        {hasTemplates ? (
          isEditing ? (
            <textarea
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              className="w-full h-full p-4 theme-bg-surface theme-text-primary text-xs sm:text-sm font-mono border-0 focus:outline-none resize-none leading-relaxed shadow-inner"
              placeholder="Edit report text..."
              autoFocus
            />
          ) : (
            <pre className="w-full h-full p-4 theme-bg-surface theme-text-primary text-xs sm:text-sm font-mono whitespace-pre-wrap select-all leading-relaxed shadow-inner overflow-y-auto text-left">
              {currentText || 'No preview text generated.'}
            </pre>
          )
        ) : (
          /* Empty State: No Template Found */
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-4 rounded-xl theme-bg-sub border theme-border border-dashed">
            <div className="w-14 h-14 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shadow-inner">
              <FileIcon className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-bold theme-text-primary">
                No Template Configured
              </h3>
              <p className="text-xs theme-text-secondary leading-relaxed">
                No document template has been configured for this report scope yet.
                Open DocLab Studio to customize or design a Word template.
              </p>
            </div>
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={SparklesIcon}
              onClick={handleGoToDocLab}
            >
              Open DocLab Studio
            </CustomButton>
          </div>
        )}
      </div>
    </Modal>
  );
}
