import type { ContentBlock } from './renderer.types';
import type { ToolAction } from './tool_action.types';

export interface ParsedResponse {
  followupQuestion: string | null;
  followupOptions: string[] | null;
  taskName: string | null;
  actions: ToolAction[];
  contentBlocks: ContentBlock[];
  displayText: string;
  question: ContentBlock | null;
  onlyThinkingDetected?: boolean;
}