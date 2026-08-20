/**
 * ------------------------------------------------------------------
 * Runtime Component Renderer
 * ------------------------------------------------------------------
 * Transpile TSX source code stored inside a design and render it
 * as a React component without depending on the original template
 * folder.
 * ------------------------------------------------------------------
 */

import { logger } from '@renderer/utils/logger';
import { useMemo } from 'react';
import * as Babel from '@babel/standalone';
import * as React from 'react';
import * as LucideReact from 'lucide-react';
import * as JSXRuntime from 'react/jsx-runtime';

const externalModules: Record<string, unknown> = {
  react: React,
  'lucide-react': LucideReact,
  'react/jsx-runtime': JSXRuntime,
};

function resolvePath(base: string, importPath: string): string {
  const baseParts = base.split('/');
  baseParts.pop();

  const importParts = importPath.split('/');
  for (const part of importParts) {
    if (part === '.') continue;
    if (part === '..') baseParts.pop();
    else baseParts.push(part);
  }

  return baseParts.join('/');
}

function loadModule(
  moduleId: string,
  files: Record<string, string>,
  base?: string,
): unknown {
  if (externalModules[moduleId]) return externalModules[moduleId];

  const resolved = base ? resolvePath(base, moduleId) : moduleId;
  const source = files[resolved];
  if (!source) {
    throw new Error(`Cannot find module: ${moduleId} (resolved: ${resolved})`);
  }

  const code = Babel.transform(source, {
    filename: `${resolved}.tsx`,
    presets: [
      ['react', { runtime: 'automatic' }],
      ['typescript', { isTSX: true, allExtensions: true }],
    ],
    plugins: ['transform-modules-commonjs'],
  }).code;

  const module = { exports: {} as Record<string, unknown> };
  const require = (dep: string) => loadModule(dep, files, resolved);
  const fn = new Function('require', 'module', 'exports', code as string);
  fn(require, module, module.exports);

  return module.exports;
}

function getRuntimeComponent(
  componentPath: string,
  files: Record<string, string>,
): React.ComponentType<any> {
  const mod = loadModule(componentPath, files) as Record<string, unknown>;
  return (mod.default || mod) as React.ComponentType<any>;
}

export function useRuntimeComponent(
  componentPath: string,
  files?: Record<string, string>,
): React.ComponentType<any> {
  return useMemo(() => {
    if (!files || !files[componentPath]) {
      return () => <div>Component not found</div>;
    }

    try {
      return getRuntimeComponent(componentPath, files);
    } catch (error) {
      logger.error('[runtimeComponent] Failed to load', componentPath, error);
      return () => <div>Failed to load component</div>;
    }
  }, [componentPath, files]);
}