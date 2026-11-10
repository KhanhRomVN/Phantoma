import React from 'react';
import { Check, Copy } from 'lucide-react';
import CodeBlock from '@renderer/components/common/CodeBlock';
import { getFileIconPath } from '@renderer/utils/file-icon';

const LINE_HEIGHT = 18;
const PADDING = 8;
const MAX_LINES = 10;
const MAX_HEIGHT = MAX_LINES * LINE_HEIGHT + PADDING * 2;

const LANGUAGE_EXT: Record<string, string> = {
  bash: 'sh',
  shell: 'sh',
  zsh: 'sh',
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  rust: 'rs',
  markdown: 'md',
  yaml: 'yml',
  text: 'txt',
  plaintext: 'txt',
  csharp: 'cs',
  golang: 'go',
  ruby: 'rb',
  kotlin: 'kt',
  powershell: 'ps1',
};

const EDITOR_OPTIONS = {
  readOnly: true,
  domReadOnly: true,
  lineHeight: LINE_HEIGHT,
  padding: { top: PADDING, bottom: PADDING },
  cursorWidth: 0,
  renderLineHighlight: 'none',
  occurrencesHighlight: 'off',
  selectionHighlight: false,
  matchBrackets: 'never',
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
  scrollbar: { alwaysConsumeMouseWheel: false },
};

interface Props {
  code: string;
  language?: string;
}

export default function ReadOnlyCodeBlock({ code, language }: Props) {
  const [height, setHeight] = React.useState(LINE_HEIGHT + PADDING * 2);
  const [copied, setCopied] = React.useState(false);
  const value = React.useMemo(() => code.replace(/\n+$/, ''), [code]);
  const lang = language || 'text';
  const ext = LANGUAGE_EXT[lang.toLowerCase()] ?? lang.toLowerCase();

  const handleMounted = React.useCallback((editor: any) => {
    const update = () => setHeight(Math.min(editor.getContentHeight(), MAX_HEIGHT));
    update();
    editor.onDidContentSizeChange(update);
  }, []);

  // ASSUMED: icon bên phải là nút copy
  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);

  return (
    <div>
      <div className="flex items-center justify-between h-7 px-2 border-b border-divider bg-sidebar-background">
        <div className="flex items-center gap-1.5 min-w-0">
          <img src={getFileIconPath(`file.${ext}`)} alt={lang} className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] text-text-secondary truncate">{lang}</span>
        </div>
        <div className="flex items-center flex-shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy"
            className="flex items-center justify-center p-0.5 rounded bg-transparent border-none cursor-pointer text-text-secondary hover:text-text-primary"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
            ) : (
              <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>
      <div style={{ height }}>
        <CodeBlock
          code={value}
          language={language}
          className="!min-h-0"
          editorOptions={EDITOR_OPTIONS}
          onEditorMounted={handleMounted}
        />
      </div>
    </div>
  );
}