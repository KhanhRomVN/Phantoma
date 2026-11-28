/**
 * ------------------------------------------------------------------
 * Skill Groups Service (IPC)
 * ------------------------------------------------------------------
 * Load/save group metadata qua main process
 * (channel giữ nguyên: skill:load-workspace-state / skill:save-workspace-state).
 * Lỗi được throw để hook phân biệt load-error với workspace rỗng.
 * ------------------------------------------------------------------
 */

import type { SkillWorkspaceState } from "../types/skill-workspace.types";
import { invokeSkillIpc } from "./skill-ipc.bridge";

export async function loadSkillGroups(): Promise<SkillWorkspaceState> {
  const data = await invokeSkillIpc<SkillWorkspaceState>(
    "skill:load-workspace-state",
  );
  return {
    groups: Array.isArray(data?.groups) ? data.groups : [],
  };
}

export async function saveSkillGroups(
  state: SkillWorkspaceState,
): Promise<void> {
  await invokeSkillIpc("skill:save-workspace-state", { state });
}
