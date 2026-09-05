#!/usr/bin/env node
/**
 * CLI tool cho ts-reap
 * Usage: ts-reap check [options]
 */
import * as path from 'path';
import * as fs from 'fs';
import { ProjectAnalyzer, UnusedFinding } from './analyzer';

interface CliOptions {
  tsconfig?: string;
  entryPatterns?: string[];
  ignorePatterns?: string[];
  scopePaths?: string[];
  format?: 'text' | 'json';
  exitCode?: boolean;
}

function colorize(text: string, code: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}

function link(text: string, filePath: string, line?: number): string {
  const normalized = filePath.split(path.sep).join('/');
  const uri = `file://${normalized}${line !== undefined ? `#L${line}` : ''}`;
  return `\x1b]8;;${uri}\x1b\\${text}\x1b]8;;\x1b\\`;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    format: 'text',
    exitCode: true
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--tsconfig':
        options.tsconfig = args[++i];
        break;
      case '--entry':
        options.entryPatterns = args[++i].split(',');
        break;
      case '--ignore':
        options.ignorePatterns = args[++i].split(',');
        break;
      case '--scope':
        options.scopePaths = args[++i].split(',');
        break;
      case '--format':
        options.format = args[++i] as 'text' | 'json';
        break;
      case '--no-exit-code':
        options.exitCode = false;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
    }
  }

  return options;
}

function showHelp() {
  console.log(`
ts-reap - Detect unused exports in TypeScript/JavaScript projects

USAGE:
  ts-reap check [options]

OPTIONS:
  --tsconfig <path>       Path to tsconfig.json (default: find in cwd)
  --scope <paths>         Comma-separated files/folders to scan (default: all files from tsconfig)
  --entry <patterns>      Comma-separated entry file patterns
  --ignore <patterns>     Comma-separated extra ignore patterns (.gitignore is always respected)
  --format <text|json>    Output format (default: text)
  --no-exit-code          Don't exit with error code if unused exports found
  -h, --help              Show this help

EXAMPLES:
  ts-reap check
  ts-reap check --scope "src"
  ts-reap check --scope "src/main,src/renderer" --ignore "temp,out"
  ts-reap check --format json
  ts-reap check --no-exit-code

EXIT CODES:
  0 - No unused exports found
  1 - Unused exports found (unless --no-exit-code)
  2 - Error occurred
`);
}

function findTsConfig(startDir: string): string | null {
  let currentDir = startDir;
  
  while (true) {
    const tsconfigPath = path.join(currentDir, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      return tsconfigPath;
    }
    
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

function formatTextOutput(findings: UnusedFinding[], projectRoot: string): string {
  if (findings.length === 0) {
    return colorize('No unused declarations found!', '32');
  }

  const grouped = new Map<string, UnusedFinding[]>();
  
  for (const finding of findings) {
    const relativePath = path.relative(projectRoot, finding.filePath);
    if (!grouped.has(relativePath)) {
      grouped.set(relativePath, []);
    }
    grouped.get(relativePath)!.push(finding);
  }

  let output = colorize(`Found ${findings.length} unused declaration(s) in ${grouped.size} file(s):`, '31') + '\n\n';
  
  for (const [filePath, fileFindings] of grouped) {
    const absPath = path.join(projectRoot, filePath);
    output += link(colorize(filePath, '36'), absPath) + '\n';
    for (const finding of fileFindings) {
      const line = finding.startLine + 1;
      const nameDisplay = link(colorize(finding.name, '33'), absPath, line);
      output += `  L${line}: ${nameDisplay} (${finding.kind})\n`;
      output += `  ${colorize(finding.message, '90')}\n\n`;
    }
  }

  return output;
}

function formatJsonOutput(findings: UnusedFinding[]): string {
  return JSON.stringify({
    totalUnused: findings.length,
    findings: findings.map(f => ({
      file: f.filePath,
      name: f.name,
      kind: f.kind,
      line: f.startLine + 1,
      column: f.startChar + 1,
      message: f.message
    }))
  }, null, 2);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  if (args[0] !== 'check') {
    console.error(`Unknown command: ${args[0]}`);
    console.error('Run "ts-reap --help" for usage');
    process.exit(2);
  }

  const options = parseArgs(args.slice(1));
  
  const tsconfigPath = options.tsconfig 
    ? path.resolve(process.cwd(), options.tsconfig)
    : findTsConfig(process.cwd());

  if (!tsconfigPath) {
    console.error('Could not find tsconfig.json');
    console.error('   Please specify --tsconfig or run from a directory with tsconfig.json');
    process.exit(2);
  }

  if (!fs.existsSync(tsconfigPath)) {
    console.error(`tsconfig.json not found at: ${tsconfigPath}`);
    process.exit(2);
  }

  const projectRoot = path.dirname(tsconfigPath);

  if (options.format === 'text') {
    console.log('Analyzing project for unused exports and locals...');
    console.log(`   Project: ${projectRoot}`);
    console.log(`   Config: ${path.basename(tsconfigPath)}`);
    if (options.scopePaths) {
      console.log(`   Scope: ${options.scopePaths.join(', ')}`);
    }
    console.log('');
  }

  try {
    const analyzer = new ProjectAnalyzer({
      tsConfigFilePath: tsconfigPath,
      entryPatterns: options.entryPatterns || ['src/index.ts', 'src/main.ts', 'index.ts'],
      ignorePatterns: options.ignorePatterns,
      scopePaths: options.scopePaths
    });

    const findings = [
      ...analyzer.findUnusedExports(),
      ...analyzer.findUnusedLocals()
    ];

    if (options.format === 'json') {
      console.log(formatJsonOutput(findings));
    } else {
      console.log(formatTextOutput(findings, projectRoot));
    }

    if (findings.length > 0 && options.exitCode) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(2);
  }
}

main();