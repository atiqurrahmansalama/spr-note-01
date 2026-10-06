import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSavedTemplatesForScope,
  getDefaultTemplateIdForScope,
  setDefaultTemplateForScope,
  type CustomDocxTemplate,
} from './scopeTemplateStore';
import { mergeTemplateWithData } from './docxTemplateEngine';
import { convertDocumentToPlainText } from './docLabTextConverter';
import {
  CopyIcon,
  SleekCheckIcon,
  ShareIcon,
  SparklesIcon,
  FileIcon,
} from '../ui/Icons';
import Modal from '../ui/Modal';
import CustomButton from '../ui/CustomButton';
import ActionMenu from '../ui/ActionMenu';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../../context/ToastContext';

export interface DocLabQuickReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
  scopeName?: string;
  dataRecord: Record<string, string>;
  title?: string;
  returnUrl?: string;
  autoCopy?: boolean;
  onNavigateToDocLab?: () => void;
}

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
  autoCopy = false,
  onNavigateToDocLab,
}: DocLabQuickReportModalProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [savedTemplates, setSavedTemplates] = useState<CustomDocxTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [copied, setCopied] = useState(false);

  // Hash ref to guard against infinite re-parsing loops and CPU/GPU thrashing
  const prevDataHashRef = useRef<string>('');

  // Copy helper with visual confirmation and feedback
  const performCopy = useCallback(async (textToCopy?: string) => {
    const text = textToCopy ?? currentText;
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('Report copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      showToast('Failed to copy to clipboard', 'error');
    }
  }, [currentText, showToast]);

  // Set selected template and persist as default template for this scope
  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      if (scopeId && templateId) {
        setDefaultTemplateForScope(scopeId, templateId);
      }
    },
    [scopeId]
  );

  // 1. Fetch available templates for this scope whenever modal opens
  useEffect(() => {
    if (!isOpen || !scopeId) {
      prevDataHashRef.current = '';
      return;
    }

    const templates = getSavedTemplatesForScope(scopeId);
    setSavedTemplates(templates);

    const defaultTmplId = getDefaultTemplateIdForScope(scopeId);
    if (defaultTmplId && templates.some((t) => t.id === defaultTmplId)) {
      setSelectedTemplateId(defaultTmplId);
    } else if (templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    } else {
      setSelectedTemplateId(null);
    }

    setCopied(false);
  }, [isOpen, scopeId]);

  // 2. Active Template derivation
  const activeTemplate = useMemo(() => {
    if (!selectedTemplateId || savedTemplates.length === 0) return null;
    return savedTemplates.find((t) => t.id === selectedTemplateId) || savedTemplates[0] || null;
  }, [selectedTemplateId, savedTemplates]);

  // Menu items for project standard ActionMenu
  const templateMenuItems = useMemo(() => {
    return savedTemplates.map((t) => ({
      label: t.name,
      icon: t.id === selectedTemplateId ? SleekCheckIcon : undefined,
      iconClassName: t.id === selectedTemplateId ? 'theme-accent' : undefined,
      onClick: () => handleSelectTemplate(t.id),
    }));
  }, [savedTemplates, selectedTemplateId, handleSelectTemplate]);

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

    // Auto-copy to clipboard on open if requested
    if (autoCopy && plainText) {
      performCopy(plainText);
    }
  }, [isOpen, activeTemplate, dataRecord, autoCopy, performCopy]);

  // Copy handler with visual confirmation
  const handleCopy = () => {
    performCopy();
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
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          performCopy();
        }
      }
    } else {
      performCopy();
    }
  };

  // Navigate to DocLab Studio workspace
  const handleGoToDocLab = () => {
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
        <ActionMenu
          label={activeTemplate?.name || 'Template'}
          icon={FileIcon}
          items={templateMenuItems}
          align="left"
          size="sm"
          variant="surface"
          header="Select Template"
        />
      ) : (
        <div className="text-[11px] theme-text-secondary hidden sm:block truncate">
          {activeTemplate?.name ? `Template: ${activeTemplate.name}` : ''}
        </div>
      )}

      {/* Action Buttons: Copy, Share */}
      <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
        <CustomButton
          type="button"
          variant="primary"
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
      subtitle="Edit, copy or share formatted document."
      headerActions={headerActions}
      footer={modalFooter}
      bodyClassName="p-4 sm:p-5"
    >
      <div className="h-[420px] sm:h-[460px] relative flex flex-col rounded-2xl overflow-hidden border theme-border theme-bg-app">
        {hasTemplates ? (
          <textarea
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            className="w-full h-full p-4 theme-bg-surface theme-text-primary text-xs sm:text-sm font-mono border-0 focus:outline-none resize-none leading-relaxed shadow-inner"
            placeholder="Edit report text..."
            autoFocus
          />
        ) : (
          /* Empty State: No Template Found */
          <EmptyState
            icon={FileIcon}
            iconVariant="accent"
            iconSize="lg"
            variant="minimal"
            title="No Template Configured"
            description="No document template has been configured for this report scope yet. Open DocLab Studio to customize or design a Word template."
            action={{
              label: 'Open DocLab Studio',
              icon: SparklesIcon,
              onClick: handleGoToDocLab,
              variant: 'primary',
              size: 'sm',
            }}
            className="w-full h-full flex flex-col items-center justify-center m-auto"
          />
        )}
      </div>
    </Modal>
  );
}
