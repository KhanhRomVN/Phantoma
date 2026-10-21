/**
 * ------------------------------------------------------------------
 * Command Display Normalizer
 * ------------------------------------------------------------------
 * Chuyển command line thô của tiến trình (từ `ps args=`) thành chuỗi
 * ngắn gọn, gần với lệnh người dùng đã gõ để hiển thị trên UI.
 * Ví dụ: `/x/flutter/bin/cache/dart-sdk/bin/dart ... flutter_tools.snapshot run -d linux`
 *        → `flutter run -d linux`
 *
 * Thứ tự xử lý:
 * 1. Launcher rules   : nhận diện wrapper đã exec sang runtime (flutter, gradlew)
 * 2. Node runtimes    : node/bun/deno <script> → tên package/bin (vite, npm, ...)
 * 3. Generic fallback : bỏ cờ VM của interpreter, rút gọn path tuyệt đối thành basename
 * ------------------------------------------------------------------
 */
import * as path from 'path';

const MAX_LENGTH = 120;
const NODE_RUNTIMES = new Set(['node', 'nodejs', 'bun', 'deno']);
const INTERPRETERS = new Set(['dart', 'java', 'ruby', 'perl', 'php', 'dotnet', ...NODE_RUNTIMES]);
const KEEP_FLAGS = new Set(['-m', '-jar', '-c', '-e', '-p', '--eval', '--print']);

const clip = (s: string): string => (s.length > MAX_LENGTH ? `${s.slice(0, MAX_LENGTH - 1)}…` : s);

const shortenToken = (token: string): string =>
  token.startsWith('/') ? path.posix.basename(token) || token : token;

const render = (name: string, rest: string[]): string =>
  [name, ...rest.map(shortenToken)].join(' ').trim();

function nodePackageName(script: string): string {
  const file = path.posix.basename(script);
  if (/^npx-cli/.test(file)) return 'npx';
  if (/^npm-cli/.test(file)) return 'npm';
  const marker = 'node_modules/';
  const at = script.lastIndexOf(marker);
  if (at >= 0) {
    const parts = script.slice(at + marker.length).split('/');
    if (parts[0] === '.bin') return parts[1] ?? file;
    return parts[0].startsWith('@') ? (parts[1] ?? parts[0]) : parts[0];
  }
  return file;
}

export function toDisplayCommand(args: string): string {
  const raw = args.trim();
  if (!raw) return '';

  const flutter = raw.match(/flutter_tools\.snapshot\s*(.*)$/);
  if (flutter) return clip(`flutter ${flutter[1]}`.trim());
  const gradle = raw.match(/GradleWrapperMain\s*(.*)$/);
  if (gradle) return clip(`gradlew ${gradle[1]}`.trim());

  const tokens = raw.split(/\s+/);
  const exe = path.posix.basename(tokens[0]);

  if (NODE_RUNTIMES.has(exe)) {
    const idx = tokens.findIndex((t, i) => i > 0 && !t.startsWith('-'));
    if (idx > 0) return clip(render(nodePackageName(tokens[idx]), tokens.slice(idx + 1)));
  }

  let rest = tokens.slice(1);
  if (INTERPRETERS.has(exe) || /^python[\d.]*$/.test(exe)) {
    while (rest.length > 0 && rest[0].startsWith('-') && !KEEP_FLAGS.has(rest[0])) {
      rest = rest.slice(1);
    }
  }
  return clip(render(exe, rest));
}