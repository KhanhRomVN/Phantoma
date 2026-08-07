import { useState, useEffect } from 'react';
import { FileWarning, ExternalLink, Music } from 'lucide-react';
import { useCodeStore, type FileNode } from '../../hooks/useCodeStore';
import { FileTabBar } from '../FileTabBar';
import { CodeBlock } from '@renderer/components/common/CodeBlock';

// ─── Helpers ────────────────────────────────────────────────────────────────

function findFileById(files: FileNode[], id: string): FileNode | null {
  for (const file of files) {
    if (file.id === id) return file;
    if (file.children) {
      const found = findFileById(file.children, id);
      if (found) return found;
    }
  }
  return null;
}

type FileCategory = 'text' | 'image' | 'pdf' | 'video' | 'audio' | 'binary';

function getFileCategory(filename: string): FileCategory {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'];
  const binaryExts = [
    'exe',
    'dll',
    'so',
    'dylib',
    'bin',
    'dat',
    'zip',
    'tar',
    'gz',
    'bz2',
    'xz',
    '7z',
    'rar',
    'docx',
    'xlsx',
    'pptx',
    'doc',
    'xls',
    'ppt',
    'wasm',
    'o',
    'obj',
    'lib',
    'a',
    'ttf',
    'otf',
    'woff',
    'woff2',
    'eot',
    'class',
    'pyc',
    'pyo',
  ];

  if (ext === 'pdf') return 'pdf';
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (binaryExts.includes(ext)) return 'binary';
  return 'text';
}

function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    json: 'json',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    md: 'markdown',
    mdx: 'markdown',
    py: 'python',
    rb: 'ruby',
    php: 'php',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    dart: 'dart',
    lua: 'lua',
    r: 'r',
    sql: 'sql',
    graphql: 'graphql',
    gql: 'graphql',
    xml: 'xml',
    svg: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'ini',
    ini: 'ini',
    cfg: 'ini',
    env: 'ini',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    fish: 'shell',
    ps1: 'powershell',
    bat: 'bat',
    cmd: 'bat',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    vue: 'html',
    svelte: 'html',
    astro: 'html',
    prisma: 'prisma',
  };
  return langMap[ext] || langMap[filename.toLowerCase()] || 'plaintext';
}

// ─── Preview Components ─────────────────────────────────────────────────────

function ImagePreview({ path, name }: { path: string; name: string }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#1a1b1e] p-4 overflow-auto">
      <img
        src={`file://${path}`}
        alt={name}
        className="max-w-full max-h-full object-contain rounded shadow-lg"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}

function PDFPreview({ path }: { path: string }) {
  return (
    <iframe src={`file://${path}`} className="flex-1 w-full border-none" title="PDF Preview" />
  );
}

function VideoPreview({ path }: { path: string }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#1a1b1e] p-4">
      <video src={`file://${path}`} controls className="max-w-full max-h-full rounded shadow-lg" />
    </div>
  );
}

function AudioPreview({ path, name }: { path: string; name: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#1a1b1e] gap-6 p-8">
      <Music className="w-16 h-16 text-text-secondary/30" strokeWidth={1} />
      <span className="text-sm text-text-secondary">{name}</span>
      <audio src={`file://${path}`} controls className="w-full max-w-md" />
    </div>
  );
}

function BinaryPreview({ name, path }: { name: string; path: string }) {
  const handleOpenExternal = async () => {
    try {
      await window.api.invoke('openFolder', { path });
    } catch (err) {
      console.error('[BinaryPreview] Failed to open:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text-secondary/40">
      <FileWarning className="w-12 h-12" strokeWidth={1} />
      <div className="text-center">
        <p className="text-sm text-text-secondary font-medium">{name}</p>
        <p className="text-xs text-text-secondary/40 mt-1">Cannot preview this file</p>
      </div>
      <button
        onClick={handleOpenExternal}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Open with default app
      </button>
    </div>
  );
}

// ─── ContentPanel ───────────────────────────────────────────────────────────

export function ContentPanel() {
  const projects = useCodeStore((s) => s.projects);
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const project = projects.find((p) => p.id === currentProjectId);

  const openFiles = project?.openFiles ?? [];
  const activeFileTabId = project?.activeFileTabId ?? null;
  const fileDisplayNames = project?.fileDisplayNames ?? {};
  const fileNodeMap = project?.fileNodeMap ?? {};
  const currentServiceId = project?.currentServiceId ?? null;
  const service = project?.services.find((s) => s.id === currentServiceId);

  const [loadedContent, setLoadedContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Resolve fileNode: tìm trong project.files trước, fallback vào fileNodeMap
  const resolveFileNode = (id: string): FileNode | null => {
    if (!project) return null;
    return findFileById(project.files, id) || fileNodeMap[id] || null;
  };

  useEffect(() => {
    if (!activeFileTabId || !project) {
      setLoadedContent(null);
      return;
    }

    const fileNode = resolveFileNode(activeFileTabId);
    if (!fileNode) {
      setLoadedContent(null);
      return;
    }

    // Only load content for text files
    const category = getFileCategory(fileNode.name);
    if (category !== 'text') {
      setLoadedContent(null);
      return;
    }

    if (fileNode.content != null && project.files.length > 0) {
      setLoadedContent(fileNode.content);
      return;
    }

    if (fileNode.path) {
      setLoading(true);
      window.api
        .invoke('fs:read-file', fileNode.path)
        .then((content: string) => {
          setLoadedContent(content || '');
          setLoading(false);
        })
        .catch((err: any) => {
          console.error('[ContentPanel] Failed to load file:', fileNode.path, err);
          setLoadedContent('');
          setLoading(false);
        });
    } else {
      setLoadedContent('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileTabId]); // ✅ Only depend on activeFileTabId - don't trigger on every state change

  // ── Active file ─────────────────────────────────────────────────────────
  if (activeFileTabId && openFiles.length > 0 && project) {
    const fileNode = resolveFileNode(activeFileTabId);
    const displayName = fileDisplayNames[activeFileTabId] || activeFileTabId;
    const category = fileNode ? getFileCategory(fileNode.name) : 'text';
    const filePath = fileNode?.path || '';

    const renderPreview = () => {
      if (loading) {
        return (
          <div className="flex items-center justify-center h-full text-text-secondary/40 text-sm">
            Loading...
          </div>
        );
      }

      switch (category) {
        case 'text':
          console.log('[ContentPanel] Rendering CodeBlock:', {
            codeLength: (loadedContent || '').length,
            filePath: fileNode?.path,
            fileId: activeFileTabId,
            loading,
          });
          return (
            <CodeBlock
              code={loadedContent || ''}
              language={fileNode ? getLanguage(fileNode.name) : 'plaintext'}
              filePath={fileNode?.path || undefined}
              fileId={activeFileTabId || undefined}
              projectRoot={project?.path || undefined}
              showLineNumbers
              wordWrap="off"
              enableLSP
            />
          );
        case 'image':
          return <ImagePreview path={filePath} name={displayName} />;
        case 'pdf':
          return <PDFPreview path={filePath} />;
        case 'video':
          return <VideoPreview path={filePath} />;
        case 'audio':
          return <AudioPreview path={filePath} name={displayName} />;
        case 'binary':
        default:
          return <BinaryPreview name={displayName} path={filePath} />;
      }
    };

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <FileTabBar />
        <div className="flex-1 overflow-hidden">{renderPreview()}</div>
      </div>
    );
  }

  // ── Service selected ────────────────────────────────────────────────────
  if (service) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-text-secondary/60">
        <div className="text-center">
          <div className="text-4xl mb-3">{TYPE_ICONS[service.type] || '📄'}</div>
          <div className="text-sm font-medium text-text-primary">{service.name}</div>
          <div className="text-xs text-text-secondary/40 mt-1">Service is ready</div>
          <div className="text-xs text-text-secondary/30 mt-2">Status: {service.status}</div>
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex items-center justify-center bg-background text-text-secondary/40">
      <div className="text-center">
        <div className="text-4xl mb-3">📂</div>
        <div className="text-sm">Select a service or open a file</div>
        <div className="text-xs text-text-secondary/30 mt-1">Browse files in Activity Panel</div>
      </div>
    </div>
  );
}

const TYPE_ICONS: Record<string, string> = {
  website: '🌐',
  app: '📱',
  device: '📲',
  database: '🗄️',
  api: '🔌',
  design: '🎨',
  table: '📊',
};
