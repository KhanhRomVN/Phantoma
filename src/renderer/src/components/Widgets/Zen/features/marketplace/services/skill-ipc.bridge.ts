/**
 * ------------------------------------------------------------------
 * Skill IPC bridge
 * ------------------------------------------------------------------
 * Transport helper dùng chung cho các service skill:
 * - đọc `window.api.invoke`
 * - chuẩn hoá envelope `{ success, data, error }`
 * - throw SkillIpcError khi thất bại (KHÔNG nuốt lỗi, KHÔNG log lặp)
 *
 * Hook/UI quyết định fallback, thông báo và retry.
 * Command/payload/response giữ nguyên theo main process.
 * ------------------------------------------------------------------
 */

interface IpcEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class SkillIpcError extends Error {
  readonly command: string;

  constructor(command: string, message: string, cause?: unknown) {
    super(message);
    this.name = "SkillIpcError";
    this.command = command;
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

type InvokeFn = (command: string, payload?: unknown) => Promise<unknown>;

function getInvoke(): InvokeFn | null {
  const api = (window as unknown as { api?: { invoke?: InvokeFn } }).api;
  return typeof api?.invoke === "function" ? api.invoke.bind(api) : null;
}

/**
 * Gọi 1 IPC command. Resolve với `data` (có thể `undefined` nếu main
 * không trả data); reject với SkillIpcError nếu bridge thiếu / success=false / throw.
 */
export async function invokeSkillIpc<T = unknown>(
  command: string,
  payload?: unknown,
): Promise<T | undefined> {
  const invoke = getInvoke();
  if (!invoke) throw new SkillIpcError(command, "API bridge not available");

  let res: IpcEnvelope<T> | undefined;
  try {
    res = (await invoke(command, payload)) as IpcEnvelope<T> | undefined;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new SkillIpcError(command, message, err);
  }

  if (!res?.success) {
    throw new SkillIpcError(command, res?.error || "Unknown error from skill API");
  }
  return res.data;
}
