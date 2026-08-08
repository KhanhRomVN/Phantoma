/**
 * Extension Content View
 *
 * Display full extension information in ContentPanel when extension service is active.
 * VSCode-style layout with header, tabs, markdown content, and info sidebar.
 */

import { useState, useEffect } from 'react';
import {
  Download,
  Star,
  Loader2,
  AlertCircle,
  Puzzle,
  FileText,
  List,
  History,
  User,
  FolderOpen,
  CheckCircle2,
  Box,
  ExternalLink,
} from 'lucide-react';
import MarkdownBlock from '@renderer/components/common/MarkdownBlock';
import { Button } from '@renderer/components/ui/Button';
import { openVSXService, type OpenVSXExtension } from '../../services/open-vsx.service';

// ─── Types ──────────────────────────────────────────────────────────────────

type TabId = 'details' | 'features' | 'changelog';

interface ExtensionContentProps {
  extensionId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ExtensionContent({ extensionId }: ExtensionContentProps) {
  const [extension, setExtension] = useState<OpenVSXExtension | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('details');

  const { namespace, name } = openVSXService.parseExtensionId(extensionId);

  useEffect(() => {
    loadExtension();
  }, [extensionId]);

  const loadExtension = async () => {
    setLoading(true);
    setError(null);
    try {
      const ext = await openVSXService.getExtension(namespace, name);
      setExtension(ext);

      // Sync installed status with main process
      try {
        const result = await window.api.invoke('extensions:list');
        const installedIds: string[] = result?.extensions ?? [];
        setInstalled(installedIds.includes(extensionId));
      } catch {
        // ignore
      }

      if (ext.files?.readme) {
        try {
          const readmeResponse = await fetch(ext.files.readme);
          const readmeText = await readmeResponse.text();
          setReadmeContent(readmeText);
        } catch (err) {
          console.error('[ExtensionContent] Failed to load README:', err);
        }
      }
    } catch (err) {
      console.error('[ExtensionContent] Failed to load extension:', err);
      setError('Failed to load extension details');
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!extension) return;
    setInstalling(true);
    try {
      const downloadUrl =
        extension.files?.download ||
        openVSXService.getDownloadUrl(namespace, name, extension.version);
      await window.api.invoke('extensions:install', { extensionId, downloadUrl });
      setInstalled(true);
    } catch (err) {
      console.error('[ExtensionContent] Install failed:', err);
      setError('Installation failed');
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async () => {
    setInstalling(true);
    try {
      await window.api.invoke('extensions:uninstall', { extensionId });
      setInstalled(false);
    } catch (err) {
      console.error('[ExtensionContent] Uninstall failed:', err);
    } finally {
      setInstalling(false);
    }
  };

  // ─── Loading State ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mb-3 mx-auto animate-spin text-accent" />
          <p className="text-sm text-text-secondary">Loading extension details...</p>
        </div>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────

  if (error || !extension) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-red-500">
          <AlertCircle className="w-8 h-8 mb-3 mx-auto" />
          <p className="text-sm">{error || 'Extension not found'}</p>
        </div>
      </div>
    );
  }

  // ─── Derived Data ───────────────────────────────────────────────────────

  const publisherName =
    extension.publishedBy?.fullName || extension.publishedBy?.loginName || extension.namespace;
  const iconUrl = extension.files?.icon;
  const hasReadme = readmeContent.length > 0;

  const TAB_ITEMS: { id: TabId; label: string; icon: typeof FileText }[] = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'features', label: 'Features', icon: List },
    { id: 'changelog', label: 'Changelog', icon: History },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* ── Header Section (full width) ──────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-start gap-4">
          {/* Favicon */}
          <div className="w-14 h-14 rounded-lg bg-sidebar border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
            {iconUrl ? (
              <img src={iconUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <Puzzle className="w-7 h-7 text-text-secondary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Dòng 1: Title */}
            <h1 className="text-lg font-semibold text-text-primary truncate">
              {extension.displayName || extension.name}
            </h1>

            {/* Dòng 2: Author | Downloads | Stars */}
            <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {publisherName}
              </span>
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {formatNumber(extension.downloadCount ?? extension.downloads ?? 0)}
              </span>
              {extension.averageRating != null && extension.averageRating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current text-yellow-500" />
                  {extension.averageRating.toFixed(1)}
                </span>
              )}
            </div>

            {/* Dòng 3: Description (1 dòng, truncate) */}
            <p className="text-xs text-text-secondary mt-2 truncate">
              {extension.description || 'No description'}
            </p>

            {/* Dòng 4: Action Buttons */}
            <div className="flex items-center gap-2 mt-3">
              {installed ? (
                <button
                  onClick={handleUninstall}
                  disabled={installing}
                  className="px-2 py-0.5 text-[11px] rounded border border-border text-text-secondary hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {installing ? 'Uninstalling...' : 'Uninstall'}
                </button>
              ) : (
                <Button size="sm" onClick={handleInstall} disabled={installing}>
                  {installing ? 'Installing...' : 'Install'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar (full width) ──────────────────────────────────────── */}
      <div className="flex items-center border-b border-border px-6">
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'text-text-primary border-accent'
                  : 'text-text-secondary border-transparent hover:text-text-primary hover:border-divider'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Content Area (flex row: tab content + right panel) ────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-w-0">
          {activeTab === 'details' &&
            (hasReadme ? (
              <MarkdownBlock content={readmeContent} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary/40">
                <FileText className="w-10 h-10 mb-2" strokeWidth={1} />
                <p className="text-sm">No README available</p>
              </div>
            ))}
          {activeTab === 'features' && (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary/40">
              <List className="w-10 h-10 mb-2" strokeWidth={1} />
              <p className="text-sm">No features listed</p>
            </div>
          )}
          {activeTab === 'changelog' && (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary/40">
              <History className="w-10 h-10 mb-2" strokeWidth={1} />
              <p className="text-sm">No changelog available</p>
            </div>
          )}
        </div>

        {/* ── Right Info Panel ────────────────────────────────────────── */}
        <div className="w-60 flex-shrink-0 border-l border-border overflow-y-auto">
          {/* Installation Status */}
          <div className="p-4 border-b border-border">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs ${
                installed
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                  : 'bg-sidebar text-text-secondary border border-border'
              }`}
            >
              {installed ? <CheckCircle2 className="w-4 h-4" /> : <Box className="w-4 h-4" />}
              <span className="font-medium">{installed ? 'Installed' : 'Not installed'}</span>
            </div>
          </div>

          {/* Info Section */}
          <div className="p-4 border-b border-border">
            <h4 className="text-[10px] font-semibold text-text-secondary/50 uppercase tracking-wider mb-3">
              Information
            </h4>
            <div className="flex flex-col gap-3">
              <InfoItem
                label="Identifier"
                value={`${extension.namespace}.${extension.name}`}
                mono
              />
              <InfoItem label="Version" value={extension.version || 'latest'} />
              <InfoItem label="Published by" value={publisherName} />
              <InfoItem label="Last Released" value={extension.version || 'latest'} />
            </div>
          </div>

          {/* Categories Section */}
          {extension.categories && extension.categories.length > 0 && (
            <div className="p-4 border-b border-border">
              <h4 className="text-[10px] font-semibold text-text-secondary/50 uppercase tracking-wider mb-3">
                Categories
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {extension.categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-2 py-0.5 text-[10px] bg-sidebar border border-border rounded-md text-text-secondary hover:text-text-primary hover:border-text-secondary/30 transition-colors"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resources Section */}
          {extension.repository && (
            <div className="p-4">
              <h4 className="text-[10px] font-semibold text-text-secondary/50 uppercase tracking-wider mb-3">
                Resources
              </h4>
              <a
                href={extension.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-sidebar border border-border text-xs text-text-secondary hover:text-primary hover:border-primary/30 hover:bg-sidebar-item-hover transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Repository
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Info Item Helper ───────────────────────────────────────────────────────

function InfoItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-text-secondary/50 uppercase mb-0.5">{label}</p>
      <p className={`text-xs text-text-primary truncate ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </p>
    </div>
  );
}
