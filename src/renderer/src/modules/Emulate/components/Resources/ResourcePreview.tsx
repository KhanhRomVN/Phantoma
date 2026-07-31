import { useState } from 'react';
import { Download, Cpu, FolderOpen, File } from 'lucide-react';
import { CodeBlock } from '@renderer/components/common/CodeBlock';
import { ResourceItem } from './types';

// Simple hex viewer for binary files like WASM
function HexView({ data, filename }: { data: string; filename: string }) {
  const [showHex, setShowHex] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert base64 to bytes
  let bytes: Uint8Array;
  try {
    // Check if data is empty
    if (!data || data.trim() === '') {
      setError('No data available');
      bytes = new Uint8Array(0);
    } else {
      const binary = atob(data);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
    }
  } catch (e) {
    // If base64 decoding fails, try treating as raw text
    try {
      // Try to interpret as UTF-8 text
      const encoder = new TextEncoder();
      bytes = encoder.encode(data);
    } catch {
      setError('Failed to decode binary data');
      bytes = new Uint8Array(0);
    }
  }

  if (error || bytes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-text-secondary">
        <Cpu className="w-8 h-8 opacity-30" />
        <p className="text-sm">{error || 'No data to display'}</p>
        <p className="text-xs opacity-60">File: {filename}</p>
      </div>
    );
  }

  const maxDisplay = Math.min(bytes.length, 4096);
  const truncated = bytes.length > 4096;
  const displayBytes = bytes.slice(0, maxDisplay);

  // Group into 16-byte lines
  const lines: { offset: number; hex: string; ascii: string }[] = [];
  for (let i = 0; i < displayBytes.length; i += 16) {
    const chunk = displayBytes.slice(i, i + 16);
    const hex = Array.from(chunk)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    const ascii = Array.from(chunk)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');
    lines.push({
      offset: i,
      hex: hex.padEnd(47, ' '),
      ascii,
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <button
          onClick={() => setShowHex(!showHex)}
          className="text-xs px-2 py-0.5 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          {showHex ? 'Show Text' : 'Show Hex'}
        </button>
        <span className="text-[10px] text-text-secondary">
          {bytes.length.toLocaleString()} bytes {truncated ? '(truncated)' : ''}
        </span>
      </div>
      {showHex ? (
        <div className="flex-1 overflow-auto font-mono text-[11px] bg-muted/10 rounded p-2">
          <div className="grid grid-cols-[60px,1fr,120px] gap-1 text-text-secondary border-b border-border pb-1 mb-1">
            <span>Offset</span>
            <span>Hex</span>
            <span>ASCII</span>
          </div>
          {lines.map((line) => (
            <div
              key={line.offset}
              className="grid grid-cols-[60px,1fr,120px] gap-1 hover:bg-muted/20"
            >
              <span className="text-text-secondary">
                0x{line.offset.toString(16).padStart(4, '0')}
              </span>
              <span className="text-text-primary">{line.hex}</span>
              <span className="text-text-secondary">{line.ascii}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-auto text-text-secondary text-xs">
          <p className="text-text-secondary">Binary file - {bytes.length.toLocaleString()} bytes</p>
          <p className="text-text-secondary mt-1">File: {filename}</p>
          <p className="text-text-secondary mt-1">Use hex view to inspect content</p>
        </div>
      )}
    </div>
  );
}

interface ResourcePreviewProps {
  item: ResourceItem | null;
}

export function ResourcePreview({ item }: ResourcePreviewProps) {
  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-secondary">
        <FolderOpen className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-sm">Select a resource to preview</p>
      </div>
    );
  }

  const isImage = item.type === 'image';
  const isVideo = item.type === 'video';
  const isWasm = item.type === 'wasm';
  const isText =
    item.type === 'document' ||
    item.contentType.includes('text') ||
    item.contentType.includes('json') ||
    item.contentType.includes('xml') ||
    item.filename.match(/\.(js|ts|jsx|tsx|css|html|json|xml|txt|md)$/i);

  const handleDownload = () => {
    if (!item.responseBody) return;
    try {
      const bytes = Uint8Array.from(atob(item.responseBody), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: item.contentType }));
      const a = Object.assign(document.createElement('a'), { href: url, download: item.filename });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download:', e);
    }
  };

  const getIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      image: <File className="w-10 h-10 text-blue-400" />,
      video: <File className="w-10 h-10 text-purple-400" />,
      audio: <File className="w-10 h-10 text-green-400" />,
      wasm: <Cpu className="w-10 h-10 text-purple-400" />,
      font: <File className="w-10 h-10 text-yellow-400" />,
      document: <File className="w-10 h-10 text-orange-400" />,
      other: <File className="w-10 h-10 text-text-secondary" />,
    };
    return iconMap[type] || iconMap.other;
  };

  const getLanguage = () => {
    const ext = item.filename.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'jsx',
      tsx: 'tsx',
      css: 'css',
      html: 'html',
      json: 'json',
      xml: 'xml',
      txt: 'text',
      md: 'markdown',
      py: 'python',
      go: 'go',
      rs: 'rust',
      c: 'c',
      cpp: 'cpp',
      java: 'java',
      php: 'php',
      rb: 'ruby',
      swift: 'swift',
      kt: 'kotlin',
    };
    return langMap[ext] || 'javascript';
  };

  // For text files, show CodeBlock
  if (isText && item.responseBody) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b border-border shrink-0 flex items-center justify-between bg-muted/5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-text-primary truncate">{item.filename}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-text-secondary">{item.size}</span>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded text-text-secondary hover:text-purple-400 hover:bg-purple-500/10 transition-all"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-muted/5">
          <CodeBlock
            code={item.responseBody}
            language={getLanguage()}
            className="h-full"
            showLineNumbers
            wordWrap="on"
          />
        </div>
      </div>
    );
  }

  // For WASM, show hex view with info
  if (isWasm) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b border-border shrink-0 flex items-center justify-between bg-muted/5">
          <div className="flex items-center gap-2 min-w-0">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-text-primary truncate">{item.filename}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-text-secondary">{item.size}</span>
            {item.responseBody && (
              <button
                onClick={handleDownload}
                className="p-1.5 rounded text-text-secondary hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-muted/5">
          {item.responseBody ? (
            <HexView data={item.responseBody} filename={item.filename} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-20 h-20 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
                <Cpu className="w-10 h-10 text-purple-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">{item.filename}</p>
                <p className="text-xs text-text-secondary mt-1">WebAssembly Module</p>
                <p className="text-xs text-text-secondary">{item.size}</p>
                <p className="text-xs text-text-secondary mt-2 break-all">{item.contentType}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Images
  if (isImage) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b border-border shrink-0 flex items-center justify-between bg-muted/5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-text-primary truncate">{item.filename}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-text-secondary">{item.size}</span>
            {item.responseBody && (
              <button
                onClick={handleDownload}
                className="p-1.5 rounded text-text-secondary hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-muted/5 flex items-center justify-center">
          <img
            src={item.url}
            alt={item.filename}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </div>
    );
  }

  // Videos
  if (isVideo) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b border-border shrink-0 flex items-center justify-between bg-muted/5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-text-primary truncate">{item.filename}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-text-secondary">{item.size}</span>
            {item.responseBody && (
              <button
                onClick={handleDownload}
                className="p-1.5 rounded text-text-secondary hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-muted/5 flex items-center justify-center">
          <video src={item.url} controls className="max-w-full max-h-full" />
        </div>
      </div>
    );
  }

  // Other files
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-border shrink-0 flex items-center justify-between bg-muted/5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-text-primary truncate">{item.filename}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-text-secondary">{item.size}</span>
          {item.responseBody && (
            <button
              onClick={handleDownload}
              className="p-1.5 rounded text-text-secondary hover:text-purple-400 hover:bg-purple-500/10 transition-all"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 bg-muted/5">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="w-20 h-20 rounded-2xl bg-muted/20 border border-border flex items-center justify-center">
            {getIcon(item.type)}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-text-primary">{item.filename}</p>
            <p className="text-xs text-text-secondary mt-1">{item.contentType}</p>
            <p className="text-xs text-text-secondary">{item.size}</p>
            {item.responseBody && (
              <button
                onClick={handleDownload}
                className="mt-4 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all text-sm font-medium"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Download File
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
