import os from 'os';

let APP_VERSION = '?.?.?';
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require('../../package.json');
  APP_VERSION = pkg.version ?? APP_VERSION;
} catch {
  APP_VERSION = '?.?.?';
}

const USE_COLOR = Boolean(process.stdout.isTTY) && !process.env['NO_COLOR'];

const ansi =
  (code: string) =>
  (t: string): string =>
    USE_COLOR ? `\x1b[${code}m${t}\x1b[0m` : t;

const fg256 =
  (n: number) =>
  (t: string): string =>
    USE_COLOR ? `\x1b[38;5;${n}m${t}\x1b[0m` : t;

const bold = ansi('1');
const dim = ansi('2');
const green = ansi('1;32');
const cyan = ansi('1;36');

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const vlen = (s: string): number => s.replace(ANSI_RE, '').length;
const padEnd = (s: string, width: number): string => s + ' '.repeat(Math.max(0, width - vlen(s)));

const print = (lines: string[]): void => lines.forEach((l) => console.log('  ' + l));

function cardWidth(): number {
  const cols = process.stdout.columns || 80;
  return Math.max(44, Math.min(72, cols - 4));
}

function sectionTitle(label: string, width: number): string {
  const rule = '─'.repeat(Math.max(2, width - vlen(label) - 4));
  return `${dim('──')} ${bold(label)} ${dim(rule)}`;
}

export function printBanner(): void {
  console.log();
  console.log('  ' + fg256(45)('◆ ') + bold('Phantoma Profile Server') + '  ' + dim(`v${APP_VERSION}`));
  console.log('  ' + dim('Profile sources, browser folders and saved logins'));
  console.log();
}

function lanAddress(): string | null {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) return ni.address;
    }
  }
  return null;
}

export function printStarted(port: number, dataDir: string): void {
  const width = cardWidth();
  const LABEL_W = 6;
  const lan = lanAddress();

  const endpoints = (hostname: string): string[] => [
    `${dim(padEnd('API', LABEL_W))}  ${cyan(`http://${hostname}:${port}/api/v1`)}`,
    `${dim(padEnd('Health', LABEL_W))}  ${cyan(`http://${hostname}:${port}/health`)}`,
  ];

  const lines: string[] = [
    `${green('✓')} ${bold('Profile server is running')}`,
    '',
    sectionTitle('Local', width),
    ...endpoints('localhost'),
  ];

  if (lan) lines.push('', sectionTitle('Network', width), ...endpoints(lan));

  lines.push('', sectionTitle('Data', width), `${dim(padEnd('Dir', LABEL_W))}  ${dataDir}`);
  lines.push('', dim('Press Ctrl+C to stop.'));

  console.log();
  print(lines);
  console.log();
}