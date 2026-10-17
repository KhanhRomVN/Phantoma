/**
 * ------------------------------------------------------------------
 * Skill Controller
 * ------------------------------------------------------------------
 * Singleton controller cho Skill feature. Gọi IPC handler ở main
 * process để fetch chi tiết skill từ mcp.directory.
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
export interface SkillDetail {
  id: string;
  name: string;
  description: string;
  author?: string;
  views?: number;
  installs?: number;
  content?: string;
}

export interface SkillControllerResult {
  success: boolean;
  data?: SkillDetail;
  error?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
function getIpc() {
  return (window as any).electron?.ipcRenderer;
}

// ─── Controller ─────────────────────────────────────────────────────────
export class SkillController {
  public static async readSkill(skillId: string): Promise<SkillControllerResult> {
    const ipc = getIpc();
    if (!ipc) return { success: false, error: 'Electron IPC not available' };
    try {
      const result = await ipc.invoke('skill:read', { skill_id: skillId });
      if (!result?.success) {
        return { success: false, error: result?.error || 'Unknown error' };
      }
      return { success: true, data: result.detail };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }
}