/**
 * ImageFragmenter
 * Enterprise Image, Figure, Caption, SVG, and Atomic Block Layout & Placement Engine.
 *
 * Part of SPR Note DocLab Enterprise Layout Architecture.
 *
 * Requirements:
 * - Intrinsic and explicit image dimensions (width, height, natural dimensions)
 * - Max-width, max-height, and aspect-ratio constraints
 * - Inline positioning vs block anchoring ('block-center', 'block-left', 'block-right', 'full-width', 'inline')
 * - Semantic atomic binding: figure + figcaption and image + caption are kept together
 * - Vector SVG scaling, dimensions, and viewBox preservation
 * - Image resource loading synchronization and re-layout observers
 */

import { ImageNode, DividerNode, SvgNode } from '../../model/types';
import { ImageAnchorMode } from '../types/documentTypes';
import { MeasurementContext } from '../measurement/measurementTypes';
import { MeasurementEngine } from '../measurement/MeasurementEngine';

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  isConstrained: boolean;
}

export interface AtomicBlockPlacementResult {
  fitsCurrentPage: boolean;
  requiresNewPage: boolean;
  htmlContent: string;
  height: number;
  isAtomic: boolean;
  keepTogether: boolean;
  dimensions?: ImageDimensions;
}

export class ImageFragmenter {
  /**
   * Resolves CSS styles for image anchoring modes
   */
  public static resolveAnchorStyles(anchorMode?: ImageAnchorMode | string): string {
    switch (anchorMode) {
      case 'block-left':
        return 'display: block; margin-right: auto; margin-left: 0; text-align: left;';
      case 'block-right':
        return 'display: block; margin-left: auto; margin-right: 0; text-align: right;';
      case 'full-width':
        return 'display: block; width: 100%; max-width: 100%; height: auto; margin: 8px 0;';
      case 'inline':
        return 'display: inline-block; vertical-align: middle; margin: 0 4px;';
      case 'block-center':
      default:
        return 'display: block; margin: 8px auto; text-align: center;';
    }
  }

  /**
   * Calculates effective dimensions for an image given container bounds, aspect ratio, and explicit sizes
   */
  public static calculateImageDimensions(
    explicitWidth: number | string | undefined,
    explicitHeight: number | string | undefined,
    containerWidth: number,
    maxAvailableHeight: number,
    aspectRatio?: number
  ): ImageDimensions {
    let width = containerWidth;
    let height = 240;

    const parsedW = typeof explicitWidth === 'number' ? explicitWidth : explicitWidth ? parseFloat(explicitWidth) : undefined;
    const parsedH = typeof explicitHeight === 'number' ? explicitHeight : explicitHeight ? parseFloat(explicitHeight) : undefined;

    if (parsedW && parsedH) {
      width = parsedW;
      height = parsedH;
    } else if (parsedW && aspectRatio) {
      width = parsedW;
      height = parsedW / aspectRatio;
    } else if (parsedH && aspectRatio) {
      height = parsedH;
      width = parsedH * aspectRatio;
    } else if (parsedW) {
      width = parsedW;
      height = parsedW * 0.75; // Default 4:3 fallback
    } else if (parsedH) {
      height = parsedH;
      width = Math.min(containerWidth, parsedH * 1.33);
    } else {
      width = Math.min(containerWidth, 400);
      height = aspectRatio ? width / aspectRatio : 240;
    }

    // Apply container width constraint
    let isConstrained = false;
    if (width > containerWidth && containerWidth > 0) {
      const scale = containerWidth / width;
      width = containerWidth;
      height = height * scale;
      isConstrained = true;
    }

    // Apply max page height constraint
    if (height > maxAvailableHeight && maxAvailableHeight > 0) {
      const scale = maxAvailableHeight / height;
      height = maxAvailableHeight;
      width = width * scale;
      isConstrained = true;
    }

    const calculatedRatio = width > 0 && height > 0 ? width / height : 1;

    return {
      width: Math.round(width),
      height: Math.round(height),
      aspectRatio: calculatedRatio,
      isConstrained,
    };
  }

  /**
   * Evaluates placement for an AST ImageNode, SvgNode, or DividerNode
   */
  public static evaluateImageNode(
    node: ImageNode | DividerNode | SvgNode,
    availableHeightPx: number,
    context?: MeasurementContext
  ): AtomicBlockPlacementResult {
    const containerWidth = context?.containerWidth || 602;
    const mCtx = context || { containerWidth, fontSizePx: 16 };
    const measured = MeasurementEngine.measure(node as any, mCtx);
    let height = measured.totalOuterHeight || measured.height || 200;

    let html = '<hr />';
    let dims: ImageDimensions | undefined;

    if (node.type === 'image') {
      const imgNode = node as ImageNode;
      dims = this.calculateImageDimensions(
        imgNode.width,
        imgNode.height,
        containerWidth,
        availableHeightPx
      );

      const anchorStyle = this.resolveAnchorStyles(imgNode.anchorMode || 'block-center');
      const customStyle = imgNode.style
        ? Object.entries(imgNode.style).map(([k, v]) => `${k}:${v}`).join(';')
        : '';
      const combinedStyle = `${anchorStyle};${customStyle}`;

      const captionHtml = imgNode.caption
        ? `<figcaption class="doclab-image-caption" style="font-size: 11px; color: #64748b; margin-top: 6px; text-align: center;">${imgNode.caption}</figcaption>`
        : '';

      const figureAttrs = `class="print-image-container print-avoid-break keep-together doclab-figure" style="${combinedStyle}; break-inside: avoid; page-break-inside: avoid;"`;
      const imgAttrs = `src="${imgNode.src}" alt="${imgNode.alt || ''}" width="${dims.width}" height="${dims.height}" style="max-width: 100%; height: auto; display: inline-block; aspect-ratio: ${dims.aspectRatio}; border-radius: 4px;"`;

      html = `<figure ${figureAttrs}><img ${imgAttrs} />${captionHtml}</figure>`;
      height = dims.height + (imgNode.caption ? 30 : 0) + 16;
    } else if (node.type === 'svg') {
      const svgNode = node as SvgNode;
      const parsedW = svgNode.width ? (typeof svgNode.width === 'number' ? svgNode.width : parseFloat(svgNode.width)) : 200;
      const parsedH = svgNode.height ? (typeof svgNode.height === 'number' ? svgNode.height : parseFloat(svgNode.height)) : 150;
      const rawSvg = svgNode.svgContent || '';

      html = `<div class="print-svg-container keep-together print-avoid-break" style="display: block; text-align: ${svgNode.alignment || 'center'}; margin: 8px 0; break-inside: avoid;">${rawSvg}</div>`;
      height = Math.max(parsedH + 16, 40);
    }

    const fitsCurrentPage = height <= availableHeightPx;

    return {
      fitsCurrentPage,
      requiresNewPage: !fitsCurrentPage,
      htmlContent: html,
      height,
      isAtomic: true,
      keepTogether: true,
      dimensions: dims,
    };
  }

  /**
   * Evaluates placement for a live DOM element (figure, image, svg, signature)
   */
  public static evaluateAtomicPlacement(
    el: HTMLElement,
    availableHeightPx: number
  ): AtomicBlockPlacementResult {
    const height = Math.max(
      el.offsetHeight,
      el.getBoundingClientRect ? el.getBoundingClientRect().height : 0,
      32
    );

    const fitsCurrentPage = height <= availableHeightPx;

    return {
      fitsCurrentPage,
      requiresNewPage: !fitsCurrentPage,
      htmlContent: el.outerHTML,
      height,
      isAtomic: true,
      keepTogether: true,
    };
  }

  /**
   * Waits for all images inside a container to finish loading and decoding
   */
  public static async waitForImages(container: HTMLElement | Document): Promise<void> {
    if (typeof document === 'undefined') return;

    const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    if (images.length === 0) return;

    const promises = images.map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        return Promise.resolve();
      }
      if (typeof img.decode === 'function') {
        return img.decode().catch(() => Promise.resolve());
      }
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
        // Timeout fallback to avoid infinite hangs
        setTimeout(resolve, 500);
      });
    });

    await Promise.all(promises);
  }

  /**
   * Creates an observer that triggers a re-layout callback whenever any image in the container loads
   */
  public static createImageLoadRelayoutObserver(
    container: HTMLElement,
    onRelayout: () => void
  ): () => void {
    if (typeof document === 'undefined') return () => {};

    const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    const uncompleted = images.filter((img) => !img.complete || img.naturalWidth === 0);

    if (uncompleted.length === 0) return () => {};

    const handlers: Array<{ img: HTMLImageElement; handler: () => void }> = [];

    uncompleted.forEach((img) => {
      const handler = () => {
        onRelayout();
      };
      img.addEventListener('load', handler, { once: true });
      img.addEventListener('error', handler, { once: true });
      handlers.push({ img, handler });
    });

    // Return cleanup function
    return () => {
      handlers.forEach(({ img, handler }) => {
        img.removeEventListener('load', handler);
        img.removeEventListener('error', handler);
      });
    };
  }
}
