/**
 * ------------------------------------------------------------------
 * useSessionCleanup
 * ------------------------------------------------------------------
 * Health-check định kỳ để xóa toàn bộ conversation (chat session) phía
 * provider khi account không còn ở chat view.
 *
 * Cơ chế:
 * - Khi `isInChatView = true` + `supportsSessionCleanup = true`:
 *   Hook KHÔNG làm gì.
 * - Khi `isInChatView = false` (unmount / đổi view):
 *   Gọi `POST /v1/accounts/:id/session-cleanup` 1 lần để dọn sạch.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { useEffect, useRef, useCallback } from 'react';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface UseSessionCleanupOptions {
  apiUrl: string;
  accountId: string | null | undefined;
  providerId: string | null | undefined;
  providers: any[];
  isInChatView: boolean;
  isStreaming: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────
function providerSupportsCleanup(
  providerId: string | null | undefined,
  providers: any[],
): boolean {
  if (!providerId) return false;
  const p = providers.find(
    (pr: any) => pr.provider_id?.toLowerCase() === providerId.toLowerCase(),
  );
  return p?.supports_session_cleanup === true;
}

// ─── Hook ───────────────────────────────────────────────────────────────
export function useSessionCleanup({
  apiUrl,
  accountId,
  providerId,
  providers,
  isInChatView,
  isStreaming,
}: UseSessionCleanupOptions): void {
  const accountIdRef = useRef(accountId);
  const providerIdRef = useRef(providerId);
  const providersRef = useRef(providers);
  const apiUrlRef = useRef(apiUrl);
  const isStreamingRef = useRef(isStreaming);

  accountIdRef.current = accountId;
  providerIdRef.current = providerId;
  providersRef.current = providers;
  apiUrlRef.current = apiUrl;
  isStreamingRef.current = isStreaming;

  const prevAccountIdRef = useRef<string | null | undefined>(null);
  const prevProviderIdRef = useRef<string | null | undefined>(null);

  const triggerCleanup = useCallback((targetAccountId: string, targetProviderId: string) => {
    const url = apiUrlRef.current;
    if (!url || !targetAccountId) return;

    if (!providerSupportsCleanup(targetProviderId, providersRef.current)) {
      return;
    }

    fetch(`${url}/v1/accounts/${targetAccountId}/session-cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((body: any) => {
            console.warn(
              `[SessionCleanup] Failed — account=${targetAccountId} status=${res.status} msg=${body?.message}`,
            );
          });
        }
        return undefined;
      })
      .catch((err) => {
        console.warn(`[SessionCleanup] Network error — account=${targetAccountId}`, err);
      });
  }, []);

  useEffect(() => {
    if (!isInChatView && !isStreaming) {
      const aid = accountIdRef.current;
      const pid = providerIdRef.current;
      if (aid && pid) {
        triggerCleanup(aid, pid);
      }
    }
  }, [isInChatView, isStreaming, triggerCleanup]);

  useEffect(() => {
    return () => {
      if (!isStreamingRef.current) {
        const aid = accountIdRef.current;
        const pid = providerIdRef.current;
        if (aid && pid) {
          triggerCleanup(aid, pid);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prevAid = prevAccountIdRef.current;
    const prevPid = prevProviderIdRef.current;

    if (prevAid && prevPid && prevAid !== accountId && !isStreaming) {
      triggerCleanup(prevAid, prevPid);
    }

    prevAccountIdRef.current = accountId;
    prevProviderIdRef.current = providerId;
  }, [accountId, providerId, isStreaming, triggerCleanup]);
}