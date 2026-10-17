/**
 * ------------------------------------------------------------------
 * Skill Executor
 * ------------------------------------------------------------------
 * Thực thi read_skill tool — fetch chi tiết skill từ mcp.directory.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Controller ──
import { SkillController } from '@renderer/controller/SkillController';

// ─── Functions ──────────────────────────────────────────────────────────
export async function executeReadSkill(params: {
  skill_id: string;
  _validationError?: string;
}): Promise<string | null> {
  const skillId = params.skill_id || '';

  if (params._validationError) {
    return `[read_skill for '${skillId}'] Result: Error - ${params._validationError}`;
  }

  const result = await SkillController.readSkill(skillId);

  if (!result.success || !result.data) {
    return `[read_skill for '${skillId}'] Result: Error - ${result.error || 'Unknown error'}`;
  }

  const detail = result.data;
  const output = [
    `Name: ${detail.name}`,
    `Description: ${detail.description}`,
    `Author: ${detail.author || 'unknown'}`,
    `Views: ${detail.views ?? 0}`,
    `Installs: ${detail.installs ?? 0}`,
    '',
    detail.content || '',
  ].join('\n');

  return `[read_skill for '${skillId}'] Result:\n${output}`;
}