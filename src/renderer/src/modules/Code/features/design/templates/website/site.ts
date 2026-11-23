export const SITE = {
  name: 'Phantoma',
  tagline: 'The desktop platform for security and network analysis',
  author: 'KhanhRomVN',
  email: 'khanhromvn@gmail.com',
  repo: 'https://github.com/KhanhRomVN/Phantoma',
};

export const NAV = [
  { label: 'Modules', route: '/' },
  { label: 'Emulate', route: '/emulate' },
  { label: 'AI Agent', route: '/agent' },
  { label: 'Download', route: '/download' },
  { label: 'FAQ', route: '/faq' },
];

export const VERBS: [string, string][] = [
  ['Map', 'find what it hides.'],
  ['Inspect', 'every page and request.'],
  ['Intercept', 'HTTP, HTTPS and WebSocket.'],
  ['Replay', 'with your own headers.'],
  ['Automate', 'the boring parts.'],
  ['Report', 'in Markdown.'],
];

export const AGENTS =
  'Claude Codex Gemini Copilot Cursor Aider Goose Amp OpenCode Cline Continue Qoder Grok Kimi Devin Kiro Kilo Codebuff'.split(
    ' ',
  );

export interface ModuleInfo {
  id: string;
  title: string;
  description: string;
  icon: string;
  wide?: boolean;
  bullets: string[];
}

export const MODULES: ModuleInfo[] = [
  {
    id: 'recon',
    title: 'Recon',
    description: 'Drive a real browser to map targets, inspect pages and capture evidence.',
    icon: 'globe',
    bullets: [
      'Navigate, click, fill, scroll and wait',
      'Multi-tab sessions side by side',
      'Screenshots and JS evaluation',
    ],
  },
  {
    id: 'emulate',
    title: 'Emulate',
    description:
      'Intercept HTTP, HTTPS and WebSocket traffic on websites, PC apps, Android apps and CLI tools.',
    icon: 'act',
    wide: true,
    bullets: [
      'MITM, CDP or Frida interception',
      'Filter by method, host, path, status, type, size and time',
      'Replay and fuzz requests, inspect resources and sources',
      'Write Markdown reports per target',
    ],
  },
  {
    id: 'code',
    title: 'Code workspace',
    description:
      'Terminals, files, notes and a built-in browser tiled in a 2×2 grid of draggable panes.',
    icon: 'terminal',
    wide: true,
    bullets: [
      'Monaco editor with LSP and file watching',
      'Git view with diff, commit detail and graph',
      'Task Manager: Kanban, Table and Timeline',
      'ZenCLI conversations resume per terminal',
    ],
  },
  {
    id: 'agent',
    title: 'AI Agent',
    description: 'An agent that reads, edits and runs commands inside your workspace.',
    icon: 'spark',
    bullets: ['Reviewable edits on real files', 'Runs commands and reports output'],
  },
  {
    id: 'design',
    title: 'Design',
    description: 'Sketch page flows as a diagram and preview every page live.',
    icon: 'layout',
    bullets: ['Live React and Tailwind preview', 'Device presets for responsive checks'],
  },
  {
    id: 'redteam',
    title: 'Built for red team work',
    description:
      'Purpose-built flows for pentest and red team engagements. Recon, analysis and notes live in one place, and everything stays on your machine.',
    icon: 'shield',
    wide: true,
    bullets: [],
  },
];

export const STEPS = [
  {
    title: 'Discover',
    description: 'Map the target with Recon and the built-in browser, collecting pages and endpoints.',
  },
  {
    title: 'Analyze',
    description: 'Let the agent and Emulate tools dig into sources, resources and behaviour.',
  },
  {
    title: 'Act',
    description: 'Take notes, run commands and keep every result inside one workspace.',
  },
];

export const TABS: [string, string, string[]][] = [
  [
    'Home',
    'Request inspector and interceptor for HTTP and WebSocket traffic.',
    ['Filters', 'Per-target', 'Live HTTPS count'],
  ],
  [
    'Repeater',
    'Replay requests with editable headers, body and params. Attach payload lists and fuzz, then compare every run.',
    ['Body', 'Headers', 'Params', 'Payload', 'History'],
  ],
  [
    'Resource',
    'Preview images, video, audio, WASM, fonts and documents captured from the target.',
    ['Image', 'Video', 'Audio', 'WASM', 'Font'],
  ],
  ['Source', 'Browse the target’s source files in a tree viewer.', ['File tree', 'Source detail']],
  [
    'Report',
    'Write and review Markdown reports per target, with a file list you can create, update and delete.',
    ['Markdown', 'Per target'],
  ],
  ['Log', 'Stream Android logcat next to your traffic.', ['Android', 'logcat']],
  ['Device', 'Manage Android devices for capture.', ['Android', 'Device panel']],
];

export const MODES = {
  full: [
    'Full Access: the agent uses every tool without asking.',
    'Ran 40 requests…<br>2 differ from baseline',
  ],
  ask: [
    'Approval Required: file edits and shell commands wait for your confirmation on each call.',
    'Waiting for approval…<div class="ask"><span>Allow</span><span>Deny</span></div>',
  ],
} as const;

export const PROVIDERS = [
  'Claude',
  'Codex',
  'Gemini',
  'DeepSeek',
  'XML or JSON tools',
  'Skills + MCP marketplace',
  'Multi-account',
];

export const FAQS: [string, string][] = [
  ['Is Phantoma free?', 'Yes. It is an open-source project hosted on GitHub.'],
  [
    'Where does my data go?',
    'Everything stays on your machine. Phantoma keeps traffic, reports and projects locally.',
  ],
  [
    'What can I intercept?',
    'HTTP, HTTPS and WebSocket traffic from websites, PC desktop apps, Android apps and CLI tools, using MITM, CDP or Frida. CLI capture also supports eBPF, PCAP and App Debug.',
  ],
  [
    'Which AI providers work with the agent?',
    'Multiple accounts and providers, including Claude, Codex, Gemini and DeepSeek. You choose the provider and model per conversation.',
  ],
  [
    'Can the agent change my files?',
    'Only as you allow. In Approval Required mode every file edit and shell command needs your confirmation. Full Access lets it work without asking.',
  ],
  [
    'Has Phantoma been audited?',
    'No. It has no certifications or security audits. Use it on systems you are authorised to test.',
  ],
];