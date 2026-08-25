import React from 'react';
import { RefreshIcon, CheckIcon } from './Icons';

/**
 * Parses error and component stack details into structured diagnostic information.
 */
function parseErrorDetails(error, errorInfo) {
  const name = error?.name || 'RuntimeError';
  const message = error?.message || (typeof error === 'string' ? error : 'An unexpected runtime error occurred.');
  const stack = error?.stack || '';
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
        if (!file.includes('node_modules') && (file.includes('src/') || file.endsWith('.jsx') || file.endsWith('.js'))) {
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
  const timestamp = new Date().toLocaleString();

  return {
    name,
    message,
    culpritFile: culpritFile || 'Unknown Source File',
    culpritLine,
    culpritColumn,
    culpritFunction: culpritFunction || 'Unknown Component',
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
 * Formats a clean Markdown diagnostic report ready for copying and bug tracking.
 */
function buildMarkdownReport(diagnostics) {
  return [
    `# Bug Report: ${diagnostics.name}`,
    `**Message:** ${diagnostics.message}`,
    `**File Location:** \`${diagnostics.locationString}\``,
    `**Component / Function:** \`<${diagnostics.culpritFunction} />\``,
    `**Timestamp:** ${diagnostics.timestamp}`,
    `**Route:** \`${diagnostics.routePath || '/'}\``,
    `**URL:** ${diagnostics.currentUrl}`,
    `**User Agent:** ${diagnostics.userAgent}`,
    '',
    '## Call Stack Trace',
    '```text',
    diagnostics.rawStack || 'No stack trace captured',
    '```',
    '',
    '## React Component Stack',
    '```text',
    diagnostics.componentStack || 'No component stack captured',
    '```',
  ].join('\n');
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copyStatus: null, // null | 'full' | 'message' | 'location'
      activeTab: 'stack', // 'stack' | 'components' | 'environment'
      showRawStack: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Captured unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
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
      error: null,
      errorInfo: null,
      copyStatus: null,
      activeTab: 'stack',
      showRawStack: false,
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

  render() {
    if (this.state.hasError) {
      const diagnostics = parseErrorDetails(this.state.error, this.state.errorInfo);
      const markdownReport = buildMarkdownReport(diagnostics);

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
                      Application Exception Caught
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase theme-bg-danger-soft theme-danger border theme-border">
                      {diagnostics.name}
                    </span>
                  </div>
                  <p className="text-xs theme-text-secondary mt-0.5">
                    A runtime error interrupted view rendering. File location and diagnostic insights are detailed below.
                  </p>
                </div>
              </div>

              {/* Quick Copy Report Button */}
              <button
                type="button"
                onClick={() => this.handleCopy('full', markdownReport)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 self-stretch sm:self-auto justify-center ${
                  this.state.copyStatus === 'full'
                    ? 'theme-bg-accent theme-accent-text'
                    : 'theme-bg-sub border theme-border theme-text-primary hover:theme-bg-elevated'
                }`}
                title="Copy full diagnostic report formatted in Markdown"
              >
                {this.state.copyStatus === 'full' ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>Report Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 theme-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Copy Full Report</span>
                  </>
                )}
              </button>
            </div>

            {/* Culprit File Origin Banner */}
            <div className="p-4 sm:p-5 rounded-2xl theme-bg-sub border theme-border space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider theme-text-secondary">
                    Source File Location
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => this.handleCopy('location', diagnostics.locationString)}
                  className="text-[11px] font-semibold theme-accent hover:underline flex items-center gap-1 cursor-pointer"
                  title="Copy file path and line number"
                >
                  {this.state.copyStatus === 'location' ? (
                    <span className="font-bold">Path Copied!</span>
                  ) : (
                    <span>Copy Path</span>
                  )}
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
                  <span className="truncate">{diagnostics.culpritFile}</span>
                  {diagnostics.culpritLine && (
                    <span className="px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent text-[11px] font-black shrink-0 border theme-border">
                      Line {diagnostics.culpritLine}
                      {diagnostics.culpritColumn ? `:${diagnostics.culpritColumn}` : ''}
                    </span>
                  )}
                </div>

                {/* Culprit Component / Function */}
                <div className="sm:col-span-4 p-3 rounded-xl theme-bg-surface border theme-border text-xs font-mono theme-text-secondary truncate select-text flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary shrink-0">
                    Scope:
                  </span>
                  <span className="font-bold theme-accent truncate">
                    &lt;{diagnostics.culpritFunction}&gt;
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
                  onClick={() => this.handleCopy('message', `${diagnostics.name}: ${diagnostics.message}`)}
                  className="text-[11px] font-semibold theme-accent hover:underline cursor-pointer"
                >
                  {this.state.copyStatus === 'message' ? 'Message Copied!' : 'Copy Message'}
                </button>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl theme-bg-sub border theme-border font-mono text-xs font-semibold theme-danger break-words select-text overflow-x-auto">
                <span className="font-black underline mr-2">{diagnostics.name}:</span>
                <span>{diagnostics.message}</span>
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
                    Call Stack Trace ({diagnostics.parsedFrames.length})
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
                      {diagnostics.rawStack || 'No raw stack available'}
                    </pre>
                  ) : diagnostics.parsedFrames.length > 0 ? (
                    diagnostics.parsedFrames.map((frame, idx) => (
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
                  {diagnostics.componentStack ? (
                    <pre className="whitespace-pre-wrap text-[11px] theme-text-primary leading-relaxed">
                      {diagnostics.componentStack}
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
                        {diagnostics.routePath || '/'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl theme-bg-surface border theme-border">
                      <span className="text-[10px] uppercase font-bold theme-text-secondary block">
                        Timestamp
                      </span>
                      <span className="font-medium theme-text-primary">{diagnostics.timestamp}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl theme-bg-surface border theme-border">
                    <span className="text-[10px] uppercase font-bold theme-text-secondary block">
                      User Agent
                    </span>
                    <span className="font-mono text-[11px] theme-text-secondary break-all">
                      {diagnostics.userAgent}
                    </span>
                  </div>
                </div>
              )}
            </div>

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
