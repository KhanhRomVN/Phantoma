import React, { useState, useEffect } from 'react';
import { Bug } from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../../components/ui/Modal';
import { BaseModalProps } from './types';

export const WebModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingApps = [],
  editApp,
  onEdit,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [duplicateError, setDuplicateError] = useState<{ name?: string; value?: string }>({});
  const [suggestions, setSuggestions] = useState<
    Array<{ name: string; url?: string; executablePath?: string }>
  >([]);
  const [faviconStatus, setFaviconStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const isEdit = !!editApp;

  const normalizeUrl = (urlString?: string): string => {
    if (!urlString) return '';
    try {
      const u = new URL(urlString);
      let normalized = u.hostname + u.pathname;
      if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
      return normalized.toLowerCase();
    } catch {
      return urlString.toLowerCase().replace(/\/$/, '');
    }
  };

  const extractSearchKeywords = (input: string): string => {
    try {
      const u = new URL(input);
      return u.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return input.toLowerCase();
    }
  };

  // Suggestions for duplicate detection
  useEffect(() => {
    if (!isOpen || isEdit) {
      setSuggestions([]);
      return;
    }
    const searchTerm = (name || '').toLowerCase();
    let searchKeywords: string[] = [];
    if (searchTerm) {
      searchKeywords = [searchTerm];
    } else if (url) {
      const domain = extractSearchKeywords(url);
      searchKeywords = [domain];
    }
    if (searchKeywords.length === 0 || !searchKeywords[0]) {
      setSuggestions([]);
      return;
    }
    const matches = existingApps
      .filter((app) => {
        const normalizedInputUrl = normalizeUrl(url);
        const normalizedAppUrl = normalizeUrl(app.url);
        if (name && app.name?.toLowerCase() === name.toLowerCase()) return true;
        if (url && normalizedInputUrl === normalizedAppUrl) return true;
        for (const keyword of searchKeywords) {
          const appUrl = (app.url || '').toLowerCase();
          if (appUrl.includes(keyword) && keyword.length > 3) return true;
        }
        return false;
      })
      .slice(0, 2)
      .map((app) => ({ name: app.name || '', url: app.url, executablePath: app.executablePath }));
    setSuggestions(matches);
  }, [name, url, existingApps, isEdit, isOpen]);

  // Duplicate error detection
  useEffect(() => {
    const appsToCheck =
      isEdit && editApp ? existingApps.filter((app) => app.id !== editApp.id) : existingApps;
    const error: { name?: string; value?: string } = {};
    if (name) {
      const existingByName = appsToCheck.find(
        (app) => app.name?.toLowerCase() === name?.toLowerCase(),
      );
      if (existingByName) error.name = `Name "${existingByName.name}" already exists`;
    }
    if (url) {
      const existingByUrl = appsToCheck.find(
        (app) => app.url?.toLowerCase() === url?.toLowerCase(),
      );
      if (existingByUrl) error.value = `URL "${existingByUrl.url}" already exists`;
    }
    setDuplicateError(error);
  }, [name, url, existingApps, isEdit, editApp]);

  // Fetch favicon when URL changes
  useEffect(() => {
    if (!url) {
      setFaviconStatus('idle');
      setFaviconUrl(null);
      return;
    }
    
    let isMounted = true;
    setFaviconStatus('loading');
    
    const fetchFavicon = async () => {
      try {
        // Extract domain from URL
        let domain = url;
        if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
          domain = `https://${domain}`;
        }
        const urlObj = new URL(domain);
        const hostname = urlObj.hostname;
        
        // Try Google S2 favicon service first (supports CORS)
        const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
        
        // Test if favicon loads using Image
        const img = new Image();
        let loaded = false;
        
        const checkImage = (src: string): Promise<boolean> => {
          return new Promise((resolve) => {
            const testImg = new Image();
            testImg.onload = () => resolve(true);
            testImg.onerror = () => resolve(false);
            testImg.src = src;
          });
        };
        
        // Try Google S2 first
        const googleLoaded = await checkImage(googleFaviconUrl);
        if (googleLoaded && isMounted) {
          setFaviconUrl(googleFaviconUrl);
          setFaviconStatus('success');
          return;
        }
        
        // Try direct favicon.ico
        const icoUrl = `https://${hostname}/favicon.ico`;
        const icoLoaded = await checkImage(icoUrl);
        if (icoLoaded && isMounted) {
          setFaviconUrl(icoUrl);
          setFaviconStatus('success');
          return;
        }
        
        // Try favicon.png
        const pngUrl = `https://${hostname}/favicon.png`;
        const pngLoaded = await checkImage(pngUrl);
        if (pngLoaded && isMounted) {
          setFaviconUrl(pngUrl);
          setFaviconStatus('success');
          return;
        }
        
        // All failed
        if (isMounted) {
          setFaviconStatus('error');
        }
      } catch {
        if (isMounted) {
          setFaviconStatus('error');
        }
      }
    };
    
    fetchFavicon();
    
    return () => {
      isMounted = false;
    };
  }, [url]);

  // Reset on open/edit
  useEffect(() => {
    if (!isOpen) return;
    if (editApp) {
      setName(editApp.name || '');
      setUrl(editApp.url || '');
    } else {
      setName('');
      setUrl('');
    }
    setFaviconStatus('idle');
    setFaviconUrl(null);
  }, [isOpen, editApp]);

  const handleSubmit = async () => {
    if (isEdit && editApp && onEdit) {
      onEdit(editApp.id, { name, url });
      onClose();
      return;
    }
    if (!name || !url) return;
    
    try {
      await onAdd({ name, url, mode: 'intercept', platform: 'web' });
      onClose();
    } catch (error) {
      // Lỗi đã được xử lý ở component cha, không đóng modal
      console.error('[WebModal] Add target failed:', error);
    }
  };

  const canSubmit = !!(name && url) && !duplicateError.name && !duplicateError.value;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader
        title={isEdit ? 'Edit Website' : 'Add Website'}
        description={isEdit ? 'Update target details' : 'Configure your website target'}
        onClose={onClose}
      />
      <ModalBody>
        <div className="space-y-4">
          {suggestions.length > 0 && (
            <div className="mb-2">
              <label className="block text-xs font-bold text-error mb-2">
                Duplicate targets detected
              </label>
              <div className="space-y-2">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="w-full text-left p-3 rounded-xl bg-error/5 border border-error/30"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-text-primary">
                          {suggestion.name}
                        </div>
                        {suggestion.url && (
                          <div className="text-xs text-text-secondary truncate mt-0.5 font-mono">
                            {suggestion.url}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Google"
              className={cn(
                'w-full bg-input-background border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary',
                duplicateError.name ? 'border-error' : 'border-border',
              )}
            />
            {duplicateError.name && (
              <p className="text-xs text-error mt-1.5">{duplicateError.name}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5">URL</label>
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-9 h-9 shrink-0 rounded-lg flex items-center justify-center border-2 transition-all bg-input-background',
                faviconStatus === 'idle' && 'border-border',
                faviconStatus === 'loading' && 'border-border animate-pulse',
                faviconStatus === 'success' && 'border-success',
                faviconStatus === 'error' && 'border-error',
              )}>
                {faviconStatus === 'loading' && (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
                {faviconStatus === 'success' && faviconUrl && (
                  <img
                    src={faviconUrl}
                    alt="Favicon"
                    className="w-6 h-6 object-contain"
                    onError={() => setFaviconStatus('error')}
                  />
                )}
                {faviconStatus === 'error' && (
                  <Bug className="w-5 h-5 text-error" />
                )}
                {faviconStatus === 'idle' && (
                  <div className="w-6 h-6 rounded bg-border/30" />
                )}
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className={cn(
                  'flex-1 bg-input-background border rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary',
                  duplicateError.value ? 'border-error' : 'border-border',
                )}
              />
            </div>
            {duplicateError.value && (
              <p className="text-xs text-error mt-1.5">{duplicateError.value}</p>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          {isEdit ? 'Save Changes' : 'Add Target'}
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default WebModal;