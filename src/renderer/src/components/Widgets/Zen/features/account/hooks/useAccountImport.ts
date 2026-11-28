import { useCallback, useEffect, useRef, useState } from 'react';
import type { FlatAccount } from '../types/account.types';
import type { DuplicateEntry } from '../types/account-import.types';
import { submitImport, type Fetcher } from '../services/account-api.service';
import {
  exportAccountsFile,
  requestAccountImport,
} from '../services/account-extension.service';
import {
  allAccountsFileName,
  selectedAccountsFileName,
  serializeAccounts,
} from '../utils/account-export.utils';

interface UseAccountImportParams {
  apiUrl: string;
  allAccounts: FlatAccount[];
  selectedAccounts: Set<string>;
  /** Refetch danh sách (silent). */
  onAccountsChanged: () => void;
}

export const useAccountImport = ({
  apiUrl,
  allAccounts,
  selectedAccounts,
  onAccountsChanged,
}: UseAccountImportParams) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startImport = useCallback(() => {
    requestAccountImport(
      apiUrl,
      (msg) => {
        if (!mountedRef.current) return false;
        // Intermediate status: file đã chọn, đang gọi API
        if (msg.status === 'analyzing') {
          setLoading(true);
          return true; // Giữ handler — còn chờ preview result
        }

        setLoading(false);

        if (msg.error) {
          console.error('[Import] Error:', msg.error);
          return false;
        }

        // SQLite path: backend import thẳng, không qua preview
        if (msg.isSqlite) {
          onAccountsChanged();
          return false;
        }

        const previewAccounts = msg.preview?.data?.accounts;
        if (!Array.isArray(previewAccounts) || previewAccounts.length === 0) {
          console.warn('[Import] Preview returned empty accounts');
          return false;
        }

        setDuplicates(previewAccounts as DuplicateEntry[]);
        setPreviewOpen(true);
        return false;
      },
      60_000,
      () => {
        if (mountedRef.current) setLoading(false);
        console.warn('[Import] Timeout after 60s');
      },
    );
  }, [apiUrl, onAccountsChanged]);

  /**
   * - New       → insert qua /import
   * - Changed   → override qua /accounts/override
   * - Identical → bỏ qua
   * Throw nếu có thao tác thất bại để modal không đóng như thành công.
   * KHÔNG refetch ở đây: onDone của modal sẽ refetch đúng một lần.
   */
  const confirmImport = useCallback(
    async (selectedEntries: DuplicateEntry[]): Promise<void> => {
      const transport: Fetcher = (path, init) => fetch(`${apiUrl}${path}`, init);
      const toInsert = selectedEntries.filter((e) => e.kind === 'new').map((e) => e.incoming);
      const toOverride = selectedEntries
        .filter((e) => e.kind === 'changed')
        .map((e) => ({ existingId: e.existing?.id, incoming: e.incoming, label: e.email }));

      const outcome = await submitImport(transport, toInsert, toOverride);
      if (outcome.failed.length > 0) {
        // Có thao tác đã thành công → refetch để UI phản ánh dù modal vẫn mở.
        if (outcome.succeeded > 0) onAccountsChanged();
        const detail = outcome.failed.map((f) => `${f.label}: ${f.error}`).join('; ');
        throw new Error(`Import failed (${outcome.failed.length}): ${detail}`);
      }
    },
    [apiUrl, onAccountsChanged],
  );

  const exportAll = () =>
    exportAccountsFile(allAccountsFileName(), serializeAccounts(allAccounts));

  const exportSelected = () => {
    const selectedData = allAccounts.filter((acc) => selectedAccounts.has(acc.id));
    exportAccountsFile(
      selectedAccountsFileName(selectedData.length),
      serializeAccounts(selectedData),
    );
  };

  const copySelected = async () => {
    const selectedData = allAccounts.filter((acc) => selectedAccounts.has(acc.id));
    try {
      await navigator.clipboard.writeText(serializeAccounts(selectedData));
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return {
    previewOpen,
    setPreviewOpen,
    duplicates,
    loading,
    startImport,
    confirmImport,
    exportAll,
    exportSelected,
    copySelected,
  };
};
