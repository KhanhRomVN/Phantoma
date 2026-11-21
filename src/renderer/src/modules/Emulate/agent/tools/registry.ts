import { browserToolExecutors } from './browser/browser.executor';
import { browserToolParsers } from './browser/browser.parser';
import { isEmulateTool, type EmulateTool } from './tool.types';
import { logger } from '../../shared/utils/logger.util';

/**
 * Tự động gom mọi tool: mỗi thư mục `agent/tools/<tool>/` có `index.ts`
 * export một `EmulateTool` và một file `<tool>.renderer.tsx`.
 * Thêm tool mới chỉ cần tạo thư mục, không phải sửa file này.
 */
const toolModules = import.meta.glob<Record<string, unknown>>('./*/index.ts', { eager: true });
const rendererModules = import.meta.glob('./*/*.renderer.tsx', { eager: true });

export const EMULATE_TOOLS: readonly EmulateTool[] = Object.values(toolModules).flatMap((mod) =>
  Object.values(mod).filter(isEmulateTool),
);

export const emulateExecutors = {
  ...Object.fromEntries(EMULATE_TOOLS.map((tool) => [tool.name, tool.execute])),
  ...browserToolExecutors,
};

export const emulateParsers = {
  ...Object.fromEntries(EMULATE_TOOLS.map((tool) => [tool.name, tool.parse])),
  ...browserToolParsers,
};

const toPascalCase = (kebab: string): string =>
  kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

/**
 * `rendererMapFromGlob` (module Chat) nhận key dạng `./renderers/<Pascal>Renderer.tsx`;
 * giữ nguyên định dạng đó để không phụ thuộc vào cách thư mục được tổ chức.
 */
export const emulateRendererModules: Record<string, unknown> = Object.fromEntries(
  Object.entries(rendererModules).map(([path, mod]) => {
    const folder = path.split('/')[1];
    return [`./renderers/${toPascalCase(folder)}Renderer.tsx`, mod];
  }),
);

if (import.meta.env.DEV && EMULATE_TOOLS.length !== Object.keys(rendererModules).length) {
  logger.error(
    `[Emulate] Số tool (${EMULATE_TOOLS.length}) khác số renderer (${Object.keys(rendererModules).length}); kiểm tra thư mục agent/tools.`,
  );
}
