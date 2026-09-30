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
  ContentArea,
  HeaderArea,
  FooterArea,
  PageSizeId,
  PageOrientation,
  MarginPreset,
  PAPER_SIZE_METRICS_MM,
  MARGIN_PRESET_METRICS_MM,
  mmToPx,
  pxToMm,
  inchesToPx,
  ptToPx,
} from '../types/layoutTypes';
import { LayoutDocumentOptions } from '../types/documentTypes';

export interface PageGeometry {
  pageSize: PageSizeId;
  orientation: PageOrientation;

  paperDimensionsMm: Dimensions;
  paperDimensionsPx: Dimensions;

  marginsMm: Insets;
  marginsPx: Insets;

  paperRect: Rect;
  marginRect: Rect;
  headerRect: Rect;
  bodyContentRect: Rect;
  footerRect: Rect;

  contentAreaPx: Rect;
  contentArea: ContentArea;
  headerAreaPx: Rect;
  headerArea?: HeaderArea;
  footerAreaPx: Rect;
  footerArea?: FooterArea;
  signatureAreaPx: Rect;
  signatureArea?: Rect;

  headerTopY: number;
  bodyTopY: number;
  footerTopY: number;

  availableContentWidthPx: number;
  availableContentHeightPx: number;
  contentWidthPx: number;
  contentHeightPx: number;

  pageGapPx: number;
  screenPageHeaderHeightPx: number;

  cssMarginString: string;
  cssPageRule: string;
  cssPaperStyle: React.CSSProperties;
  scale: number;
}

export class PageGeometryCalculator {
  /**
   * Resolves physical paper dimensions in mm and CSS pixels (derived from 96 DPI and scale)
   */
  public static resolveDimensions(
    pageSize: PageSizeId = 'A4',
    orientation: PageOrientation = 'PORTRAIT',
    customMm?: Partial<Dimensions>,
    scale: number = 1
  ): { mm: Dimensions; px: Dimensions } {
    const upperSize = (String(pageSize || 'A4').toUpperCase()) as PageSizeId;
    const base = PAPER_SIZE_METRICS_MM[upperSize] || PAPER_SIZE_METRICS_MM.A4;
    const isLandscape = orientation === 'LANDSCAPE';

    let widthMm = customMm?.width !== undefined ? customMm.width : base.widthMm;
    let heightMm = customMm?.height !== undefined ? customMm.height : base.heightMm;

    if (upperSize !== 'CUSTOM') {
      if (isLandscape && widthMm < heightMm) {
        // Swap for landscape
        const temp = widthMm;
        widthMm = heightMm;
        heightMm = temp;
      } else if (!isLandscape && widthMm > heightMm && upperSize !== 'ID_CARD') {
        // Swap for portrait
        const temp = widthMm;
        widthMm = heightMm;
        heightMm = temp;
      }
    }

    const mm: Dimensions = { width: widthMm, height: heightMm };
    const px: Dimensions = {
      width: mmToPx(widthMm, scale),
      height: mmToPx(heightMm, scale),
    };

    return { mm, px };
  }

  /**
   * Resolves exact margin insets in millimeters, CSS pixels (with scale), and CSS padding string
   */
  public static resolveMargins(
    marginPreset: MarginPreset = 'NORMAL',
    customMarginsMm?: Partial<Insets>,
    pageProperties?: any,
    scale: number = 1
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
        const px: Insets = {
          top: mmToPx(topMm, scale),
          right: mmToPx(rightMm, scale),
          bottom: mmToPx(bottomMm, scale),
          left: mmToPx(leftMm, scale),
        };
        const css = `${topMm}mm ${rightMm}mm ${bottomMm}mm ${leftMm}mm`;

        return { mm, px, css };
      }
    }

    const upperPreset = (String(marginPreset || 'NORMAL').toUpperCase()) as MarginPreset;
    const baseMm = MARGIN_PRESET_METRICS_MM[upperPreset] || MARGIN_PRESET_METRICS_MM.NORMAL;
    const topMm = customMarginsMm?.top !== undefined ? customMarginsMm.top : baseMm.top;
    const rightMm = customMarginsMm?.right !== undefined ? customMarginsMm.right : baseMm.right;
    const bottomMm = customMarginsMm?.bottom !== undefined ? customMarginsMm.bottom : baseMm.bottom;
    const leftMm = customMarginsMm?.left !== undefined ? customMarginsMm.left : baseMm.left;

    const mm: Insets = { top: topMm, right: rightMm, bottom: bottomMm, left: leftMm };
    const px: Insets = {
      top: mmToPx(topMm, scale),
      right: mmToPx(rightMm, scale),
      bottom: mmToPx(bottomMm, scale),
      left: mmToPx(leftMm, scale),
    };
    const css = `${topMm}mm ${rightMm}mm ${bottomMm}mm ${leftMm}mm`;

    return { mm, px, css };
  }

  /**
   * Primary Calculator: computes authoritative and deterministic page geometry
   */
  public static calculate(options: LayoutDocumentOptions = {}): PageGeometry {
    const rawPageSize = ((options.pageSize || (options as any).paperSize || 'A4') as string).toUpperCase();
    const pageSize: PageSizeId = (rawPageSize as any);
    const orientation: PageOrientation = options.orientation || 'PORTRAIT';
    const scale = options.scale || 1;

    const customPaperDimensionsMm = options.customPaperDimensionsMm || (
      (options as any).customWidthMm !== undefined || (options as any).customHeightMm !== undefined
        ? {
            width: (options as any).customWidthMm !== undefined ? (options as any).customWidthMm : 210,
            height: (options as any).customHeightMm !== undefined ? (options as any).customHeightMm : 297,
          }
        : undefined
    );

    const { mm: paperDimensionsMm, px: paperDimensionsPx } = this.resolveDimensions(
      pageSize,
      orientation,
      customPaperDimensionsMm,
      scale
    );

    const { mm: marginsMm, px: marginsPx, css: cssMarginString } = this.resolveMargins(
      options.margin,
      options.customMarginsMm,
      options.pageProperties,
      scale
    );

    const headerConfig = options.headerConfig;
    const footerConfig = options.footerConfig;
    const signatureConfig = options.signatureConfig;

    const headerHeight = Math.max(
      0,
      options.headerHeightPx !== undefined
        ? options.headerHeightPx
        : (headerConfig?.headerHeightPx !== undefined
            ? headerConfig.headerHeightPx
            : (headerConfig ? mmToPx(15, scale) : 0))
    );
    const footerHeight = Math.max(
      0,
      options.footerHeightPx !== undefined
        ? options.footerHeightPx
        : (footerConfig?.footerHeightPx !== undefined
            ? footerConfig.footerHeightPx
            : (footerConfig ? mmToPx(12, scale) : 0))
    );
    const signatureHeight = Math.max(
      0,
      options.signatureHeightPx !== undefined
        ? options.signatureHeightPx
        : (signatureConfig?.heightPx !== undefined
            ? signatureConfig.heightPx
            : (signatureConfig ? mmToPx(25, scale) : 0))
    );

    // Calculate header top Y coordinate
    const headerTopY = options.headerDistancePx !== undefined
      ? options.headerDistancePx
      : (options.headerDistanceMm !== undefined
          ? mmToPx(options.headerDistanceMm, scale)
          : marginsPx.top);

    // Body content starts below top margin and header
    const bodyTopY = Math.max(marginsPx.top, headerTopY + headerHeight);

    // Calculate footer distance & top Y coordinate
    const footerBottomDistancePx = options.footerDistancePx !== undefined
      ? options.footerDistancePx
      : (options.footerDistanceMm !== undefined
          ? mmToPx(options.footerDistanceMm, scale)
          : marginsPx.bottom);

    const footerTopY = paperDimensionsPx.height - footerBottomDistancePx - footerHeight;

    const availableContentWidthPx = Math.max(50, paperDimensionsPx.width - marginsPx.left - marginsPx.right);
    const availableContentHeightPx = Math.max(
      50,
      paperDimensionsPx.height - marginsPx.top - marginsPx.bottom - headerHeight - footerHeight - signatureHeight
    );

    const paperRect: Rect = {
      x: 0,
      y: 0,
      width: paperDimensionsPx.width,
      height: paperDimensionsPx.height,
    };

    const marginRect: Rect = {
      x: marginsPx.left,
      y: marginsPx.top,
      width: availableContentWidthPx,
      height: Math.max(0, paperDimensionsPx.height - marginsPx.top - marginsPx.bottom),
    };

    const headerRect: Rect = {
      x: marginsPx.left,
      y: headerTopY,
      width: availableContentWidthPx,
      height: headerHeight,
    };

    const bodyContentRect: Rect = {
      x: marginsPx.left,
      y: bodyTopY,
      width: availableContentWidthPx,
      height: availableContentHeightPx,
    };

    const footerRect: Rect = {
      x: marginsPx.left,
      y: footerTopY,
      width: availableContentWidthPx,
      height: footerHeight,
    };

    const contentAreaPx: Rect = {
      x: marginsPx.left,
      y: bodyTopY,
      width: availableContentWidthPx,
      height: availableContentHeightPx,
    };

    const headerAreaPx: Rect = headerRect;
    const footerAreaPx: Rect = footerRect;

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

    const contentArea: ContentArea = {
      ...contentAreaPx,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    };

    const headerArea: HeaderArea = {
      ...headerAreaPx,
      isVisible: headerHeight > 0,
      reserveHeight: headerHeight,
    };

    const footerArea: FooterArea = {
      ...footerAreaPx,
      isVisible: footerHeight > 0,
      reserveHeight: footerHeight,
    };

    return {
      pageSize,
      orientation,
      paperDimensionsMm,
      paperDimensionsPx,
      marginsMm,
      marginsPx,
      paperRect,
      marginRect,
      headerRect,
      bodyContentRect,
      footerRect,
      contentAreaPx,
      contentArea,
      headerAreaPx,
      headerArea,
      footerAreaPx,
      footerArea,
      signatureAreaPx,
      signatureArea: signatureAreaPx,
      headerTopY,
      bodyTopY,
      footerTopY,
      availableContentWidthPx,
      availableContentHeightPx,
      contentWidthPx: availableContentWidthPx,
      contentHeightPx: availableContentHeightPx,
      pageGapPx,
      screenPageHeaderHeightPx,
      cssMarginString,
      cssPageRule,
      cssPaperStyle,
      scale,
    };
  }

  /**
   * Calculates section-specific page geometry with overrides from SectionNode or SectionBreakNode
   */
  public static calculateSectionGeometry(
    sectionOrBreak: any,
    documentOptions: LayoutDocumentOptions = {}
  ): PageGeometry {
    if (!sectionOrBreak) {
      return this.calculate(documentOptions);
    }

    const sectionProps = sectionOrBreak.properties || sectionOrBreak.sectionProperties || sectionOrBreak;
    const mergedOptions: LayoutDocumentOptions = {
      ...documentOptions,
      pageSize: sectionProps.pageSize || sectionProps.paperSize || documentOptions.pageSize,
      orientation: sectionProps.orientation || documentOptions.orientation,
      margin: sectionProps.margin || sectionProps.marginPreset || documentOptions.margin,
      customMarginsMm: sectionProps.customMarginsMm || sectionProps.marginsMm || documentOptions.customMarginsMm,
      customPaperDimensionsMm: sectionProps.customPaperDimensionsMm || documentOptions.customPaperDimensionsMm,
      headerHeightPx: sectionProps.headerHeightPx !== undefined ? sectionProps.headerHeightPx : documentOptions.headerHeightPx,
      footerHeightPx: sectionProps.footerHeightPx !== undefined ? sectionProps.footerHeightPx : documentOptions.footerHeightPx,
      headerDistanceMm: sectionProps.headerDistanceMm !== undefined ? sectionProps.headerDistanceMm : documentOptions.headerDistanceMm,
      footerDistanceMm: sectionProps.footerDistanceMm !== undefined ? sectionProps.footerDistanceMm : documentOptions.footerDistanceMm,
      scale: sectionProps.scale !== undefined ? sectionProps.scale : documentOptions.scale,
    };

    return this.calculate(mergedOptions);
  }
}
