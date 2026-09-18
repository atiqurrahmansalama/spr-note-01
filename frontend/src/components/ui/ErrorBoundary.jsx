import React from 'react';
import { RefreshIcon, CheckIcon, CopyIcon, ChevronDownIcon, ChevronRightIcon, ChevronLeftIcon } from './Icons';

/**
 * Parses error and component stack details into structured diagnostic information.
 */
function parseErrorDetails(error, errorInfo = null, errorType = 'React Render Error') {
  const name = error?.name || (error instanceof Error ? error.constructor.name : 'RuntimeError');
  let message = '';
  if (typeof error === 'string') {
    message = error;
  } else if (error?.message) {
    message = error.message;
  } else if (error?.reason?.message) {
    message = error.reason.message;
  } else if (typeof error?.reason === 'string') {
    message = error.reason;
  } else {
    message = 'An unexpected runtime error occurred.';
  }

  const stack = error?.stack || error?.reason?.stack || '';
  const componentStack = errorInfo?.componentStack || '';

  // Clean URL helper: removes localhost, port, query params, hash, and bundler prefixes
  const cleanPath = (rawPath) => {
    if (!rawPath) return '';
    let cleaned = rawPath.trim();
    cleaned = cleaned.replace(/^\((.*)\)$/, '$1');
    cleaned = cleaned.replace(/^https?:\/\/[^/]+\//, '');
    cleaned = cleaned.replace(/\?[^:]*/, '');
    cleaned = cleaned.replace(/^(webpack-internal:\/\/\/|@fs\/)/, '');
    return cleaned;
  };

  let culpritFile = '';
  let culpritLine = '';
  let culpritColumn = '';
  let culpritFunction = '';
  const parsedFrames = [];

  if (stack) {
    const lines = stack.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Match Chrome/Edge/Node format: "at Component (http://.../src/file.jsx:line:col)"
      const chromeMatch = line.match(/^at (?:(async )?([a-zA-Z0-9_$<>.]+)\s+)?\(?(.*?):(\d+):(\d+)\)?$/);
      // Match Firefox/Safari format: "Component@http://.../src/file.jsx:line:col"
      const safariMatch = line.match(/^([a-zA-Z0-9_$<>.]*)@?(.*?):(\d+):(\d+)$/);

      const match = chromeMatch || safariMatch;
      if (match) {
        const fnName = chromeMatch ? (chromeMatch[2] || 'anonymous') : (safariMatch[1] || 'anonymous');
        const file = cleanPath(chromeMatch ? chromeMatch[3] : safariMatch[2]);
        const lineNo = chromeMatch ? chromeMatch[4] : safariMatch[3];
        const colNo = chromeMatch ? chromeMatch[5] : safariMatch[4];

        const isInternal =
          file.includes('node_modules') ||
          file.includes('@vite') ||
          file.includes('chunk-') ||
          file.includes('react-dom') ||
          file.includes('vite/dist');

        parsedFrames.push({
          fnName,
          file,
          line: lineNo,
          column: colNo,
          isInternal,
          raw: line,
        });

        if (!culpritFile && !isInternal && (file.includes('src/') || file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.ts'))) {
          culpritFile = file;
          culpritLine = lineNo;
          culpritColumn = colNo;
          culpritFunction = fnName;
        }
      }
    }
  }

  // Fallback check from React componentStack
  if (!culpritFile && componentStack) {
    const lines = componentStack.split('\n');
    for (const rawLine of lines) {
      const match = rawLine.match(/at\s+([a-zA-Z0-9_$<>.]+)\s+\(?(.*?):(\d+):(\d+)\)?/);
      if (match) {
        const file = cleanPath(match[2]);
        if (!file.includes('node_modules') && (file.includes('src/') || file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.ts'))) {
          culpritFile = file;
          culpritLine = match[3];
          culpritColumn = match[4];
          culpritFunction = match[1];
          break;
        }
      }
    }
  }

  // Fallback to first available frame if no source file matched
  if (!culpritFile && parsedFrames.length > 0) {
    culpritFile = parsedFrames[0].file;
    culpritLine = parsedFrames[0].line;
    culpritColumn = parsedFrames[0].column;
    culpritFunction = parsedFrames[0].fnName;
  }

  const locationString = culpritFile
    ? `${culpritFile}${culpritLine ? `:${culpritLine}` : ''}${culpritColumn ? `:${culpritColumn}` : ''}`
    : 'Unknown location';

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const routePath = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}${window.location.hash}` : '';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Unique deduplication signature
  const signature = `${name}_${message}_${culpritFile}_${culpritLine}`;

  return {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    signature,
    name,
    message,
    errorType,
    culpritFile: culpritFile || 'Unknown Source File',
    culpritLine,
    culpritColumn,
    culpritFunction: culpritFunction || 'Unknown Scope',
    locationString,
    parsedFrames,
    rawStack: stack,
    componentStack: componentStack.trim(),
    currentUrl,
    routePath,
    userAgent,
    timestamp,
  };
}

/**
 * Builds a unified Markdown diagnostic report for all captured exceptions.
 */
function buildMultiMarkdownReport(diagnosticsList) {
  if (!diagnosticsList || diagnosticsList.length === 0) return '# No Error Details';

  if (diagnosticsList.length === 1) {
    const diag = diagnosticsList[0];
    const appFrames = (diag.parsedFrames || []).filter((f) => !f.isInternal && f.file);
    const formattedAppStack = appFrames.length > 0
      ? appFrames.map((f, i) => `  ${i + 1}. at <${f.fnName}> (${f.file}${f.line ? `:${f.line}:${f.column}` : ''})`).join('\n')
      : null;

    const compHierarchy = (diag.componentStack || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('at ') && !l.includes('node_modules') && !l.includes('div') && !l.includes('Suspense'))
      .slice(0, 5)
      .map((l) => `  - ${l}`)
      .join('\n');

    const sections = [
      `# Bug Report: ${diag.name}`,
      `**Message:** ${diag.message}`,
      `**Location:** \`${diag.locationString}\``,
      `**Component Scope:** \`<${diag.culpritFunction} />\``,
      `**Route:** \`${diag.routePath || '/'}\``,
      `**Error Type:** ${diag.errorType}`,
    ];

    if (formattedAppStack) {
      sections.push('', '## Application Call Stack', '```text', formattedAppStack, '```');
    }
    if (compHierarchy) {
      sections.push('', '## Component Hierarchy', '```text', compHierarchy, '```');
    }
    return sections.join('\n');
  }

  // Multi-Error Unified Report
  const headRoute = diagnosticsList[0]?.routePath || '/';
  const reportLines = [
    `# Bug Report: ${diagnosticsList.length} Application Exceptions Caught`,
    `**Captured Route:** \`${headRoute}\``,
    `**Total Exceptions:** ${diagnosticsList.length}`,
    `**Captured At:** ${diagnosticsList[0]?.timestamp || new Date().toLocaleTimeString()}`,
    '',
  ];

  diagnosticsList.forEach((diag, index) => {
    const num = index + 1;
    reportLines.push(
      `---`,
      `### [Exception ${num}/${diagnosticsList.length}] ${diag.name}: ${diag.message}`,
      `- **Location:** \`${diag.locationString}\``,
      `- **Component Scope:** \`<${diag.culpritFunction} />\``,
      `- **Error Type:** ${diag.errorType}`,
      `- **Timestamp:** ${diag.timestamp}`
    );

    const appFrames = (diag.parsedFrames || []).filter((f) => !f.isInternal && f.file);
    if (appFrames.length > 0) {
      reportLines.push(
        '',
        '```text',
        appFrames.map((f, i) => `  ${i + 1}. at <${f.fnName}> (${f.file}${f.line ? `:${f.line}:${f.column}` : ''})`).join('\n'),
        '```'
      );
    }
    reportLines.push('');
  });

  return reportLines.join('\n');
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errors: [], // Array of parsed error diagnostics objects
      selectedErrorIndex: 0, // 0 to errors.length - 1, or -1 for unified all view
      activeTab: 'all', // 'all' | 'stack' | 'components' | 'environment'
      copyStatus: null, // null | 'full' | 'summary' | 'location' | 'single'
      showRawStack: false,
      expandedStacks: {}, // Map of error index to boolean for accordion in 'all' view
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidMount() {
    // Listen for global window errors and unhandled rejections
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.addEventListener('spr_report_error', this.handleCustomReportedError);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('spr_report_error', this.handleCustomReportedError);
  }

  addErrorToState = (error, errorInfo, errorType) => {
    const parsed = parseErrorDetails(error, errorInfo, errorType);
    this.setState((prev) => {
      // Deduplicate identical errors
      const exists = prev.errors.some((e) => e.signature === parsed.signature);
      if (exists) return { hasError: true };

      const nextErrors = [...prev.errors, parsed];
      return {
        hasError: true,
        errors: nextErrors,
        activeTab: nextErrors.length > 1 ? 'all' : 'stack',
      };
    });
  };

  handleWindowError = (event) => {
    if (event?.error) {
      this.addErrorToState(event.error, null, 'Global Window Error');
    } else if (event?.message) {
      this.addErrorToState(
        { name: 'GlobalError', message: event.message, filename: event.filename, lineno: event.lineno, colno: event.colno },
        null,
        'Global Window Error'
      );
    }
  };

  handleUnhandledRejection = (event) => {
    const reason = event?.reason;
    this.addErrorToState(reason || new Error('Unhandled Promise Rejection'), null, 'Unhandled Promise Rejection');
  };

  handleCustomReportedError = (event) => {
    if (event?.detail?.error) {
      this.addErrorToState(event.detail.error, event.detail.errorInfo || null, event.detail.errorType || 'Application Error');
    }
  };

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Captured unhandled error:', error, errorInfo);
    this.addErrorToState(error, errorInfo, 'React Render Error');
  }

  handleReload = () => {
    window.location.reload();
  };

  handleNavigateHome = () => {
    window.location.href = '/';
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      errors: [],
      selectedErrorIndex: 0,
      activeTab: 'all',
      copyStatus: null,
      showRawStack: false,
      expandedStacks: {},
    });
  };

  handleCopy = (type, text) => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.setState({ copyStatus: type });
        setTimeout(() => this.setState({ copyStatus: null }), 2500);
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
      });
  };

  toggleStackExpand = (idx) => {
    this.setState((prev) => ({
      expandedStacks: {
        ...prev.expandedStacks,
        [idx]: !prev.expandedStacks[idx],
      },
    }));
  };

  render() {
    if (this.state.hasError && this.state.errors.length > 0) {
      const errors = this.state.errors;
      const isMultiError = errors.length > 1;
      const selectedIndex = Math.min(Math.max(0, this.state.selectedErrorIndex), errors.length - 1);
      const activeError = errors[selectedIndex] || errors[0];
      const combinedMarkdown = buildMultiMarkdownReport(errors);

      // Build short multi-error summary for clipboard
      const shortSummary = errors
        .map((e, i) => `[#${i + 1}] ${e.name}: ${e.message} (Location: ${e.locationString})`)
        .join('\n');

      return (
        <div className="min-h-screen theme-bg-main flex items-center justify-center p-3 sm:p-6 theme-text-primary select-none overflow-y-auto">
          <div className="w-full max-w-3xl theme-bg-surface border theme-border rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 animate-fade-in my-auto">
            {/* Top Header Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b theme-border pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl theme-bg-danger-soft theme-danger border theme-border flex items-center justify-center text-xl font-bold shrink-0 shadow-inner">
                  <svg className="w-6 h-6 theme-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black theme-text-primary tracking-tight">
                      {isMultiError ? 'Application Exceptions Caught' : 'Application Exception Caught'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase theme-bg-danger-soft theme-danger border theme-border">
                      {isMultiError ? `${errors.length} Errors Caught` : activeError.name}
                    </span>
                  </div>
                  <p className="text-xs theme-text-secondary mt-0.5">
                    {isMultiError
                      ? `${errors.length} runtime exceptions occurred during execution. All diagnostic insights are listed below.`
                      : 'A runtime error interrupted view rendering. File location and diagnostic insights are detailed below.'}
                  </p>
                </div>
              </div>

              {/* Top Quick Copy Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0 self-stretch sm:self-auto justify-end">
                <button
                  type="button"
                  onClick={() => this.handleCopy('summary', shortSummary)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    this.state.copyStatus === 'summary'
                      ? 'theme-bg-accent theme-accent-text'
                      : 'theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated'
                  }`}
                  title="Copy short summary of all errors for quick sharing"
                >
                  {this.state.copyStatus === 'summary' ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>Summary Copied!</span>
                    </>
                  ) : (
                    <span>Copy Summary</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => this.handleCopy('full', combinedMarkdown)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    this.state.copyStatus === 'full'
                      ? 'theme-bg-accent theme-accent-text'
                      : 'theme-bg-accent theme-accent-text hover:opacity-90'
                  }`}
                  title="Copy clean structured markdown report containing all caught exceptions"
                >
                  {this.state.copyStatus === 'full' ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>{isMultiError ? 'All Errors Copied!' : 'Report Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5" />
                      <span>{isMultiError ? `Copy All (${errors.length}) Errors` : 'Copy Clean Report'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Switcher & Navigation Tabs (when multiple errors exist) */}
            {isMultiError && (
              <div className="space-y-2 p-3 rounded-2xl theme-bg-sub border theme-border">
                <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b theme-border">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full theme-bg-danger animate-pulse" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider theme-text-secondary">
                      Caught Errors ({errors.length})
                    </span>
                  </div>

                  {/* Previous / Next Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={selectedIndex === 0}
                      onClick={() =>
                        this.setState((prev) => ({
                          selectedErrorIndex: Math.max(0, prev.selectedErrorIndex - 1),
                          activeTab: 'stack',
                        }))
                      }
                      className="p-1.5 rounded-lg border theme-border theme-bg-surface hover:theme-bg-elevated disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                      title="Previous Error"
                    >
                      <ChevronLeftIcon className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono font-bold px-2 theme-text-secondary">
                      {selectedIndex + 1} of {errors.length}
                    </span>
                    <button
                      type="button"
                      disabled={selectedIndex === errors.length - 1}
                      onClick={() =>
                        this.setState((prev) => ({
                          selectedErrorIndex: Math.min(errors.length - 1, prev.selectedErrorIndex + 1),
                          activeTab: 'stack',
                        }))
                      }
                      className="p-1.5 rounded-lg border theme-border theme-bg-surface hover:theme-bg-elevated disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                      title="Next Error"
                    >
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Error Pills List */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => this.setState({ activeTab: 'all' })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      this.state.activeTab === 'all'
                        ? 'theme-bg-accent theme-accent-text shadow-xs'
                        : 'theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary'
                    }`}
                  >
                    <span>All Errors (Unified View)</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black theme-bg-accent-soft theme-accent">
                      {errors.length}
                    </span>
                  </button>

                  {errors.map((err, idx) => {
                    const isSelected = this.state.activeTab !== 'all' && selectedIndex === idx;
                    return (
                      <button
                        key={err.id || idx}
                        type="button"
                        onClick={() =>
                          this.setState({
                            selectedErrorIndex: idx,
                            activeTab: this.state.activeTab === 'all' ? 'stack' : this.state.activeTab,
                          })
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 max-w-[240px] truncate ${
                          isSelected
                            ? 'theme-bg-accent theme-accent-text shadow-xs'
                            : 'theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary'
                        }`}
                        title={`${err.name}: ${err.message} (${err.locationString})`}
                      >
                        <span className="text-[10px] opacity-75 font-mono">#{idx + 1}</span>
                        <span className="truncate">{err.name}: {err.message}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW MODE 1: UNIFIED ALL ERRORS LIST (Displays all errors simultaneously) */}
            {isMultiError && this.state.activeTab === 'all' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 pb-1 border-b theme-border">
                  <span className="text-xs font-extrabold uppercase tracking-wider theme-text-secondary">
                    All Detected Exceptions ({errors.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => this.handleCopy('full', combinedMarkdown)}
                    className="text-[11px] font-semibold theme-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CopyIcon className="w-3 h-3" />
                    <span>Copy All Details</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {errors.map((err, idx) => {
                    const isExpanded = Boolean(this.state.expandedStacks[idx]);
                    const appFrames = (err.parsedFrames || []).filter((f) => !f.isInternal && f.file);

                    return (
                      <div
                        key={err.id || idx}
                        className="p-4 rounded-2xl theme-bg-sub border theme-border space-y-3 shadow-xs transition hover:border-theme-accent/40"
                      >
                        {/* Error Header & Scope */}
                        <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-5 h-5 rounded-lg theme-bg-danger-soft theme-danger border theme-border text-[11px] font-black flex items-center justify-center font-mono">
                              {idx + 1}
                            </span>
                            <span className="font-mono text-xs font-black theme-danger">
                              {err.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-surface border theme-border theme-text-secondary">
                              {err.errorType}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono theme-text-secondary">
                              {err.timestamp}
                            </span>
                            <button
                              type="button"
                              onClick={() => this.handleCopy(`err_${idx}`, `**${err.name}:** ${err.message}\n**Location:** \`${err.locationString}\``)}
                              className="text-[11px] font-semibold theme-accent hover:underline flex items-center gap-1 cursor-pointer ml-1"
                              title="Copy this single error"
                            >
                              <CopyIcon className="w-3 h-3" />
                              <span>{this.state.copyStatus === `err_${idx}` ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Culprit File Location */}
                        <div className="p-2.5 rounded-xl theme-bg-surface border theme-border font-mono text-xs font-bold theme-text-primary break-all select-text flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 theme-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          <span className="truncate flex-1">{err.culpritFile}</span>
                          {err.culpritLine && (
                            <span className="px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent text-[10px] font-black shrink-0 border theme-border">
                              Line {err.culpritLine}:{err.culpritColumn || '0'}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md theme-bg-sub border theme-border text-[10px] font-mono theme-text-secondary shrink-0">
                            &lt;{err.culpritFunction}&gt;
                          </span>
                        </div>

                        {/* Error Message Box */}
                        <div className="p-3 rounded-xl theme-bg-surface border theme-border font-mono text-xs font-semibold theme-danger break-words select-text">
                          {err.message}
                        </div>

                        {/* Expandable Stack Trace Accordion */}
                        <div>
                          <button
                            type="button"
                            onClick={() => this.toggleStackExpand(idx)}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <span>Call Stack Details</span>
                              <span className="text-[10px] opacity-60 font-mono">({appFrames.length} application frames)</span>
                            </span>
                            <ChevronDownIcon
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3 rounded-xl theme-bg-surface border theme-border font-mono text-[11px] max-h-44 overflow-y-auto space-y-1.5 select-text animate-fade-in">
                              {appFrames.length > 0 ? (
                                appFrames.map((frame, fIdx) => (
                                  <div key={fIdx} className="flex items-start justify-between gap-2 p-1.5 rounded-lg theme-bg-sub border theme-border">
                                    <div className="truncate">
                                      <span className="theme-accent font-black">#{fIdx + 1} {frame.fnName}</span>
                                      <span className="theme-text-secondary ml-1 font-normal">({frame.file})</span>
                                    </div>
                                    {frame.line && (
                                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded theme-bg-surface border theme-border shrink-0">
                                        L{frame.line}:{frame.column}
                                      </span>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <pre className="whitespace-pre-wrap theme-text-secondary text-[10px] leading-relaxed">
                                  {err.rawStack || 'No parsed application frames.'}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* VIEW MODE 2: SINGLE ACTIVE ERROR DEEP DIAGNOSTICS */
              <div className="space-y-4">
                {/* Culprit File Origin Banner */}
                <div className="p-4 sm:p-5 rounded-2xl theme-bg-sub border theme-border space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
                      <span className="text-[11px] font-extrabold uppercase tracking-wider theme-text-secondary">
                        Source File Location {isMultiError ? `(Error #${selectedIndex + 1})` : ''}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => this.handleCopy('location', activeError.locationString)}
                      className="text-[11px] font-semibold theme-accent hover:underline flex items-center gap-1 cursor-pointer"
                      title="Copy file path and line number"
                    >
                      <CopyIcon className="w-3 h-3" />
                      <span>{this.state.copyStatus === 'location' ? 'Path Copied!' : 'Copy Path'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* File Path & Line */}
                    <div className="sm:col-span-8 p-3 rounded-xl theme-bg-surface border theme-border font-mono text-xs font-bold theme-text-primary break-all select-text flex items-center gap-2.5">
                      <svg className="w-4 h-4 theme-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                      <span className="truncate">{activeError.culpritFile}</span>
                      {activeError.culpritLine && (
                        <span className="px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent text-[11px] font-black shrink-0 border theme-border">
                          Line {activeError.culpritLine}
                          {activeError.culpritColumn ? `:${activeError.culpritColumn}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Culprit Component / Scope */}
                    <div className="sm:col-span-4 p-3 rounded-xl theme-bg-surface border theme-border text-xs font-mono theme-text-secondary truncate select-text flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary shrink-0">
                        Scope:
                      </span>
                      <span className="font-bold theme-accent truncate">
                        &lt;{activeError.culpritFunction}&gt;
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error Message Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                      Error Message
                    </span>
                    <button
                      type="button"
                      onClick={() => this.handleCopy('message', `${activeError.name}: ${activeError.message}`)}
                      className="text-[11px] font-semibold theme-accent hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <CopyIcon className="w-3 h-3" />
                      <span>{this.state.copyStatus === 'message' ? 'Message Copied!' : 'Copy Message'}</span>
                    </button>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl theme-bg-sub border theme-border font-mono text-xs font-semibold theme-danger break-words select-text overflow-x-auto">
                    <span className="font-black underline mr-2">{activeError.name}:</span>
                    <span>{activeError.message}</span>
                  </div>
                </div>

                {/* Diagnostics Tabs & Content */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b theme-border pb-2 gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => this.setState({ activeTab: 'stack' })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          this.state.activeTab === 'stack'
                            ? 'theme-bg-accent theme-accent-text shadow-xs'
                            : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
                        }`}
                      >
                        Call Stack Trace ({activeError.parsedFrames.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => this.setState({ activeTab: 'components' })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          this.state.activeTab === 'components'
                            ? 'theme-bg-accent theme-accent-text shadow-xs'
                            : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
                        }`}
                      >
                        Component Tree
                      </button>
                      <button
                        type="button"
                        onClick={() => this.setState({ activeTab: 'environment' })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          this.state.activeTab === 'environment'
                            ? 'theme-bg-accent theme-accent-text shadow-xs'
                            : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
                        }`}
                      >
                        Environment
                      </button>
                    </div>

                    {this.state.activeTab === 'stack' && (
                      <button
                        type="button"
                        onClick={() => this.setState((prev) => ({ showRawStack: !prev.showRawStack }))}
                        className="text-[11px] font-semibold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                      >
                        {this.state.showRawStack ? 'Show Parsed Frames' : 'Show Raw Stack'}
                      </button>
                    )}
                  </div>

                  {/* Tab 1: Stack Trace */}
                  {this.state.activeTab === 'stack' && (
                    <div className="p-3 rounded-2xl theme-bg-sub border theme-border font-mono text-xs max-h-56 overflow-y-auto space-y-1.5 select-text">
                      {this.state.showRawStack ? (
                        <pre className="whitespace-pre-wrap theme-text-secondary text-[11px] leading-relaxed">
                          {activeError.rawStack || 'No raw stack available'}
                        </pre>
                      ) : activeError.parsedFrames.length > 0 ? (
                        activeError.parsedFrames.map((frame, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-xl flex items-start justify-between gap-3 text-[11px] border ${
                              !frame.isInternal
                                ? 'theme-bg-surface border theme-border font-bold theme-text-primary'
                                : 'border-transparent theme-text-secondary opacity-75'
                            }`}
                          >
                            <div className="flex items-start gap-2 truncate">
                              <span className="text-[10px] theme-text-secondary opacity-60 shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="truncate">
                                <span className={!frame.isInternal ? 'theme-accent font-black' : ''}>
                                  {frame.fnName}
                                </span>
                                <span className="theme-text-secondary ml-1 font-normal truncate block sm:inline">
                                  ({frame.file})
                                </span>
                              </div>
                            </div>
                            {frame.line && (
                              <span className="text-[10px] shrink-0 font-bold px-1.5 py-0.5 rounded theme-bg-sub border theme-border">
                                L{frame.line}:{frame.column}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs theme-text-secondary p-2">No stack trace parsed.</p>
                      )}
                    </div>
                  )}

                  {/* Tab 2: React Component Hierarchy */}
                  {this.state.activeTab === 'components' && (
                    <div className="p-3 rounded-2xl theme-bg-sub border theme-border font-mono text-xs max-h-56 overflow-y-auto select-text">
                      {activeError.componentStack ? (
                        <pre className="whitespace-pre-wrap text-[11px] theme-text-primary leading-relaxed">
                          {activeError.componentStack}
                        </pre>
                      ) : (
                        <p className="text-xs theme-text-secondary p-2">No component stack captured.</p>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Environment & Context */}
                  {this.state.activeTab === 'environment' && (
                    <div className="p-3 rounded-2xl theme-bg-sub border theme-border text-xs space-y-2 select-text">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl theme-bg-surface border theme-border">
                          <span className="text-[10px] uppercase font-bold theme-text-secondary block">
                            Captured Route
                          </span>
                          <span className="font-mono font-bold theme-text-primary break-all">
                            {activeError.routePath || '/'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl theme-bg-surface border theme-border">
                          <span className="text-[10px] uppercase font-bold theme-text-secondary block">
                            Timestamp
                          </span>
                          <span className="font-medium theme-text-primary">{activeError.timestamp}</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl theme-bg-surface border theme-border">
                        <span className="text-[10px] uppercase font-bold theme-text-secondary block">
                          User Agent
                        </span>
                        <span className="font-mono text-[11px] theme-text-secondary break-all">
                          {activeError.userAgent}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t theme-border">
              <button
                type="button"
                onClick={this.handleNavigateHome}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-primary transition cursor-pointer text-center"
              >
                Go to Dashboard
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold rounded-xl border theme-border hover:theme-bg-elevated theme-text-primary transition cursor-pointer text-center"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-bold rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <RefreshIcon className="w-4 h-4" />
                  <span>Reload Application</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
