/**
 * Mode E: Native Tabular Report View
 * Slices and renders tabular rows across fixed/density-aware sheets with repeated headers and metrics.
 */

import React from 'react';
import DocLabDocumentWrapper from '../../DocLabDocumentWrapper';
import DocLabTableRenderer from '../../DocLabTableRenderer';
import {
  PrintColumn,
  PrintMetaItem,
  PrintOptions,
  PrintPaginationResult,
  PrintSummaryMetric,
  PrintBatchDocument,
} from '../../types';

export interface ModeETabularReportViewProps {
  title: string;
  subtitle?: string;
  liveMetaItems: PrintMetaItem[];
  handleMetaItemsChange?: (items: PrintMetaItem[]) => void;
  options: PrintOptions;
  updateOptionsWithHistory: (updater: any) => void;
  liveColumns: PrintColumn[];
  visibleColumnKeys: string[];
  isColumnMandatory?: ((column: any, idx?: number) => boolean) | null;
  isColumnRequired?: ((column: any, idx?: number) => boolean) | null;
  requiredColumnKeys?: (string | number)[] | null;
  visibleRowKeys: string[];
  isRowMandatory?: ((row: any, idx: number) => boolean) | null;
  isRowRequired?: ((row: any, idx: number) => boolean) | null;
  requiredRowKeys?: (string | number)[] | null;
  getRowIdentifier: (row: any, idx: number) => string;
  liveSummaryMetrics: PrintSummaryMetric[];
  footerRow?: any;
  footerRows?: any[];
  paginationResult: PrintPaginationResult;
  effectiveDocs?: PrintBatchDocument[] | null;
}

export const ModeETabularReportView: React.FC<ModeETabularReportViewProps> = ({
  title,
  subtitle,
  liveMetaItems,
  handleMetaItemsChange,
  options,
  updateOptionsWithHistory,
  liveColumns,
  visibleColumnKeys,
  isColumnMandatory,
  isColumnRequired,
  requiredColumnKeys,
  visibleRowKeys,
  isRowMandatory,
  isRowRequired,
  requiredRowKeys,
  getRowIdentifier,
  liveSummaryMetrics,
  footerRow,
  footerRows = [],
  paginationResult,
  effectiveDocs,
}) => {
  if (effectiveDocs && effectiveDocs.length > 0) {
    return (
      <div className="flex flex-col items-center gap-8 print:gap-0 print:block">
        {effectiveDocs.map((doc, docIdx) => {
          const docMeta = doc.metaItems || liveMetaItems;
          const docCols = doc.columns || liveColumns;
          const docData = doc.data || [];
          const docFooterRows = doc.footerRows || (docIdx === effectiveDocs.length - 1 ? footerRows : []);
          const docFooterRow = doc.footerRow || (docIdx === effectiveDocs.length - 1 ? footerRow : null);
          const docMetrics =
            doc.summaryMetrics ||
            (docIdx === effectiveDocs.length - 1 && options.showSummary !== false ? liveSummaryMetrics : []);

          return (
            <div key={doc.id || docIdx} className="relative paper-sheet-wrapper group">
              <div
                className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:m-0 print:bg-white relative"
                data-size={options.pageSize || 'A4'}
                data-orientation={options.orientation || 'PORTRAIT'}
                data-margin={options.margin || 'NORMAL'}
                data-density={options.density || 'NORMAL'}
                data-color-mode={options.colorMode || 'FULL_COLOR'}
                data-page-break="true"
              >
                <DocLabDocumentWrapper
                  title={doc.title || title}
                  subtitle={doc.subtitle || subtitle}
                  metaItems={docMeta}
                  onMetaItemsChange={docIdx === 0 ? handleMetaItemsChange : undefined}
                  options={options}
                  onOptionsChange={updateOptionsWithHistory}
                  pageIndex={docIdx}
                  totalPages={effectiveDocs.length}
                  isFirstPage={docIdx === 0}
                  isLastPage={docIdx === effectiveDocs.length - 1}
                >
                  {doc.content ? (
                    doc.content
                  ) : (
                    <DocLabTableRenderer
                      columns={docCols}
                      data={docData}
                      visibleColumnKeys={visibleColumnKeys}
                      isColumnMandatory={isColumnMandatory}
                      isColumnRequired={isColumnRequired}
                      requiredColumnKeys={requiredColumnKeys}
                      visibleRowKeys={visibleRowKeys}
                      isRowMandatory={isRowMandatory}
                      isRowRequired={isRowRequired}
                      requiredRowKeys={requiredRowKeys}
                      getRowKey={getRowIdentifier}
                      summaryMetrics={docMetrics}
                      density={options.density}
                      footerRow={docFooterRow}
                      footerRows={docFooterRows}
                    />
                  )}
                </DocLabDocumentWrapper>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {paginationResult.pages.map((page, pIdx) => (
        <div key={pIdx} className="relative paper-sheet-wrapper group">
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
              pageIndex={pIdx}
              totalPages={paginationResult.totalPages}
              isFirstPage={page.isFirstPage}
              isLastPage={page.isLastPage}
            >
              <DocLabTableRenderer
                columns={liveColumns}
                data={page.rows}
                visibleColumnKeys={visibleColumnKeys}
                isColumnMandatory={isColumnMandatory}
                isColumnRequired={isColumnRequired}
                requiredColumnKeys={requiredColumnKeys}
                visibleRowKeys={visibleRowKeys}
                isRowMandatory={isRowMandatory}
                isRowRequired={isRowRequired}
                requiredRowKeys={requiredRowKeys}
                getRowKey={getRowIdentifier}
                extraBlankRows={page.extraBlanks}
                summaryMetrics={page.isLastPage && options.showSummary !== false ? liveSummaryMetrics : []}
                density={options.density}
                footerRow={page.isLastPage ? footerRow : null}
                footerRows={page.isLastPage ? footerRows : []}
                startIndex={page.startIndex}
              />
            </DocLabDocumentWrapper>
          </div>
        </div>
      ))}
    </>
  );
};
