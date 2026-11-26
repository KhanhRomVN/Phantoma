import { AlignLeft } from 'lucide-react';
/**
 * ------------------------------------------------------------------
 * Body Details
 * ------------------------------------------------------------------
 * Hiển thị request/response body với syntax highlighting, hex viewer
 * cho binary data và tìm kiếm matches.
 *
 * Các chức năng chính:
 * - Code block với syntax highlighting (highlight.js)
 * - Hex viewer cho binary body
 * - Tìm kiếm và điều hướng matches
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { forwardRef, useImperativeHandle, useRef, useState, useMemo } from 'react';

// ── UI ──
import CodeBlock, { CodeBlockRef } from '@renderer/components/common/CodeBlock';

// ── Utils ──
import hljs from 'highlight.js';
import { cn } from '@renderer/utils/cn';
import { NetworkRequest } from '../FilterPanel';

// ─── Types ──────────────────────────────────────────────────────────────
interface BodyDetailsProps {
  request: NetworkRequest;
  searchTerm: string;
}

export interface BodyDetailsRef {
  nextMatch: () => void;
}

interface HexViewerProps {
  data: string;
  className?: string;
}

// ─── Components ─────────────────────────────────────────────────────────
function HexViewer({ data, className }: HexViewerProps) {
  const { hexLines, asciiLines } = useMemo(() => {
    let buffer: Uint8Array;
    try {
      buffer = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    } catch (e) {
      buffer = new TextEncoder().encode(data);
    }

    const hex: string[] = [];
    const ascii: string[] = [];
    const chunkSize = 16;
    const limit = Math.min(buffer.length, HEX_MAX_BYTES);

    for (let i = 0; i < limit; i += chunkSize) {
      const chunk = buffer.slice(i, i + chunkSize);

      const hexLine = Array.from(chunk)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      const padding = '   '.repeat(chunkSize - chunk.length);

      hex.push(hexLine + padding);

      const asciiLine = Array.from(chunk)
        .map((b) => {
          return b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
        })
        .join('');
      ascii.push(asciiLine);
    }

    return { hexLines: hex, asciiLines: ascii };
  }, [data]);

  return (
    <div
      className={cn(
        'font-mono text-xs overflow-auto h-full p-4 select-text',
        className,
      )}
    >
      <div className="flex">
        {/* Offset Column */}
        <div className="flex flex-col text-text-secondary select-none mr-4 border-r border-border pr-2 text-right">
          {hexLines.map((_, i) => (
            <div key={i}>{(i * 16).toString(16).padStart(8, '0').toUpperCase()}</div>
          ))}
        </div>

        {/* Hex Column */}
        <div className="flex flex-col text-text-primary mr-4 whitespace-pre">
          {hexLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        {/* ASCII Column */}
        <div className="flex flex-col text-success border-l border-border pl-4 whitespace-pre">
          {asciiLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Giới hạn hiển thị để tránh đơ UI với body lớn
const BODY_MAX_CHARS = 512 * 1024;
const HEX_MAX_BYTES = 64 * 1024;
const LANG_DETECT_SAMPLE = 2000;

function getLanguage(contentType?: string, content?: string): string {
  // Check content type first
  if (contentType) {
    if (contentType.includes('json')) return 'json';
    if (contentType.includes('html')) return 'html';
    if (contentType.includes('xml')) return 'xml';
    if (contentType.includes('javascript') || contentType.includes('js')) return 'javascript';
    if (contentType.includes('css')) return 'css';
  }

  // If no content type or unknown, try to detect from content
  if (isJsonText(content)) return 'json';
  if (isCssText(content)) return 'css';

  if (content) {
    try {
      const result = hljs.highlightAuto(content.slice(0, LANG_DETECT_SAMPLE));
      // Only use detected language if confidence is reasonable
      // hljs returns a relevance score, we can check if it's high enough
      if (result.language && result.relevance > 5) {
        // Map highlight.js language names to Monaco language names
        const langMap: Record<string, string> = {
          json: 'json',
          html: 'html',
          xml: 'xml',
          javascript: 'javascript',
          js: 'javascript',
          typescript: 'typescript',
          css: 'css',
          python: 'python',
          java: 'java',
          c: 'c',
          cpp: 'cpp',
          csharp: 'csharp',
          go: 'go',
          rust: 'rust',
          php: 'php',
          ruby: 'ruby',
          sql: 'sql',
          yaml: 'yaml',
          toml: 'toml',
          markdown: 'markdown',
          bash: 'bash',
          shell: 'bash',
        };
        return langMap[result.language] || result.language || 'text';
      }
    } catch {
      // Highlight.js detection failed, fallback to simple detection
      const trimmed = content.trim();
      // Check if it looks like JSON
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          JSON.parse(trimmed);
          return 'json';
        } catch {
          // Not valid JSON, continue
        }
      }
      // Check if it looks like HTML
      if (trimmed.startsWith('<') && trimmed.includes('>')) {
        return 'html';
      }
      // Check if it looks like XML
      if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
        return 'xml';
      }
    }
  }

  return 'text';
}

function isCssText(content?: string): boolean {
  if (!content) return false;
  const sample = content.slice(0, LANG_DETECT_SAMPLE).trim();
  if (!sample || sample.startsWith('<') || sample.startsWith('{') || sample.startsWith('[')) {
    return false;
  }
  if (/^(function\b|const\b|let\b|var\b|import\b|export\b|class\b|\(function|!function)/.test(sample)) {
    return false;
  }
  return /^(@[\w-]+[^{;]*[{;]|[.#:*\[]?[\w\-.#:\[\]="'>+~*, ()]+\{\s*[\w-]+\s*:)/.test(sample);
}

function formatCss(css: string): string {
  let out = '';
  let indent = 0;
  let paren = 0;
  let quote: string | null = null;
  const pad = () => '  '.repeat(indent);
  const nextTerminator = (from: number): string => {
    for (let j = from; j < css.length; j++) {
      const ch = css[j];
      if (ch === '{' || ch === ';' || ch === '}') return ch;
    }
    return '';
  };

  for (let i = 0; i < css.length; i++) {
    const c = css[i];

    if (quote) {
      out += c;
      if (c === '\\') out += css[++i] ?? '';
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      out += c;
      continue;
    }
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? css.length : end + 2;
      out += css.slice(i, stop);
      if (indent === 0 || out.endsWith('*/')) out += '\n' + pad();
      i = stop - 1;
      continue;
    }
    if (c === '(') paren++;
    if (c === ')') paren = Math.max(0, paren - 1);

    if (paren === 0 && c === '{') {
      out = out.trimEnd() + ' {\n';
      indent++;
      out += pad();
    } else if (paren === 0 && c === '}') {
      out = out.trimEnd();
      indent = Math.max(0, indent - 1);
      out += '\n' + pad() + '}\n' + (indent === 0 ? '\n' : '') + pad();
    } else if (paren === 0 && c === ';') {
      out = out.trimEnd() + ';\n' + pad();
    } else if (paren === 0 && c === ',' && nextTerminator(i + 1) === '{') {
      out = out.trimEnd() + ',\n' + pad();
    } else if (paren === 0 && c === ':' && indent > 0 && nextTerminator(i + 1) !== '{') {
      out = out.trimEnd() + ': ';
    } else if (/\s/.test(c)) {
      if (out && !/[\s]$/.test(out)) out += ' ';
    } else {
      out += c;
    }
  }

  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function isJsonText(content?: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function BodyTypeBadge({
  contentType,
  isJson,
  language,
}: {
  contentType?: string;
  isJson: boolean;
  language?: string;
}) {
  if (isJson) {
    return (
      <span className="bg-success/10 text-success px-1.5 py-0.5 rounded font-bold uppercase">
        JSON
      </span>
    );
  }
  if (!contentType && language && language !== 'text') {
    return (
      <span className="bg-secondary px-1.5 py-0.5 rounded font-bold uppercase text-text-secondary">
        {language}
      </span>
    );
  }
  if (contentType) {
    return (
      <span className="bg-secondary px-1.5 py-0.5 rounded text-text-secondary">{contentType}</span>
    );
  }
  return (
    <span className="bg-secondary px-1.5 py-0.5 rounded font-bold uppercase text-text-secondary">
      UNKNOWN
    </span>
  );
}

function formatJsonIfValid(content: string): string {
  if (!content) return content;
  const trimmed = content.trim();
  try {
    // Try to parse as JSON and format it
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // Not valid JSON, return original
    return content;
  }
}

export const BodyDetails = forwardRef<BodyDetailsRef, BodyDetailsProps>(
  ({ request, searchTerm }, ref) => {
    const analysis = request.analysis;
    const requestBlockRef = useRef<CodeBlockRef>(null);
    const responseBlockRef = useRef<CodeBlockRef>(null);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

    useImperativeHandle(ref, () => ({
      nextMatch: () => {
        const reqCount = requestBlockRef.current?.getMatchCount() || 0;
        const resCount = responseBlockRef.current?.getMatchCount() || 0;
        const total = reqCount + resCount;

        if (total === 0) return;

        const nextIndex = (currentMatchIndex + 1) % total;
        setCurrentMatchIndex(nextIndex);

        if (nextIndex < reqCount) {
          requestBlockRef.current?.goToMatch(nextIndex);
        } else {
          responseBlockRef.current?.goToMatch(nextIndex - reqCount);
        }
      },
    }));

    // Fallback: Use raw request data when analysis is not available
    const body = analysis?.body as any;
    const requestBodyFull = body?.request?.formatted
      ? JSON.stringify(body.request.formatted, null, 2)
      : body?.request?.raw
        ? formatJsonIfValid(body.request.raw)
        : formatJsonIfValid(
            typeof request.requestBody === 'string'
              ? request.requestBody
              : request.requestBody
                ? JSON.stringify(request.requestBody)
                : 'No Content',
          );

    const responseBodyFull = body?.response?.formatted
      ? JSON.stringify(body.response.formatted, null, 2)
      : body?.response?.raw
        ? formatJsonIfValid(body.response.raw)
        : formatJsonIfValid(
            typeof request.responseBody === 'string'
              ? request.responseBody
              : request.responseBody
                ? JSON.stringify(request.responseBody)
                : 'No Content',
          );

    const truncateBody = (full: string, isBinary: boolean): string => {
      if (full.length <= BODY_MAX_CHARS) return full;
      const head = full.slice(0, BODY_MAX_CHARS);
      return isBinary
        ? head
        : `${head}\n\n... [Đã cắt bớt: hiển thị ${BODY_MAX_CHARS} / ${full.length} ký tự]`;
    };
    const isResponseBinary = body?.response?.isBinary;

    const requestLanguage = useMemo(
      () => getLanguage(body?.request?.contentType, requestBodyFull),
      [body?.request?.contentType, requestBodyFull],
    );
    const responseLanguage = useMemo(
      () => (isResponseBinary ? 'text' : getLanguage(body?.response?.contentType, responseBodyFull)),
      [body?.response?.contentType, responseBodyFull, isResponseBinary],
    );

    const requestBodyContent = useMemo(
      () => truncateBody(requestLanguage === 'css' ? formatCss(requestBodyFull) : requestBodyFull, false),
      [requestBodyFull, requestLanguage],
    );
    const responseBodyContent = useMemo(
      () =>
        truncateBody(
          responseLanguage === 'css' ? formatCss(responseBodyFull) : responseBodyFull,
          !!isResponseBinary,
        ),
      [responseBodyFull, responseLanguage, isResponseBinary],
    );

    const isRequestJson = useMemo(
      () => (body?.request?.contentType || '').includes('json') || isJsonText(requestBodyFull),
      [body?.request?.contentType, requestBodyFull],
    );
    const isResponseJson = useMemo(
      () =>
        !isResponseBinary &&
        ((body?.response?.contentType || '').includes('json') || isJsonText(responseBodyFull)),
      [body?.response?.contentType, responseBodyFull, isResponseBinary],
    );

    const readonlyOptions = {
      readOnly: true,
      domReadOnly: true,
      renderLineHighlight: 'none',
      matchBrackets: 'never',
      folding: false,
      guides: { indentation: false },
      renderIndentGuides: false,
      selectionHighlight: false,
      occurrencesHighlight: false,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      contextmenu: false,
    };

    return (
      <div className="h-full overflow-hidden flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full overflow-hidden">
          {/* Request Body */}
          <div className="flex flex-col h-full space-y-1.5 overflow-hidden">
            <div className="flex justify-between items-center border-b border-border/50 pb-1.5 flex-shrink-0">
              <h3 className="text-[10px] font-bold text-text-secondary uppercase">Request Body</h3>
              <div className="flex gap-1.5 text-[10px] items-center">
                <button
                  onClick={() => requestBlockRef.current?.format()}
                  className="p-1 hover:bg-secondary rounded text-text-secondary hover:text-text-primary transition-colors"
                  title="Format Document"
                >
                  <AlignLeft className="w-3 h-3" />
                </button>
                <div className="w-[1px] h-3 bg-border/50 mx-1" />
                {body?.request?.compression && body?.request?.compression !== 'none' && (
                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">
                    {body?.request?.compression}
                  </span>
                )}
                <BodyTypeBadge
                  contentType={body?.request?.contentType}
                  isJson={isRequestJson}
                  language={requestLanguage}
                />
                <span className="bg-secondary px-1.5 py-0.5 rounded text-text-secondary">
                  {body?.request?.size || '0 B'}
                </span>
              </div>
            </div>

            <div className="flex-1 border border-border/50 rounded-md overflow-hidden relative min-h-0">
              <CodeBlock
                ref={requestBlockRef}
                code={requestBodyContent}
                language={requestLanguage}
                className="absolute inset-0"
                showLineNumbers
                wordWrap="on"
                searchTerm={searchTerm}
                editorOptions={readonlyOptions}
              />
            </div>
          </div>

          {/* Response Body */}
          <div className="flex flex-col h-full space-y-1.5 overflow-hidden">
            <div className="flex justify-between items-center border-b border-border/50 pb-1.5 flex-shrink-0">
              <h3 className="text-[10px] font-bold text-text-secondary uppercase">Response Body</h3>
              <div className="flex gap-1.5 text-[10px] items-center">
                {!isResponseBinary && (
                  <button
                    onClick={() => responseBlockRef.current?.format()}
                    className="p-1 hover:bg-secondary rounded text-text-secondary hover:text-text-primary transition-colors"
                    title="Format Document"
                  >
                    <AlignLeft className="w-3 h-3" />
                  </button>
                )}
                <div className="w-[1px] h-3 bg-border/50 mx-1" />
                {isResponseBinary && (
                  <span className="bg-info/10 text-info px-1.5 py-0.5 rounded font-bold uppercase">
                    BINARY
                  </span>
                )}
                {body?.response?.compression && body?.response?.compression !== 'none' && (
                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">
                    {body?.response?.compression}
                  </span>
                )}
                <BodyTypeBadge
                  contentType={body?.response?.contentType}
                  isJson={isResponseJson}
                  language={responseLanguage}
                />
                <span className="bg-secondary px-1.5 py-0.5 rounded text-text-secondary">
                  {body?.response?.size || '0 B'}
                </span>
              </div>
            </div>

            <div className="flex-1 border border-border/50 rounded-md overflow-hidden relative min-h-0">
              {isResponseBinary ? (
                <HexViewer data={responseBodyContent} className="absolute inset-0" />
              ) : (
                <CodeBlock
                  ref={responseBlockRef}
                  code={responseBodyContent}
                  language={responseLanguage}
                  className="absolute inset-0"
                  showLineNumbers
                  wordWrap="on"
                  searchTerm={searchTerm}
                  editorOptions={readonlyOptions}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

BodyDetails.displayName = 'BodyDetails';
export type { BodyDetailsProps };
