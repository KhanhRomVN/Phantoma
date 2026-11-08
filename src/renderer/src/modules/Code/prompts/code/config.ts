import type { ZenModuleCapabilities } from '@renderer/components/Widgets/Zen/feature/Chat/services/moduleRegistry';

export type SystemPromptMode = 'fast' | 'balanced' | 'thorough';

export const MAX_READ_LINES_PER_TURN = 1500;

export interface ModeBehaviorConfig {
  askConfirmation: 'minimal' | 'moderate' | 'extensive' | 'almost-never';
  commentStyle: 'minimal' | 'standard' | 'comprehensive';
  testBehavior: 'none' | 'propose-existing' | 'write-new';
  explanationLevel: 'one-line' | 'brief' | 'detailed';
  readBeforeEdit: boolean;
  maxBatchSize: number;
  runVerifyAfterChange: boolean;
}

export const MODE_BEHAVIORS: Record<SystemPromptMode, ModeBehaviorConfig> = {
  fast: {
    askConfirmation: 'minimal',
    commentStyle: 'minimal',
    testBehavior: 'none',
    explanationLevel: 'one-line',
    readBeforeEdit: true,
    maxBatchSize: 5,
    runVerifyAfterChange: false,
  },
  balanced: {
    askConfirmation: 'moderate',
    commentStyle: 'standard',
    testBehavior: 'propose-existing',
    explanationLevel: 'brief',
    readBeforeEdit: true,
    maxBatchSize: 3,
    runVerifyAfterChange: false,
  },
  thorough: {
    askConfirmation: 'extensive',
    commentStyle: 'comprehensive',
    testBehavior: 'write-new',
    explanationLevel: 'detailed',
    readBeforeEdit: true,
    maxBatchSize: 2,
    runVerifyAfterChange: true,
  },
};

/**
 * Capabilities for the main Code assistant — nguồn sự thật duy nhất cho toolbar và build prompt.
 * promptLength / styleCode: false hoặc bỏ trống = tắt; `{ options, default }` = tập lựa chọn riêng
 * (1 phần tử = cố định, UI ẩn selector). toolFormats cần ≥ 1 phần tử.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: { options: ['none', 'short', 'medium', 'long'], default: 'long' },
  styleCode: { options: Object.keys(MODE_BEHAVIORS), default: 'balanced' },
  skill: true,
  memory: true,
  toolFormats: ['xml', 'json'],
  features: { commitMessage: true },
};
