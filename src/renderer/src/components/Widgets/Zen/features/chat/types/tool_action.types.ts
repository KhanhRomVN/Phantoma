import type { TagType } from './tag.types';

export interface ToolAction {
  type: TagType;
  params: Record<string, any>;
  rawXml: string;
  isError?: boolean;
  errorMessage?: string;
  errorCode?: string;
}