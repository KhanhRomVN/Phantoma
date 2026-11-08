import type { ParsedResponse } from '../responseParser';

export const TOOL_FORMAT_IDS = ['xml', 'json'] as const;

export type ToolFormatId = (typeof TOOL_FORMAT_IDS)[number];

export interface ToolCallSpec {
  tool: string;
  params: Record<string, unknown>;
}

export type ToolCallSerializer = (call: ToolCallSpec) => string;

export interface ToolFormatDefinition {
  id: ToolFormatId;
  label: string;
  description: string;
  colorVar: string;
  normalize?: (content: string) => string;
  parse?: (content: string, base: ParsedResponse, feature?: string | null) => ParsedResponse | null;
  serializeCall?: ToolCallSerializer;
}