import { AlignLeft } from 'lucide-react';
import { CodeBlock, CodeBlockRef } from '../../../../components/common/CodeBlock';
import { forwardRef, useImperativeHandle, useRef, useState, useMemo } from 'react';
import { cn } from '../../../../shared/lib/utils';

interface BodyDetailsProps {
  request: NetworkRequest;
  searchTerm: string;
}

export interface BodyDetailsRef {
  nextMatch: () => void;
}

// HexViewer component (merged)
interface HexViewerProps {
  data: string;
  className?: string;
}

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

    for (let i = 0; i < buffer.length; i += chunkSize) {
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
        'font-mono text-xs overflow-auto h-full bg-background p-4 select-text',
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
        <div className="flex flex-col text-success border-l border-divider pl-4 whitespace-pre">
          {asciiLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

import hljs from 'highlight.js';
import { NetworkRequest } from '../../types/inspector';

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
  if (content) {
    try {
      const result = hljs.highlightAuto(content);
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
    const requestBodyContent = analysis?.body?.request?.formatted
      ? JSON.stringify(analysis.body.request.formatted, null, 2)
      : analysis?.body?.request?.raw
        ? formatJsonIfValid(analysis.body.request.raw)
        : formatJsonIfValid(request.requestBody || 'No Content');

    const responseBodyContent = analysis?.body?.response?.formatted
      ? JSON.stringify(analysis.body.response.formatted, null, 2)
      : analysis?.body?.response?.raw
        ? formatJsonIfValid(analysis.body.response.raw)
        : formatJsonIfValid(request.responseBody || 'No Content');

    const requestLanguage = getLanguage(analysis?.body?.request?.contentType, requestBodyContent);
    const responseLanguage = getLanguage(
      analysis?.body?.response?.contentType,
      responseBodyContent,
    );

    const isResponseBinary = analysis?.body?.response?.isBinary;

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
            <div className="flex justify-between items-center border-b border-divider/50 pb-1.5 flex-shrink-0">
              <h3 className="text-[10px] font-bold text-text-secondary uppercase">Request Body</h3>
              <div className="flex gap-1.5 text-[10px] items-center">
                <button
                  onClick={() => requestBlockRef.current?.format()}
                  className="p-1 hover:bg-secondary rounded text-text-secondary hover:text-text-primary transition-colors"
                  title="Format Document"
                >
                  <AlignLeft className="w-3 h-3" />
                </button>
                <div className="w-[1px] h-3 bg-divider/50 mx-1" />
                {analysis?.body?.request?.compression &&
                  analysis?.body?.request?.compression !== 'none' && (
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">
                      {analysis?.body?.request?.compression}
                    </span>
                  )}
                <span className="bg-secondary px-1.5 py-0.5 rounded text-text-secondary">
                  {analysis?.body?.request?.contentType || 'Unknown Type'}
                </span>
                <span className="bg-secondary px-1.5 py-0.5 rounded text-text-secondary">
                  {analysis?.body?.request?.size || '0 B'}
                </span>
              </div>
            </div>

            <div className="flex-1 bg-card-background/20 border border-border/50 rounded-md overflow-hidden relative min-h-0">
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
            <div className="flex justify-between items-center border-b border-divider/50 pb-1.5 flex-shrink-0">
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
                <div className="w-[1px] h-3 bg-divider/50 mx-1" />
                {isResponseBinary && (
                  <span className="bg-info/10 text-info px-1.5 py-0.5 rounded font-bold uppercase">
                    BINARY
                  </span>
                )}
                {analysis?.body?.response?.compression &&
                  analysis?.body?.response?.compression !== 'none' && (
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">
                      {analysis?.body?.response?.compression}
                    </span>
                  )}
                <span className="bg-secondary px-1.5 py-0.5 rounded text-text-secondary">
                  {analysis?.body?.response?.contentType || 'Unknown Type'}
                </span>
                <span className="bg-secondary px-1.5 py-0.5 rounded text-text-secondary">
                  {analysis?.body?.response?.size || '0 B'}
                </span>
              </div>
            </div>

            <div className="flex-1 bg-secondary/20 border border-border/50 rounded-md overflow-hidden relative min-h-0">
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
