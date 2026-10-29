import React from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import yaml from 'highlight.js/lib/languages/yaml';
import sql from 'highlight.js/lib/languages/sql';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import { Modal, ModalBody } from '@renderer/components/ui/Modal';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';
import { X } from 'lucide-react';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);

// ─── hljs language mapping ─────────────────────────────────────────────
function getHljsLang(filePath: string): string | undefined {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    html: 'xml',
    htm: 'xml',
    svg: 'xml',
    xml: 'xml',
    css: 'css',
    scss: 'css',
    less: 'css',
    json: 'json',
    md: 'markdown',
    markdown: 'markdown',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    py: 'python',
    yaml: 'yaml',
    yml: 'yaml',
    sql: 'sql',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    c: 'cpp',
    h: 'cpp',
    hpp: 'cpp',
  };
  return map[ext];
}

// ─── Split highlighted HTML into per-line HTML, keeping spans balanced ─
function splitHtmlByLines(html: string): string[] {
  const lines: string[] = [];
  const openStack: { name: string }[] = [];
  let current = '';
  let i = 0;
  while (i < html.length) {
    const ch = html[i];
    if (ch === '<') {
      const end = html.indexOf('>', i);
      if (end === -1) {
        current += html.slice(i);
        break;
      }
      const tag = html.slice(i, end + 1);
      const nameMatch = tag.match(/^<\/?([a-zA-Z0-9-]+)/);
      const tagName = nameMatch ? nameMatch[1] : 'span';
      if (tag.startsWith('</')) {
        openStack.pop();
        current += tag;
      } else if (tag.endsWith('/>')) {
        current += tag;
      } else {
        openStack.push({ name: tagName });
        current += tag;
      }
      i = end + 1;
    } else if (ch === '\n') {
      for (let j = openStack.length - 1; j >= 0; j--) {
        current += `</${openStack[j].name}>`;
      }
      lines.push(current);
      current = openStack.map((t) => `<${t.name}>`).join('');
      i++;
    } else {
      current += ch;
      i++;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapeHtml(code: string): string {
  return code.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}

function highlightToLines(code: string, language?: string): string[] {
  let html: string;
  try {
    if (language && hljs.getLanguage(language)) {
      html = hljs.highlight(code, { language, ignoreIllegals: true }).value;
    } else {
      html = escapeHtml(code);
    }
  } catch {
    html = escapeHtml(code);
  }
  return splitHtmlByLines(html);
}

// ─── Inject highlight theme once ───────────────────────────────────────
const STYLE_ID = 'file-preview-modal-hljs-theme';
function ensureHighlightStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .fpm-code .hljs-keyword,
    .fpm-code .hljs-selector-tag,
    .fpm-code .hljs-literal { color: #c678dd; }
    .fpm-code .hljs-string,
    .fpm-code .hljs-attr,
    .fpm-code .hljs-template-variable { color: #98c379; }
    .fpm-code .hljs-number,
    .fpm-code .hljs-symbol,
    .fpm-code .hljs-bullet { color: #d19a66; }
    .fpm-code .hljs-comment,
    .fpm-code .hljs-quote { color: #7f848e; font-style: italic; }
    .fpm-code .hljs-function,
    .fpm-code .hljs-title,
    .fpm-code .hljs-section { color: #61afef; }
    .fpm-code .hljs-variable,
    .fpm-code .hljs-params,
    .fpm-code .hljs-tag { color: #e06c75; }
    .fpm-code .hljs-type,
    .fpm-code .hljs-built_in,
    .fpm-code .hljs-class .hljs-title { color: #e5c07b; }
    .fpm-code .hljs-meta,
    .fpm-code .hljs-name,
    .fpm-code .hljs-selector-id,
    .fpm-code .hljs-selector-class { color: #56b6c2; }
  `;
  document.head.appendChild(style);
}

// ─── Lightweight code view (highlighted, no Monaco) ────────────────────
type LineStatus = 'same' | 'add' | 'del';

function computeLineDiff(
  oldText: string,
  newText: string,
): { left: LineStatus[]; right: LineStatus[] } {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  const n = a.length;
  const m = b.length;
  const left: LineStatus[] = a.map(() => 'del');
  const right: LineStatus[] = b.map(() => 'add');
  if (n * m > 4_000_000) {
    return { left: a.map(() => 'same'), right: b.map(() => 'same') };
  }
  const w = m + 1;
  const dp = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] =
        a[i] === b[j]
          ? dp[(i + 1) * w + j + 1] + 1
          : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      left[i] = 'same';
      right[j] = 'same';
      i++;
      j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return { left, right };
}

const LightweightCodeView = React.memo(function LightweightCodeView({
  content,
  filePath,
  lineStatus,
}: {
  content: string;
  filePath?: string;
  lineStatus?: LineStatus[];
}) {
  ensureHighlightStyle();
  const language = filePath ? getHljsLang(filePath) : undefined;
  const lines = React.useMemo(() => highlightToLines(content, language), [content, language]);
  return (
    <div className="fpm-code flex-1 overflow-auto font-mono text-[13px] leading-[1.6] py-2">
      {lines.map((html, i) => (
        <div
          key={i}
          className={`flex min-w-full w-max ${
            lineStatus?.[i] === 'add'
              ? 'bg-success/20'
              : lineStatus?.[i] === 'del'
                ? 'bg-error/20'
                : ''
          }`}
        >
          <span className="w-14 shrink-0 text-right pr-3 text-text-secondary/40 select-none border-r border-divider/30 sticky left-0 bg-background">
            {i + 1}
          </span>
          <span
            className="pl-3 whitespace-pre"
            dangerouslySetInnerHTML={{ __html: html || ' ' }}
          />
        </div>
      ))}
    </div>
  );
});

const DEFAULT_NEW_LABEL = 'Nội dung mới';
const DEFAULT_OLD_LABEL = 'Nội dung cũ';

export type FilePreviewMode = 'content' | 'diff';

// Width cố định theo từng mode — content nhỏ gọn, diff rộng để đủ 2 cột.
const MODAL_WIDTH_CLASS: Record<FilePreviewMode, string> = {
  content: 'w-[60vw] max-w-[900px] h-[70vh]',
  diff: 'w-[54vw] max-w-[900px] h-[85vh]',
};

export interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Đường dẫn file — dùng cho tiêu đề, nhận diện ngôn ngữ, và đọc nội dung đang có trên đĩa */
  filePath: string;
  /** Nội dung sẽ được ghi bởi tool (vd: action.params.content / new_content) */
  newContent: string;
  /** Chế độ hiển thị: chỉ nội dung mới, hay so sánh 2 cột */
  mode: FilePreviewMode;
  /**
   * Nội dung cũ để so sánh (cột trái) khi mode='diff'.
   * Nếu bỏ trống → modal sẽ đọc nội dung hiện tại trên đĩa (nếu fetchOldContent=true).
   */
  oldContent?: string;
  /** Có đọc nội dung file hiện tại từ đĩa khi mode='diff' và không truyền oldContent (mặc định: bật) */
  fetchOldContent?: boolean;
  /** Nhãn cột phải */
  newContentLabel?: string;
  /** Nhãn cột trái (chỉ dùng khi mode='diff') */
  oldContentLabel?: string;
}

/**
 * FilePreviewModal — modal xem nội dung file hoặc diff 2 cột, dùng chung cho
 * các file renderer trong chat (write_to_file, replace_in_file...).
 *
 * Mode do caller quyết định (không có tab bar chuyển đổi trong modal).
 *
 * Lưu ý hiệu năng:
 * - Không dùng Monaco; render bằng text thuần + highlight.js core (bundle nhỏ).
 * - Không đọc file/không render gì cho tới khi modal mở.
 * - Cột trái ở mode='diff' chỉ đọc đĩa khi cần thiết (không truyền oldContent).
 * - State được reset khi đóng modal để tránh RAM/CPU tăng sau nhiều lần mở.
 */
export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  filePath,
  newContent,
  mode,
  oldContent,
  fetchOldContent = true,
  newContentLabel = DEFAULT_NEW_LABEL,
  oldContentLabel = DEFAULT_OLD_LABEL,
}) => {
  const [diskContent, setDiskContent] = React.useState<string | null>(null);
  const [loadingDisk, setLoadingDisk] = React.useState(false);

  // Reset state khi đóng modal — giải phóng string lớn + tránh trạng thái cũ
  React.useEffect(() => {
    if (!isOpen) {
      setDiskContent(null);
      setLoadingDisk(false);
    }
  }, [isOpen]);

  // Chỉ đọc nội dung file trên đĩa khi mode='diff' và không có oldContent truyền sẵn
  React.useEffect(() => {
    if (!isOpen || mode !== 'diff') return;
    if (oldContent !== undefined) return;
    if (!fetchOldContent || !filePath) return;

    let cancelled = false;
    setLoadingDisk(true);
    window.api
      .invoke('fs:read-file', filePath)
      .then((content: string) => {
        if (cancelled) return;
        setDiskContent(content ?? '');
        setLoadingDisk(false);
      })
      .catch(() => {
        if (cancelled) return;
        setDiskContent(null);
        setLoadingDisk(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, oldContent, fetchOldContent, filePath]);

  if (!isOpen) return null;

  const fileName = filePath.split('/').pop() || filePath;
  const leftContent = oldContent !== undefined ? oldContent : diskContent;
  const showLoadingLeft = oldContent === undefined && loadingDisk;
  const diffStatus =
    mode === 'diff' && !showLoadingLeft
      ? leftContent === null
        ? { left: [] as LineStatus[], right: newContent.split('\n').map((): LineStatus => 'add') }
        : computeLineDiff(leftContent, newContent)
      : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={MODAL_WIDTH_CLASS[mode]}>
      {/* Custom header cho file preview — có icon theo loại file */}
      <div className="px-5 py-3 border-b border-divider shrink-0 flex items-center gap-3">
        <img
          src={getFileIconPath(fileName)}
          alt=""
          style={{ width: '20px', height: '20px' }}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-text-primary truncate">{fileName}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-card-hover text-text-secondary outline-none hover:bg-error/15 hover:text-error transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ModalBody className="!p-0 flex flex-col min-h-0">
        {mode === 'content' ? (
          <LightweightCodeView content={newContent} filePath={filePath} />
        ) : (
          <div className="flex-1 grid grid-cols-2 min-h-0 divide-x divide-divider">
            <div className="flex flex-col min-h-0 overflow-hidden">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-text-secondary bg-card-background/50 border-b border-divider shrink-0">
                {oldContentLabel}
              </div>
              {showLoadingLeft ? (
                <div className="flex-1 flex items-center justify-center text-text-secondary/40 text-sm">
                  Đang tải...
                </div>
              ) : leftContent === null ? (
                <div className="flex-1 flex items-center justify-center text-text-secondary/40 text-xs italic px-3 text-center">
                  File chưa tồn tại trên đĩa
                </div>
              ) : (
                <LightweightCodeView
                  content={leftContent}
                  filePath={filePath}
                  lineStatus={diffStatus?.left}
                />
              )}
            </div>
            <div className="flex flex-col min-h-0 overflow-hidden">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-text-secondary bg-card-background/50 border-b border-divider shrink-0">
                {newContentLabel}
              </div>
              <LightweightCodeView
                content={newContent}
                filePath={filePath}
                lineStatus={diffStatus?.right}
              />
            </div>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

export default FilePreviewModal;