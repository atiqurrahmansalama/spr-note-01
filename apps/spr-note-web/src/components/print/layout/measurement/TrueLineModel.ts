/**
 * TrueLineModel.ts
 *
 * Authoritative Browser-Derived True Line Model for SPR Note DocLab Layout.
 *
 * Implements line-level spatial queries, formatting context extraction,
 * bidirectional script handling, and exact line-box slicing.
 */

import { Rect } from '../types/layoutTypes';
import {
  LineMetric,
  TrueLineModel,
  InlineRunMetric,
  InlineRunFormatting,
  InlineFormattingContext,
  MeasurementContext,
} from './measurementTypes';
import { TextMeasurement } from './TextMeasurement';

export class TrueLineModelEngine {
  /**
   * Measures all visual lines in a text block using native browser Range geometry
   */
  public static measureLines(
    el: HTMLElement,
    context?: MeasurementContext
  ): TrueLineModel[] {
    const result = TextMeasurement.measureTextLines(el, context);
    return result.lines;
  }

  /**
   * Locates the visual line containing a specific character offset within the block
   */
  public static findLineAtCharOffset(
    lines: TrueLineModel[],
    charOffset: number
  ): TrueLineModel | undefined {
    return lines.find(
      (line) => charOffset >= line.charStart && charOffset <= line.charEnd
    );
  }

  /**
   * Locates the visual line closest to a vertical Y coordinate within the block
   */
  public static findLineAtY(
    lines: TrueLineModel[],
    offsetY: number
  ): TrueLineModel | undefined {
    for (const line of lines) {
      if (offsetY >= line.rect.y && offsetY <= line.rect.y + line.rect.height) {
        return line;
      }
    }
    // If before first line
    if (lines.length > 0 && offsetY < lines[0].rect.y) {
      return lines[0];
    }
    // If after last line
    if (lines.length > 0) {
      return lines[lines.length - 1];
    }
    return undefined;
  }

  /**
   * Calculates the last fitting line index that fits strictly within availableHeightPx
   */
  public static calculateFittingLineCount(
    lines: TrueLineModel[],
    availableHeightPx: number
  ): number {
    let count = 0;
    for (const line of lines) {
      const lineBottom = line.rect.y + line.rect.height;
      if (lineBottom <= availableHeightPx + 1) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * Validates whether a line contains mixed directionality (bidi content)
   */
  public static isBidiLine(line: TrueLineModel): boolean {
    return line.formattingContext?.hasMixedDirection === true;
  }

  /**
   * Validates whether a line contains inline dynamic tokens
   */
  public static hasTokens(line: TrueLineModel): boolean {
    return line.formattingContext?.hasTokens === true;
  }
}

export * from './measurementTypes';
