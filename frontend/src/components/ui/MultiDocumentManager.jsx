import React, { useState, useEffect } from 'react';
import CustomInput from './CustomInput';
import DocumentFilePicker from './DocumentFilePicker';
import { TrashIcon } from './Icons';
import { documentTypesStore, resolveAllowedFormatsConfig } from '../../utils/localStore';
import { useTenant } from '../../context/TenantContext';

/**
 * Enterprise Universal Multi-Document List Manager Component
 * 
 * Clean 2-column layout on larger screens:
 * - Left column: Document Title (dynamically powered by Developer Tools documentTypesStore)
 * - Right column: Document File Picker
 * 
 * Supports:
 * - Mandatory / Required Documents (is_required: true -> Cannot be deleted, marked with badge)
 * - Dynamic Additional Documents (User can add extra documents freely)
 */
export default function MultiDocumentManager({
  title = "DOCUMENTS & CREDENTIALS",
  subTitle = "Attach required academic or identity documents one by one",
  addButtonLabel = "+ Add Document",
  itemLabelPrefix = "DOCUMENT",
  documents = [],
  onChange,
  targetCategory = null,
  presetSuggestions = [],
  maxDocuments = 15,
  disabled = false,
  className = "",
}) {
  const tenantContext = useTenant ? useTenant() : {};
  const activeTenantId = tenantContext?.activeTenantId || 'default';

  const [availableTypes, setAvailableTypes] = useState(() =>
    documentTypesStore.getTypes(activeTenantId, targetCategory)
  );

  // Real-time synchronization with Developer Tools taxonomy changes
  useEffect(() => {
    const handleTypesUpdated = () => {
      setAvailableTypes(documentTypesStore.getTypes(activeTenantId, targetCategory));
    };
    window.addEventListener('spr_document_types_updated', handleTypesUpdated);
    return () => window.removeEventListener('spr_document_types_updated', handleTypesUpdated);
  }, [activeTenantId, targetCategory]);

  const activeSuggestions = presetSuggestions.length > 0
    ? presetSuggestions
    : availableTypes
        .filter((d) => d.is_active !== false)
        .map((d) => (d.name_bn ? `${d.name}` : d.name));

  const getDocFormatConfig = (title) => {
    if (!title) {
      return {
        accept: ".pdf,.doc,.docx,image/*,.jpg,.jpeg,.png,.webp",
        subLabel: "PDF, JPG, PNG, WebP (Max 5MB)",
      };
    }
    const cleanTitle = title.toLowerCase().trim();
    const matched = (availableTypes || []).find(
      (t) =>
        t.name?.toLowerCase().trim() === cleanTitle ||
        (t.name_bn && t.name_bn.toLowerCase().trim() === cleanTitle)
    );
    return resolveAllowedFormatsConfig(matched?.allowed_formats || matched?.allowed_format);
  };

  const handleAdd = () => {
    if (documents.length >= maxDocuments) return;
    const newDoc = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: "",
      is_required: false,
      file_url: "",
      file_name: "",
      file_size: "",
    };
    onChange?.([...documents, newDoc]);
  };

  const handleUpdateTitle = (id, value) => {
    const updated = documents.map((doc) =>
      doc.id === id ? { ...doc, title: value } : doc
    );
    onChange?.(updated);
  };

  const handleFileChange = (id, fileData) => {
    const updated = documents.map((doc) =>
      doc.id === id
        ? {
            ...doc,
            file_url: fileData.url,
            file_name: fileData.name,
            file_size: fileData.size,
          }
        : doc
    );
    onChange?.(updated);
  };

  const handleFileRemove = (id) => {
    const updated = documents.map((doc) =>
      doc.id === id
        ? {
            ...doc,
            file_url: "",
            file_name: "",
            file_size: "",
          }
        : doc
    );
    onChange?.(updated);
  };

  const handleRemove = (id) => {
    const updated = documents.filter((doc) => doc.id !== id && !doc.is_required);
    onChange?.(updated);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary truncate">
            {title}
          </h4>
          {subTitle && (
            <p className="text-[11px] theme-text-secondary mt-0.5 leading-relaxed">
              {subTitle}
            </p>
          )}
        </div>

        {!disabled && documents.length < maxDocuments && (
          <button
            type="button"
            onClick={handleAdd}
            className="px-3.5 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
          >
            <span>{addButtonLabel}</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {documents.length === 0 ? (
        <div className="p-6 sm:p-8 rounded-2xl border-2 border-dashed theme-border theme-bg-sub/30 text-center space-y-2 select-none">
          <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft theme-accent border theme-border flex items-center justify-center mx-auto shadow-inner">
            <svg className="w-6 h-6 theme-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xs font-bold theme-text-primary">
            No documents attached yet
          </p>
          <p className="text-[11px] theme-text-secondary max-w-sm mx-auto">
            Click "{addButtonLabel}" to attach your credentials, sanads, or certificates.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc, index) => (
            <div
              key={doc.id || index}
              className="p-4 sm:p-5 rounded-2xl theme-bg-sub border theme-border space-y-4 animate-fade-in shadow-xs"
            >
              {/* Card Top Title & Mandatory Badge / Remove Button */}
              <div className="flex items-center justify-between border-b theme-border pb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold theme-accent uppercase tracking-wider">
                    {itemLabelPrefix} #{index + 1}
                  </span>
                  {doc.is_required && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shadow-xs">
                      Mandatory / বাধ্যতামূলক
                    </span>
                  )}
                </div>

                {!disabled && !doc.is_required && (
                  <button
                    type="button"
                    onClick={() => handleRemove(doc.id)}
                    className="px-2.5 py-1 rounded-lg theme-bg-danger-soft theme-danger border theme-border text-[11px] font-bold hover:opacity-80 transition cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {/* 2-Column Responsive Layout: Left = Title Input, Right = Document File Picker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-start">
                {/* Left Column: Document Title & Developer Tools Preset Suggestions */}
                <div className="space-y-2">
                  <CustomInput
                    label="Document Title"
                    placeholder="e.g. Dawra-e-Hadith Sanad, Birth Certificate, Marksheet"
                    value={doc.title || ""}
                    onChange={(val) => handleUpdateTitle(doc.id, val)}
                    required
                    disabled={disabled || (doc.is_required && Boolean(doc.title))}
                  />

                  {/* Dynamic preset quick suggestions from Developer Tools (only for non-mandatory or empty title) */}
                  {activeSuggestions.length > 0 && !doc.title && !doc.is_required && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeSuggestions.slice(0, 6).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleUpdateTitle(doc.id, suggestion)}
                          className="px-2.5 py-1 rounded-lg theme-bg-surface hover:theme-bg-elevated border theme-border text-[10px] font-medium theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                        >
                          + {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Document File Picker with Dynamic Allowed Formats */}
                <div>
                  {(() => {
                    const formatConfig = getDocFormatConfig(doc.title);
                    return (
                      <DocumentFilePicker
                        label={`Upload Scanned ${doc.title || 'Document'}`}
                        subLabel={formatConfig.subLabel}
                        accept={formatConfig.accept}
                        fileUrl={doc.file_url}
                        fileName={doc.file_name}
                        fileSize={doc.file_size}
                        onChange={(fileData) => handleFileChange(doc.id, fileData)}
                        onRemove={() => handleFileRemove(doc.id)}
                        disabled={disabled}
                        compact={true}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
