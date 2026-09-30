/**
 * KeepTogetherResolver
 * Evaluates keep-together (break-inside: avoid) and keep-with-next (heading & image/figure orphan protection).
 *
 * Part of SPR Note DocLab Enterprise Layout Architecture.
 */

import { SourceNode } from '../types/documentTypes';
import { BlockNode } from '../../model/types';
import { PaginationRules } from './PaginationRules';
import { MIN_PARAGRAPH_SPLIT_SPACE_PX, MIN_TABLE_SPLIT_SPACE_PX } from '../fragmentation/fragmentationRules';

export class KeepTogetherResolver {
  /**
   * Evaluates if a node must be kept whole on a single page
   */
  public static isKeepTogether(node: HTMLElement | SourceNode | BlockNode | any): boolean {
    const rules = PaginationRules.extractRules(node);
    return rules.breakInside === 'avoid';
  }

  /**
   * Protects headings, images with captions, and elements marked keep-with-next
   * from being orphaned at the bottom of a page without their following content
   */
  public static shouldPushWithNext(
    currentNode: HTMLElement | SourceNode | BlockNode | any,
    nextNode: HTMLElement | SourceNode | BlockNode | any,
    currentHeightPx: number,
    availableHeightPx: number
  ): boolean {
    if (!currentNode) return false;
    const rules = PaginationRules.extractRules(currentNode);

    // If no next node exists (e.g. last element in document), it fits if currentHeight fits
    if (!nextNode) return false;

    // Check semantic image + caption relationship: image and its caption must stay together
    const isCurrentImg =
      (typeof currentNode === 'object' && 'tagName' in currentNode && ['figure', 'img'].includes(currentNode.tagName.toLowerCase())) ||
      (typeof currentNode === 'object' && 'type' in currentNode && ['image', 'svg', 'figure'].includes(currentNode.type));

    const isNextCaption =
      (typeof nextNode === 'object' && 'tagName' in nextNode && nextNode.tagName.toLowerCase() === 'figcaption') ||
      (typeof nextNode === 'object' && 'classList' in nextNode && nextNode.classList.contains('doclab-image-caption')) ||
      (typeof nextNode === 'object' && 'className' in nextNode && typeof nextNode.className === 'string' && nextNode.className.includes('caption'));

    if (isCurrentImg && isNextCaption) {
      // If remaining space cannot hold both image and caption, push image with caption
      const captionHeight = 36;
      if (availableHeightPx - currentHeightPx < captionHeight) {
        return true;
      }
    }

    // If current node doesn't have keep-with-next, no orphan protection needed
    if (!rules.keepWithNext) return false;

    const remainingSpaceAfterCurrent = availableHeightPx - currentHeightPx;

    const nextTag =
      typeof nextNode === 'object' && 'tagName' in nextNode
        ? (nextNode as HTMLElement).tagName.toLowerCase()
        : typeof nextNode === 'object' && 'type' in nextNode
        ? (nextNode as SourceNode).type
        : 'p';

    const minRequiredFollowSpace =
      nextTag === 'table' ? MIN_TABLE_SPLIT_SPACE_PX : MIN_PARAGRAPH_SPLIT_SPACE_PX;

    // If the remaining space after this block is too cramped for the following block,
    // push to next page so it stays together with its following content!
    if (remainingSpaceAfterCurrent < minRequiredFollowSpace) {
      return true;
    }

    return false;
  }
}
