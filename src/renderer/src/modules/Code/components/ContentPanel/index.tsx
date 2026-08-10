import { useState, useEffect, memo } from 'react';
import {
  FileWarning,
  ExternalLink,
  Music,
  Globe,
  Smartphone,
  Monitor,
  Database,
  Plug,
  Palette,
  Table,
  Puzzle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCodeStore, type FileNode } from '../../hooks/useCodeStore';
import { fileWatcherService } from '../../services/file-watcher.service';
import { FileTabBar } from '../FileTabBar';
import CodeBlock from '@renderer/components/common/CodeBlock';

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

export const ContentPanel = memo(function ContentPanel() {
  // 🚀 ULTRA-OPTIMIZED: Chỉ subscribe vào những fields thực sự cần thiết
  const currentProjectId = useCodeStore((s) => s.currentProjectId);

  const currentServiceId = useCodeStore((s) => {
    const project = s.projects.find((p) => p.id === currentProjectId);
    return project?.currentServiceId ?? null;
  });

  const activeFileTabId = useCodeStore((s) => {
    const project = s.projects.find((p) => p.id === currentProjectId);
    return project?.activeFileTabId ?? null;
  });

  const openFiles = useCodeStore((s) => {
    const project = s.projects.find((p) => p.id === currentProjectId);
    return project?.openFiles ?? [];
  });

  const projectPath = useCodeStore((s) => {
    const project = s.projects.find((p) => p.id === currentProjectId);
    return project?.path;
  });

  const unsavedFiles = useCodeStore((s) => {
    const project = s.projects.find((p) => p.id === currentProjectId);
    return project?.unsavedFiles ?? new Set<string>();
  });

  // Lookup helpers
  const getDisplayName = (fileId: string) => {
    const project = useCodeStore.getState().projects.find((p) => p.id === currentProjectId);
    return project?.fileDisplayNames[fileId] || fileId;
  };

  const getFileNode = (fileId: string): FileNode | null => {
    const project = useCodeStore.getState().projects.find((p) => p.id === currentProjectId);
    if (!project) return null;
    return findFileById(project.files, fileId) || project.fileNodeMap[fileId] || null;
  };

  const getService = (serviceId: string | null) => {
    if (!serviceId) return null;
    const project = useCodeStore.getState().projects.find((p) => p.id === currentProjectId);
    return project?.services.find((s) => s.id === serviceId);
  };

  // Cache nội dung cho tất cả file trong openFiles (không chỉ file active)
  const [loadedContents, setLoadedContents] = useState<Record<string, string>>({});
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const [fileMtimes, setFileMtimes] = useState<Record<string, number>>({});

  // Determine what to show: service takes priority if selected, then files
  const showService = currentServiceId !== null;
  const showFile = !showService && openFiles.length > 0;

  // Log active tab changes
  useEffect(() => {
    if (showFile && activeFileTabId) {
      const displayName = getDisplayName(activeFileTabId);
    }
  }, [activeFileTabId, showFile]);

  // Khi switch tab, kiểm tra mtime và reload nếu file bị thay đổi bên ngoài
  useEffect(() => {
    if (!showFile || !activeFileTabId) return;

    const fileNode = getFileNode(activeFileTabId);
    if (!fileNode?.path) return;

    const category = getFileCategory(fileNode.name);
    if (category !== 'text') return;

    const filePath = fileNode.path;
    const fileId = activeFileTabId;
    const fileName = fileNode.name;

    window.api
      .invoke('fs:stat', filePath)
      .then((stat: { mtime: number }) => {
        const cachedMtime = fileMtimes[fileId];
        if (
          cachedMtime !== undefined &&
          cachedMtime === stat.mtime &&
          loadedContents[fileId] !== undefined
        ) {
          return;
        }

        const doRead = (attempt: number) => {
          window.api
            .invoke('fs:read-file', filePath)
            .then((content: string) => {
              if (content.length === 0 && attempt < 2) {
                setTimeout(() => doRead(attempt + 1), 300);
                return;
              }
              setLoadedContents((prev) => ({ ...prev, [fileId]: content || '' }));
              setFileMtimes((prev) => ({ ...prev, [fileId]: stat.mtime }));
            })
            .catch((err: any) => {
              console.error(`[ContentPanel] ❌ Load failed: ${fileName}`, err);
              setLoadedContents((prev) => ({ ...prev, [fileId]: '' }));
            });
        };
        doRead(1);
      })
      .catch((err: any) => {
        console.warn(`[ContentPanel] ⚠️  fs:stat failed for ${fileName}:`, err);
      });
  }, [activeFileTabId, showFile]);

  // ⚠️ DEPRECATED: File watcher moved to fileWatcherService
  // File watcher now runs independently of component lifecycle
  // See: src/renderer/src/modules/Code/services/file-watcher.service.ts
  //
  // Event-driven watcher: lắng nghe fs:file-changed từ main process
  // (chokidar watch file active, độ trễ ~50-100ms thay vì polling 2000ms)
  // useEffect(() => {
  //   ... (commented out - file watcher now handled by service)
  // }, [activeFileTabId, showFile]);

  // NEW: Listen to file changes from fileWatcherService
  // This updates loadedContents when files change externally
  useEffect(() => {
    const unsubscribe = fileWatcherService.onFileChange((event) => {
      const { filePath, content, mtime } = event;

      // Find fileId for this filePath
      const state = useCodeStore.getState();
      const project = state.projects.find((p) => p.id === currentProjectId);
      if (!project) return;

      let targetFileId: string | null = null;
      for (const fid of project.openFiles) {
        const node = project.fileNodeMap[fid];
        if (node && node.path === filePath) {
          targetFileId = fid;
          break;
        }
      }

      if (!targetFileId) return;

      // Update loadedContents
      setLoadedContents((prev) => ({
        ...prev,
        [targetFileId]: content,
      }));

      // Update mtime
      setFileMtimes((prev) => ({
        ...prev,
        [targetFileId]: mtime,
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [currentProjectId]);

  // Load nội dung cho tất cả file text trong openFiles
  useEffect(() => {
    if (!showFile || openFiles.length === 0) return;
    openFiles.forEach((fileId) => {
      const fileNode = getFileNode(fileId);
      if (!fileNode) {
        console.warn(`[ContentPanel] ⚠️ File node not found for ${fileId}`);
        return;
      }

      const category = getFileCategory(fileNode.name);
      if (category !== 'text') {
        return;
      }

      // Đã có trong cache
      if (loadedContents[fileId] !== undefined) {
        return;
      }

      // Đang load
      if (loadingFiles.has(fileId)) {
        return;
      }

      if (fileNode.content != null && unsavedFiles.has(fileId)) {
        setLoadedContents((prev) => ({ ...prev, [fileId]: fileNode.content ?? '' }));
        // Lấy mtime từ disk nếu có path
        if (fileNode.path) {
          window.api
            .invoke('fs:stat', fileNode.path)
            .then((stat: { mtime: number }) => {
              setFileMtimes((prev) => ({ ...prev, [fileId]: stat.mtime }));
            })
            .catch(() => {});
        }
        return;
      }

      if (fileNode.path) {
        setLoadingFiles((prev) => new Set(prev).add(fileId));
        window.api
          .invoke('fs:read-file', fileNode.path)
          .then((content: string) => {
            setLoadedContents((prev) => ({ ...prev, [fileId]: content || '' }));
            setLoadingFiles((prev) => {
              const next = new Set(prev);
              next.delete(fileId);
              return next;
            });
            // Lưu mtime sau khi load thành công
            return window.api.invoke('fs:stat', fileNode.path);
          })
          .then((stat: { mtime: number }) => {
            if (stat) setFileMtimes((prev) => ({ ...prev, [fileId]: stat.mtime }));
          })
          .catch((err: any) => {
            console.error(`[ContentPanel] ❌ Failed: ${fileNode.path}`, err);
            setLoadedContents((prev) => ({ ...prev, [fileId]: '' }));
            setLoadingFiles((prev) => {
              const next = new Set(prev);
              next.delete(fileId);
              return next;
            });
          });
      } else {
        console.warn(`[ContentPanel] ⚠️ No path/content: ${fileNode.name}`);
        setLoadedContents((prev) => ({ ...prev, [fileId]: '' }));
      }
    });
  }, [showFile, openFiles]);

  // ── Service selected ────────────────────────────────────────────────────
  if (showService && currentServiceId) {
    const service = getService(currentServiceId);
    if (!service) return null;

    // Check if it's an extension service
    if (service.type === 'extension') {
      // Use stored extensionId if available
      const extensionId =
        service.extensionId ||
        (() => {
          // Fallback: extract from service ID
          const withoutPrefix = service.id.replace('ext_', '');
          const lastUnderscoreIndex = withoutPrefix.lastIndexOf('_');

          if (lastUnderscoreIndex !== -1) {
            const namespace = withoutPrefix.substring(0, lastUnderscoreIndex);
            const name = withoutPrefix.substring(lastUnderscoreIndex + 1);
            return `${namespace}.${name}`;
          }
          return withoutPrefix.replace(/_/g, '.');
        })();

      return <div className="flex-1 flex flex-col min-h-0 bg-background"></div>;
    }

    // Regular service (non-extension)
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="flex-1 flex items-center justify-center text-text-secondary/60">
          <div className="text-center">
            <div className="text-4xl mb-3">{TYPE_ICONS[service.type] || '📄'}</div>
            <div className="text-sm font-medium text-text-primary">{service.name}</div>
            <div className="text-xs text-text-secondary/40 mt-1">Service content area</div>
            <div className="text-xs text-text-secondary/30 mt-2">Status: {service.status}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Open files ─────────────────────────────────────────────────────────
  // Render CodeBlock cho TẤT CẢ file trong openFiles, ẩn/hiện bằng CSS
  // để mỗi CodeBlock tự gửi didOpen khi mount → LSP phân tích mọi file trong tab bar
  if (showFile && openFiles.length > 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <FileTabBar />
        <div className="flex-1 overflow-hidden">
          {openFiles.map((fileId) => {
            const fileNode = getFileNode(fileId);
            const isActive = fileId === activeFileTabId;
            const displayName = getDisplayName(fileId);
            const category = fileNode ? getFileCategory(fileNode.name) : 'text';
            const filePath = fileNode?.path || '';
            const content = loadedContents[fileId];
            const isLoading = loadingFiles.has(fileId) || content === undefined;

            return (
              <div
                key={fileId}
                style={{
                  display: isActive ? 'flex' : 'none',
                  flex: 1,
                  flexDirection: 'column',
                  minHeight: 0,
                  height: '100%',
                }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center h-full text-text-secondary/40 text-sm">
                    Loading...
                  </div>
                ) : (
                  <>
                    {category === 'text' && (
                      <CodeBlock
                        code={content || ''}
                        language={fileNode ? getLanguage(fileNode.name) : 'plaintext'}
                        filePath={fileNode?.path || undefined}
                        fileId={fileId || undefined}
                        projectRoot={projectPath || undefined}
                        showLineNumbers={true}
                        wordWrap="off"
                        enableLSP={true}
                      />
                    )}
                    {category === 'image' && <ImagePreview path={filePath} name={displayName} />}
                    {category === 'pdf' && <PDFPreview path={filePath} />}
                    {category === 'video' && <VideoPreview path={filePath} />}
                    {category === 'audio' && <AudioPreview path={filePath} name={displayName} />}
                    {category === 'binary' && <BinaryPreview name={displayName} path={filePath} />}
                  </>
                )}
              </div>
            );
          })}
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
});

ContentPanel.displayName = 'ContentPanel';

const TYPE_ICONS: Record<string, ReactNode> = {
  website: <Globe className="w-3.5 h-3.5" />,
  app: <Smartphone className="w-3.5 h-3.5" />,
  device: <Monitor className="w-3.5 h-3.5" />,
  database: <Database className="w-3.5 h-3.5" />,
  api: <Plug className="w-3.5 h-3.5" />,
  design: <Palette className="w-3.5 h-3.5" />,
  table: <Table className="w-3.5 h-3.5" />,
  extension: <Puzzle className="w-3.5 h-3.5" />,
};
