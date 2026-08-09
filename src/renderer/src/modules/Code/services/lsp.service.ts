/**
 * LSP (Language Server Protocol) Service
 * Detects language from file extension and maps to recommended LSP servers.
 */

// ─── Language → LSP Server Mapping ──────────────────────────────────────
export interface LSPServer {
  id: string;
  name: string;
  language: string;
  npmPackage: string;
  description: string;
  homepage?: string;
  icon?: string;
}

const LSP_SERVERS: Record<string, LSPServer> = {
  typescript: {
    id: 'typescript',
    name: 'TypeScript Language Server',
    language: 'TypeScript',
    npmPackage: 'typescript-language-server',
    description: 'IntelliSense, auto-complete, diagnostics for .ts / .tsx files',
    homepage: 'https://github.com/typescript-language-server/typescript-language-server',
  },
  javascript: {
    id: 'javascript',
    name: 'TypeScript Language Server',
    language: 'JavaScript',
    npmPackage: 'typescript-language-server',
    description: 'IntelliSense, auto-complete, diagnostics for .js / .jsx files (uses TS server)',
    homepage: 'https://github.com/typescript-language-server/typescript-language-server',
  },
  python: {
    id: 'python',
    name: 'Pyright',
    language: 'Python',
    npmPackage: 'pyright',
    description: 'Fast type checker and language server for Python',
    homepage: 'https://github.com/microsoft/pyright',
  },
  rust: {
    id: 'rust',
    name: 'Rust Analyzer',
    language: 'Rust',
    npmPackage: 'rust-analyzer', // Usually installed via rustup, not npm
    description: 'First-class Rust language support',
    homepage: 'https://rust-analyzer.github.io/',
  },
  go: {
    id: 'go',
    name: 'Gopls',
    language: 'Go',
    npmPackage: 'gopls', // Installed via go install
    description: 'Official Go language server',
    homepage: 'https://github.com/golang/tools/tree/master/gopls',
  },
  css: {
    id: 'css',
    name: 'CSS Language Server',
    language: 'CSS / SCSS / Less',
    npmPackage: 'vscode-langservers-extracted',
    description: 'Auto-complete, linting for CSS, SCSS, Less',
    homepage: 'https://github.com/hrsh7th/vscode-langservers-extracted',
  },
  html: {
    id: 'html',
    name: 'HTML Language Server',
    language: 'HTML',
    npmPackage: 'vscode-langservers-extracted',
    description: 'Auto-complete, validation for HTML',
    homepage: 'https://github.com/hrsh7th/vscode-langservers-extracted',
  },
  json: {
    id: 'json',
    name: 'JSON Language Server',
    language: 'JSON',
    npmPackage: 'vscode-langservers-extracted',
    description: 'Schema validation, auto-complete for JSON',
    homepage: 'https://github.com/hrsh7th/vscode-langservers-extracted',
  },
  markdown: {
    id: 'markdown',
    name: 'Marksman',
    language: 'Markdown',
    npmPackage: 'marksman', // Usually installed via system package
    description: 'Markdown LSP with link completion, diagnostics',
    homepage: 'https://github.com/artempyanykh/marksman',
  },
  yaml: {
    id: 'yaml',
    name: 'YAML Language Server',
    language: 'YAML',
    npmPackage: 'yaml-language-server',
    description: 'Schema-based validation for YAML files',
    homepage: 'https://github.com/redhat-developer/yaml-language-server',
  },
  bash: {
    id: 'bash',
    name: 'Bash Language Server',
    language: 'Bash / Shell',
    npmPackage: 'bash-language-server',
    description: 'Linting, auto-complete for shell scripts',
    homepage: 'https://github.com/bash-lsp/bash-language-server',
  },
  php: {
    id: 'php',
    name: 'Intelephense',
    language: 'PHP',
    npmPackage: 'intelephense',
    description: 'High performance PHP language server',
    homepage: 'https://intelephense.com/',
  },
  java: {
    id: 'java',
    name: 'Eclipse JDT LS',
    language: 'Java',
    npmPackage: 'java-debug', // Usually via Eclipse JDT
    description: 'Full Java support with Gradle/Maven integration',
    homepage: 'https://github.com/eclipse-jdtls/eclipse.jdt.ls',
  },
  csharp: {
    id: 'csharp',
    name: 'OmniSharp',
    language: 'C#',
    npmPackage: 'omnisharp-roslyn', // Usually via system install
    description: 'C# language services for .NET',
    homepage: 'https://github.com/OmniSharp/omnisharp-roslyn',
  },
};

// ─── Language Detection ─────────────────────────────────────────────────

/**
 * Detect language from file extension
 */
export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const extMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    py: 'python',
    pyw: 'python',
    rs: 'rust',
    go: 'go',
    css: 'css',
    scss: 'css',
    sass: 'css',
    less: 'css',
    html: 'html',
    htm: 'html',
    json: 'json',
    md: 'markdown',
    mdx: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',
    php: 'php',
    java: 'java',
    cs: 'csharp',
  };

  return extMap[ext] || '';
}

/**
 * Get LSP server info for a given filename
 */
export function getLSPServer(filename: string): LSPServer | null {
  const lang = detectLanguage(filename);
  if (!lang) return null;
  return LSP_SERVERS[lang] || null;
}

// ─── Installation State ─────────────────────────────────────────────────

const INSTALLED_KEY = 'lsp-installed-servers';

/**
 * Check if an LSP server is marked as installed
 */
export function isLSPInstalled(serverId: string): boolean {
  try {
    const installed = JSON.parse(localStorage.getItem(INSTALLED_KEY) || '[]');
    return installed.includes(serverId);
  } catch {
    return false;
  }
}

/**
 * Mark an LSP server as installed
 */
export function markLSPInstalled(serverId: string): void {
  try {
    const installed = JSON.parse(localStorage.getItem(INSTALLED_KEY) || '[]');
    if (!installed.includes(serverId)) {
      installed.push(serverId);
      localStorage.setItem(INSTALLED_KEY, JSON.stringify(installed));
    }
  } catch {
    // ignore
  }
}

/**
 * Mark an LSP server as dismissed (don't ask again)
 */
export function dismissLSP(serverId: string): void {
  try {
    const dismissed = JSON.parse(localStorage.getItem('lsp-dismissed') || '[]');
    if (!dismissed.includes(serverId)) {
      dismissed.push(serverId);
      localStorage.setItem('lsp-dismissed', JSON.stringify(dismissed));
    }
  } catch {
    // ignore
  }
}

/**
 * Check if an LSP server suggestion was dismissed
 */
export function isLSPDismissed(serverId: string): boolean {
  try {
    const dismissed = JSON.parse(localStorage.getItem('lsp-dismissed') || '[]');
    return dismissed.includes(serverId);
  } catch {
    return false;
  }
}
