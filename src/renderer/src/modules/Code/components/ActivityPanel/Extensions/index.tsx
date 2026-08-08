/**
 * Extensions Panel
 * 
 * Browse and install VS Code extensions from Open VSX Registry.
 * Integrates with @codingame/monaco-vscode-api extension host.
 */

import { useState, useEffect, useRef } from 'react';
import {
  Package,
  Download,
  Star,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  PackageCheck,
} from 'lucide-react';
import { openVSXService, type OpenVSXExtension } from '../../../services/open-vsx.service';
import { useCodeStore } from '../../../hooks/useCodeStore';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VSCodeExtension {
  id: string;
  namespace: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  publisher: string;
  icon?: string;
  categories: string[];
  downloads: number;
  rating: number;
  repository?: string;
  installed: boolean;
  enabled: boolean;
  downloadUrl?: string;
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function convertOpenVSXToExtension(openVSXExt: OpenVSXExtension): VSCodeExtension {
  const publisher = openVSXExt.publishedBy 
    ? (openVSXExt.publishedBy.fullName || openVSXExt.publishedBy.loginName)
    : openVSXExt.namespace;

  return {
    id: openVSXExt.namespace + '.' + openVSXExt.name,
    namespace: openVSXExt.namespace,
    name: openVSXExt.name,
    displayName: openVSXExt.displayName || openVSXExt.name,
    description: openVSXExt.description || '',
    version: openVSXExt.version || 'latest',
    publisher,
    icon: openVSXExt.files?.icon,
    categories: openVSXExt.categories || [],
    downloads: openVSXExt.downloadCount ?? openVSXExt.downloads ?? 0,
    rating: openVSXExt.averageRating || 0,
    repository: openVSXExt.repository,
    installed: false,
    enabled: false,
    downloadUrl: openVSXExt.files?.download,
  };
}

function createInstalledCard(extensionId: string): VSCodeExtension {
  const dotIndex = extensionId.lastIndexOf('.');
  const namespace = dotIndex > 0 ? extensionId.substring(0, dotIndex) : extensionId;
  const name = dotIndex > 0 ? extensionId.substring(dotIndex + 1) : extensionId;

  return {
    id: extensionId,
    namespace,
    name,
    displayName: name,
    description: 'Installed extension',
    version: '',
    publisher: namespace,
    icon: undefined,
    categories: [],
    downloads: 0,
    rating: 0,
    repository: undefined,
    installed: true,
    enabled: true,
    downloadUrl: undefined,
  };
}

// ─── Extensions Panel Component ────────────────────────────────────────────

export function ExtensionsPanel() {
  const [extensions, setExtensions] = useState<VSCodeExtension[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [installedSearchQuery, setInstalledSearchQuery] = useState('');
  const [showInstalledOnly, setShowInstalledOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input value in sync with current view's query
  const currentQuery = showInstalledOnly ? installedSearchQuery : searchQuery;

  useEffect(() => {
    loadPopularExtensions();
  }, []);

  const loadInstalledExtensions = async () => {
    setInitialLoading(true);
    setError(null);

    try {
      const result = await window.api.invoke('extensions:list');
      const installedIds: string[] = result?.extensions ?? [];
      const cards: VSCodeExtension[] = [];

      for (const installedId of installedIds) {
        try {
          const dotIndex = installedId.lastIndexOf('.');
          const ns = dotIndex > 0 ? installedId.substring(0, dotIndex) : installedId;
          const nm = dotIndex > 0 ? installedId.substring(dotIndex + 1) : installedId;
          const extDetail = await openVSXService.getExtension(ns, nm);
          const card = convertOpenVSXToExtension(extDetail);
          card.installed = true;
          card.enabled = true;
          cards.push(card);
        } catch {
          cards.push(createInstalledCard(installedId));
        }
      }

      setExtensions(cards);
    } catch (err) {
      console.error('[Extensions] Failed to load installed extensions:', err);
      setError('Failed to load installed extensions');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleToggleInstalled = () => {
    const newVal = !showInstalledOnly;
    setShowInstalledOnly(newVal);
    if (newVal) {
      loadInstalledExtensions();
    } else {
      loadPopularExtensions();
    }
  };

  const loadPopularExtensions = async () => {
    setInitialLoading(true);
    setError(null);

    try {
      console.log('[Extensions] Loading popular extensions from Open VSX...');
      const popularExtensions = await openVSXService.getPopular({ size: 50 });
      
      let converted = popularExtensions.map(convertOpenVSXToExtension);

      try {
        const result = await window.api.invoke('extensions:list');
        const installedIds: string[] = result?.extensions ?? [];
        const idSet = new Set(installedIds);
        converted = converted.map((ext) => {
          if (idSet.has(ext.id)) {
            return Object.assign({}, ext, { installed: true, enabled: true });
          }
          return ext;
        });
      } catch (err) {
        // ignore
      }

      setExtensions(converted);
      console.log('[Extensions] Loaded', converted.length, 'extensions');
    } catch (err) {
      console.error('[Extensions] Failed to load extensions:', err);
      setError('Failed to load extensions from Open VSX Registry');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadPopularExtensions();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Extensions] Searching for:', searchQuery);
      const result = await openVSXService.search(searchQuery, {
        size: 50,
        sortBy: 'relevance',
      });
      
      let converted = result.extensions.map(convertOpenVSXToExtension);

      try {
        const listResult = await window.api.invoke('extensions:list');
        const installedIds: string[] = listResult?.extensions ?? [];
        const idSet = new Set(installedIds);
        converted = converted.map((ext) => {
          if (idSet.has(ext.id)) {
            return Object.assign({}, ext, { installed: true, enabled: true });
          }
          return ext;
        });
      } catch {
        // ignore
      }

      setExtensions(converted);
      console.log('[Extensions] Found', converted.length, 'extensions');
    } catch (err) {
      console.error('[Extensions] Search failed:', err);
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (extension: VSCodeExtension) => {
    setLoading(true);
    try {
      console.log('[Extensions] Installing ' + extension.id + '...');
      const downloadUrl = extension.downloadUrl || 
        openVSXService.getDownloadUrl(extension.namespace, extension.name, extension.version);

      await window.api.invoke('extensions:install', { 
        extensionId: extension.id,
        downloadUrl,
      });

      setExtensions((prev) =>
        prev.map((ext) =>
          ext.id === extension.id ? Object.assign({}, ext, { installed: true, enabled: true }) : ext
        )
      );

      console.log('[Extensions] Installed ' + extension.id);
    } catch (error) {
      console.error('[Extensions] Failed to install ' + extension.id + ':', error);
      setError('Failed to install ' + extension.displayName);
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async (extensionId: string) => {
    setLoading(true);
    try {
      await window.api.invoke('extensions:uninstall', { extensionId });

      setExtensions((prev) =>
        prev.map((ext) =>
          ext.id === extensionId ? Object.assign({}, ext, { installed: false, enabled: false }) : ext
        )
      );

      console.log('[Extensions] Uninstalled ' + extensionId);
    } catch (error) {
      console.error('[Extensions] Failed to uninstall ' + extensionId + ':', error);
      setError('Failed to uninstall extension');
    } finally {
      setLoading(false);
    }
  };

  // Filter by current view's query
  const filteredExtensions = currentQuery.trim()
    ? extensions.filter((ext) =>
        ext.displayName.toLowerCase().includes(currentQuery.toLowerCase()) ||
        ext.description.toLowerCase().includes(currentQuery.toLowerCase()) ||
        ext.publisher.toLowerCase().includes(currentQuery.toLowerCase())
      )
    : extensions;

  const displayedExtensions = showInstalledOnly
    ? filteredExtensions.filter((ext) => ext.installed)
    : filteredExtensions;

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-text-primary">Extensions</span>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleToggleInstalled}
            className={'p-1 rounded transition-colors ' + (
              showInstalledOnly
                ? 'text-accent bg-accent/10'
                : 'text-text-secondary hover:bg-sidebar-item-hover'
            )}
            title={showInstalledOnly ? 'Show all extensions' : 'Show installed only'}
          >
            <PackageCheck className="w-4 h-4" />
          </button>
          <button 
            onClick={showInstalledOnly ? loadInstalledExtensions : loadPopularExtensions}
            disabled={loading || initialLoading}
            className="p-1 hover:bg-sidebar-item-hover rounded disabled:opacity-50"
          >
            <RefreshCw className={'w-4 h-4 text-text-secondary ' + ((loading || initialLoading) ? 'animate-spin' : '')} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            placeholder={showInstalledOnly ? 'Search installed extensions...' : 'Search extensions...'}
            value={currentQuery}
            onChange={(e) => {
              if (showInstalledOnly) {
                setInstalledSearchQuery(e.target.value);
              } else {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim() && !showInstalledOnly) {
                  loadPopularExtensions();
                }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !showInstalledOnly && searchQuery.trim()) {
                handleSearch();
              }
            }}
            className="w-full pl-10 pr-4 py-2 bg-input-background border border-border rounded-md text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Extensions List */}
      <div className="flex-1 overflow-y-auto">
        {initialLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <Loader2 className="w-8 h-8 mb-3 animate-spin" />
            <p className="text-sm">Loading extensions...</p>
          </div>
        ) : displayedExtensions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary/40">
            <Package className="w-12 h-12 mb-2" strokeWidth={1} />
            <p className="text-sm">
              {currentQuery.trim()
                ? 'No extensions match your search'
                : showInstalledOnly
                  ? 'No installed extensions'
                  : 'No extensions found'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayedExtensions.map((extension) => (
              <ExtensionItem
                key={extension.id}
                extension={extension}
                onInstall={() => handleInstall(extension)}
                onUninstall={handleUninstall}
                loading={loading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Extension Item Component ──────────────────────────────────────────────

interface ExtensionItemProps {
  extension: VSCodeExtension;
  onInstall: () => void;
  onUninstall: (id: string) => void;
  loading: boolean;
}

function ExtensionItem({ extension, onInstall, onUninstall, loading }: ExtensionItemProps) {
  const addService = useCodeStore((s) => s.addService);
  const setCurrentService = useCodeStore((s) => s.setCurrentService);
  const currentProjectId = useCodeStore((s) => s.currentProjectId);

  const handleCardClick = () => {
    if (!currentProjectId) return;

    const serviceId = 'ext_' + extension.id.replace(/\./g, '_');
    
    const projects = useCodeStore.getState().projects;
    const project = projects.find((p) => p.id === currentProjectId);
    const existingService = project?.services.find((s) => s.id === serviceId);

    if (!existingService) {
      const newServiceInput = {
        id: serviceId,
        name: 'Extension: ' + extension.displayName,
        type: 'extension' as const,
        meta: extension.version,
        extensionId: extension.id,
      };
      
      addService(currentProjectId, newServiceInput);
      
      setTimeout(() => {
        setCurrentService(serviceId);
      }, 0);
    } else {
      setCurrentService(serviceId);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className="px-4 py-3 hover:bg-sidebar-item-hover transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
          {extension.icon ? (
            <img src={extension.icon} alt={extension.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-4 h-4 text-text-secondary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-medium text-text-primary truncate flex-1">
              {extension.displayName}
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-text-secondary shrink-0">
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {extension.downloads >= 1000000
                  ? (extension.downloads / 1000000).toFixed(1) + 'M'
                  : extension.downloads >= 1000
                    ? (extension.downloads / 1000).toFixed(1) + 'K'
                    : extension.downloads}
              </span>
              {extension.rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  {extension.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          <p className="text-[11px] text-text-secondary mt-0.5 truncate">
            {extension.description}
          </p>

          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-text-secondary truncate">
              {extension.publisher}
            </span>
            <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              {extension.installed ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUninstall(extension.id);
                  }}
                  disabled={loading}
                  className="px-2 py-0.5 text-[11px] rounded border border-border text-text-secondary hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Uninstall
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onInstall();
                  }}
                  disabled={loading}
                  className="px-2 py-0.5 text-[11px] rounded border border-border text-text-secondary hover:text-primary hover:border-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Install'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}