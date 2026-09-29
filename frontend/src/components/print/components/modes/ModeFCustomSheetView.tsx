/**
 * Mode F: External Custom JSX Sheet View & Fallback Container
 */

import React from 'react';
import DocLabDocumentWrapper from '../../DocLabDocumentWrapper';
import { PageGeometry } from '../../layout/geometry/PageGeometry';
import { CanonicalContentRenderer } from '../../layout/render/CanonicalContentRenderer';
import { PrintMetaItem, PrintOptions } from '../../types';

export interface ModeFCustomSheetViewProps {
  customSheets?: boolean;
  children?: React.ReactNode;
  title: string;
  subtitle?: string;
  liveMetaItems: PrintMetaItem[];
  handleMetaItemsChange?: (items: PrintMetaItem[]) => void;
  options: PrintOptions;
  updateOptionsWithHistory: (updater: any) => void;
  pageGeometry: PageGeometry;
}

export const ModeFCustomSheetView: React.FC<ModeFCustomSheetViewProps> = ({
  customSheets,
  children,
  title,
  subtitle,
  liveMetaItems,
  handleMetaItemsChange,
  options,
  updateOptionsWithHistory,
  pageGeometry,
}) => {
  if (customSheets) {
    return <>{children}</>;
  }

  if (children) {
    return (
      <div className="relative paper-sheet-wrapper group">
        <div
          className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:m-0 print:bg-white relative"
          data-size={options.pageSize || 'A4'}
          data-orientation={options.orientation || 'PORTRAIT'}
          data-margin={options.margin || 'NORMAL'}
          data-density={options.density || 'NORMAL'}
          data-color-mode={options.colorMode || 'FULL_COLOR'}
          data-page-break={options.enablePageBreak !== false ? 'true' : 'false'}
        >
          <DocLabDocumentWrapper
            title={title}
            subtitle={subtitle}
            metaItems={liveMetaItems}
            onMetaItemsChange={handleMetaItemsChange}
            options={options}
            onOptionsChange={updateOptionsWithHistory}
            pageIndex={0}
            totalPages={1}
            isFirstPage={true}
            isLastPage={true}
          >
            {children}
          </DocLabDocumentWrapper>
        </div>
      </div>
    );
  }

  // Blank Default Document Fallback Sheet
  return (
    <div className="relative paper-sheet-wrapper group flex flex-col items-center">
      <div
        className="paper-sheet docx-paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:m-0 print:bg-white relative text-left box-border shadow-lg cursor-text"
        data-size={options.pageSize || 'A4'}
        data-orientation={options.orientation || 'PORTRAIT'}
        data-margin={options.margin || 'NORMAL'}
        data-density={options.density || 'NORMAL'}
        data-color-mode={options.colorMode || 'FULL_COLOR'}
        style={{
          backgroundColor: '#ffffff',
          color: '#0f172a',
          width: `${pageGeometry.paperDimensionsPx.width}px`,
          maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
          minHeight: `${pageGeometry.paperDimensionsPx.height}px`,
          height: `${pageGeometry.paperDimensionsPx.height}px`,
          maxHeight: `${pageGeometry.paperDimensionsPx.height}px`,
          padding: pageGeometry.cssMarginString,
          textAlign: 'left',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div className="w-full h-full text-left">
          <CanonicalContentRenderer
            content="<p style='font-size: 11pt; color: #334155; line-height: 1.6;'><br></p>"
            styles=""
            pageIndex={0}
            totalPages={1}
          />
        </div>
      </div>
    </div>
  );
};
