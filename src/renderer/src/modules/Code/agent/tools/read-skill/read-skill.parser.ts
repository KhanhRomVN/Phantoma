/**
 * ------------------------------------------------------------------
 * Read Skill Parser
 * ------------------------------------------------------------------
 * Parse nội dung tag read_skill từ phản hồi của AI thành params.
 *
 * Main types:
 * - ReadSkillParams : Params của tool (skill_id)
 *
 * Main functions:
 * - parseReadSkill() : Trích xuất và validate skill_id
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { extractParamValue } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ReadSkillParams {
  skill_id: string;
  _validationError?: string;
}

// ─── Functions ───────────────────────────────────────────────────────────────
export const parseReadSkill = (innerContent: string): ReadSkillParams => {
  const skillId = (extractParamValue(innerContent, 'skill_id') || innerContent).trim();

  if (!skillId) {
    const errorMsg = 'Missing required parameter: skill_id';
    console.error('[Phantoma][ReadSkillParser] Validation error:', {
      error: errorMsg,
      innerContent: innerContent.substring(0, 200),
    });
    return {
      skill_id: '',
      _validationError: errorMsg,
    };
  }

  return { skill_id: skillId };
};
