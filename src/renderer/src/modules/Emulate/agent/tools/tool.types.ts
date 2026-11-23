import type { ZenModule } from '@renderer/components/Widgets/Zen/screens/Chat/services/moduleRegistry';

type ToolExecutor = NonNullable<ZenModule['executors']>[string];
type ToolParser = NonNullable<ZenModule['parsers']>[string];

/** Một tool của AI agent: tên tag, hàm thực thi và hàm parse nội dung tag. */
export interface EmulateTool {
  name: string;
  execute: ToolExecutor;
  parse: ToolParser;
}

export function isEmulateTool(value: unknown): value is EmulateTool {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<EmulateTool>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.execute === 'function' &&
    typeof candidate.parse === 'function'
  );
}
