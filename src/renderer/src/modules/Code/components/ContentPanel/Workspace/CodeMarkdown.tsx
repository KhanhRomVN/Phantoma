import { useState, useRef } from 'react';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Eye,
  Code,
  WrapText,
  FileDown,
} from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';

interface CodeMarkdownProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

type ViewMode = 'source' | 'rich';

export const CodeMarkdown = ({ 
  initialContent = '', 
  onContentChange 
}: CodeMarkdownProps) => {
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<ViewMode>('rich');
  const [wordWrap, setWordWrap] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onContentChange?.(newContent);
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    handleContentChange(newText);
    
    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertAtLine = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const newText = content.substring(0, lineStart) + prefix + content.substring(lineStart);
    
    handleContentChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const handleExportPDF = async () => {
    if (window.api?.invoke) {
      try {
        await window.api.invoke('markdown:export-pdf', {
          content,
          filename: 'document.pdf',
        });
      } catch (err) {
        console.error('[CodeMarkdown] Failed to export PDF:', err);
      }
    }
  };

  const toolbarButtons = [
    { 
      icon: <Type className="w-4 h-4" />, 
      label: 'Body Text',
      action: () => insertAtLine(''),
    },
    { 
      icon: <Heading1 className="w-4 h-4" />, 
      label: 'Heading 1',
      action: () => insertAtLine('# '),
    },
    { 
      icon: <Heading2 className="w-4 h-4" />, 
      label: 'Heading 2',
      action: () => insertAtLine('## '),
    },
    { 
      icon: <Heading3 className="w-4 h-4" />, 
      label: 'Heading 3',
      action: () => insertAtLine('### '),
    },
    { 
      icon: <Heading4 className="w-4 h-4" />, 
      label: 'Heading 4',
      action: () => insertAtLine('#### '),
    },
    { 
      icon: <Heading5 className="w-4 h-4" />, 
      label: 'Heading 5',
      action: () => insertAtLine('##### '),
    },
    'separator',
    { 
      icon: <Bold className="w-4 h-4" />, 
      label: 'Bold',
      action: () => insertMarkdown('**', '**'),
    },
    { 
      icon: <Italic className="w-4 h-4" />, 
      label: 'Italic',
      action: () => insertMarkdown('*', '*'),
    },
    { 
      icon: <Strikethrough className="w-4 h-4" />, 
      label: 'Strikethrough',
      action: () => insertMarkdown('~~', '~~'),
    },
    'separator',
    { 
      icon: <List className="w-4 h-4" />, 
      label: 'Bullet List',
      action: () => insertAtLine('- '),
    },
    { 
      icon: <ListOrdered className="w-4 h-4" />, 
      label: 'Numbered List',
      action: () => insertAtLine('1. '),
    },
    { 
      icon: <CheckSquare className="w-4 h-4" />, 
      label: 'Checklist',
      action: () => insertAtLine('- [ ] '),
    },
    'separator',
    { 
      icon: <Quote className="w-4 h-4" />, 
      label: 'Quote',
      action: () => insertAtLine('> '),
    },
    { 
      icon: <LinkIcon className="w-4 h-4" />, 
      label: 'Link',
      action: () => insertMarkdown('[', '](url)'),
    },
    { 
      icon: <ImageIcon className="w-4 h-4" />, 
      label: 'Image',
      action: () => insertMarkdown('![alt](', ')'),
    },
  ] as const;

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Toolbar */}
      <div className="h-10 shrink-0 flex items-center gap-1 px-2 bg-sidebar-background border-b border-divider overflow-x-auto">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-0.5 mr-2 border-r border-divider pr-2">
          <button
            onClick={() => setViewMode('rich')}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors',
              viewMode === 'rich' 
                ? 'bg-primary/20 text-primary' 
                : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.05]'
            )}
          >
            Rich
          </button>
          <button
            onClick={() => setViewMode('source')}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors flex items-center gap-1',
              viewMode === 'source' 
                ? 'bg-primary/20 text-primary' 
                : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.05]'
            )}
          >
            <Code className="w-3 h-3" />
            Source
          </button>
        </div>

        {/* Formatting Tools - Only show in Rich mode */}
        {viewMode === 'rich' && (
          <>
            {toolbarButtons.map((btn, idx) => {
              if (btn === 'separator') {
                return <div key={`sep-${idx}`} className="w-px h-6 bg-divider mx-1" />;
              }
              
              return (
                <button
                  key={idx}
                  onClick={btn.action}
                  className="p-1.5 rounded hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors"
                  title={btn.label}
                  aria-label={btn.label}
                >
                  {btn.icon}
                </button>
              );
            })}
          </>
        )}

        {/* Right Side Tools */}
        <div className="ml-auto flex items-center gap-1 border-l border-divider pl-2">
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={cn(
              'p-1.5 rounded transition-colors',
              wordWrap 
                ? 'bg-primary/20 text-primary' 
                : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.05]'
            )}
            title="Toggle Word Wrap"
            aria-label="Toggle Word Wrap"
          >
            <WrapText className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleExportPDF}
            className="p-1.5 rounded hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors"
            title="Export as PDF"
            aria-label="Export as PDF"
          >
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'source' ? (
          // Source View
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="# Start writing markdown..."
            className={cn(
              "w-full h-full bg-transparent border-none resize-none p-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none font-mono leading-relaxed",
              wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
            )}
            spellCheck={false}
          />
        ) : (
          // Rich Editor View (with textarea for now, can be enhanced with a rich text library)
          <div className="w-full h-full flex">
            {/* Edit Pane */}
            <div className="flex-1 border-r border-divider">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="# Start writing markdown..."
                className={cn(
                  "w-full h-full bg-transparent border-none resize-none p-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none font-mono leading-relaxed",
                  wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
                )}
                spellCheck={false}
              />
            </div>
            
            {/* Preview Pane */}
            <div className="flex-1 overflow-auto p-4">
              <div 
                className="prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: renderMarkdownPreview(content) 
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple markdown to HTML renderer (can be replaced with a proper markdown library like marked or remark)
function renderMarkdownPreview(markdown: string): string {
  let html = markdown;
  
  // Headers
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  
  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Images
  html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" />');
  
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // Checkboxes
  html = html.replace(/- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled /> $1</li>');
  html = html.replace(/- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled /> $1</li>');
  
  // Paragraphs
  html = html.replace(/^(?!<[hbluo]|<\/[hbluo])(.+)$/gm, '<p>$1</p>');
  
  return html;
}

export default CodeMarkdown;
