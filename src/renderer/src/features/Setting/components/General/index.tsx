import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, FolderOpen, Save, File, FolderPlus, Eye, ChevronDown } from 'lucide-react';
import { useServerHealth } from '../../../../providers/ServerHealthProvider';
import { apiClient } from '../../../../services/ApiClient';
import { databaseService } from '../../../../services/DatabaseService';

// Helper function to get directory name from a file path (cross-platform)
// Works without Node.js path module
function getDirname(filePath: string): string {
  // Normalize path separators: replace backslashes with forward slashes
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) {
    return '.'; // No directory separator found
  }
  return normalized.substring(0, lastSlash);
}

const General: React.FC = () => {
  const [serverUrl, setServerUrl] = useState('localhost:8080');
  const [dbPath, setDbPath] = useState<string>('');
  const [newDbPath, setNewDbPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [showCreateFileInput, setShowCreateFileInput] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { error, isValid, clearError } = useServerHealth();

  // Load server URL from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('server_url');
    if (saved) {
      setServerUrl(saved);
    }
  }, []);

  // Load database path from server
  useEffect(() => {
    const loadDbPath = async () => {
      try {
        setIsLoading(true);
        setDbError(null);
        const path = await databaseService.getDatabasePath();
        setDbPath(path);
        setNewDbPath(path);
      } catch (err) {
        setDbError(err instanceof Error ? err.message : 'Failed to load database path');
        console.error('Failed to load database path:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadDbPath();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setServerUrl(newUrl);
    localStorage.setItem('server_url', newUrl);
    // Update the API client's base URL
    apiClient.setBaseUrl(newUrl);
    // Clear any previous error so the health check can retry
    clearError();
    // Dispatch event for any other listeners
    window.dispatchEvent(new CustomEvent('serverUrlChanged', { detail: newUrl }));
  };

  const handleBrowse = () => {
    setShowDropdown(!showDropdown);
  };

  const handleViewFile = async () => {
    setShowDropdown(false);
    try {
      const dirPath = dbPath ? getDirname(dbPath) : '';
      if (!dirPath) {
        setDbError('No database path available');
        return;
      }
      if (window.api && window.api.invoke) {
        await window.api.invoke('openFolder', { path: dirPath });
      } else {
        console.warn('IPC not available for opening folder');
        setDbError('Cannot open folder: IPC not available');
      }
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to open folder');
      console.error('Failed to open folder:', err);
    }
  };

  const handleSelectFile = async () => {
    setShowDropdown(false);
    try {
      if (window.api && window.api.invoke) {
        const result = await window.api.invoke('selectFile');
        if (result.success && result.filePath) {
          setNewDbPath(result.filePath);
          // Auto-apply if different from current
          if (result.filePath !== dbPath) {
            await handleApplyDirect(result.filePath);
          }
        }
      } else {
        setDbError('IPC not available for selecting file');
      }
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to select file');
      console.error('Failed to select file:', err);
    }
  };

  const handleSelectFolder = async () => {
    setShowDropdown(false);
    try {
      if (window.api && window.api.invoke) {
        const result = await window.api.invoke('selectFolder');
        if (result.success && result.folderPath) {
          setSelectedFolderPath(result.folderPath);
          setShowCreateFileInput(true);
          setNewFileName('');
        }
      } else {
        setDbError('IPC not available for selecting folder');
      }
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to select folder');
      console.error('Failed to select folder:', err);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      setDbError('Please enter a file name');
      return;
    }
    const fileName = newFileName.trim().endsWith('.sql') ? newFileName.trim() : newFileName.trim() + '.sql';
    const fullPath = `${selectedFolderPath}/${fileName}`;
    setShowCreateFileInput(false);
    setNewDbPath(fullPath);
    if (fullPath !== dbPath) {
      await handleApplyDirect(fullPath);
    }
  };

  const handleCancelCreateFile = () => {
    setShowCreateFileInput(false);
    setSelectedFolderPath('');
    setNewFileName('');
  };

  const handleApplyDirect = async (pathToApply: string) => {
    try {
      setIsUpdating(true);
      setDbError(null);
      const updatedPath = await databaseService.updateDatabasePath(pathToApply);
      setDbPath(updatedPath);
      setNewDbPath(updatedPath);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to update database path');
      console.error('Failed to update database path:', err);
      setNewDbPath(dbPath);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApply = async () => {
    if (!newDbPath || newDbPath === dbPath) {
      return;
    }

    try {
      setIsUpdating(true);
      setDbError(null);
      const updatedPath = await databaseService.updateDatabasePath(newDbPath);
      setDbPath(updatedPath);
      setNewDbPath(updatedPath);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to update database path');
      console.error('Failed to update database path:', err);
      // Revert newDbPath to current dbPath on error
      setNewDbPath(dbPath);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-base text-primary m-0 mb-4">General Settings</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-text-primary tracking-wide mb-1.5">
            API Server URL
          </label>
          <input
            type="text"
            value={serverUrl}
            onChange={handleUrlChange}
            placeholder="localhost:8080"
            className="w-full max-w-md px-4 py-3 bg-input-background border border-border rounded-md text-text-primary text-[13px] font-mono outline-none transition-all focus:ring-1 focus:ring-primary focus:border-primary"
          />
          <p className="text-[10px] text-text-secondary mt-2 mb-0">
            Example: localhost:8080 | 192.168.1.100:8080 | api.example.com
          </p>

          {!isValid && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
              <span className="text-error text-xs">Server is not reachable</span>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 rounded-md bg-error/20 border border-error/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-error">Server Connection Error</p>
                  <p className="text-xs text-error/90 mt-0.5">{error}</p>
                  <p className="text-[10px] text-error/70 mt-2">
                    The Phantoma backend server could not be reached. Make sure the server is
                    running and the URL above is correct.
                  </p>
                  <p className="text-[10px] text-error/70 mt-2">
                    The application will automatically reconnect when the server becomes available.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Database Path Section */}
        <div className="mt-6 pt-6 border-t border-border">
          <label className="block text-sm font-medium text-text-primary tracking-wide mb-1.5">
            Database Path
          </label>
          <p className="text-[10px] text-text-secondary mb-3">
            Path to the SQLite database file used by the backend server.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newDbPath}
              onChange={(e) => setNewDbPath(e.target.value)}
              placeholder="/path/to/database.sql"
              disabled={isLoading || isUpdating}
              className="flex-1 max-w-md px-4 py-3 bg-input-background border border-border rounded-md text-text-primary text-[13px] font-mono outline-none transition-all focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleBrowse}
                disabled={isLoading || isUpdating || !dbPath}
                className="flex items-center gap-1 p-2.5 bg-background-secondary border border-border rounded-md hover:bg-background-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Browse database file"
              >
                <FolderOpen className="w-4 h-4 text-text-secondary" />
                <ChevronDown className={`w-3.5 h-3.5 text-text-secondary transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showDropdown && (
                <div className="absolute right-0 mt-1 w-56 bg-background-primary border border-border rounded-md shadow-lg overflow-hidden z-50">
                  <button
                    onClick={handleViewFile}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-background-hover transition-colors text-left"
                  >
                    <Eye className="w-4 h-4 text-text-secondary" />
                    <span>Xem file hiện tại</span>
                  </button>
                  <button
                    onClick={handleSelectFile}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-background-hover transition-colors text-left border-t border-border"
                  >
                    <File className="w-4 h-4 text-text-secondary" />
                    <span>Chọn file có sẵn</span>
                  </button>
                  <button
                    onClick={handleSelectFolder}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-background-hover transition-colors text-left border-t border-border"
                  >
                    <FolderPlus className="w-4 h-4 text-text-secondary" />
                    <span>Tạo file mới</span>
                  </button>
                </div>
              )}
            </div>
            {newDbPath !== dbPath && (
              <button
                onClick={handleApply}
                disabled={isUpdating || isLoading || !newDbPath}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {isUpdating ? 'Saving...' : 'Apply'}
              </button>
            )}
          </div>

          {showCreateFileInput && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-text-secondary whitespace-nowrap">
                {selectedFolderPath}/
              </span>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="database_name.sql"
                className="flex-1 max-w-xs px-3 py-2 bg-input-background border border-border rounded-md text-text-primary text-sm font-mono outline-none transition-all focus:ring-1 focus:ring-primary focus:border-primary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFile();
                  if (e.key === 'Escape') handleCancelCreateFile();
                }}
              />
              <button
                onClick={handleCreateFile}
                disabled={!newFileName.trim()}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
              <button
                onClick={handleCancelCreateFile}
                className="px-3 py-2 bg-background-secondary border border-border rounded-md hover:bg-background-hover transition-colors text-xs font-medium text-text-secondary"
              >
                Cancel
              </button>
            </div>
          )}

          {isLoading && (
            <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
              Loading database path...
            </div>
          )}

          {dbError && (
            <div className="mt-2 flex items-start gap-2 text-xs text-error">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{dbError}</span>
            </div>
          )}

          {!isLoading && !dbError && dbPath && (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-success/70" />
              Current path: <span className="font-mono text-text-primary">{dbPath}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default General;