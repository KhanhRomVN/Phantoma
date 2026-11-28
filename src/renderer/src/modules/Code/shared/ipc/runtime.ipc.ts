/**
 * ------------------------------------------------------------------
 * Runtime IPC
 * ------------------------------------------------------------------
 * Wrapper mỏng quanh window.api.runtime để lấy thông tin runtime của
 * Code server (cổng kết nối).
 *
 * Main constants:
 * - runtimeIpc : Tập hàm getCodePorts
 * ------------------------------------------------------------------
 */

// ─── Constants ───────────────────────────────────────────────────────────────
export const runtimeIpc = {
  getCodePorts: async (): Promise<{ code?: number } | undefined> => {
    const runtime = (window as any).api?.runtime;
    return runtime?.startCode ? await runtime.startCode() : await runtime?.getPorts();
  },
};