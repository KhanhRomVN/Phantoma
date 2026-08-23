import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { logger } from '@renderer/utils/logger';
import { Bug } from 'lucide-react';

// ── Types ──
import type { BaseModalProps } from './index';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

type WebsiteBodyProps = Pick<
  BaseModalProps,
  'isOpen' | 'onAdd' | 'existingApps' | 'editApp' | 'onEdit' | 'onCanSubmitChange'
>;

export interface WebsiteRef {
  submit: () => Promise<void>;
  canSubmit: boolean;
}

export const Website = forwardRef<WebsiteRef, WebsiteBodyProps>(function Website(
  { isOpen, onAdd, existingApps = [], editApp, onEdit, onCanSubmitChange },
  ref,
) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [duplicateError, setDuplicateError] = useState<{ name?: string; value?: string }>({});
  const [suggestions, setSuggestions] = useState<
    Array<{ name: string; url?: string; executablePath?: string }>
  >([]);
  const [faviconStatus, setFaviconStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
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
        let domain = url;
        if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
          domain = `https://${domain}`;
        }
        const urlObj = new URL(domain);
        const hostname = urlObj.hostname;

        const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;

        const checkImage = (src: string): Promise<boolean> => {
          return new Promise((resolve) => {
            const testImg = new Image();
            testImg.onload = () => resolve(true);
            testImg.onerror = () => resolve(false);
            testImg.src = src;
          });
        };

        const googleLoaded = await checkImage(googleFaviconUrl);
        if (googleLoaded && isMounted) {
          setFaviconUrl(googleFaviconUrl);
          setFaviconStatus('success');
          return;
        }

        const icoUrl = `https://${hostname}/favicon.ico`;
        const icoLoaded = await checkImage(icoUrl);
        if (icoLoaded && isMounted) {
          setFaviconUrl(icoUrl);
          setFaviconStatus('success');
          return;
        }

        const pngUrl = `https://${hostname}/favicon.png`;
        const pngLoaded = await checkImage(pngUrl);
        if (pngLoaded && isMounted) {
          setFaviconUrl(pngUrl);
          setFaviconStatus('success');
          return;
        }

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
      return;
    }
    if (!name || !url) return;

    try {
      await onAdd({ name, url, mode: 'intercept', platform: 'web' });
    } catch (error) {
      logger.error('[Website] Add target failed:', error);
    }
  };

  const canSubmit = !!(name && url) && !duplicateError.name && !duplicateError.value;

  useImperativeHandle(ref, () => ({ submit: handleSubmit, canSubmit }), [handleSubmit, canSubmit]);

  useEffect(() => {
    onCanSubmitChange?.(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  return (
    <div className="space-y-4">
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
        {duplicateError.name && <p className="text-xs text-error mt-1.5">{duplicateError.name}</p>}
      </div>
      <div>
        <label className="block text-xs font-bold text-text-secondary mb-1.5">URL</label>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-9 h-9 shrink-0 rounded-lg flex items-center justify-center border-2 transition-all bg-input-background',
              faviconStatus === 'idle' && 'border-border',
              faviconStatus === 'loading' && 'border-border animate-pulse',
              faviconStatus === 'success' && 'border-success',
              faviconStatus === 'error' && 'border-error',
            )}
          >
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
            {faviconStatus === 'error' && <Bug className="w-5 h-5 text-error" />}
            {faviconStatus === 'idle' && <div className="w-6 h-6 rounded bg-border/30" />}
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
  );
});

export default Website;
