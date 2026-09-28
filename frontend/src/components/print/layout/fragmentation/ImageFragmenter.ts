/**
 * ImageFragmenter
 * Handles images, figures, SVGs, signature blocks, and atomic cards with anchoring rules.
 *
 * Part of SPR Note DocLab Enterprise Layout Architecture.
 *
 * Implements strict `break-inside: avoid` behavior:
 * If an atomic image/signature cannot fit in the remaining page area,
 * it is cleanly pushed to the next page without clipping or slicing.
 *
 * Anchoring Modes Supported:
 * - 'block-center' (default centered block)
 * - 'block-left' (left-aligned with margin)
 * - 'block-right' (right-aligned with margin)
 * - 'full-width' (expanded across content width)
 * - 'inline' (inline inline-block flow)
 */

import { ImageNode, DividerNode } from '../../model/types';
import { ImageAnchorMode } from '../types/documentTypes';
import { MeasurementContext } from '../measurement/measurementTypes';
import { MeasurementEngine } from '../measurement/MeasurementEngine';

export interface AtomicBlockPlacementResult {
  fitsCurrentPage: boolean;
  requiresNewPage: boolean;
  htmlContent: string;
  height: number;
}

export class ImageFragmenter {
  /**
   * Resolves CSS styles for image anchoring modes
   */
  public static resolveAnchorStyles(anchorMode?: ImageAnchorMode): string {
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
   * Evaluates placement for an AST ImageNode or DividerNode
   */
  public static evaluateImageNode(
    node: ImageNode | DividerNode,
    availableHeightPx: number,
    context?: MeasurementContext
  ): AtomicBlockPlacementResult {
    const measured = MeasurementEngine.measure(node, context || { containerWidth: 602, fontSizePx: 16 });
    const height = measured.totalOuterHeight || measured.height || 200;

    let html = '<hr />';
    if (node.type === 'image') {
      const imgNode = node as ImageNode;
      const anchorStyle = this.resolveAnchorStyles((imgNode as any).anchorMode || 'block-center');
      const customStyle = imgNode.style ? Object.entries(imgNode.style).map(([k, v]) => `${k}:${v}`).join(';') : '';
      const combinedStyle = `${anchorStyle};${customStyle}`;
      html = `<div class="print-image-container print-avoid-break keep-together" style="${combinedStyle}"><img src="${imgNode.src}" alt="${imgNode.alt || ''}" style="max-width: 100%; height: auto; display: inline-block;" />${imgNode.caption ? `<figcaption style="font-size: 11px; color: #64748b; margin-top: 4px;">${imgNode.caption}</figcaption>` : ''}</div>`;
    }

    if (height <= availableHeightPx) {
      return {
        fitsCurrentPage: true,
        requiresNewPage: false,
        htmlContent: html,
        height,
      };
    }

    return {
      fitsCurrentPage: false,
      requiresNewPage: true,
      htmlContent: html,
      height,
    };
  }

  /**
   * Evaluates placement for a live DOM element (image, signature, card, figure)
   */
  public static evaluateAtomicPlacement(
    el: HTMLElement,
    availableHeightPx: number
  ): AtomicBlockPlacementResult {
    const height = Math.max(el.offsetHeight, el.getBoundingClientRect ? el.getBoundingClientRect().height : 0, 32);

    if (height <= availableHeightPx) {
      return {
        fitsCurrentPage: true,
        requiresNewPage: false,
        htmlContent: el.outerHTML,
        height,
      };
    }

    // Element exceeds available space -> push to next page
    return {
      fitsCurrentPage: false,
      requiresNewPage: true,
      htmlContent: el.outerHTML,
      height,
    };
  }
}
