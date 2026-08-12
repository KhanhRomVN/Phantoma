/**
 * ------------------------------------------------------------------
 * LSP Panel
 * ------------------------------------------------------------------
 * Browse and install Language Server Protocol servers from the
 * Activity sidebar. Displays all available LSP servers from the
 * shared registry with search, filter, install/uninstall actions,
 * and homepage links.
 *
 * Main features:
 * - Search servers by name, language, or description
 * - Filter to show installed only
 * - Install / Uninstall with simulated progress
 * - Server item cards with language icon, description, and actions
 * - Error display with dismiss button
 * - Refresh button to re-sync installed state
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect } from 'react';

// ── UI ──
import {
  Terminal,
  Download,
  Archive,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
  Trash2,
  CheckCircle,
} from 'lucide-react';

// ── Services ──
import { isLSPInstalled, markLSPInstalled, type LSPServer } from '../../../services/lsp.service';

// ── Constants ──
import { AVAILABLE_LSP_SERVERS } from '../../../constants/lsp-servers';

// ─── Component ──────────────────────────────────────────────────────────

export function LSPPanel() {
  // ── State ──
  const [servers, setServers] = useState<LSPServer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInstalledOnly, setShowInstalledOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Effects ──
  useEffect(() => {
    loadServers();
  }, []);

  // ── Helpers ──
  const loadServers = () => {
    // Mark installed servers
    const serversWithStatus = AVAILABLE_LSP_SERVERS.map((server) => ({
      ...server,
      installed: isLSPInstalled(server.id),
    }));
    setServers(serversWithStatus);
  };

  // ── Handlers ──
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      loadServers();
      setLoading(false);
    }, 300);
  };

  const handleInstall = async (server: LSPServer) => {
    setLoading(true);
    setError(null);

    try {
      // Simulate installation (in real app, this would call IPC to install via npm/system)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mark as installed
      markLSPInstalled(server.id);
      loadServers();
    } catch (err) {
      console.error('[LSP] Failed to install', server.name, ':', err);
      setError(`Failed to install ${server.name}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async (serverId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Simulate uninstallation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Remove from localStorage
      const installed = JSON.parse(localStorage.getItem('lsp-installed-servers') || '[]');
      const filtered = installed.filter((id: string) => id !== serverId);
      localStorage.setItem('lsp-installed-servers', JSON.stringify(filtered));

      loadServers();
    } catch (err) {
      console.error('[LSP] Failed to uninstall', serverId, ':', err);
      setError(`Failed to uninstall server`);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived ──
  const filteredServers = searchQuery.trim()
    ? servers.filter(
        (server) =>
          server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          server.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
          server.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : servers;

  const displayedServers = showInstalledOnly
    ? filteredServers.filter((server: any) => server.installed)
    : filteredServers;

  // ── Render ──
  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium text-text-primary">Language Server Protocol</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowInstalledOnly(!showInstalledOnly)}
            className={
              'p-1 rounded transition-colors ' +
              (showInstalledOnly
                ? 'text-accent bg-accent/10'
                : 'text-text-secondary hover:bg-sidebar-item-hover')
            }
            title={showInstalledOnly ? 'Show all servers' : 'Show installed only'}
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1 hover:bg-sidebar-item-hover rounded disabled:opacity-50 text-text-secondary"
            title="Refresh"
          >
            <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder={
              showInstalledOnly ? 'Search installed servers...' : 'Search language servers...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Servers List */}
      <div className="flex-1 overflow-y-auto">
        {displayedServers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary/40">
            <Terminal className="w-12 h-12 mb-2" strokeWidth={1} />
            <p className="text-sm">
              {searchQuery.trim()
                ? 'No servers match your search'
                : showInstalledOnly
                  ? 'No installed language servers'
                  : 'No language servers found'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayedServers.map((server: any) => (
              <LSPServerItem
                key={server.id}
                server={server}
                onInstall={() => handleInstall(server)}
                onUninstall={() => handleUninstall(server.id)}
                loading={loading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LSP Server Item ────────────────────────────────────────────────────

interface LSPServerItemProps {
  server: LSPServer & { installed?: boolean };
  onInstall: () => void;
  onUninstall: () => void;
  loading: boolean;
}

function LSPServerItem({ server, onInstall, onUninstall, loading }: LSPServerItemProps) {
  const handleOpenHomepage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (server.homepage) {
      window.open(server.homepage, '_blank');
    }
  };

  const languageIcon = server.icon;

  return (
    <div className="px-4 py-3 hover:bg-sidebar-item-hover transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
          {languageIcon ? (
            <img
              src={languageIcon}
              alt={server.language}
              className="w-5 h-5 object-contain"
              onError={(e) => {
                // Fallback to Terminal icon if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML =
                  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>';
              }}
            />
          ) : (
            <Terminal className="w-4 h-4 text-primary" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xs font-medium text-text-primary truncate flex-1">{server.name}</h3>
            {server.installed && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 shrink-0">
                <CheckCircle className="w-3 h-3" />
                Installed
              </span>
            )}
          </div>

          <p className="text-[11px] text-text-secondary/70 mb-2 line-clamp-2">
            {server.description}
          </p>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-accent truncate">{server.language}</span>

            <div className="flex items-center gap-1 shrink-0">
              {server.homepage && (
                <button
                  onClick={handleOpenHomepage}
                  className="p-1 hover:bg-sidebar-item-hover rounded text-text-secondary hover:text-primary transition-colors"
                  title="Open homepage"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              {server.installed ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUninstall();
                  }}
                  disabled={loading}
                  className="px-2 py-1 text-[11px] rounded border border-border text-text-secondary hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3" />
                      Uninstall
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onInstall();
                  }}
                  disabled={loading}
                  className="px-2 py-1 text-[11px] rounded border border-border text-text-secondary hover:text-primary hover:border-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-3 h-3" />
                      Install
                    </>
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