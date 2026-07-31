import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { extensionService } from '../../../../../../../services/ExtensionService';
import FileIcon from '@renderer/components/common/FileIcon';
import { CodeBlock } from '@renderer/components/common/CodeBlock';
import { $ } from '@renderer/utils/color';

const ABSOLUTE_PATH_REGEX = /^(\/[^\s<>"'`]+|[A-Za-z]:\\[^\s<>"'`]+)/;
const RELATIVE_PATH_WITH_FOLDERS_REGEX = /^[^\s<>"'`|*?:]+[/\\][^\s<>"'`|*?:]+\.[a-zA-Z0-9]{1,10}$/;
const FILENAME_REGEX = /^[^\s/\\<>"'`]+\.[a-zA-Z0-9]{1,10}$/;
const isLikelyFolder = (token: string): boolean => {
  if (token.endsWith('/') || token.endsWith('\\')) return true;
  if (ABSOLUTE_PATH_REGEX.test(token)) {
    const lastSegment =
      token
        .replace(/[/\\]$/, '')
        .split(/[/\\]/)
        .pop() || '';
    return !lastSegment.includes('.');
  }
  return false;
};

interface PathChipProps {
  displayText: string;
  resolvedPath: string;
}

const PathChip: React.FC<PathChipProps> = ({ displayText, resolvedPath }) => {
  const isFolder = isLikelyFolder(resolvedPath);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFolder) {
      extensionService.postMessage({
        command: 'openFolder',
        path: resolvedPath,
      });
    } else {
      extensionService.postMessage({ command: 'openFile', path: resolvedPath });
    }
  };

  return (
    <span
      onClick={handleClick}
      title={isFolder ? `Open folder: ${resolvedPath}` : `Open file: ${resolvedPath}`}
      className="inline-flex items-center gap-[3px] px-1 py-px rounded-[3px] text-text-primary text-sm hover:opacity-75 transition-opacity"
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.75')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
    >
      <FileIcon
        path={resolvedPath}
        isFolder={isFolder}
        style={{ width: '12px', height: '12px', flexShrink: 0 }}
      />
      {displayText}
    </span>
  );
};

type ReactChild = React.ReactNode;

// Helper to extract filename from path
const getFilename = (path: string): string => {
  return path.split(/[/\\]/).pop() || path;
};

// Helper to shorten path for display: folder/.../file
const shortenPath = (fullPath: string, maxLength: number = 50): string => {
  if (fullPath.length <= maxLength) {
    return fullPath;
  }

  const parts = fullPath.split(/[/\\]/);
  if (parts.length <= 2) {
    return fullPath;
  }

  const filename = parts[parts.length - 1];
  const firstFolder = parts[0];

  // Calculate remaining space for middle part
  const fixedLength = firstFolder.length + filename.length + 5; // +5 for "/../"

  if (fixedLength >= maxLength) {
    // If first folder + file is already too long, just show folder/../file
    return `${firstFolder}/../${filename}`;
  }

  // Try to fit as many middle folders as possible
  let result = `${firstFolder}`;
  let remainingParts = parts.slice(1, -1);

  // Check if we can fit all middle parts
  const fullMiddle = remainingParts.join('/');
  if (result.length + fullMiddle.length + filename.length + 2 <= maxLength) {
    return fullPath;
  }

  // Otherwise, abbreviate
  return `${firstFolder}/../${filename}`;
};

// Helper to check if text looks like a file path
const isFilePath = (text: string): boolean => {
  // Check for path patterns: contains / or \, and has file extension
  return (text.includes('/') || text.includes('\\')) && /\.[a-zA-Z0-9]{1,10}$/.test(text);
};

const domNodeToReact = (
  node: Node,
  key: string | number,
  knownFilePaths: Map<string, string>,
): ReactChild => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  // Handle <pre><code> blocks → use CodeBlock component for syntax highlighting
  if (tag === 'pre') {
    const codeEl = el.querySelector('code');
    if (codeEl) {
      const codeText = codeEl.textContent || '';
      const className = codeEl.className || '';
      const languageMatch = className.match(/language-(\w+)/);
      const language = languageMatch ? languageMatch[1] : 'text';
      return <CodeBlock key={key} code={codeText} language={language} />;
    }
  }

  // Inline <code> → path detection
  if (tag === 'code' && !el.closest('pre')) {
    const text = el.textContent?.trim() || '';

    if (text.length >= 2) {
      // Case 1: absolute path → always a PathChip
      if (ABSOLUTE_PATH_REGEX.test(text)) {
        return <PathChip key={key} displayText={text} resolvedPath={text} />;
      }

      // Case 2: relative path containing folders → always a PathChip
      if (RELATIVE_PATH_WITH_FOLDERS_REGEX.test(text)) {
        return <PathChip key={key} displayText={text} resolvedPath={text} />;
      }

      // Case 3: basename-only with extension → only PathChip if found in history
      if (FILENAME_REGEX.test(text)) {
        const resolvedPath = knownFilePaths.get(text);
        if (resolvedPath) {
          return <PathChip key={key} displayText={text} resolvedPath={resolvedPath} />;
        }
        // Not found in history → render as plain <code>
      }
    }
  }

  // Handle table cells with file paths
  if (tag === 'td') {
    const text = el.textContent?.trim() || '';

    // Check if this cell contains a file path
    if (isFilePath(text)) {
      const filename = getFilename(text);
      const shortenedPath = shortenPath(text);

      // Strip common prefixes that might be in the full path
      let cleanPath = text;
      const prefixesToStrip = ['src/renderer/src/', 'src/renderer/', 'src/'];

      for (const prefix of prefixesToStrip) {
        if (cleanPath.startsWith(prefix)) {
          cleanPath = cleanPath.substring(prefix.length);
          break;
        }
      }

      // Also handle paths starting with components/, features/, etc
      // These should be relative to src/renderer/src
      if (
        cleanPath.startsWith('components/') ||
        cleanPath.startsWith('features/') ||
        cleanPath.startsWith('pages/') ||
        cleanPath.startsWith('utils/')
      ) {
        cleanPath = `src/renderer/src/${cleanPath}`;
      }

      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        extensionService.postMessage({
          command: 'openFile',
          path: text,
        });
      };

      return (
        <td key={key} data-file-path="true">
          <span
            onClick={handleClick}
            className="inline-flex items-center gap-1 cursor-pointer hover:opacity-75 transition-opacity"
            title={`Click to open: ${text}`}
          >
            <FileIcon
              path={text}
              isFolder={false}
              style={{ width: '12px', height: '12px', flexShrink: 0 }}
            />
            <span className="whitespace-normal break-words">
              {filename}
              <span className="opacity-60 text-[0.9em] ml-1">({shortenedPath})</span>
            </span>
          </span>
        </td>
      );
    }
  }

  // <code> inside <pre> → already handled by CodeBlock above
  // This fallback handles cases where <code> is inside <pre> but CodeBlock wasn't rendered
  if (tag === 'code' && el.closest('pre')) {
    const children: ReactChild[] = Array.from(el.childNodes).map((child, i) =>
      domNodeToReact(child, `${key}-${i}`, knownFilePaths),
    );
    return (
      <code key={key} className="bg-transparent p-0">
        {children}
      </code>
    );
  }

  // Recursively convert children
  const children: ReactChild[] = Array.from(el.childNodes).map((child, i) =>
    domNodeToReact(child, `${key}-${i}`, knownFilePaths),
  );

  // Build props, copying relevant HTML attributes
  const props: any = { key };
  if (el.hasAttribute('href')) {
    props.href = el.getAttribute('href');
    props.target = '_blank';
    props.rel = 'noopener noreferrer';
  }
  if (el.hasAttribute('src')) props.src = el.getAttribute('src');
  if (el.hasAttribute('alt')) props.alt = el.getAttribute('alt');
  if (el.hasAttribute('class')) props.className = el.getAttribute('class');

  return React.createElement(tag, props, ...children);
};

// ─────────────────────────────────────────────────────────────────────────────

export interface MarkdownBlockProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
  knownFilePaths?: Map<string, string>;
}

const MarkdownBlock: React.FC<MarkdownBlockProps> = React.memo(
  ({ content, className, style, knownFilePaths }) => {
    const resolvedMap = knownFilePaths || new Map<string, string>();

    const reactNodes = React.useMemo(() => {
      // 1. Render markdown → sanitized HTML
      // Strict DOMPurify config: strip event handlers and dangerous protocols
      const rawHtml = marked.parse(content) as string;
      const sanitized = DOMPurify.sanitize(rawHtml, {
        USE_PROFILES: { html: true },
        FORBID_ATTR: [
          'onerror',
          'onload',
          'onclick',
          'onmouseover',
          'onfocus',
          'onblur',
          'onchange',
          'onsubmit',
        ],
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
        ALLOW_DATA_ATTR: false,
      });

      // 2. Parse into DOM
      const wrapper = document.createElement('div');
      wrapper.innerHTML = sanitized;

      // 3. Walk DOM → React tree with path substitution
      return Array.from(wrapper.childNodes).map((child, i) =>
        domNodeToReact(child, i, resolvedMap),
      );
    }, [content, resolvedMap.size]);

    return (
      <>
        <div className={`markdown-content-inline ${className || ''}`} style={style}>
          {reactNodes}
        </div>
        <style>{`
          .markdown-content-inline {
            line-height: 1.6;
            font-size: ${$('--font-size-sm') || '13px'};
            color: ${$('--primary-text')};
          }
          .markdown-content-inline h1,
          .markdown-content-inline h2,
          .markdown-content-inline h3 {
            margin-top: 12px;
            margin-bottom: 8px;
            font-weight: 600;
            color: ${$('--primary-text')};
          }
          .markdown-content-inline h1 { font-size: 1.25em; }
          .markdown-content-inline h2 { font-size: 1.1em; }
          .markdown-content-inline h3 { font-size: 1.05em; }
          .markdown-content-inline p { margin-bottom: 8px; }
          .markdown-content-inline ul,
          .markdown-content-inline ol {
            margin-bottom: 8px;
            padding-left: 20px;
          }
          .markdown-content-inline ul { list-style-type: disc !important; }
          .markdown-content-inline ul ul {
            list-style-type: circle !important;
            margin-top: 4px;
            margin-bottom: 4px;
          }
          .markdown-content-inline ul ul ul {
            list-style-type: square !important;
          }
          .markdown-content-inline ol { list-style-type: decimal !important; }
          .markdown-content-inline ol ol {
            list-style-type: lower-alpha !important;
            margin-top: 4px;
            margin-bottom: 4px;
          }
          .markdown-content-inline li {
            margin-bottom: 4px;
            display: list-item !important;
          }
          .markdown-content-inline li > ul,
          .markdown-content-inline li > ol {
            margin-top: 4px;
            margin-bottom: 4px;
          }
          .markdown-content-inline table {
            border-collapse: collapse;
            width: 100%;
            margin: 12px 0;
            font-size: 0.9em;
          }
          .markdown-content-inline th,
          .markdown-content-inline td {
            border: 1px solid ${$('--border')};
            padding: 6px 10px;
            text-align: left;
          }
          .markdown-content-inline th {
            background-color: ${$('--table-header-background')};
            font-weight: 600;
          }
          .markdown-content-inline :not(pre) > code {
            background-color: ${$('--table-header-background')};
            padding: 2px 4px;
            border-radius: 4px;
            font-family: ${$('--font-family') || 'monospace'};
            font-size: 0.9em;
          }
          .markdown-content-inline pre > code {
            background: none !important;
            padding: 0;
          }
          .markdown-content-inline pre {
            background-color: ${$('--background') || '#1e1e1e'};
            border-radius: 4px;
            padding: 10px 12px;
            overflow-x: auto;
            margin: 8px 0;
            font-family: ${$('--font-family') || 'monospace'};
            font-size: 0.9em;
            line-height: 1.5;
          }
          .markdown-content-inline a {
            color: ${$('--primary')};
            text-decoration: none;
          }
          .markdown-content-inline a:hover {
            text-decoration: underline;
          }
          .markdown-content-inline blockquote {
            border-left: 4px solid ${$('--border')};
            padding-left: 12px;
            color: ${$('--secondary-text')};
            margin: 12px 0;
          }
        `}</style>
      </>
    );
  },
  (prev, next) => {
    // Custom comparison: skip re-render if content unchanged and map size unchanged
    return (
      prev.content === next.content &&
      prev.className === next.className &&
      (prev.knownFilePaths?.size ?? 0) === (next.knownFilePaths?.size ?? 0)
    );
  },
);

export default MarkdownBlock;
