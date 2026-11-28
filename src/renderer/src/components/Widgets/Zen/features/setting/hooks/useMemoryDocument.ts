/**
 * ------------------------------------------------------------------
 * useMemoryDocument
 * ------------------------------------------------------------------
 * Vòng đời đọc/lưu file memory.md với autosave debounce.
 *
 * Main features:
 * - Revision-based dirty tracking (không dùng 1 boolean cho nhiều save)
 * - Save tuần tự: bản mới nhất luôn được lưu sau cùng
 * - Flush pending edit khi unmount / tắt Memory
 * - Reload bị chặn khi còn draft chưa lưu; bỏ response load cũ
 * - Thiếu method hoặc response không success → báo lỗi, không báo Saved giả
 * ------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { electronWidgetBridge } from '../../../shared/platform/electron-widget-bridge.service';

export type MemorySaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// TODO: chuyển vào type của ExtensionService sau khi xác minh IPC contract.
interface MemoryApi {
  getMemorySnapshot?: () => Promise<string | null | undefined>;
  saveMemory?: (content: string) => Promise<{ success: boolean; error?: string } | undefined>;
}

const getMemoryApi = (): MemoryApi => electronWidgetBridge as unknown as MemoryApi;

const getErrorMessage = (e: unknown, fallback: string): string =>
  e instanceof Error && e.message ? e.message : fallback;

const SAVE_DEBOUNCE_MS = 1000;
const SAVED_BADGE_MS = 2000;

type Timer = ReturnType<typeof setTimeout>;

export function useMemoryDocument(enabled: boolean) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<MemorySaveStatus>('idle');
  const [dirty, setDirty] = useState(false);

  const contentRef = useRef('');
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const savingRef = useRef(false);
  const loadSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const debounceRef = useRef<Timer | null>(null);
  const statusTimerRef = useRef<Timer | null>(null);

  const clearDebounce = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
  };
  const clearStatusTimer = () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = null;
  };

  /** Lưu tuần tự cho tới khi revision đã lưu == revision mới nhất. */
  const flush = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      while (savedRevisionRef.current < revisionRef.current) {
        const revision = revisionRef.current;
        const text = contentRef.current;
        if (mountedRef.current) setStatus('saving');
        try {
          const api = getMemoryApi();
          if (!api.saveMemory) {
            throw new Error('Memory save is not supported by the extension service.');
          }
          const result = await api.saveMemory(text);
          if (!result || !result.success) {
            throw new Error(result?.error || 'Failed to save memory file.');
          }
          savedRevisionRef.current = revision;
        } catch (e) {
          if (mountedRef.current) {
            setStatus('error');
            setError(getErrorMessage(e, 'Failed to save memory file.'));
          }
          return; // giữ dirty để retry
        }
      }

      if (mountedRef.current) {
        setDirty(false);
        setError(null);
        setStatus('saved');
        clearStatusTimer();
        statusTimerRef.current = setTimeout(() => {
          setStatus((prev) => (prev === 'saved' ? 'idle' : prev));
        }, SAVED_BADGE_MS);
      }
    } finally {
      savingRef.current = false;
    }
  }, []);

  const load = useCallback(async () => {
    // Không cho reload ghi đè draft chưa lưu
    if (savingRef.current || savedRevisionRef.current < revisionRef.current) return;

    const seq = ++loadSeqRef.current;
    const startRevision = revisionRef.current;
    setLoading(true);
    setError(null);
    try {
      const api = getMemoryApi();
      if (!api.getMemorySnapshot) {
        throw new Error('Memory read is not supported by the extension service.');
      }
      const snapshot = await api.getMemorySnapshot();
      if (
        !mountedRef.current ||
        seq !== loadSeqRef.current ||
        startRevision !== revisionRef.current
      ) {
        return; // response cũ / user đã gõ trong lúc load
      }
      const text = typeof snapshot === 'string' ? snapshot : '';
      contentRef.current = text;
      setContent(text);
      setStatus('idle');
    } catch (e) {
      if (mountedRef.current && seq === loadSeqRef.current) {
        setError(getErrorMessage(e, 'Failed to load memory file.'));
      }
    } finally {
      if (mountedRef.current && seq === loadSeqRef.current) setLoading(false);
    }
  }, []);

  const onChange = useCallback(
    (value: string) => {
      contentRef.current = value;
      revisionRef.current += 1;
      setContent(value);
      setDirty(true);
      setStatus('idle');
      clearStatusTimer();
      clearDebounce();
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void flush();
      }, SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  // Bật Memory → tải snapshot; tắt Memory → flush pending edit (không xóa file)
  useEffect(() => {
    if (enabled) {
      void load();
    } else if (savedRevisionRef.current < revisionRef.current) {
      clearDebounce();
      void flush();
    }
  }, [enabled, load, flush]);

  // Unmount (chuyển tab / đóng Drawer): flush draft đang chờ thay vì hủy
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearDebounce();
      clearStatusTimer();
      if (savedRevisionRef.current < revisionRef.current) {
        void flush();
      }
    };
  }, [flush]);

  return {
    content,
    loading,
    error,
    status,
    dirty,
    onChange,
    reload: load,
    retry: flush,
  };
}
