/**
 * Mode A: Interactive Word (.docx) Template Editor
 * Authoritative single-host editing with live page projection.
 */

import React from 'react';
import { PaginatedDocumentEditor } from '../../layout';
import { separateDocxStylesAndBody } from '../../docxStyleUtils';
import { sanitizeLogicalDocumentHtml } from '../../layout/logicalDocument';
import { saveDocLabCanvasDraft } from '../../docxTemplateEngine';
import { PrintOptions } from '../../types';

export interface ModeATemplateEditorProps {
  customDocxTemplate: any;
  setCustomDocxTemplate: React.Dispatch<React.SetStateAction<any>>;
  updateCustomDocxTemplateWithHistory?: (updater: any) => void;
  options: PrintOptions;
  docxStyles: string;
  scopeId?: string;
}

export const ModeATemplateEditor: React.FC<ModeATemplateEditorProps> = ({
  customDocxTemplate,
  setCustomDocxTemplate,
  updateCustomDocxTemplateWithHistory,
  options,
  docxStyles,
  scopeId = 'general_document',
}) => {
  const effectiveScope =
    scopeId ||
    customDocxTemplate?.scopeId ||
    (options as any)?.scopeId ||
    'general_document';

  const handleContentChange = (newHtml: string) => {
    const cleanWithoutSpacers = sanitizeLogicalDocumentHtml(newHtml);
    const { styles: incomingStyles, body: incomingBody } = separateDocxStylesAndBody(cleanWithoutSpacers);
    const cleanNewHtml = sanitizeLogicalDocumentHtml(incomingBody || cleanWithoutSpacers);

    const preservedStyles =
      incomingStyles ||
      customDocxTemplate?.styles ||
      separateDocxStylesAndBody(customDocxTemplate?.html || customDocxTemplate?.rawHtml || '').styles ||
      '';

    const fullDocHtml = preservedStyles ? `${preservedStyles}\n${cleanNewHtml}` : cleanNewHtml;

    // Instant zero-latency synchronous local draft backup for 100% crash/reload resilience
    saveDocLabCanvasDraft(effectiveScope, {
      scopeId: effectiveScope,
      templateId: customDocxTemplate?.id,
      name: customDocxTemplate?.name,
      rawHtml: fullDocHtml,
      styles: preservedStyles,
      templateBody: cleanNewHtml,
      isTableDocument: Boolean(customDocxTemplate?.isTableDocument),
      sampleColumns: customDocxTemplate?.columns || customDocxTemplate?.sampleColumns,
      sampleData: customDocxTemplate?.data || customDocxTemplate?.sampleData,
      pageSize: options.pageSize || customDocxTemplate?.pageSize,
      orientation: options.orientation || customDocxTemplate?.orientation,
      margin: options.margin || customDocxTemplate?.margin,
      pageProperties: customDocxTemplate?.pageProperties,
    });

    const updater = (prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        scopeId: effectiveScope,
        styles: preservedStyles,
        templateBody: cleanNewHtml,
        body: cleanNewHtml,
        html: fullDocHtml,
        rawHtml: fullDocHtml,
      };
    };

    if (updateCustomDocxTemplateWithHistory) {
      updateCustomDocxTemplateWithHistory(updater);
    } else {
      setCustomDocxTemplate(updater);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 print:gap-0 print:block">
      {docxStyles && (
        <style
          dangerouslySetInnerHTML={{
            __html: docxStyles.replace(/<\/?style\b[^>]*>/gi, ''),
          }}
        />
      )}
      <PaginatedDocumentEditor
        key="doclab_master_paginated_editor"
        htmlContent={
          customDocxTemplate.templateBody ||
          customDocxTemplate.body ||
          customDocxTemplate.rawHtml ||
          '<p><br></p>'
        }
        styles={docxStyles}
        isEditable={true}
        options={{
          pageSize: options.pageSize || customDocxTemplate?.pageSize || 'A4',
          orientation: options.orientation || customDocxTemplate?.orientation || 'PORTRAIT',
          margin: options.margin || customDocxTemplate?.margin || 'NORMAL',
          customMarginsMm: options.customMarginsMm,
          pageProperties: customDocxTemplate?.pageProperties || customDocxTemplate?.templateMeta?.pageProperties,
          density: options.density,
          fontSizePx: options.fontSizePx,
          fontFamily: options.fontFamily,
          lineHeight: options.lineHeight,
          styles: docxStyles,
        }}
        onContentChange={handleContentChange}
      />
    </div>
  );
};
