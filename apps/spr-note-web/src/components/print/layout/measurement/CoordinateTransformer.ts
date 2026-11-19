/**
 * CoordinateTransformer.ts
 *
 * Enterprise Coordinate Normalization Engine for SPR Note DocLab Layout.
 *
 * Enforces explicit coordinate system boundaries:
 *
 *   [Viewport Coordinates]  (window client rects from getBoundingClientRect)
 *          │
 *          ▼
 *   [Sandbox Coordinates]   (relative to offscreen measurement mirror/sandbox origin)
 *          │
 *          ▼
 *   [Page Coordinates]      (relative to the physical/rendered page container origin)
 *          │
 *          ▼
 *   [Content Area]          (relative to body content area inside page margins)
 *          │
 *          ▼
 *   [Fragment Local]        (relative to individual layout fragment origin)
 *
 * INVARIANT: Viewport coordinates must NEVER be directly compared with
 * page-local or fragment-local heights and offsets without explicit normalization.
 */

import { Rect, Insets, Point } from '../types/layoutTypes';

export interface ViewportRect extends Rect {
  _coordinateSystem: 'viewport';
}

export interface SandboxRect extends Rect {
  _coordinateSystem: 'sandbox';
}

export interface PageRect extends Rect {
  _coordinateSystem: 'page';
}

export interface ContentAreaRect extends Rect {
  _coordinateSystem: 'contentArea';
}

export interface FragmentLocalRect extends Rect {
  _coordinateSystem: 'fragmentLocal';
}

export class CoordinateTransformer {
  /**
   * Transforms raw browser viewport client rect into sandbox-local coordinates
   */
  public static viewportToSandbox(
    viewportRect: Rect,
    sandboxOrigin: Point
  ): SandboxRect {
    return {
      _coordinateSystem: 'sandbox',
      x: Math.round((viewportRect.x - sandboxOrigin.x) * 100) / 100,
      y: Math.round((viewportRect.y - sandboxOrigin.y) * 100) / 100,
      width: Math.round(viewportRect.width * 100) / 100,
      height: Math.round(viewportRect.height * 100) / 100,
    };
  }

  /**
   * Transforms sandbox-measured rect into page body content area coordinates
   */
  public static sandboxToContentArea(
    sandboxRect: Rect,
    contentAreaOffset: Point = { x: 0, y: 0 }
  ): ContentAreaRect {
    return {
      _coordinateSystem: 'contentArea',
      x: Math.round((sandboxRect.x + contentAreaOffset.x) * 100) / 100,
      y: Math.round((sandboxRect.y + contentAreaOffset.y) * 100) / 100,
      width: Math.round(sandboxRect.width * 100) / 100,
      height: Math.round(sandboxRect.height * 100) / 100,
    };
  }

  /**
   * Transforms content area rect into page-relative coordinates by adding page margin insets
   */
  public static contentAreaToPage(
    contentRect: Rect,
    margins: Insets
  ): PageRect {
    return {
      _coordinateSystem: 'page',
      x: Math.round((contentRect.x + margins.left) * 100) / 100,
      y: Math.round((contentRect.y + margins.top) * 100) / 100,
      width: Math.round(contentRect.width * 100) / 100,
      height: Math.round(contentRect.height * 100) / 100,
    };
  }

  /**
   * Transforms page-relative coordinates into fragment-local coordinates
   */
  public static pageToFragmentLocal(
    pageRect: Rect,
    fragmentOrigin: Point
  ): FragmentLocalRect {
    return {
      _coordinateSystem: 'fragmentLocal',
      x: Math.round((pageRect.x - fragmentOrigin.x) * 100) / 100,
      y: Math.round((pageRect.y - fragmentOrigin.y) * 100) / 100,
      width: Math.round(pageRect.width * 100) / 100,
      height: Math.round(pageRect.height * 100) / 100,
    };
  }

  /**
   * Transforms fragment-local coordinates back to page-relative coordinates
   */
  public static fragmentLocalToPage(
    localPoint: Point,
    fragmentOrigin: Point
  ): Point {
    return {
      x: Math.round((localPoint.x + fragmentOrigin.x) * 100) / 100,
      y: Math.round((localPoint.y + fragmentOrigin.y) * 100) / 100,
    };
  }

  /**
   * Transforms page-relative coordinates to browser viewport coordinates for onscreen rendering
   */
  public static pageToViewport(
    pagePoint: Point,
    pageContainerViewportOrigin: Point
  ): Point {
    return {
      x: Math.round((pagePoint.x + pageContainerViewportOrigin.x) * 100) / 100,
      y: Math.round((pagePoint.y + pageContainerViewportOrigin.y) * 100) / 100,
    };
  }

  /**
   * Normalizes a measured element's getBoundingClientRect() directly to sandbox root
   */
  public static normalizeElementRect(
    elementRect: DOMRect | Rect,
    containerRect: DOMRect | Rect
  ): Rect {
    const elLeft = 'left' in elementRect ? elementRect.left : elementRect.x;
    const elTop = 'top' in elementRect ? elementRect.top : elementRect.y;
    const contLeft = 'left' in containerRect ? containerRect.left : containerRect.x;
    const contTop = 'top' in containerRect ? containerRect.top : containerRect.y;

    return {
      x: Math.round((elLeft - contLeft) * 100) / 100,
      y: Math.round((elTop - contTop) * 100) / 100,
      width: Math.round(elementRect.width * 100) / 100,
      height: Math.round(elementRect.height * 100) / 100,
    };
  }
}
