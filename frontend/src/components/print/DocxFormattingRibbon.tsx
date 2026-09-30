import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  TextColorIcon,
  HighlighterIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon,
  ListBulletIcon,
  ListOrderedIcon,
  DividerIcon,
  TableIcon,
  ChevronDownIcon,
  PageBreakIcon,
  ShapesIcon,
  UploadIcon,
} from '../ui/Icons';
import {
  generateSvgDividerHtml,
  wrapRawSvgCode,
  SVG_PRESET_ITEMS,
} from './svgShapeTemplates';

export interface DocLabEditorCommands {
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  toggleStrike: () => void;
  setFontFamily: (fontFamily: string) => void;
  setFontSize: (fontSize: string | number) => void;
  setTextColor: (color: string) => void;
  setHighlightColor: (color: string) => void;
  setBlockType: (blockType: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'ul' | 'ol' | 'blockquote') => void;
  setAlignment: (align: 'left' | 'center' | 'right' | 'justify') => void;
  toggleList: (listType: 'ul' | 'ol') => void;
  insertTable: (rows?: number, cols?: number) => void;
  insertDivider: () => void;
  insertSvg: (svgMarkup: string) => void;
  insertToken: (tokenKey: string, category?: string) => void;
  insertManualPageBreak: () => void;
  removeFormat: () => void;
}

export interface DocxFormattingRibbonProps {
  editor?: {
    commands: DocLabEditorCommands;
  };
  onCommand?: (cmd: string, val?: string, options?: any) => void;
  onInsertToken?: (token: string) => void;
  className?: string;
}

const TEXT_COLORS = [
  { label: 'Default', value: '#0f172a', bg: 'bg-slate-900' },
  { label: 'Muted', value: '#64748b', bg: 'bg-slate-500' },
  { label: 'Blue', value: '#2563eb', bg: 'bg-blue-600' },
  { label: 'Indigo', value: '#4f46e5', bg: 'bg-indigo-600' },
  { label: 'Emerald', value: '#059669', bg: 'bg-emerald-600' },
  { label: 'Amber', value: '#d97706', bg: 'bg-amber-600' },
  { label: 'Rose', value: '#e11d48', bg: 'bg-rose-600' },
  { label: 'Purple', value: '#9333ea', bg: 'bg-purple-600' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: 'transparent', bg: 'bg-transparent border border-dashed border-slate-400' },
  { label: 'Yellow', value: '#fef08a', bg: 'bg-yellow-200' },
  { label: 'Green', value: '#bbf7d0', bg: 'bg-green-200' },
  { label: 'Cyan', value: '#a5f3fc', bg: 'bg-cyan-200' },
  { label: 'Pink', value: '#fbcfe8', bg: 'bg-pink-200' },
  { label: 'Orange', value: '#fed7aa', bg: 'bg-orange-200' },
];

const FONT_FAMILIES = [
  { label: 'Inter (Sans)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Times (Serif)', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia (Serif)', value: 'Georgia, serif' },
  { label: 'Courier (Mono)', value: '"Courier New", Courier, monospace' },
  { label: 'Bengali / Noto', value: '"SolaimanLipi", "Noto Sans Bengali", sans-serif' },
];

const FONT_SIZES = [
  { label: '9pt', value: '1' },
  { label: '10pt', value: '2' },
  { label: '12pt', value: '3' },
  { label: '14pt', value: '4' },
  { label: '18pt', value: '5' },
  { label: '24pt', value: '6' },
  { label: '32pt', value: '7' },
];

/**
 * Enterprise Rich-Text Formatting Ribbon for Print Studio Document Canvas
 * Positioned cleanly outside the paper sheet, with comprehensive typography,
 * alignments, color palettes, headings, tables, and divider tools.
 * 
 * Powered 100% by pure Editor Commands (zero deprecated execCommand, zero direct DOM mutation).
 */
export default function DocxFormattingRibbon({
  editor,
  onCommand,
  className = '',
}: DocxFormattingRibbonProps) {
  const [activeColorMenu, setActiveColorMenu] = useState<'text' | 'highlight' | null>(null);
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const [shapeCategory, setShapeCategory] = useState<'lines' | 'signatures' | 'boxes' | 'stamps' | 'custom'>('lines');
  const [customSvgInput, setCustomSvgInput] = useState('');
  const [showCustomSvgModal, setShowCustomSvgModal] = useState(false);

  const colorMenuRef = useRef<HTMLDivElement>(null);
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const svgFileInputRef = useRef<HTMLInputElement>(null);

  // Unified Editor Commands Dispatcher Proxy
  const editorCommands: DocLabEditorCommands = useMemo(() => {
    if (editor?.commands) {
      return editor.commands;
    }

    // Default dispatcher bridging to single-host PaginatedDocumentEditor
    const dispatch = (command: string, value: string = '', options: any = {}) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('spr_doclab_editor_command', {
            detail: { command, value, options },
          })
        );
      }
      onCommand?.(command, value, options);
    };

    return {
      toggleBold: () => dispatch('bold'),
      toggleItalic: () => dispatch('italic'),
      toggleUnderline: () => dispatch('underline'),
      toggleStrike: () => dispatch('strike'),
      setFontFamily: (font: string) => dispatch('fontFamily', font),
      setFontSize: (size: string | number) => dispatch('fontSize', String(size)),
      setTextColor: (color: string) => dispatch('color', color),
      setHighlightColor: (color: string) => dispatch('backgroundColor', color),
      setBlockType: (type) => {
        if (type === 'p') dispatch('paragraph');
        else if (type.startsWith('h')) dispatch('heading', type.replace('h', ''));
        else dispatch(type === 'ul' ? 'unordered-list' : 'ordered-list');
      },
      setAlignment: (align) => dispatch('align', align),
      toggleList: (listType) => dispatch(listType === 'ul' ? 'unordered-list' : 'ordered-list'),
      insertTable: (rows = 3, cols = 3) => dispatch('insertTable', '', { rows, cols }),
      insertDivider: () => dispatch('insertSvg', generateSvgDividerHtml({ style: 'solid', thickness: 1.5, color: '#94a3b8' })),
      insertSvg: (svgMarkup: string) => dispatch('insertSvg', svgMarkup),
      insertToken: (tokenKey: string, category: string = 'general') => dispatch('insertToken', tokenKey, { category }),
      insertManualPageBreak: () => dispatch('insertPageBreak'),
      removeFormat: () => dispatch('removeFormat'),
    };
  }, [editor?.commands, onCommand]);

  // Close color & shape menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setActiveColorMenu(null);
      }
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target as Node)) {
        setIsShapeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInsertTable = (rows: number = 3, cols: number = 3) => {
    editorCommands.insertTable(rows, cols);
  };

  const handleInsertDivider = () => {
    editorCommands.insertDivider();
  };

  const handleInsertSvgItem = (htmlContent: string) => {
    editorCommands.insertSvg(htmlContent);
    setIsShapeMenuOpen(false);
  };

  const handleSvgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleInsertSvgItem(wrapRawSvgCode(text));
      }
    };
    reader.readAsText(file);
    if (svgFileInputRef.current) svgFileInputRef.current.value = '';
  };

  const handleInsertCustomSvgCode = () => {
    if (!customSvgInput.trim()) return;
    handleInsertSvgItem(wrapRawSvgCode(customSvgInput.trim()));
    setCustomSvgInput('');
    setShowCustomSvgModal(false);
  };

  const handleInsertPageBreak = useCallback(() => {
    editorCommands.insertManualPageBreak();
  }, [editorCommands]);

  // Global Ctrl+Enter shortcut for inserting a page break in active document
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const active = document.activeElement;
        if (active && ((active as HTMLElement).isContentEditable || active.getAttribute('contenteditable') === 'true')) {
          e.preventDefault();
          handleInsertPageBreak();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInsertPageBreak]);

  return (
    <div
      ref={colorMenuRef}
      className={`flex items-center gap-1 p-1 rounded-xl theme-bg-sub/90 border theme-border shadow-2xs select-none flex-wrap ${className}`}
      onMouseDown={(e) => {
        // Prevent stealing focus from contentEditable except for form selects
        if ((e.target as HTMLElement).tagName !== 'SELECT' && (e.target as HTMLElement).tagName !== 'OPTION') {
          e.preventDefault();
        }
      }}
    >
      {/* 1. Headings & Block Format */}
      <div className="flex items-center gap-0.5 border-r theme-border pr-1 mr-0.5">
        <select
          onChange={(e) => editorCommands.setBlockType(e.target.value as any)}
          defaultValue="p"
          className="px-2 py-1 rounded-lg text-xs font-semibold theme-bg-surface border theme-border theme-text-primary focus:outline-none cursor-pointer"
          title="Text Style / Heading"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        {/* Font Family */}
        <select
          onChange={(e) => editorCommands.setFontFamily(e.target.value)}
          defaultValue="Inter, system-ui, sans-serif"
          className="px-2 py-1 rounded-lg text-xs font-medium theme-bg-surface border theme-border theme-text-primary focus:outline-none cursor-pointer max-w-[110px] truncate"
          title="Font Family"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Font Size */}
        <select
          onChange={(e) => editorCommands.setFontSize(e.target.value)}
          defaultValue="3"
          className="px-1.5 py-1 rounded-lg text-xs font-medium theme-bg-surface border theme-border theme-text-primary focus:outline-none cursor-pointer w-[60px]"
          title="Font Size"
        >
          {FONT_SIZES.map((s) => (
            <option key={s.label} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Text Styles: Bold, Italic, Underline, Strikethrough */}
      <div className="flex items-center gap-0.5 border-r theme-border pr-1 mr-0.5">
        <button
          type="button"
          onClick={() => editorCommands.toggleBold()}
          title="Bold (Ctrl+B)"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <BoldIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editorCommands.toggleItalic()}
          title="Italic (Ctrl+I)"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <ItalicIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editorCommands.toggleUnderline()}
          title="Underline (Ctrl+U)"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editorCommands.toggleStrike()}
          title="Strikethrough"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <StrikethroughIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. Text Color & Highlight Palette */}
      <div className="flex items-center gap-0.5 border-r theme-border pr-1 mr-0.5 relative">
        {/* Text Color Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveColorMenu((prev) => (prev === 'text' ? null : 'text'))}
            title="Text Color"
            className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            <TextColorIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <ChevronDownIcon className="w-2.5 h-2.5 opacity-60" />
          </button>

          {activeColorMenu === 'text' && (
            <div className="absolute top-full left-0 mt-1 p-2 rounded-xl theme-bg-elevated border theme-border shadow-xl z-50 grid grid-cols-4 gap-1.5 min-w-[120px] animate-in fade-in zoom-in-95">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => {
                    editorCommands.setTextColor(c.value);
                    setActiveColorMenu(null);
                  }}
                  title={c.label}
                  className="w-5 h-5 rounded-full flex items-center justify-center hover:scale-110 transition-transform cursor-pointer border theme-border"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlighter Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveColorMenu((prev) => (prev === 'highlight' ? null : 'highlight'))}
            title="Highlight Color"
            className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            <HighlighterIcon className="w-3.5 h-3.5 text-amber-500" />
            <ChevronDownIcon className="w-2.5 h-2.5 opacity-60" />
          </button>

          {activeColorMenu === 'highlight' && (
            <div className="absolute top-full left-0 mt-1 p-2 rounded-xl theme-bg-elevated border theme-border shadow-xl z-50 grid grid-cols-3 gap-1.5 min-w-[120px] animate-in fade-in zoom-in-95">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => {
                    editorCommands.setHighlightColor(c.value);
                    setActiveColorMenu(null);
                  }}
                  title={c.label}
                  className={`w-6 h-5 rounded-md flex items-center justify-center hover:scale-105 transition-transform cursor-pointer ${c.bg}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Alignments */}
      <div className="flex items-center gap-0.5 border-r theme-border pr-1 mr-0.5">
        <button
          type="button"
          onClick={() => editorCommands.setAlignment('left')}
          title="Align Left"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <AlignLeftIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editorCommands.setAlignment('center')}
          title="Align Center"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <AlignCenterIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editorCommands.setAlignment('right')}
          title="Align Right"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <AlignRightIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editorCommands.setAlignment('justify')}
          title="Justify"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <AlignJustifyIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5. Lists & Indentation */}
      <div className="flex items-center gap-0.5 border-r theme-border pr-1 mr-0.5">
        <button
          type="button"
          onClick={() => editorCommands.toggleList('ul')}
          title="Bullet List"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <ListBulletIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editorCommands.toggleList('ol')}
          title="Numbered List"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <ListOrderedIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 6. Insert Elements: Table, Horizontal Divider, Shapes (SVG) & Page Break */}
      <div className="flex items-center gap-0.5 border-r theme-border pr-1 mr-0.5">
        <button
          type="button"
          onClick={() => handleInsertTable(3, 3)}
          title="Insert Table (3x3)"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer flex items-center gap-1"
        >
          <TableIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleInsertDivider}
          title="Insert Horizontal Divider Line"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
        >
          <DividerIcon className="w-3.5 h-3.5" />
        </button>

        {/* Shapes & Vectors (SVG) Menu Trigger */}
        <div className="relative" ref={shapeMenuRef}>
          <button
            type="button"
            onClick={() => setIsShapeMenuOpen((prev) => !prev)}
            title="Insert Shapes, Lines, Stamps & Custom SVG"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              isShapeMenuOpen
                ? 'theme-bg-accent-soft theme-accent font-bold'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated'
            }`}
          >
            <ShapesIcon className="w-3.5 h-3.5 theme-accent" />
            <span className="text-[11px] font-semibold hidden sm:inline">Shapes</span>
            <ChevronDownIcon className="w-2.5 h-2.5 opacity-70" />
          </button>

          {isShapeMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 rounded-2xl theme-bg-elevated border theme-border shadow-2xl z-50 p-2 text-left animate-in fade-in zoom-in-95">
              {/* Category Switcher Tabs */}
              <div className="flex items-center gap-1 pb-1.5 mb-1.5 border-b theme-border overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setShapeCategory('lines')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    shapeCategory === 'lines'
                      ? 'theme-bg-accent-soft theme-accent font-bold'
                      : 'theme-text-secondary hover:theme-bg-sub'
                  }`}
                >
                  Lines
                </button>
                <button
                  type="button"
                  onClick={() => setShapeCategory('signatures')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    shapeCategory === 'signatures'
                      ? 'theme-bg-accent-soft theme-accent font-bold'
                      : 'theme-text-secondary hover:theme-bg-sub'
                  }`}
                >
                  Signatures
                </button>
                <button
                  type="button"
                  onClick={() => setShapeCategory('boxes')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    shapeCategory === 'boxes'
                      ? 'theme-bg-accent-soft theme-accent font-bold'
                      : 'theme-text-secondary hover:theme-bg-sub'
                  }`}
                >
                  Boxes
                </button>
                <button
                  type="button"
                  onClick={() => setShapeCategory('stamps')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    shapeCategory === 'stamps'
                      ? 'theme-bg-accent-soft theme-accent font-bold'
                      : 'theme-text-secondary hover:theme-bg-sub'
                  }`}
                >
                  Seals
                </button>
                <button
                  type="button"
                  onClick={() => setShapeCategory('custom')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    shapeCategory === 'custom'
                      ? 'theme-bg-accent-soft theme-accent font-bold'
                      : 'theme-text-secondary hover:theme-bg-sub'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Items List based on Category */}
              <div className="max-h-60 overflow-y-auto space-y-1">
                {shapeCategory === 'custom' ? (
                  <div className="p-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => svgFileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-dashed theme-border theme-text-primary hover:theme-border-accent hover:theme-bg-accent-soft transition-all cursor-pointer"
                    >
                      <UploadIcon className="w-4 h-4 theme-accent" />
                      <span>Upload SVG File (.svg)</span>
                    </button>
                    <input
                      ref={svgFileInputRef}
                      type="file"
                      accept=".svg,image/svg+xml"
                      onChange={handleSvgFileUpload}
                      className="hidden"
                    />

                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                        Paste SVG Code
                      </label>
                      <textarea
                        value={customSvgInput}
                        onChange={(e) => setCustomSvgInput(e.target.value)}
                        placeholder="<svg ...> ... </svg>"
                        rows={3}
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-xl theme-bg-surface border theme-border theme-text-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleInsertCustomSvgCode}
                        disabled={!customSvgInput.trim()}
                        className="w-full py-1.5 rounded-xl text-xs font-bold theme-bg-accent theme-text-on-accent disabled:opacity-50 cursor-pointer shadow-2xs"
                      >
                        Insert SVG
                      </button>
                    </div>
                  </div>
                ) : (
                  SVG_PRESET_ITEMS.filter((item) => item.category === shapeCategory).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleInsertSvgItem(preset.html())}
                      className="w-full text-left p-2 rounded-xl hover:theme-bg-sub transition-colors flex flex-col gap-0.5 cursor-pointer group"
                    >
                      <div className="text-xs font-bold theme-text-primary group-hover:theme-accent">
                        {preset.label}
                      </div>
                      <div className="text-[10px] theme-text-secondary truncate">
                        {preset.description}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleInsertPageBreak}
          title="Insert Page Break / New Page (Ctrl + Enter)"
          className="p-1.5 rounded-lg theme-text-secondary hover:theme-accent hover:theme-bg-elevated transition-colors cursor-pointer flex items-center gap-1"
        >
          <PageBreakIcon className="w-3.5 h-3.5" />
          <span className="text-[10px] font-semibold hidden sm:inline">Page</span>
        </button>
      </div>

      {/* 7. Clear Formatting */}
      <button
        type="button"
        onClick={() => editorCommands.removeFormat()}
        title="Clear Formatting (Tx)"
        className="p-1.5 rounded-lg theme-text-secondary hover:text-rose-500 hover:theme-bg-elevated transition-colors text-xs font-mono font-bold cursor-pointer"
      >
        Tx
      </button>
    </div>
  );
}
