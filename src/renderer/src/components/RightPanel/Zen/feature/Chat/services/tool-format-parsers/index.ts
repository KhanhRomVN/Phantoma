import { xmlFormat } from './XMLFormat';
import { jsonFormat } from './JSONFormat';
import { TOOL_FORMAT_IDS } from './types';
import type { ToolFormatDefinition, ToolFormatId } from './types';

export { TOOL_FORMAT_IDS } from './types';
export type {
  ToolCallSerializer,
  ToolCallSpec,
  ToolFormatDefinition,
  ToolFormatId,
} from './types';

const REGISTRY: Record<ToolFormatId, ToolFormatDefinition> = {
  xml: xmlFormat,
  json: jsonFormat,
};

export const DEFAULT_TOOL_FORMAT: ToolFormatId = 'json';

/** Fallback format when requested format has no parser (XML is most backward-compatible) */
export const FALLBACK_PARSER_FORMAT: ToolFormatId = 'xml';

/** Default supported formats when a prompt doesn't declare toolFormats (all available formats) */
export const DEFAULT_SUPPORTED_FORMATS: readonly ToolFormatId[] = TOOL_FORMAT_IDS;

export const isToolFormatId = (value: unknown): value is ToolFormatId =>
  typeof value === 'string' && (TOOL_FORMAT_IDS as readonly string[]).includes(value);

export const normalizeToolFormat = (
  value: unknown,
  fallback: ToolFormatId = DEFAULT_TOOL_FORMAT,
): ToolFormatId => (isToolFormatId(value) ? value : fallback);

export const getToolFormat = (id?: string | null): ToolFormatDefinition =>
  REGISTRY[normalizeToolFormat(id)];

export const listToolFormats = (supported?: readonly ToolFormatId[]): ToolFormatDefinition[] =>
  TOOL_FORMAT_IDS.filter((id) => !supported || supported.includes(id)).map((id) => REGISTRY[id]);

export const resolveToolFormat = (
  requested: unknown,
  supported?: readonly ToolFormatId[],
): ToolFormatId => {
  const format = normalizeToolFormat(requested);
  if (!supported || supported.length === 0 || supported.includes(format)) return format;
  return supported[0];
};