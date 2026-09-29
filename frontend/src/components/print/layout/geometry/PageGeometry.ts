/**
 * PageGeometry & Physical Layout Metrics for DocLab Architecture
 *
 * Single Source of Truth for paper dimensions, orientation, and margin calculations.
 *
 * Supports:
 * - A4 (210mm x 297mm)
 * - Letter (215.9mm x 279.4mm)
 * - Legal (215.9mm x 355.6mm)
 * - ID Card (85.6mm x 53.98mm)
 * - Custom paper sizes
 * - Portrait and Landscape orientations
 * - Custom Top, Right, Bottom, Left margins (in mm and px)
 *
 * NEVER hard-codes a single universal page height.
 */

import {
  Dimensions,
  Insets,
  Rect,
  PageSizeId,
  PageOrientation,
  MarginPreset,
  PAPER_SIZE_METRICS_MM,
  MARGIN_PRESET_METRICS_MM,
  mmToPx,
  pxToMm,
} from '../types/layoutTypes';
import { LayoutDocumentOptions } from '../types/documentTypes';

export interface PageGeometry {
  pageSize: PageSizeId;
  orientation: PageOrientation;

  paperDimensionsMm: Dimensions;
  paperDimensionsPx: Dimensions;

  marginsMm: Insets;
  marginsPx: Insets;

  contentAreaPx: Rect;
  headerAreaPx: Rect;
  footerAreaPx: Rect;
  signatureAreaPx: Rect;

  availableContentWidthPx: number;
  availableContentHeightPx: number;
  contentWidthPx: number;
  contentHeightPx: number;

  pageGapPx: number;
  screenPageHeaderHeightPx: number;

  cssMarginString: string;
  cssPageRule: string;
  cssPaperStyle: React.CSSProperties;
}

export class PageGeometryCalculator {
  /**
   * Resolves physical paper dimensions in mm and CSS pixels (96 DPI)
   */
  public static resolveDimensions(
    pageSize: PageSizeId = 'A4',
    orientation: PageOrientation = 'PORTRAIT',
    customMm?: Partial<Dimensions>
  ): { mm: Dimensions; px: Dimensions } {
    const base = PAPER_SIZE_METRICS_MM[pageSize] || PAPER_SIZE_METRICS_MM.A4;
    const isLandscape = orientation === 'LANDSCAPE';

    let widthMm = customMm?.width !== undefined ? customMm.width : base.widthMm;
    let heightMm = customMm?.height !== undefined ? customMm.height : base.heightMm;

    if (pageSize !== 'CUSTOM') {
      if (isLandscape && widthMm < heightMm) {
        // Swap for landscape
        const temp = widthMm;
        widthMm = heightMm;
        heightMm = temp;
      } else if (!isLandscape && widthMm > heightMm && pageSize !== 'ID_CARD') {
        // Swap for portrait
        const temp = widthMm;
        widthMm = heightMm;
        heightMm = temp;
      }
    }

    const mm: Dimensions = { width: widthMm, height: heightMm };
    const px: Dimensions = { width: mmToPx(widthMm), height: mmToPx(heightMm) };

    return { mm, px };
  }

  /**
   * Resolves exact margin insets in millimeters, CSS pixels, and CSS padding string
   */
  public static resolveMargins(
    marginPreset: MarginPreset = 'NORMAL',
    customMarginsMm?: Partial<Insets>,
    pageProperties?: any
  ): { mm: Insets; px: Insets; css: string } {
    // Check if OpenXML pageProperties provide explicit millimeter margins
    if (pageProperties) {
      const top = pageProperties.marginTopMm ?? pageProperties.top;
      const right = pageProperties.marginRightMm ?? pageProperties.right;
      const bottom = pageProperties.marginBottomMm ?? pageProperties.bottom;
      const left = pageProperties.marginLeftMm ?? pageProperties.left;

      if (top !== undefined || right !== undefined || bottom !== undefined || left !== undefined) {
        const topMm = top !== undefined ? top : 20;
        const rightMm = right !== undefined ? right : 20;
        const bottomMm = bottom !== undefined ? bottom : 20;
        const leftMm = left !== undefined ? left : 20;

        const mm: Insets = { top: topMm, right: rightMm, bottom: bottomMm, left: leftMm };
        const px: Insets = { top: mmToPx(topMm), right: mmToPx(rightMm), bottom: mmToPx(bottomMm), left: mmToPx(leftMm) };
        const css = `${topMm}mm ${rightMm}mm ${bottomMm}mm ${leftMm}mm`;

        return { mm, px, css };
      }
    }

    const baseMm = MARGIN_PRESET_METRICS_MM[marginPreset] || MARGIN_PRESET_METRICS_MM.NORMAL;
    const topMm = customMarginsMm?.top !== undefined ? customMarginsMm.top : baseMm.top;
    const rightMm = customMarginsMm?.right !== undefined ? customMarginsMm.right : baseMm.right;
    const bottomMm = customMarginsMm?.bottom !== undefined ? customMarginsMm.bottom : baseMm.bottom;
    const leftMm = customMarginsMm?.left !== undefined ? customMarginsMm.left : baseMm.left;

    const mm: Insets = { top: topMm, right: rightMm, bottom: bottomMm, left: leftMm };
    const px: Insets = { top: mmToPx(topMm), right: mmToPx(rightMm), bottom: mmToPx(bottomMm), left: mmToPx(leftMm) };
    const css = `${topMm}mm ${rightMm}mm ${bottomMm}mm ${leftMm}mm`;

    return { mm, px, css };
  }

  /**
   * Primary Calculator: computes complete spatial page geometry
   */
  public static calculate(options: LayoutDocumentOptions = {}): PageGeometry {
    const pageSize = options.pageSize || 'A4';
    const orientation = options.orientation || 'PORTRAIT';

    const { mm: paperDimensionsMm, px: paperDimensionsPx } = this.resolveDimensions(
      pageSize,
      orientation,
      options.customPaperDimensionsMm
    );

    const { mm: marginsMm, px: marginsPx, css: cssMarginString } = this.resolveMargins(
      options.margin,
      options.customMarginsMm,
      options.pageProperties
    );

    const headerConfig = options.headerConfig;
    const footerConfig = options.footerConfig;
    const signatureConfig = options.signatureConfig;

    const headerHeight = Math.max(
      0,
      options.headerHeightPx !== undefined
        ? options.headerHeightPx
        : (headerConfig?.headerHeightPx !== undefined ? headerConfig.headerHeightPx : (headerConfig ? 60 : 0))
    );
    const footerHeight = Math.max(
      0,
      options.footerHeightPx !== undefined
        ? options.footerHeightPx
        : (footerConfig?.footerHeightPx !== undefined ? footerConfig.footerHeightPx : (footerConfig ? 40 : 0))
    );
    const signatureHeight = Math.max(
      0,
      options.signatureHeightPx !== undefined
        ? options.signatureHeightPx
        : (signatureConfig?.heightPx !== undefined ? signatureConfig.heightPx : (signatureConfig ? 80 : 0))
    );

    const availableContentWidthPx = Math.max(100, paperDimensionsPx.width - marginsPx.left - marginsPx.right);
    const availableContentHeightPx = Math.max(
      100,
      paperDimensionsPx.height - marginsPx.top - marginsPx.bottom - headerHeight - footerHeight - signatureHeight
    );

    const contentAreaPx: Rect = {
      x: marginsPx.left,
      y: marginsPx.top + headerHeight,
      width: availableContentWidthPx,
      height: availableContentHeightPx,
    };

    const headerAreaPx: Rect = {
      x: marginsPx.left,
      y: marginsPx.top,
      width: availableContentWidthPx,
      height: headerHeight,
    };

    const footerAreaPx: Rect = {
      x: marginsPx.left,
      y: paperDimensionsPx.height - marginsPx.bottom - footerHeight,
      width: availableContentWidthPx,
      height: footerHeight,
    };

    const signatureAreaPx: Rect = {
      x: marginsPx.left,
      y: paperDimensionsPx.height - marginsPx.bottom - footerHeight - signatureHeight,
      width: availableContentWidthPx,
      height: signatureHeight,
    };

    const sizeSpec =
      pageSize === 'CUSTOM' && paperDimensionsMm
        ? `${paperDimensionsMm.width}mm ${paperDimensionsMm.height}mm`
        : `${String(pageSize).toLowerCase()} ${String(orientation).toLowerCase()}`;
    const cssPageRule = `@page { size: ${sizeSpec}; margin: 0; }`;

    const cssPaperStyle: React.CSSProperties = {
      width: `${paperDimensionsPx.width}px`,
      maxWidth: `${paperDimensionsPx.width}px`,
      minHeight: `${paperDimensionsPx.height}px`,
      height: `${paperDimensionsPx.height}px`,
      padding: cssMarginString,
      boxSizing: 'border-box',
    };

    const pageGapPx = 32;
    const screenPageHeaderHeightPx = 32;

    return {
      pageSize,
      orientation,
      paperDimensionsMm,
      paperDimensionsPx,
      marginsMm,
      marginsPx,
      contentAreaPx,
      headerAreaPx,
      footerAreaPx,
      signatureAreaPx,
      availableContentWidthPx,
      availableContentHeightPx,
      contentWidthPx: availableContentWidthPx,
      contentHeightPx: availableContentHeightPx,
      pageGapPx,
      screenPageHeaderHeightPx,
      cssMarginString,
      cssPageRule,
      cssPaperStyle,
    };
  }
}
