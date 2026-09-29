/**
 * Mode A: Interactive Word (.docx) Template Editor
 * Authoritative single-host editing with live page projection.
 */

import React from 'react';
import { PaginatedDocumentEditor } from '../../layout';
import { separateDocxStylesAndBody } from '../../docxStyleUtils';
import { sanitizeLogicalDocumentHtml } from '../../layout/logicalDocument';
import { PrintOptions } from '../../types';

export interface ModeATemplateEditorProps {
  customDocxTemplate: any;
  setCustomDocxTemplate: React.Dispatch<React.SetStateAction<any>>;
  updateCustomDocxTemplateWithHistory?: (updater: any) => void;
  options: PrintOptions;
  docxStyles: string;
  isDebugOverlayOpen?: boolean;
}

export const ModeATemplateEditor: React.FC<ModeATemplateEditorProps> = ({
  customDocxTemplate,
  setCustomDocxTemplate,
  updateCustomDocxTemplateWithHistory,
  options,
  docxStyles,
  isDebugOverlayOpen = false,
}) => {
  const handleContentChange = (newHtml: string) => {
    const cleanWithoutSpacers = sanitizeLogicalDocumentHtml(newHtml);
    const { styles: incomingStyles, body: incomingBody } = separateDocxStylesAndBody(cleanWithoutSpacers);
    const cleanNewHtml = sanitizeLogicalDocumentHtml(incomingBody || cleanWithoutSpacers);

    const updater = (prev: any) => {
      if (!prev) return null;
      const preservedStyles =
        incomingStyles ||
        prev.styles ||
        separateDocxStylesAndBody(prev.html || prev.rawHtml || '').styles ||
        '';

      return {
        ...prev,
        styles: preservedStyles,
        templateBody: cleanNewHtml,
        body: cleanNewHtml,
        html: preservedStyles ? `${preservedStyles}\n${cleanNewHtml}` : cleanNewHtml,
        rawHtml: preservedStyles ? `${preservedStyles}\n${cleanNewHtml}` : cleanNewHtml,
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
        debugLayout={isDebugOverlayOpen}
        onContentChange={handleContentChange}
      />
    </div>
  );
};
