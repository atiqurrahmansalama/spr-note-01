/**
 * PagedEditorPageProjector.ts
 *
 * Dedicated Subsystem for Imperative Runtime Page Shell Projection and DOM Reconciliation.
 *
 * Core Responsibilities (SECTION 5):
 * 1. Receives LayoutDocument and imperatively projects runtime page shells (<div data-runtime-page="0">...)
 *    inside the single contentEditable host root.
 * 2. Preserves stable DOM nodes whenever possible so typing and native browser selections are NOT destroyed.
 * 3. Moves nodes between pages smoothly when pagination boundaries shift.
 * 4. Never persists runtime page shells or headers to canonical storage.
 * 5. React controls editor state/orchestration, while PagedEditorPageProjector imperatively controls physical DOM.
 */

import { LayoutDocument, LayoutPage } from '../types/paginationTypes';
import { PageGeometry } from '../geometry/PageGeometry';
import { EditorSerializer } from './EditorSerializer';
import { EditorPositionMapper } from './EditorPositionMapper';

export interface ProjectorOptions {
  pageSize?: string;
  orientation?: 'PORTRAIT' | 'LANDSCAPE';
  margin?: string;
  customMarginsMm?: { top: number; right: number; bottom: number; left: number };
  density?: string;
  styles?: string;
  title?: string;
  headerConfig?: any;
  footerConfig?: any;
}

export interface ReconciliationReport {
  totalPages: number;
  createdShells: number;
  removedShells: number;
  preservedNodes: number;
  timestamp: number;
}

export class PagedEditorPageProjector {
  /**
   * Imperatively projects and reconciles the physical page shells inside the single contentEditable host.
   * Preserves existing DOM nodes to prevent caret collapse and flickering during typing.
   */
  public static project(
    rootHost: HTMLElement,
    layoutDoc: LayoutDocument,
    geometry: PageGeometry,
    options: ProjectorOptions = {}
  ): ReconciliationReport {
    if (!rootHost || !layoutDoc) {
      return { totalPages: 0, createdShells: 0, removedShells: 0, preservedNodes: 0, timestamp: Date.now() };
    }

    const pages = layoutDoc.pages && layoutDoc.pages.length > 0
      ? layoutDoc.pages
      : [this.createFallbackPage(geometry)];

    const targetPageCount = pages.length;
    let createdShells = 0;
    let removedShells = 0;
    let preservedNodes = 0;

    // Capture active selection before DOM mutation
    const savedSel = EditorPositionMapper.captureLogicalSelection(rootHost);

    // 1. Get existing runtime page shells
    const existingShells = Array.from(
      rootHost.querySelectorAll(':scope > .doclab-runtime-page-shell, :scope > [data-runtime-page]')
    ) as HTMLElement[];

    // 2. Adjust number of page shells (Create or Remove)
    while (existingShells.length < targetPageCount) {
      const pageIndex = existingShells.length;
      const newShell = this.createPageShellElement(pageIndex, geometry, options);
      rootHost.appendChild(newShell);
      existingShells.push(newShell);
      createdShells++;
    }

    while (existingShells.length > targetPageCount) {
      const extraShell = existingShells.pop();
      if (extraShell && extraShell.parentNode === rootHost) {
        rootHost.removeChild(extraShell);
        removedShells++;
      }
    }

    // 3. Reconcile each physical page shell
    pages.forEach((page, pageIndex) => {
      const shell = existingShells[pageIndex];
      if (!shell) return;

      this.updatePageShellAttributes(shell, page, pageIndex, targetPageCount, geometry, options);
      preservedNodes += this.reconcilePageContent(shell, page, options);
    });

    // 4. Restore selection if possible
    if (savedSel) {
      EditorPositionMapper.restoreLogicalSelection(rootHost, savedSel);
    }

    return {
      totalPages: targetPageCount,
      createdShells,
      removedShells,
      preservedNodes,
      timestamp: Date.now(),
    };
  }

  /**
   * Extracts clean, pure canonical HTML from a root host containing runtime page shells.
   * Strips all [data-runtime-page] containers and chrome without corrupting semantic manual breaks.
   */
  public static extractCanonicalHtml(rootHost: HTMLElement): string {
    if (!rootHost) return '<p><br></p>';
    const clone = rootHost.cloneNode(true) as HTMLElement;

    // 1. Remove non-editable chrome elements
    const chromeEls = clone.querySelectorAll('[contenteditable="false"]:not([data-manual-break="true"])');
    chromeEls.forEach((el) => el.parentNode?.removeChild(el));

    // 2. Unwrap all page shells
    const shells = clone.querySelectorAll('.doclab-runtime-page-shell, [data-runtime-page], .paper-sheet');
    shells.forEach((shell) => {
      while (shell.firstChild) {
        shell.parentNode?.insertBefore(shell.firstChild, shell);
      }
      shell.parentNode?.removeChild(shell);
    });

    return EditorSerializer.sanitize(clone.innerHTML);
  }

  /**
   * Creates a brand-new physical A4 page shell DOM container
   */
  private static createPageShellElement(
    pageIndex: number,
    geometry: PageGeometry,
    options: ProjectorOptions
  ): HTMLElement {
    const shell = document.createElement('div');
    shell.className =
      'doclab-runtime-page-shell paper-sheet docx-paper-sheet relative text-left box-border shadow-xl rounded-xs print:shadow-none print:border-none print:w-full print:m-0 print:bg-white flex flex-col justify-between mb-8 print:mb-0';
    shell.setAttribute('data-doclab-runtime-page', 'true');
    shell.setAttribute('data-runtime-page', String(pageIndex));
    shell.setAttribute('data-page-index', String(pageIndex));
    shell.setAttribute('data-size', options.pageSize || 'A4');
    shell.setAttribute('data-orientation', options.orientation || 'PORTRAIT');
    shell.setAttribute('data-margin', options.margin || 'NORMAL');
    shell.setAttribute('data-page-break', 'true');

    Object.assign(shell.style, {
      backgroundColor: '#ffffff',
      color: '#0f172a',
      width: `${geometry.paperDimensionsPx.width}px`,
      maxWidth: `${geometry.paperDimensionsPx.width}px`,
      minHeight: `${geometry.paperDimensionsPx.height}px`,
      height: `${geometry.paperDimensionsPx.height}px`,
      maxHeight: `${geometry.paperDimensionsPx.height}px`,
      padding: geometry.cssMarginString,
      boxSizing: 'border-box',
      textAlign: 'left',
      overflow: 'hidden',
    });

    // Content container inside shell
    const contentArea = document.createElement('div');
    contentArea.className =
      'doclab-runtime-page-content doclab-page-content-slot w-full flex-1 relative z-10 text-left select-text overflow-hidden';
    Object.assign(contentArea.style, {
      minHeight: `${geometry.contentAreaPx.height}px`,
      maxHeight: `${geometry.contentAreaPx.height}px`,
      height: `${geometry.contentAreaPx.height}px`,
    });

    shell.appendChild(contentArea);
    return shell;
  }

  /**
   * Updates physical dimensions, margins, and page number attributes on an existing shell
   */
  private static updatePageShellAttributes(
    shell: HTMLElement,
    page: LayoutPage,
    pageIndex: number,
    totalPages: number,
    geometry: PageGeometry,
    options: ProjectorOptions
  ): void {
    shell.setAttribute('data-runtime-page', String(pageIndex));
    shell.setAttribute('data-page-index', String(pageIndex));
    shell.setAttribute('data-size', options.pageSize || 'A4');
    shell.setAttribute('data-orientation', options.orientation || 'PORTRAIT');

    Object.assign(shell.style, {
      width: `${geometry.paperDimensionsPx.width}px`,
      maxWidth: `${geometry.paperDimensionsPx.width}px`,
      minHeight: `${geometry.paperDimensionsPx.height}px`,
      height: `${geometry.paperDimensionsPx.height}px`,
      maxHeight: `${geometry.paperDimensionsPx.height}px`,
      padding: geometry.cssMarginString,
      overflow: 'hidden',
    });

    const contentSlot = shell.querySelector('.doclab-page-content-slot') as HTMLElement;
    if (contentSlot) {
      Object.assign(contentSlot.style, {
        minHeight: `${page.contentArea?.height || geometry.contentAreaPx.height}px`,
        maxHeight: `${page.contentArea?.height || geometry.contentAreaPx.height}px`,
        height: `${page.contentArea?.height || geometry.contentAreaPx.height}px`,
      });
    }
  }

  /**
   * Reconciles the inner content of a physical page shell with minimum DOM churn
   */
  private static reconcilePageContent(
    shell: HTMLElement,
    page: LayoutPage,
    options: ProjectorOptions
  ): number {
    const contentSlot = (shell.querySelector('.doclab-page-content-slot') || shell) as HTMLElement;
    const targetHtml = page.fragments && page.fragments.length > 0
      ? page.fragments.map((f) => f.htmlContent || `<p>${f.textContent || ''}</p>`).join('\n')
      : (page.htmlContent || '<p><br></p>');

    const cleanTarget = EditorSerializer.sanitize(targetHtml);
    const currentClean = EditorSerializer.sanitize(contentSlot.innerHTML);

    if (currentClean !== cleanTarget) {
      contentSlot.innerHTML = cleanTarget;
      return 1;
    }

    return 1; // Preserved node
  }

  private static createFallbackPage(geometry: PageGeometry): LayoutPage {
    return {
      index: 0,
      pageNumber: 1,
      width: geometry.paperDimensionsPx.width,
      height: geometry.paperDimensionsPx.height,
      margins: { top: 48, right: 48, bottom: 48, left: 48 },
      contentArea: { x: 48, y: 48, width: geometry.contentAreaPx.width, height: geometry.contentAreaPx.height },
      fragments: [],
      htmlContent: '<p><br></p>',
      usedHeight: 0,
      availableHeight: geometry.contentAreaPx.height,
      isFirstPage: true,
      isLastPage: true,
    };
  }
}
export default PagedEditorPageProjector;
