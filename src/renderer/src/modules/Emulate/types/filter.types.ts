/**
 * ------------------------------------------------------------------
 * Filter Types
 * ------------------------------------------------------------------
 * Type definitions cho bộ lọc requests trong Inspector/RequestTable.
 * Bao gồm filter theo method, host, path, status, type, size, time.
 *
 * Các types chính:
 * - InspectorFilter   : Cấu trúc filter hoàn chỉnh
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import { HttpMethod } from '../constants/methods';

// ─── Types ──────────────────────────────────────────────────────────────
export interface InspectorFilter {
  methods: Record<HttpMethod, boolean>;
  host: {
    whitelist: string[];
  };
  path: {
    whitelist: string[];
  };
  status: Record<string, boolean>;
  type: {
    xhr: boolean;
    js: boolean;
    css: boolean;
    img: boolean;
    media: boolean;
    font: boolean;
    doc: boolean;
    ws: boolean;
    wasm: boolean;
    manifest: boolean;
    other: boolean;
  };
  size: {
    min: string;
    max: string;
  };
  time: {
    min: string;
    max: string;
  };
}
