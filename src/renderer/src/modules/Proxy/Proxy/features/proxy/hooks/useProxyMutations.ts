import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Proxy, ProxyDraft } from '../../../shared/types/proxy-domain.types';
import { errorMessage } from '../../../shared/utils/error';
import { proxiesApi } from '../api/proxy.api';

interface UseProxyMutationsOptions {
  setProxies: Dispatch<SetStateAction<Proxy[]>>;
  setError: (message: string | null) => void;
}

/** Create / import / delete operations that change the proxy list. */
export function useProxyMutations({ setProxies, setError }: UseProxyMutationsOptions) {
  const createProxy = useCallback(
    async (draft: ProxyDraft, sourceId: string): Promise<void> => {
      try {
        const created = await proxiesApi.create({ ...draft, sourceId });
        setProxies((prev) => [created, ...prev]);
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
      }
    },
    [setProxies, setError],
  );

  const importProxies = useCallback(
    async (drafts: ProxyDraft[], sourceId: string): Promise<void> => {
      try {
        const { created, skipped } = await proxiesApi.createMany(sourceId, drafts);
        setProxies((prev) => [...created, ...prev]);
        setError(
          skipped.length > 0 ? `${skipped.length} proxies skipped: ${skipped[0].reason}` : null,
        );
      } catch (err) {
        setError(errorMessage(err));
      }
    },
    [setProxies, setError],
  );

  /** Resolves to true when the server deleted the proxies and the list was updated. */
  const deleteProxies = useCallback(
    async (ids: string[]): Promise<boolean> => {
      const gone = new Set(ids);
      try {
        await proxiesApi.removeMany(ids);
        setProxies((prev) => prev.filter((p) => !gone.has(p.id)));
        setError(null);
        return true;
      } catch (err) {
        setError(errorMessage(err));
        return false;
      }
    },
    [setProxies, setError],
  );

  /** Adds proxies that were created elsewhere (e.g. by a VPN provider flow) to the top of the list. */
  const prependProxies = useCallback(
    (created: Proxy[]): void => setProxies((prev) => [...created, ...prev]),
    [setProxies],
  );

  return { createProxy, importProxies, deleteProxies, prependProxies };
}
