import type { ComponentType } from 'react';

/**
 * Build a tool-name → renderer map from an import.meta.glob result.
 * File `ListHttpsRenderer.tsx` exporting `ListHttpsRenderer` becomes key `list_https`.
 */
export const rendererMapFromGlob = (
  mods: Record<string, any>,
  omit: string[] = [],
): Record<string, ComponentType<any>> => {
  const out: Record<string, ComponentType<any>> = {};
  for (const [filePath, mod] of Object.entries(mods)) {
    const name = (filePath.split('/').pop() || '').replace(/\.tsx$/, '');
    if (!name.endsWith('Renderer') || omit.includes(name)) continue;
    const Comp = mod[name];
    if (!Comp) continue;
    const key = name
      .slice(0, -'Renderer'.length)
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase();
    out[key] = Comp;
  }
  return out;
};