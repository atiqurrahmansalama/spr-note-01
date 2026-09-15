import React, { useCallback } from 'react';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon,
  ListBulletIcon,
  ListOrderedIcon,
  HeadingIcon,
} from '../ui/Icons';

export interface DocxFormattingRibbonProps {
  onCommand?: (cmd: string, val?: string) => void;
  className?: string;
}

/**
 * Enterprise Rich-Text Formatting Ribbon for Print Studio Document Canvas
 * Positioned cleanly outside and above the paper sheet, with zero paper space consumption.
 */
export default function DocxFormattingRibbon({
  onCommand,
  className = '',
}: DocxFormattingRibbonProps) {
  const executeCommand = useCallback((cmd: string, val: string = '') => {
    try {
      document.execCommand(cmd, false, val);
      onCommand?.(cmd, val);
    } catch (e) {
      console.warn('Formatting command execution error', e);
    }
  }, [onCommand]);

  return (
    <div
      className={`flex items-center gap-1 p-1 rounded-xl theme-bg-sub/80 border theme-border shadow-2xs select-none ${className}`}
      onMouseDown={(e) => e.preventDefault()} // Prevents stealing contentEditable focus
    >
      {/* Headings */}
      <div className="flex items-center gap-0.5 border-r theme-border pr-1 mr-0.5">
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h1>')}
          title="Heading 1"
          className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors text-xs font-bold px-1.5 flex items-center gap-0.5 cursor-pointer"
        >
          <HeadingIcon className="w-3.5 h-3.5" />
          <span>H1</span>
        </button>
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h2>')}
          title="Heading 2"
          className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors text-xs font-bold px-1.5 flex items-center gap-0.5 cursor-pointer"
        >
          <HeadingIcon className="w-3 h-3" />
          <span>H2</span>
        </button>
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<p>')}
          title="Normal Paragraph"
          className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors text-xs font-semibold px-1.5 cursor-pointer"
        >
          P
        </button>
      </div>

      {/* Text Styles: Bold, Italic, Underline */}
      <div className="flex items-center gap-0.5 border-r theme-border pr-1 mr-0.5">
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          title="Bold (Ctrl+B)"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <BoldIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          title="Italic (Ctrl+I)"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <ItalicIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('underline')}
          title="Underline (Ctrl+U)"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Alignments */}
      <div className="flex items-center gap-0.5 border-r theme-border pr-1 mr-0.5">
        <button
          type="button"
          onClick={() => executeCommand('justifyLeft')}
          title="Align Left"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <AlignLeftIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('justifyCenter')}
          title="Align Center"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <AlignCenterIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('justifyRight')}
          title="Align Right"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <AlignRightIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('justifyFull')}
          title="Justify"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <AlignJustifyIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Lists */}
      <div className="flex items-center gap-0.5 border-r theme-border pr-1 mr-0.5">
        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          title="Bullet List"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <ListBulletIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('insertOrderedList')}
          title="Numbered List"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <ListOrderedIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Clear Formatting */}
      <button
        type="button"
        onClick={() => executeCommand('removeFormat')}
        title="Clear Formatting"
        className="p-1.5 rounded-lg theme-text-secondary hover:theme-rose hover:theme-bg-elevated transition-colors text-xs font-mono font-bold cursor-pointer"
      >
        Tx
      </button>
    </div>
  );
}
