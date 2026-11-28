import path from 'path';
import type { GitDeps } from './git-helpers';

const LANGUAGE_BY_EXT = new Map<string, string>(
  Object.entries({
    ts: 'TypeScript',
    tsx: 'TypeScript',
    js: 'JavaScript',
    jsx: 'JavaScript',
    mjs: 'JavaScript',
    cjs: 'JavaScript',
    html: 'HTML',
    htm: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    vue: 'Vue',
    py: 'Python',
    go: 'Go',
    rs: 'Rust',
    java: 'Java',
    rb: 'Ruby',
    php: 'PHP',
    cs: 'C#',
    cpp: 'C++',
    c: 'C',
    swift: 'Swift',
    kt: 'Kotlin',
    sh: 'Shell',
  }),
);
const IGNORED_LANGUAGE_PATH = /(^|\/)(node_modules|dist|build|out|monaco|vendor)\//;

export const createLanguageStats = ({ git, fileSystem }: Pick<GitDeps, 'git' | 'fileSystem'>) => async (root: string) => {
  const list = await git.run(['ls-files', '-z'], root);
  if (list.error) return [];

  const files = list.stdout
    .split('\0')
    .filter((f) => f && !IGNORED_LANGUAGE_PATH.test(f) && !f.endsWith('.min.js'));
  const bytesByLang = new Map<string, number>();

  for (let i = 0; i < files.length; i += 200) {
    await Promise.all(
      files.slice(i, i + 200).map(async (f) => {
        const lang = LANGUAGE_BY_EXT.get(f.split('.').pop()?.toLowerCase() ?? '');
        if (!lang) return;
        try {
          const { size } = await fileSystem.stat(path.join(root, f));
          bytesByLang.set(lang, (bytesByLang.get(lang) ?? 0) + size);
        } catch {
          return;
        }
      }),
    );
  }

  const total = [...bytesByLang.values()].reduce((a, b) => a + b, 0);
  if (!total) return [];
  return [...bytesByLang.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({
      id: name.toLowerCase(),
      name,
      percentage: Math.round((bytes / total) * 1000) / 10,
    }));
};