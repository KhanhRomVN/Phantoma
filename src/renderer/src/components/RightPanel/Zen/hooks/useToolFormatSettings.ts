/**
 * ------------------------------------------------------------------
 * useToolFormatSettings
 * ------------------------------------------------------------------
 * Quản lý toolFormat ('xml' | 'json') per (providerId, modelId).
 *
 * Mặc định là 'json'.
 * Lưu vào localStorage với key:
 *   zen_tool_format__<providerId>__<modelId>
 *
 * Khi chưa có preset cho model đó → fallback về 'json'.
 * Khi model thay đổi → tự động load lại preset của model mới.
 * ------------------------------------------------------------------
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Storage helpers ──────────────────────────────────────────────────────

const storageKey = (providerId: string, modelId: string) =>
  `zen_tool_format__${providerId}__${modelId}`;

const loadToolFormat = (providerId: string, modelId: string): 'xml' | 'json' => {
  try {
    const key = storageKey(providerId, modelId);
    const raw = localStorage.getItem(key);
    const result: 'xml' | 'json' = raw === 'xml' ? 'xml' : 'json';
    return result;
  } catch (e) {
    console.warn('[ToolFormat] load failed:', e);
  }
  return 'json';
};

const saveToolFormat = (providerId: string, modelId: string, format: 'xml' | 'json') => {
  try {
    const key = storageKey(providerId, modelId);
    localStorage.setItem(key, format);
  } catch (e) {
    console.warn('[ToolFormat] save failed:', e);
  }
};

// Helper to split model id base from effort suffix (e.g. "gpt-4-high" -> "gpt-4")
function splitModelAndEffort(modelId: string): { base: string; effort: string | null } {
  const suffixes = ['-low', '-medium', '-high'];
  for (const suffix of suffixes) {
    if (modelId.endsWith(suffix)) {
      return {
        base: modelId.slice(0, -suffix.length),
        effort: suffix.slice(1),
      };
    }
  }
  return { base: modelId, effort: null };
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useToolFormatSettings(
  providerId: string | null | undefined,
  rawModelId: string | null | undefined,
) {
  // Effort nằm trong model id (<base>-<effort>) → bỏ suffix để đổi effort
  // không làm đổi toolFormat (xml/json) của model.
  const modelId = rawModelId ? splitModelAndEffort(rawModelId).base : rawModelId;

  // Khởi tạo từ preset của model (nếu có) hoặc default 'xml'
  const [toolFormat, setToolFormatState] = useState<'xml' | 'json'>(() => {
    if (providerId && modelId) {
      return loadToolFormat(providerId, modelId);
    }
    return 'json';
  });

  // Track model key để detect khi model thực sự thay đổi
  const prevModelKeyRef = useRef<string | null>(
    providerId && modelId ? `${providerId}__${modelId}` : null,
  );

  // Khi model thay đổi → load preset của model mới
  useEffect(() => {
    const modelKey = providerId && modelId ? `${providerId}__${modelId}` : null;
    if (modelKey === prevModelKeyRef.current) return;
    prevModelKeyRef.current = modelKey;

    if (providerId && modelId) {
      const loaded = loadToolFormat(providerId, modelId);
      setToolFormatState(loaded);
    } else {
      setToolFormatState('json');
    }
  }, [providerId, modelId]);

  // Setter: lưu per-model
  const setToolFormat = useCallback(
    (format: 'xml' | 'json') => {
      setToolFormatState(format);
      if (providerId && modelId) {
        saveToolFormat(providerId, modelId, format);
      } else {
        console.warn(
          '[ToolFormat] setToolFormat called but no providerId/modelId — not persisted',
        );
      }
    },
    [providerId, modelId],
  );

  // Toggle helper
  const toggleToolFormat = useCallback(() => {
    const next = toolFormat === 'xml' ? 'json' : 'xml';
    setToolFormat(next);
  }, [toolFormat, setToolFormat]);

  return {
    toolFormat,
    setToolFormat,
    toggleToolFormat,
  };
}