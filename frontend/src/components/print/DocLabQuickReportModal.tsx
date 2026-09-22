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
  CloseIcon,
  EditIcon,
  CopyIcon,
  SleekCheckIcon,
  ShareIcon,
  SparklesIcon,
  ChevronDownIcon,
  FileIcon,
} from '../ui/Icons';
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
 * DocLabQuickReportModal
 * 
 * Reusable, lightweight, high-performance report modal for DocLab.
 * Can be used across any module in the SPR Note project.
 * 
 * Features:
 * - Automatically checks for templates assigned to the requested scope.
 * - If template exists: merges data into template and renders formatted text.
 * - If no template exists: displays clean empty state with direct CTA to DocLab Studio.
 * - In-place text editing, one-click copy, template switcher, and deep-link to DocLab workspace.
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

  // 1. Fetch available templates for this scope whenever modal opens
  useEffect(() => {
    if (!isOpen || !scopeId) return;

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

    setIsEditing(false);
    setCopied(false);
    setIsTemplateMenuOpen(false);
  }, [isOpen, scopeId]);

  // 2. Active Template derivation
  const activeTemplate = useMemo(() => {
    if (!selectedTemplateId || savedTemplates.length === 0) return null;
    return savedTemplates.find((t) => t.id === selectedTemplateId) || savedTemplates[0] || null;
  }, [selectedTemplateId, savedTemplates]);

  // 3. Populate template with data whenever active template or data record changes
  useEffect(() => {
    if (!activeTemplate) {
      setCurrentText('');
      return;
    }

    const templateRaw = activeTemplate.rawHtml || '';
    if (!templateRaw) {
      setCurrentText('');
      return;
    }

    // Merge template with live data
    const mergedHtml = mergeTemplateWithData(templateRaw, dataRecord);
    const plainText = convertDocumentToPlainText(mergedHtml);
    setCurrentText(plainText);
  }, [activeTemplate, dataRecord]);

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
        // User cancelled or share failed, fallback to copy
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

  if (!isOpen) return null;

  const hasTemplates = savedTemplates.length > 0 && activeTemplate !== null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="theme-bg-surface border theme-border rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] theme-text-primary"
      >
        {/* 1. Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b theme-border theme-bg-sub">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-main)] animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              {title || `${scopeName} Preview`}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Open in DocLab Link Button */}
            <button
              type="button"
              onClick={handleGoToDocLab}
              className="px-2.5 py-1 rounded-lg theme-bg-accent-soft hover:opacity-85 theme-accent text-xs font-semibold border border-[var(--accent-main)]/30 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Open in DocLab Studio"
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>DocLab</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
              title="Close modal"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Modal Body */}
        <div className="p-4 overflow-y-auto h-[440px] sm:h-[480px] theme-bg-app relative flex flex-col">
          {hasTemplates ? (
            isEditing ? (
              <textarea
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                className="w-full h-full p-4 rounded-xl theme-bg-sub theme-text-primary text-sm font-mono border border-[var(--accent-main)]/60 focus:outline-none resize-none leading-relaxed shadow-inner"
                placeholder="Edit report text..."
                autoFocus
              />
            ) : (
              <pre className="w-full h-full p-4 rounded-xl theme-bg-sub border theme-border theme-text-primary text-sm font-mono whitespace-pre-wrap select-all leading-relaxed shadow-inner overflow-y-auto text-left">
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
                  No Template Found
                </h3>
                <p className="text-xs theme-text-secondary leading-relaxed">
                  No document template has been configured for this report scope yet.
                  Design or import one in DocLab Studio to instantly generate reports.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGoToDocLab}
                className="px-5 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold transition-all shadow-md hover:opacity-90 flex items-center gap-2 cursor-pointer"
              >
                <SparklesIcon className="w-4 h-4" />
                <span>Open DocLab Studio</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Sub-bar: Active Template & Change Template Dropdown */}
        {hasTemplates && (
          <div className="flex items-center justify-between px-5 py-2.5 theme-bg-sub border-t theme-border text-xs theme-text-secondary select-none">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold uppercase tracking-wider text-[10px] theme-text-secondary">
                Template:
              </span>
              <span className="font-medium theme-text-primary truncate">
                {activeTemplate?.name || 'Default Template'}
              </span>
            </div>

            {/* Change Template Menu */}
            {savedTemplates.length > 1 && (
              <div ref={templateMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
                  className="px-2 py-1 rounded-md theme-bg-elevated hover:theme-bg-accent-soft hover:theme-accent theme-text-primary text-[11px] font-semibold border theme-border flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Change Template</span>
                  <ChevronDownIcon className="w-3 h-3 opacity-70" />
                </button>

                {isTemplateMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-1.5 w-56 rounded-xl theme-bg-surface border theme-border shadow-xl py-1 z-30 overflow-hidden">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider theme-text-secondary border-b theme-border">
                      Select Template
                    </div>
                    <div className="max-h-44 overflow-y-auto">
                      {savedTemplates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(t.id);
                            setIsTemplateMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
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
            )}
          </div>
        )}

        {/* 4. Modal Footer: Edit, Copy, Share Actions */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3.5 border-t theme-border theme-bg-sub select-none">
          {/* Button 1: Edit */}
          <button
            type="button"
            disabled={!hasTemplates}
            onClick={() => setIsEditing(!isEditing)}
            className={`h-9 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isEditing
                ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/40 hover:opacity-80'
                : 'theme-bg-elevated hover:theme-bg-accent-soft hover:theme-accent theme-text-primary theme-border'
            }`}
          >
            <EditIcon className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Done' : 'Edit'}</span>
          </button>

          {/* Button 2: Copy */}
          <button
            type="button"
            disabled={!hasTemplates}
            onClick={handleCopy}
            className={`h-9 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              copied
                ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/40'
                : 'theme-bg-accent hover:opacity-90 theme-accent-text border-[var(--accent-main)]'
            }`}
          >
            {copied ? (
              <SleekCheckIcon className="w-3.5 h-3.5" />
            ) : (
              <CopyIcon className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          {/* Button 3: Share */}
          <button
            type="button"
            disabled={!hasTemplates}
            onClick={handleShare}
            className="h-9 rounded-xl theme-bg-elevated hover:theme-bg-accent-soft hover:theme-accent theme-text-primary font-semibold text-xs transition-all border theme-border flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShareIcon className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}
