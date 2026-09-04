import { useState, useRef, useEffect, type RefObject } from 'react';
/**
 * ------------------------------------------------------------------
 * FileContentSection
 * ------------------------------------------------------------------
 * Panel hiển thị nội dung source file đã chọn — tự động prettify
 * nếu code bị minified, syntax highlighting.
 *
 * Các chức năng chính:
 * - Hiển thị source với CodeBlock (syntax highlighting)
 * - Tự động prettify code minified
 * - Hiển thị thông tin obfuscation/compression
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── UI ──
import { FileCode, AlignLeft, Loader2 } from 'lucide-react';
import CodeBlock, { CodeBlockRef } from '@renderer/components/common/CodeBlock';

// ── Utils ──
import { logger } from '@renderer/utils/logger';
import { prettifyCode, isMinified } from '../../../utils/prettify';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';

// ─── Types ──────────────────────────────────────────────────────────────
export interface SelectedSourceContent {
  content: string;
  fileName: string;
  language: string;
  isDifferent?: boolean;
  compressionRatio?: string;
}

interface FileContentSectionProps {
  selectedContent: SelectedSourceContent | null;
}

// ─── Components ─────────────────────────────────────────────────────────
function SourceView({
  content,
  language,
  codeBlockRef,
}: {
  content: string;
  language?: string;
  codeBlockRef: RefObject<CodeBlockRef | null>;
}) {
  const [displayContent, setDisplayContent] = useState(content);
  const [isFormatting, setIsFormatting] = useState(false);

  useEffect(() => {
    const autoPrettify = async () => {
      if (!content || content.length === 0) {
        setDisplayContent('');
        return;
      }
      const needsFormatting = isMinified(content);
      if (needsFormatting) {
        setIsFormatting(true);
        try {
          const result = await prettifyCode(content);
          if (result.error) {
            setDisplayContent(content);
          } else {
            setDisplayContent(result.formatted);
          }
        } catch {
          setDisplayContent(content);
        }
        setIsFormatting(false);
      } else {
        setDisplayContent(content);
      }
    };
    autoPrettify();
  }, [content, language]);

  if (!content)
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <FileCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a file to view source</p>
        </div>
      </div>
    );
  if (isFormatting)
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-purple-400" />
          <p className="text-sm">Formatting code...</p>
        </div>
      </div>
    );

  const langMap: Record<string, string> = {
    javascript: 'javascript',
    typescript: 'typescript',
    html: 'html',
    css: 'css',
    json: 'json',
    xml: 'xml',
    jsx: 'jsx',
    tsx: 'tsx',
    js: 'javascript',
    ts: 'typescript',
  };
  const monacoLang = language ? langMap[language.toLowerCase()] || 'javascript' : 'javascript';

  return (
    <div className="h-full w-full min-h-[200px] flex flex-col">
      <div className="flex-1 overflow-hidden">
        <CodeBlock
          ref={codeBlockRef}
          code={displayContent}
          language={monacoLang}
          showLineNumbers
          wordWrap="on"
          editorOptions={{
            readOnly: true,
            fontSize: 13,
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            automaticLayout: true,
            formatOnType: true,
            formatOnPaste: true,
          }}
        />
      </div>
    </div>
  );
}

export function FileContentSection({ selectedContent }: FileContentSectionProps) {
  const codeBlockRef = useRef<CodeBlockRef>(null);

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="h-10 px-3 border-b border-divider flex items-center justify-between shrink-0 bg-muted/10">
        <div className="flex items-center gap-2">
          <img
            src={getFileIconPath(selectedContent?.fileName || '')}
            className="w-4 h-4 shrink-0"
            alt=""
          />
          <span className="text-xs font-medium text-text-primary truncate">
            {selectedContent?.fileName || 'No file selected'}
          </span>
          {selectedContent?.isDifferent && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 shrink-0">
              Obfuscated ({selectedContent.compressionRatio})
            </span>
          )}
        </div>
        <button
          onClick={() => {
            try {
              codeBlockRef.current?.format();
            } catch {
              logger.warn('[FileContentSection] Format action failed');
            }
          }}
          className="p-1 hover:bg-secondary rounded text-text-secondary hover:text-text-primary transition-colors"
          title="Format Document (Ctrl+Shift+F)"
        >
          <AlignLeft className="w-3 h-3" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <SourceView
          content={selectedContent?.content || ''}
          language={selectedContent?.language}
          codeBlockRef={codeBlockRef}
        />
      </div>
    </div>
  );
}

export default FileContentSection;