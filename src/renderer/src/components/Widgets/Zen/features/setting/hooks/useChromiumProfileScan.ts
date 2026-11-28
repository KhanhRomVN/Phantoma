/**
 * ------------------------------------------------------------------
 * useChromiumProfileScan
 * ------------------------------------------------------------------
 * Quét folder Chromium profile qua backend, có debounce, abort,
 * request identity (apiUrl + profileDir) và validate response.
 *
 * Main features:
 * - Response cũ không thể ghi đè state của path/backend mới
 * - Chỉ nhận subpaths dạng string[]
 * - Tự chọn subpath khi 0/1 kết quả; reset nếu selection không còn hợp lệ
 * ------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type ScanState =
  | { status: 'idle' }
  | { status: 'scanning' }
  | { status: 'done'; subpaths: string[] }
  | { status: 'error'; message: string };

interface UseChromiumProfileScanArgs {
  apiUrl: string;
  profileDir: string;
  subpath: string;
  onSubpathChange: (value: string) => void;
}

const SCAN_DEBOUNCE_MS = 800;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const normalizeBaseUrl = (url: string): string => url.trim().replace(/\/+$/, '');

type ParsedScan = { ok: true; subpaths: string[] } | { ok: false; message: string };

const parseScanResponse = (httpOk: boolean, json: unknown): ParsedScan => {
  const body = isRecord(json) ? json : null;
  const message = body && typeof body.message === 'string' ? body.message : undefined;

  if (!httpOk || !body || body.success !== true) {
    return { ok: false, message: message || 'Failed to scan folder' };
  }

  const raw = isRecord(body.data) ? body.data.subpaths : undefined;
  if (raw === undefined || raw === null) return { ok: true, subpaths: [] };

  if (!Array.isArray(raw) || !raw.every((item) => typeof item === 'string')) {
    return { ok: false, message: 'Invalid response from backend' };
  }
  return { ok: true, subpaths: raw as string[] };
};

export function useChromiumProfileScan({
  apiUrl,
  profileDir,
  subpath,
  onSubpathChange,
}: UseChromiumProfileScanArgs) {
  const [scanState, setScanState] = useState<ScanState>({ status: 'idle' });
  const [retryNonce, setRetryNonce] = useState(0);

  const subpathRef = useRef(subpath);
  subpathRef.current = subpath;
  const onSubpathChangeRef = useRef(onSubpathChange);
  onSubpathChangeRef.current = onSubpathChange;

  // Cache kết quả scan gần nhất theo (apiUrl chuẩn hóa + profileDir)
  const cacheRef = useRef<{ key: string; subpaths: string[] } | null>(null);

  const applySelection = useCallback((subpaths: string[]) => {
    if (subpaths.length === 0) {
      onSubpathChangeRef.current('');
    } else if (subpaths.length === 1) {
      onSubpathChangeRef.current(subpaths[0]);
    } else if (subpathRef.current && !subpaths.includes(subpathRef.current)) {
      // Nhiều subpath: selection cũ không còn tồn tại → bắt user chọn lại
      onSubpathChangeRef.current('');
    }
  }, []);

  useEffect(() => {
    const base = normalizeBaseUrl(apiUrl);
    if (!profileDir || !base) {
      setScanState({ status: 'idle' });
      return;
    }

    const key = `${base}\n${profileDir}`;
    const cached = cacheRef.current;
    if (cached && cached.key === key) {
      setScanState({ status: 'done', subpaths: cached.subpaths });
      applySelection(cached.subpaths);
      return;
    }

    setScanState({ status: 'idle' });
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setScanState({ status: 'scanning' });
      try {
        const res = await fetch(`${base}/v1/config/scan-profile-dir`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_dir: profileDir }),
          signal: controller.signal,
        });
        const json: unknown = await res.json().catch(() => null);
        if (controller.signal.aborted) return;

        const parsed = parseScanResponse(res.ok, json);
        if (!parsed.ok) {
          setScanState({ status: 'error', message: parsed.message });
          return;
        }

        cacheRef.current = { key, subpaths: parsed.subpaths };
        setScanState({ status: 'done', subpaths: parsed.subpaths });
        applySelection(parsed.subpaths);
      } catch {
        if (controller.signal.aborted) return;
        setScanState({ status: 'error', message: 'Cannot connect to backend' });
      }
    }, SCAN_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [apiUrl, profileDir, retryNonce, applySelection]);

  /** Quét lại thủ công (bỏ qua cache). */
  const retry = useCallback(() => {
    cacheRef.current = null;
    setRetryNonce((n) => n + 1);
  }, []);

  return { scanState, retry };
}
