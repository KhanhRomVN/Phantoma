/**
 * ------------------------------------------------------------------
 * useApiConfiguration
 * ------------------------------------------------------------------
 * Hook quản lý cấu hình URL API và providers.
 * Load API URL từ storage và fetch providers từ backend.
 *
 * Main returns:
 * - apiUrl         : URL hiện tại của API backend
 * - setApiUrl      : Setter cho API URL
 * - isApiUrlReady  : Flag báo API URL đã load xong
 * - providers      : Danh sách providers từ API
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect } from 'react';

// ── Utils ──
import { logger } from '@renderer/utils/logger';

// ── Services ──
import { extensionService } from '../../../../services/ExtensionService';

// ─── Hook ───────────────────────────────────────────────────────────────
export const useApiConfiguration = () => {
  const [apiUrl, setApiUrl] = useState('http://localhost:8888');
  const [isApiUrlReady, setIsApiUrlReady] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);

  // Load API URL from storage
  useEffect(() => {
    const storage = extensionService.getStorage();
    storage
      .get('backend-api-url')
      .then((res: any) => {
        if (res?.value?.startsWith('http')) {
          const url = res.value.endsWith('/') ? res.value.slice(0, -1) : res.value;
          setApiUrl(url);
        }
        setIsApiUrlReady(true);
      })
      .catch((err: any) => {
        logger.warn('[Zen] ChatPanel failed to load apiUrl from storage:', err);
        setIsApiUrlReady(true);
      });
  }, []);

  // Fetch providers from API
  useEffect(() => {
    if (!apiUrl) return;
    fetch(`${apiUrl}/v1/providers`)
      .then((r) => r.json())
      .then((res: any) => {
        const data = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(data)) setProviders(data);
      })
      .catch((err: any) => {
        logger.warn('[useApiConfiguration] Failed to fetch providers:', err);
      });
  }, [apiUrl]);

  return {
    apiUrl,
    setApiUrl,
    isApiUrlReady,
    providers,
    setProviders,
  };
};
