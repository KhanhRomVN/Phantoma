/**
 * Welcome UI for Recon Server
 * Banner + interactive host/port picker
 */
import * as net from 'net';
import * as dns from 'dns';
import * as os from 'os';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// Version
let APP_VERSION = '1.0.0';
try {
  const pkg = require('../../package.json');
  APP_VERSION = pkg.version ?? APP_VERSION;
} catch {}

// ANSI helpers
const IS_TTY = Boolean(process.stdout.isTTY);
const USE_COLOR = IS_TTY && !process.env['NO_COLOR'];

const ansi = (code: string) => (t: string): string =>
  USE_COLOR ? `\x1b[${code}m${t}\x1b[0m` : t;

const fg256 = (n: number) => (t: string): string =>
  USE_COLOR ? `\x1b[38;5;${n}m${t}\x1b[0m` : t;

const bold = ansi('1');
const dim = ansi('2');
const green = ansi('1;32');
const cyan = ansi('1;36');
const blue = fg256(39);

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const vlen = (s: string): number => s.replace(ANSI_RE, '').length;
const padEnd = (s: string, width: number): string =>
  s + ' '.repeat(Math.max(0, width - vlen(s)));

// Layout
const MIN_WIDTH = 44;
const MAX_WIDTH = 72;

function cardWidth(): number {
  const cols = process.stdout.columns || 80;
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, cols - 4));
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of text.split(' ')) {
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= width) cur += ' ' + word;
    else {
      out.push(cur);
      cur = word;
    }
  }
  if (cur) out.push(cur);
  return out;
}

const print = (lines: string[]): void => lines.forEach((l) => console.log('  ' + l));

// Banner
const BANNER_LINES = [
  '██████╗ ███████╗ ██████╗ ██████╗ ███╗   ██╗',
  '██╔══██╗██╔════╝██╔════╝██╔═══██╗████╗  ██║',
  '██████╔╝█████╗  ██║     ██║   ██║██╔██╗ ██║',
  '██╔══██╗██╔══╝  ██║     ██║   ██║██║╚██╗██║',
  '██║  ██║███████╗╚██████╗╚██████╔╝██║ ╚████║',
  '╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝',
];

const GRADIENT = [141, 135, 129, 123, 117, 111];
const TAGLINE = 'Phantoma Recon Service';
const BANNER_WIDTH = 65;

function printBanner(): void {
  const cols = process.stdout.columns || 80;
  console.log();

  if (cols >= BANNER_WIDTH + 4) {
    BANNER_LINES.forEach((line, i) => {
      console.log('  ' + fg256(GRADIENT[i % GRADIENT.length])(line));
    });
    console.log();
  } else {
    console.log('  ' + fg256(135)('◆ ') + bold('RECON'));
  }

  console.log('  ' + bold(TAGLINE) + '  ' + dim(`v${APP_VERSION}`));
  console.log();
}

// About section
const AUTHOR = {
  name: 'KhanhRomVN',
  role: 'Author of Phantoma and its components',
  url: 'https://github.com/KhanhRomVN',
};

interface Tool {
  name: string;
  summary: string;
  description: string;
  url: string;
  install?: string;
}

const TOOLS: Tool[] = [
  {
    name: 'Zen',
    summary: 'AI coding agent for VS Code',
    description:
      'Chat with any LLM through API keys or free web accounts, with checkpoints, permission modes and a skills marketplace.',
    url: 'https://github.com/KhanhRomVN/Zen',
  },
  {
    name: 'ZenCLI',
    summary: 'AI coding agent for the terminal',
    description:
      'Terminal-native companion to Zen with a rich TUI, slash commands and persistent history.',
    install: 'npm install -g @khanhromvn/zencli',
    url: 'https://github.com/KhanhRomVN/ZenCLI',
  },
];

function sectionTitle(label: string, width: number): string {
  const rule = '─'.repeat(Math.max(2, width - vlen(label) - 4));
  return `${dim('──')} ${bold(label)} ${dim(rule)}`;
}

function printIntro(): void {
  const width = cardWidth();
  const bar = dim('│') + '  ';
  const textWidth = width - 4;
  const lines: string[] = [];

  lines.push(sectionTitle('Developer', width));
  lines.push('');
  lines.push(`${blue('◆')} ${bold(AUTHOR.name)}`);
  wrap(AUTHOR.role, textWidth).forEach((l) => lines.push(bar + dim(l)));
  lines.push(bar + cyan('↗ ') + cyan(AUTHOR.url));
  lines.push('');

  lines.push(sectionTitle('Companion tools', width));

  for (const tool of TOOLS) {
    lines.push('');
    lines.push(`${blue('◆')} ${bold(tool.name)}  ${dim(tool.summary)}`);
    wrap(tool.description, textWidth).forEach((l) => lines.push(bar + l));
    if (tool.install) {
      lines.push(bar + green('$ ') + bold(tool.install));
    }
    lines.push(bar + cyan('↗ ') + cyan(tool.url));
  }

  lines.push('');
  print(lines);
}

// Preferences
const PREFS_DIR = path.join(os.homedir(), '.phantoma-recon');
const PREFS_FILE = path.join(PREFS_DIR, 'preferences.json');

interface Preferences {
  lastPort?: number;
}

function loadPrefs(): Preferences {
  try {
    return JSON.parse(fs.readFileSync(PREFS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function savePrefs(prefs: Preferences): void {
  try {
    fs.mkdirSync(PREFS_DIR, { recursive: true });
    fs.writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2), 'utf8');
  } catch {}
}

function getLastPort(): number | undefined {
  return loadPrefs().lastPort;
}

function saveLastPort(port: number): void {
  savePrefs({ ...loadPrefs(), lastPort: port });
}

// Network helpers
function getLocalIPs(): string[] {
  const ifaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const ifname of Object.keys(ifaces)) {
    const addrs = ifaces[ifname];
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }
  return ips;
}

async function isPortFree(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, host);
  });
}

// Interactive prompt
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question('  ' + question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function showWelcome(
  defaultHost: string,
  defaultPort: number,
): Promise<{ host: string; port: number }> {
  printBanner();
  printIntro();

  // Non-interactive mode
  if (!IS_TTY) {
    return { host: defaultHost, port: defaultPort };
  }

  const lastPort = getLastPort();
  const suggestedPort = lastPort || defaultPort;

  console.log('  ' + sectionTitle('Configuration', cardWidth()));
  console.log();

  // Port
  const portAnswer = await prompt(
    `Port ${dim(`[${suggestedPort}]`)}: `,
  );
  const port = parseInt(portAnswer, 10) || suggestedPort;

  // Validate port
  if (!(await isPortFree(port, defaultHost))) {
    console.log('  ' + dim(`Port ${port} is already in use. Using default: ${defaultPort}`));
    saveLastPort(defaultPort);
    return { host: defaultHost, port: defaultPort };
  }

  saveLastPort(port);
  console.log();
  return { host: defaultHost, port };
}

export function printStarted(host: string, port: number): void {
  const width = cardWidth();
  const localIPs = getLocalIPs();

  console.log();
  console.log('  ' + green('✓') + ' ' + bold('RECON is running'));
  console.log();
  console.log('  ' + sectionTitle('Local', width));
  console.log('  ' + padEnd(bold('HTTP'), 11) + cyan(`http://localhost:${port}`));
  console.log();

  if (localIPs.length > 0) {
    console.log('  ' + sectionTitle('Network', width));
    localIPs.forEach((ip) => {
      console.log('  ' + padEnd(bold('HTTP'), 11) + cyan(`http://${ip}:${port}`));
    });
    console.log();
  }

  console.log('  ' + dim('Press Ctrl+C to stop.'));
  console.log();
}