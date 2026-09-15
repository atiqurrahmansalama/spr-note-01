import React, { useState, useRef } from 'react';
import { Modal, CustomButton, CustomInput } from '../ui';
import {
  FileIcon,
  CheckCircleIcon,
  SparklesIcon,
  UploadIcon,
  EditIcon,
} from '../ui/Icons';
import {
  parseDocxDocument,
  saveDocxTemplate,
  DocxParseResult,
  CustomDocxTemplate,
  TemplatePlaceholderKey,
} from './docxTemplateEngine';
import { ALL_DOCUMENT_SCOPES } from './scopeTemplateStore';

export interface DocxTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (result: {
    id?: string;
    name?: string;
    html: string;
    rawHtml?: string;
    isTableDocument: boolean;
    columns: Array<{ id: string; header: string; label: string }>;
    data: Array<Record<string, any>>;
    templateMeta?: CustomDocxTemplate;
  }) => void;
  sampleData?: Record<string, any>;
  columns?: Array<{ id: string; header: string; label: string }>;
  metaItems?: Array<{ label: string; value: any }>;
  placeholderKeys?: TemplatePlaceholderKey[];
  initialScopeId?: string;
}

/**
 * Enterprise Word (.docx) Document Ingestion & Preview Modal
 * Clean, lightweight, and focused purely on document file upload and canvas mounting.
 */
export default function DocxTemplateModal({
  isOpen,
  onClose,
  onApplyTemplate,
  sampleData = {},
  columns = [],
  metaItems = [],
  placeholderKeys = [],
  initialScopeId = 'general_document',
}: DocxTemplateModalProps) {
  const [targetScopeId, setTargetScopeId] = useState<string>(initialScopeId || 'general_document');
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<DocxParseResult | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [previewTab, setPreviewTab] = useState<'preview' | 'html'>('preview');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (selectedFile: File) => {
    if (!selectedFile || !/\.docx$/i.test(selectedFile.name)) {
      alert('Please upload a valid Microsoft Word (.docx) document.');
      return;
    }

    setFile(selectedFile);
    setTemplateName(selectedFile.name.replace(/\.docx$/i, ''));
    setIsParsing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = await parseDocxDocument(arrayBuffer);
      setParseResult(result);
    } catch (err) {
      console.error('Failed to parse docx document', err);
      alert('Failed to parse Word document. Please ensure the file is not corrupted.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleResetFile = () => {
    setFile(null);
    setParseResult(null);
    setTemplateName('');
    setTemplateDescription('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApply = (saveAsTemplate = false) => {
    if (!parseResult) return;
    const finalHtml = parseResult.html;
    const templateId = `docx_upload_${Date.now()}`;
    const cleanName = templateName.trim() || file?.name?.replace(/\.[^/.]+$/, '') || 'Custom Word Template';

    let savedTemplate: CustomDocxTemplate | undefined;
    if (saveAsTemplate) {
      const newTmpl: CustomDocxTemplate = {
        id: templateId,
        name: cleanName,
        description: templateDescription.trim(),
        rawHtml: finalHtml,
        detectedPlaceholders: parseResult.detectedPlaceholders,
        isTableDocument: parseResult.isTableDocument,
        sampleColumns: parseResult.extractedColumns,
        sampleData: parseResult.extractedRows,
      };
      (newTmpl as any).scopeId = targetScopeId;
      savedTemplate = saveDocxTemplate(newTmpl);
    }

    const templateMeta: CustomDocxTemplate = savedTemplate || {
      id: templateId,
      name: cleanName,
      description: templateDescription.trim(),
      rawHtml: finalHtml,
      detectedPlaceholders: parseResult.detectedPlaceholders,
      isTableDocument: parseResult.isTableDocument,
      sampleColumns: parseResult.extractedColumns,
      sampleData: parseResult.extractedRows,
    };

    onApplyTemplate({
      id: templateId,
      name: cleanName,
      html: finalHtml,
      rawHtml: finalHtml,
      isTableDocument: parseResult.isTableDocument,
      columns: parseResult.extractedColumns,
      data: parseResult.extractedRows,
      templateMeta: templateMeta,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={10000}
      title="Upload Word Document (.docx)"
      subtitle="Upload any Microsoft Word file to convert and design as a live document on canvas."
      size={parseResult ? '3xl' : '2xl'}
      bodyClassName="p-5 sm:p-6 space-y-4"
      footer={
        <div className="flex items-center justify-between w-full">
          <CustomButton
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </CustomButton>

          <div className="flex items-center gap-2.5">
            {parseResult && (
              <CustomButton
                variant="outline"
                size="sm"
                onClick={() => handleApply(true)}
                icon={SparklesIcon}
                className="theme-border text-xs"
              >
                Save as Reusable Template
              </CustomButton>
            )}

            <CustomButton
              variant="primary"
              size="sm"
              onClick={() => handleApply(false)}
              disabled={!parseResult || isParsing}
              icon={CheckCircleIcon}
              className="shadow-xs"
            >
              Apply Document to Canvas
            </CustomButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* If no file is parsed yet, show Upload Box & Scope Selector */}
        {!parseResult ? (
          <div className="space-y-4">
            {/* Drag & Drop Upload Area */}
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
                  : 'theme-border hover:border-slate-400 theme-bg-sub/40 hover:theme-bg-sub/80'
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
                {isParsing ? 'Parsing Word Document...' : 'Choose a Word document (.docx) or drag it here'}
              </h3>
              <p className="text-xs theme-text-secondary mt-1 max-w-sm">
                Upload your document to render in high fidelity. You can format and edit text directly on canvas.
              </p>

              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold theme-bg-surface border theme-border theme-text-secondary">
                <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
                <span>Supports Unicode Bengali &amp; English with 100% layout fidelity</span>
              </div>
            </div>

            {/* Target Scope Selection */}
            <div className="p-3 rounded-xl border theme-border theme-bg-sub/40 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold theme-text-primary">Target Document Scope</div>
                <div className="text-[11px] theme-text-secondary">Assign which module or scope this template belongs to</div>
              </div>
              <select
                value={targetScopeId}
                onChange={(e) => setTargetScopeId(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs theme-bg-surface border theme-border theme-text-primary font-medium focus:outline-none focus:border-[var(--accent-main)] cursor-pointer"
              >
                {ALL_DOCUMENT_SCOPES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          /* File Loaded: Show Metadata & Live Document Preview */
          <div className="space-y-4 animate-fade-in">
            {/* Active File Bar */}
            <div className="p-3 rounded-xl theme-bg-sub border theme-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                  <FileIcon className="w-4 h-4" />
                </div>
                <div className="truncate min-w-0">
                  <div className="text-xs font-bold theme-text-primary truncate">{file?.name}</div>
                  <div className="text-[10.5px] theme-text-secondary">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : ''} • Ready to Apply
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center p-0.5 rounded-xl theme-bg-surface border theme-border text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('preview')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      previewTab === 'preview'
                        ? 'theme-bg-accent-soft theme-accent font-bold shadow-2xs'
                        : 'theme-text-secondary hover:theme-text-primary'
                    }`}
                  >
                    Document Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('html')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      previewTab === 'html'
                        ? 'theme-bg-accent-soft theme-accent font-bold shadow-2xs'
                        : 'theme-text-secondary hover:theme-text-primary'
                    }`}
                  >
                    Source HTML
                  </button>
                </div>

                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={handleResetFile}
                  icon={EditIcon}
                  className="text-xs"
                >
                  Change File
                </CustomButton>
              </div>
            </div>

            {/* Template Info Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CustomInput
                label="Template Name"
                placeholder="e.g. Official Student Admit Card"
                value={templateName}
                onChange={(e: any) => setTemplateName(e.target.value)}
              />
              <CustomInput
                label="Description / Category (Optional)"
                placeholder="e.g. Standard 2 per page exam slip"
                value={templateDescription}
                onChange={(e: any) => setTemplateDescription(e.target.value)}
              />
            </div>

            {/* Document Live Preview Box (Pure White Paper in Light & Dark Modes) */}
            {previewTab === 'preview' ? (
              <div className="max-h-[460px] overflow-y-auto p-4 sm:p-6 rounded-2xl bg-slate-100 dark:bg-slate-900 border theme-border shadow-inner flex justify-center">
                <div className="w-full max-w-2xl min-h-[380px] !bg-white !text-slate-900 p-6 sm:p-8 rounded-lg shadow-md border border-slate-200">
                  <div
                    className="docx-preview-content font-sans text-xs sm:text-sm leading-relaxed !bg-white !text-slate-900"
                    dangerouslySetInnerHTML={{ __html: parseResult.html }}
                  />
                </div>
              </div>
            ) : (
              <div className="max-h-[460px] overflow-y-auto p-4 rounded-2xl !bg-slate-950 !text-slate-100 border border-slate-800 font-mono text-xs">
                <pre className="whitespace-pre-wrap">{parseResult.html}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
