/**
 * KeepTogetherResolver
 * Evaluates keep-together (break-inside: avoid) and keep-with-next (heading orphan protection).
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
   * Protects headings from being orphaned at the bottom of a page without their following content
   */
  public static shouldPushWithNext(
    currentNode: HTMLElement | SourceNode | BlockNode | any,
    nextNode: HTMLElement | SourceNode | BlockNode | any,
    currentHeightPx: number,
    availableHeightPx: number
  ): boolean {
    const rules = PaginationRules.extractRules(currentNode);

    // If current node doesn't have keep-with-next, no orphan protection needed
    if (!rules.keepWithNext) return false;

    // If no next node exists (e.g. last element in document), it fits if currentHeight fits
    if (!nextNode) return false;

    const remainingSpaceAfterCurrent = availableHeightPx - currentHeightPx;

    const nextTag =
      'tagName' in nextNode
        ? (nextNode as HTMLElement).tagName.toLowerCase()
        : (nextNode as SourceNode).type;

    const minRequiredFollowSpace =
      nextTag === 'table' ? MIN_TABLE_SPLIT_SPACE_PX : MIN_PARAGRAPH_SPLIT_SPACE_PX;

    // If the remaining space after this heading is too cramped for the following block,
    // push the heading to the next page so it stays together with its section!
    if (remainingSpaceAfterCurrent < minRequiredFollowSpace) {
      return true;
    }

    return false;
  }
}
