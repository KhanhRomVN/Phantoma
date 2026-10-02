/**
 * AI Agent Detector Utility
 * Based on Orca's detection mechanisms for process names and OSC titles.
 */

export type TuiAgentId =
  | 'claude' | 'codex' | 'gemini' | 'copilot' | 'cursor'
  | 'aider' | 'goose' | 'amp' | 'opencode' | 'cline'
  | 'continue' | 'antigravity' | 'qoder' | 'grok' | 'muse'
  | 'kimi' | 'droid' | 'mistral-vibe' | 'qwen-code' | 'hermes'
  | 'aug' | 'trae' | 'dsh' | 'zcode' | 'devin' | 'kiro'
  | 'kilo' | 'pi' | 'omp' | 'rovo' | 'codebuff' | 'codebuddy'
  | 'openclaude' | 'mimo-code' | 'ante' | 'command-code'
  | 'autohand' | 'freebuff' | 'crush' | 'openclaw' | 'prime-agent';

interface ProviderConfig {
  id: TuiAgentId;
  detectCmd: string;
  aliases?: string[];
  expectedProcess: string;
  processPrefix?: string;
}

const PROVIDER_REGISTRY: ProviderConfig[] = [
  { id: 'claude', detectCmd: 'claude', expectedProcess: 'claude' },
  { id: 'codex', detectCmd: 'codex', expectedProcess: 'codex', processPrefix: 'codex-' },
  { id: 'gemini', detectCmd: 'gemini', expectedProcess: 'gemini' },
  { id: 'copilot', detectCmd: 'copilot', expectedProcess: 'copilot' },
  { id: 'cursor', detectCmd: 'cursor-agent', expectedProcess: 'cursor-agent' },
  { id: 'aider', detectCmd: 'aider', expectedProcess: 'aider' },
  { id: 'goose', detectCmd: 'goose', expectedProcess: 'goose' },
  { id: 'amp', detectCmd: 'amp', expectedProcess: 'amp' },
  { id: 'opencode', detectCmd: 'opencode', expectedProcess: 'opencode' },
  { id: 'cline', detectCmd: 'cline', expectedProcess: 'cline' },
  { id: 'continue', detectCmd: 'cn', expectedProcess: 'cn' }, // 'continue' is builtin
  { id: 'antigravity', detectCmd: 'agy', expectedProcess: 'agy' },
  { id: 'qoder', detectCmd: 'qodercli', expectedProcess: 'qodercli', processPrefix: 'qodercli-' },
  { id: 'grok', detectCmd: 'grok', expectedProcess: 'grok', processPrefix: 'grok-' },
  { id: 'muse', detectCmd: 'muse', expectedProcess: 'muse', processPrefix: 'muse-bin-' },
  { id: 'kimi', detectCmd: 'kimi', aliases: ['kimi-code'], expectedProcess: 'kimi' },
  { id: 'droid', detectCmd: 'droid', expectedProcess: 'droid' },
  { id: 'mistral-vibe', detectCmd: 'vibe', aliases: ['mistral-vibe'], expectedProcess: 'vibe' },
  { id: 'qwen-code', detectCmd: 'qwen', expectedProcess: 'qwen' },
  { id: 'hermes', detectCmd: 'hermes', expectedProcess: 'hermes' },
  { id: 'aug', detectCmd: 'auggie', expectedProcess: 'auggie' },
  { id: 'trae', detectCmd: 'traecli', expectedProcess: 'traecli' },
  { id: 'dsh', detectCmd: 'dsh-tui', aliases: ['dst'], expectedProcess: 'dsh' },
  { id: 'zcode', detectCmd: 'zcode', expectedProcess: 'zcode-cli' },
  { id: 'devin', detectCmd: 'devin', expectedProcess: 'devin' },
  { id: 'kiro', detectCmd: 'kiro-cli', expectedProcess: 'kiro-cli' },
  { id: 'kilo', detectCmd: 'kilo', expectedProcess: 'kilo' },
  { id: 'pi', detectCmd: 'pi', expectedProcess: 'pi' },
  { id: 'omp', detectCmd: 'omp', expectedProcess: 'omp' },
  { id: 'rovo', detectCmd: 'rovo', expectedProcess: 'rovo' },
  { id: 'codebuff', detectCmd: 'codebuff', expectedProcess: 'codebuff' },
  { id: 'codebuddy', detectCmd: 'codebuddy', aliases: ['cbc'], expectedProcess: 'codebuddy' },
  { id: 'openclaude', detectCmd: 'openclaude', expectedProcess: 'openclaude' },
  { id: 'mimo-code', detectCmd: 'mimo', expectedProcess: 'mimo' },
  { id: 'ante', detectCmd: 'ante', expectedProcess: 'ante' },
  { id: 'command-code', detectCmd: 'command-code', expectedProcess: 'command-code' },
  { id: 'autohand', detectCmd: 'autohand', expectedProcess: 'autohand' },
  { id: 'freebuff', detectCmd: 'freebuff', expectedProcess: 'freebuff' },
  { id: 'crush', detectCmd: 'crush', expectedProcess: 'crush' },
  { id: 'openclaw', detectCmd: 'openclaw', expectedProcess: 'openclaw' },
  { id: 'prime-agent', detectCmd: 'prime-agent', expectedProcess: 'prime-agent' },
];

// Build lookup map
const PROCESS_TO_AGENT = new Map<string, TuiAgentId>();
for (const p of PROVIDER_REGISTRY) {
  const names = [p.expectedProcess, p.detectCmd, ...(p.aliases || [])];
  for (const name of names) {
    const norm = normalizeProcessName(name);
    if (norm && !PROCESS_TO_AGENT.has(norm)) {
      PROCESS_TO_AGENT.set(norm, p.id);
    }
  }
}

function normalizeProcessName(name: string): string {
  if (!name) return '';
  const unquoted = name.trim().replace(/^['"]|['"]$/g, '');
  const basename = unquoted.split(/[\/\\]/).pop() ?? unquoted;
  return basename.toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/i, '');
}

/**
 * Detects an AI agent from a raw command line string or process name.
 */
export function detectAgentFromCommandLine(cmdline: string): TuiAgentId | null {
  if (!cmdline) return null;
  
  // Simple tokenization for the first word
  const tokens = cmdline.trim().split(/\s+/);
  const firstToken = tokens[0];
  const norm = normalizeProcessName(firstToken);

  // 1. Exact Match
  const exactMatch = PROCESS_TO_AGENT.get(norm);
  if (exactMatch) return exactMatch;

  // 2. Prefix Matches (handled in registry but double-check for safety/performance)
  if (norm.startsWith('codex-')) return 'codex';
  if (norm.startsWith('grok-')) return 'grok';
  if (norm.startsWith('muse-bin-')) return 'muse';
  if (/^qodercli-\d/.test(norm)) return 'qoder';

  // 3. Interpreter Unwrap (Node/Python) - Simplified version
  if (['node', 'python', 'python3'].includes(norm) || /^python\d/.test(norm)) {
     // Look for known package markers in subsequent tokens
     const joined = tokens.join(' ');
     if (joined.includes('@openai/codex')) return 'codex';
     if (joined.includes('@google/gemini-cli')) return 'gemini';
     if (joined.includes('@tencent-ai/codebuddy-code')) return 'codebuddy';
     if (joined.includes('@zcode/cli')) return 'zcode';
     
     // Try to find the script name if it's the second token
     if (tokens.length > 1) {
       const scriptNorm = normalizeProcessName(tokens[1]);
       const scriptMatch = PROCESS_TO_AGENT.get(scriptNorm);
       if (scriptMatch) return scriptMatch;
     }
  }

  return null;
}

/**
 * Extracts OSC titles from a PTY output chunk.
 * Format: ESC ] 0|1|2 ; title BEL OR ESC \
 */
export function extractOscTitles(data: string): string[] {
  const titles: string[] = [];
  let i = 0;
  while (i < data.length) {
    // Find ESC ]
    if (data.charCodeAt(i) === 0x1b && data.charCodeAt(i + 1) === 0x5d) {
      const cmdChar = data.charCodeAt(i + 2);
      // Check for 0, 1, or 2 followed by semicolon
      if ((cmdChar >= 0x30 && cmdChar <= 0x32) && data.charCodeAt(i + 3) === 0x3b) {
        const start = i + 4;
        let end = -1;
        
        // Look for BEL (\x07)
        const belIndex = data.indexOf('\x07', start);
        if (belIndex !== -1) {
          end = belIndex;
        } else {
          // Look for ST (\x1b\)
          const stIndex = data.indexOf('\x1b\\', start);
          if (stIndex !== -1) {
            end = stIndex;
          }
        }

        if (end !== -1) {
          const title = data.slice(start, end).slice(0, 1024); // Truncate long titles
          titles.push(title);
          i = end + 1; // Move past terminator
          continue;
        }
      }
    }
    i++;
  }
  return titles;
}

/**
 * Classifies an agent based on its terminal title (OSC sequence).
 * Uses strict token-boundary regex to avoid false positives from paths or project names.
 */
export function detectAgentFromTitle(title: string): TuiAgentId | null {
  if (!title) return null;
  const lower = title.toLowerCase();

  // 1. Special Case: Cursor Native (Exact match preferred, but case-insensitive check with boundaries)
  if (/^\s*cursor\s+agent\s*$/.test(lower)) return 'cursor';

  // 2. Special Case: Gemini Glyphs
  // ✦ (U+2726), ⏲ (U+23F2), ◇ (U+25C7), ✋ (U+270B)
  // Must ensure it's not a conflicting agent like DSH or Qoder which might share symbols
  if (/[✦⏲◇]/.test(title)) {
    if (!/dsh|whale|qoder/i.test(title)) {
      return 'gemini';
    }
  }

  // 3. Strict Token Matching for other agents
  // Pattern: (?<![\w./\\-])KEYWORD(?:\.(?:exe|cmd|bat|ps1))?(?![\w./\\-])
  // This ensures "claude" matches in "Running claude..." but NOT in "/home/user/my-claude-project"
  
  const AGENT_TOKENS: Array<{ keyword: string; id: TuiAgentId }> = [
    { keyword: 'claude', id: 'claude' },
    { keyword: 'codex', id: 'codex' },
    { keyword: 'copilot', id: 'copilot' },
    { keyword: 'aider', id: 'aider' },
    { keyword: 'goose', id: 'goose' },
    { keyword: 'amp', id: 'amp' },
    { keyword: 'opencode', id: 'opencode' },
    { keyword: 'cline', id: 'cline' },
    { keyword: 'gemini', id: 'gemini' },
    { keyword: 'antigravity', id: 'antigravity' },
    { keyword: 'agy', id: 'antigravity' },
    { keyword: 'qoder', id: 'qoder' },
    { keyword: 'grok', id: 'grok' },
    { keyword: 'muse', id: 'muse' },
    { keyword: 'kimi', id: 'kimi' },
    { keyword: 'droid', id: 'droid' },
    { keyword: 'hermes', id: 'hermes' },
    { keyword: 'auggie', id: 'aug' },
    { keyword: 'traecli', id: 'trae' },
    { keyword: 'zcode', id: 'zcode' },
    { keyword: 'devin', id: 'devin' },
    { keyword: 'kiro', id: 'kiro' },
    { keyword: 'kilo', id: 'kilo' },
    { keyword: 'pi', id: 'pi' },
    { keyword: 'omp', id: 'omp' },
    { keyword: 'rovo', id: 'rovo' },
    { keyword: 'codebuddy', id: 'codebuddy' },
    { keyword: 'openclaude', id: 'openclaude' },
    { keyword: 'mimo', id: 'mimo-code' },
    { keyword: 'ante', id: 'ante' },
    { keyword: 'command-code', id: 'command-code' },
    { keyword: 'autohand', id: 'autohand' },
    { keyword: 'crush', id: 'crush' },
    { keyword: 'openclaw', id: 'openclaw' },
    { keyword: 'prime-agent', id: 'prime-agent' },
  ];

  for (const { keyword, id } of AGENT_TOKENS) {
    // Escape special regex chars in keyword just in case, though most are alphanumeric/hyphen
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Construct boundary-aware regex
    // Lookbehind: Not preceded by word char, dot, slash, backslash, hyphen
    // Optional extension: .exe, .cmd, etc.
    // Lookahead: Not followed by word char, dot, slash, backslash, hyphen
    const re = new RegExp(`(?<![\\w./\\\\-])${escapedKeyword}(?:\\.(?:exe|cmd|bat|ps1))?(?![\\w./\\\\-])`, 'i');
    
    if (re.test(title)) {
      return id;
    }
  }

  return null;
}