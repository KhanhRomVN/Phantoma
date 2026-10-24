import { extractParamValue } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/ToolParser';

export interface ReadSkillParams {
  skill_id: string;
  _validationError?: string;
}

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