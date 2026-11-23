import { FolderOpen } from 'lucide-react';
import { getFileIconPath } from '@renderer/utils/file-icon';
import { type StackInfo } from '../../../utils/detect-stack.util';

export const LANG_EXT: Record<string, string> = {
  typescript: 'ts',
  javascript: 'js',
  python: 'py',
  go: 'go',
  rust: 'rs',
  java: 'java',
  kotlin: 'kt',
  swift: 'swift',
  ruby: 'rb',
  php: 'php',
  csharp: 'cs',
  'c#': 'cs',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  html: 'html',
  css: 'css',
  scss: 'scss',
  vue: 'vue',
  svelte: 'svelte',
  dart: 'dart',
  lua: 'lua',
  shell: 'sh',
  json: 'json',
  markdown: 'md',
};

export function LanguageBadgeIcon({ stack, className = 'w-4 h-4' }: { stack?: StackInfo; className?: string }) {
  const top = stack?.languages?.length
    ? stack.languages.reduce((a, b) => (b.percentage > a.percentage ? b : a))
    : undefined;
  const key = (top?.id ?? stack?.primaryLanguage ?? '').toLowerCase();
  if (!key) return <FolderOpen className={className} />;
  return (
    <img
      src={getFileIconPath(`file.${LANG_EXT[key] ?? key}`)}
      alt=""
      className={`${className} object-contain`}
      draggable={false}
    />
  );
}
