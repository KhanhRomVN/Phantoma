import { watch } from 'chokidar';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join, relative, dirname } from 'path';

const execPromise = promisify(exec);

// Configuration
const DEFAULT_TARGET = 'src/renderer/src/features/Emulate';
const TARGET_FOLDER = process.argv[2] || DEFAULT_TARGET;
const DEBOUNCE_DELAY = 300;
const TS_CONFIG = 'tsconfig.web.json';
const SHOW_WARNINGS = false; // Set to true to show warnings, false to show only errors

// Track pending timer for debounce
let debounceTimer: NodeJS.Timeout | null = null;
let isRunning = false;
const pendingChanges: Set<string> = new Set();

// ANSI color codes for better terminal output
const colors = {
  info: chalk.cyan,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  dim: chalk.dim,
  bold: chalk.bold,
};

function logHeader(onceMode: boolean = false) {
  console.clear();
  if (onceMode) {
    console.log(chalk.bold.cyan('🔍 Phantoma Feature Checker (One-time)'));
  } else {
    console.log(chalk.bold.cyan('🔍 Phantoma Feature Watcher'));
  }
  console.log(chalk.dim(`📁 Target: ${TARGET_FOLDER}`));
  if (!onceMode) {
    console.log(chalk.dim(`🔄 Press Ctrl+C to stop`));
  }
  console.log();
}

function logFileChange(filePath: string) {
  const relativePath = relative(process.cwd(), filePath);
  console.log(chalk.dim(`📂 File changed: ${relativePath}`));
  console.log();
}

function groupErrorsByMessage(errors: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const err of errors) {
    // Extract file path and message
    // Format: file.ts:line:col - message (rule)
    const match = err.match(/^(.+?):\d+:\d+\s*-\s*(.+?)(?:\s*\((.+)\))?$/);
    if (match) {
      const [, filePath, message, rule] = match;
      const key = rule ? `${message} (${rule})` : message;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(filePath);
    } else {
      // Fallback: use the whole error as key
      if (!groups.has(err)) {
        groups.set(err, []);
      }
      groups.get(err)!.push('unknown');
    }
  }
  return groups;
}

function logTypeScriptResult(result: { errors: string[]; warnings: string[] }) {
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0 && SHOW_WARNINGS;

  if (!hasErrors && !hasWarnings) {
    console.log(chalk.green('✅ TypeScript: No errors'));
    return;
  }

  // Group errors
  if (hasErrors) {
    const grouped = groupErrorsByMessage(result.errors);
    console.log(chalk.red(`❌ TypeScript: ${result.errors.length} error(s)`));
    for (const [message, files] of grouped) {
      const fileList =
        files.length > 3
          ? files.slice(0, 3).join(', ') + ` +${files.length - 3} more`
          : files.join(', ');
      // Format: file_path (white) : error_message (red)
      console.log(chalk.white(`   ${fileList}: `) + chalk.red(message));
    }
  }

  // Show warnings if enabled
  if (hasWarnings) {
    const grouped = groupErrorsByMessage(result.warnings);
    console.log(chalk.yellow(`⚠️  TypeScript: ${result.warnings.length} warning(s)`));
    for (const [message, files] of grouped) {
      const fileList =
        files.length > 3
          ? files.slice(0, 3).join(', ') + ` +${files.length - 3} more`
          : files.join(', ');
      console.log(chalk.white(`   ${fileList}: `) + chalk.yellow(message));
    }
  }
}

function logESLintResult(result: { errors: string[]; warnings: string[] }) {
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0 && SHOW_WARNINGS;

  if (!hasErrors && !hasWarnings) {
    console.log(chalk.green('✅ ESLint: No issues'));
    return;
  }

  // Group errors
  if (hasErrors) {
    const grouped = groupErrorsByMessage(result.errors);
    console.log(chalk.red(`❌ ESLint: ${result.errors.length} error(s)`));
    for (const [message, files] of grouped) {
      const fileList =
        files.length > 3
          ? files.slice(0, 3).join(', ') + ` +${files.length - 3} more`
          : files.join(', ');
      console.log(chalk.white(`   ${fileList}: `) + chalk.red(message));
    }
  }

  // Show warnings if enabled
  if (hasWarnings) {
    const grouped = groupErrorsByMessage(result.warnings);
    console.log(chalk.yellow(`⚠️  ESLint: ${result.warnings.length} warning(s)`));
    for (const [message, files] of grouped) {
      const fileList =
        files.length > 3
          ? files.slice(0, 3).join(', ') + ` +${files.length - 3} more`
          : files.join(', ');
      console.log(chalk.white(`   ${fileList}: `) + chalk.yellow(message));
    }
  }
}

function logTailwindResult(result: { errors: string[]; warnings: string[] }) {
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0 && SHOW_WARNINGS;

  if (!hasErrors && !hasWarnings) {
    console.log(chalk.green('✅ Tailwind: No issues'));
    return;
  }

  // Group errors
  if (hasErrors) {
    const grouped = groupErrorsByMessage(result.errors);
    console.log(chalk.red(`❌ Tailwind: ${result.errors.length} error(s)`));
    for (const [message, files] of grouped) {
      const fileList =
        files.length > 3
          ? files.slice(0, 3).join(', ') + ` +${files.length - 3} more`
          : files.join(', ');
      console.log(chalk.white(`   ${fileList}: `) + chalk.red(message));
    }
  }

  // Show warnings if enabled
  if (hasWarnings) {
    const grouped = groupErrorsByMessage(result.warnings);
    console.log(chalk.yellow(`⚠️  Tailwind: ${result.warnings.length} warning(s)`));
    for (const [message, files] of grouped) {
      const fileList =
        files.length > 3
          ? files.slice(0, 3).join(', ') + ` +${files.length - 3} more`
          : files.join(', ');
      console.log(chalk.white(`   ${fileList}: `) + chalk.yellow(message));
    }
  }
}

function logSummary(results: {
  typescript: { errors: string[]; warnings: string[] };
  eslint: { errors: string[]; warnings: string[] };
  tailwind: { errors: string[]; warnings: string[] };
}) {
  console.log();
  console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

  const totalErrors =
    results.typescript.errors.length +
    results.eslint.errors.length +
    results.tailwind.errors.length;
  const totalWarnings =
    results.typescript.warnings.length +
    results.eslint.warnings.length +
    results.tailwind.warnings.length;

  // Only show warnings in summary if enabled
  const showWarnings = SHOW_WARNINGS;
  const effectiveWarnings = showWarnings ? totalWarnings : 0;

  if (totalErrors === 0 && effectiveWarnings === 0) {
    console.log(chalk.green.bold('✅ All checks passed! 🎉'));
  } else {
    const parts: string[] = [];
    if (totalErrors > 0) {
      parts.push(chalk.red.bold(`❌ ${totalErrors} error(s)`));
    }
    if (effectiveWarnings > 0) {
      parts.push(chalk.yellow.bold(`⚠️  ${effectiveWarnings} warning(s)`));
    }
    if (totalWarnings > 0 && !showWarnings) {
      parts.push(chalk.dim(`(${totalWarnings} warnings hidden - set SHOW_WARNINGS=true to see)`));
    }
    console.log(parts.join(' '));
  }
  console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log();
}

async function runTypeScriptCheck(): Promise<{ errors: string[]; warnings: string[] }> {
  try {
    const { stdout, stderr } = await execPromise(`npx tsc --noEmit -p ${TS_CONFIG}`, {
      cwd: process.cwd(),
    });

    const output = stdout + stderr;
    const lines = output.split('\n').filter((line) => line.trim());

    const errors: string[] = [];
    const warnings: string[] = [];

    // Filter lines related to the target folder
    const targetPattern = new RegExp(TARGET_FOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    for (const line of lines) {
      if (targetPattern.test(line)) {
        if (line.includes('error TS')) {
          errors.push(line.trim());
        } else if (line.includes('warning TS')) {
          warnings.push(line.trim());
        } else if (line.includes('error') || line.includes('Error')) {
          errors.push(line.trim());
        }
      }
    }

    return { errors, warnings };
  } catch (error: any) {
    // tsc returns non-zero exit code on errors, but we still get output
    const output = error.stdout || error.stderr || '';
    const lines = output.split('\n').filter((line: string) => line.trim());

    const errors: string[] = [];
    const warnings: string[] = [];
    const targetPattern = new RegExp(TARGET_FOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    for (const line of lines) {
      if (targetPattern.test(line)) {
        if (line.includes('error TS')) {
          errors.push(line.trim());
        } else if (line.includes('warning TS')) {
          warnings.push(line.trim());
        } else if (line.includes('error') || line.includes('Error')) {
          errors.push(line.trim());
        }
      }
    }

    return { errors, warnings };
  }
}

async function runESLintCheck(): Promise<{ errors: string[]; warnings: string[] }> {
  try {
    const { stdout } = await execPromise(`npx eslint ${TARGET_FOLDER} --format=json`, {
      cwd: process.cwd(),
    });

    const results = JSON.parse(stdout);
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const fileResult of results) {
      const filePath = relative(process.cwd(), fileResult.filePath);
      for (const message of fileResult.messages) {
        const line = `${filePath}:${message.line}:${message.column} - ${message.message} (${message.ruleId || 'unknown'})`;
        if (message.severity === 2) {
          errors.push(line);
        } else if (message.severity === 1) {
          warnings.push(line);
        }
      }
    }

    return { errors, warnings };
  } catch (error: any) {
    // ESLint might return non-zero exit code but still have output
    if (error.stdout) {
      try {
        const results = JSON.parse(error.stdout);
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const fileResult of results) {
          const filePath = relative(process.cwd(), fileResult.filePath);
          for (const message of fileResult.messages) {
            const line = `${filePath}:${message.line}:${message.column} - ${message.message} (${message.ruleId || 'unknown'})`;
            if (message.severity === 2) {
              errors.push(line);
            } else if (message.severity === 1) {
              warnings.push(line);
            }
          }
        }

        return { errors, warnings };
      } catch {
        return { errors: ['Failed to parse ESLint output'], warnings: [] };
      }
    }
    return { errors: ['ESLint execution failed'], warnings: [] };
  }
}

async function runTailwindCheck(): Promise<{ errors: string[]; warnings: string[] }> {
  // Simple check: look for Tailwind classes in files and validate against config
  // This is a basic implementation - you can extend with actual Tailwind CLI
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if tailwind.config.js exists
    const configPath = join(process.cwd(), 'tailwind.config.js');
    if (!existsSync(configPath)) {
      warnings.push('tailwind.config.js not found, skipping Tailwind validation');
      return { errors, warnings };
    }

    // Simple check: scan for unknown Tailwind classes
    const targetPath = join(process.cwd(), TARGET_FOLDER);
    if (!existsSync(targetPath)) {
      warnings.push(`Target folder ${TARGET_FOLDER} does not exist`);
      return { errors, warnings };
    }

    // For now, we'll do a basic check - you can enhance this with actual Tailwind CLI
    const { stdout } = await execPromise(
      `npx tailwindcss -i ${targetPath} --content ${targetPath} --dry-run 2>&1 || true`,
      {
        cwd: process.cwd(),
      },
    );

    if (stdout.includes('error') || stdout.includes('Error')) {
      errors.push('Tailwind configuration error detected');
    }

    // Additional check: look for invalid class patterns (you can expand this)
    const files = await execPromise(
      `find ${TARGET_FOLDER} -type f \\( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \\)`,
      {
        cwd: process.cwd(),
      },
    );

    // Basic validation: warn about common issues
    if (files.stdout) {
      const fileList = files.stdout.split('\n').filter((f) => f.trim());
      for (const file of fileList) {
        try {
          const content = readFileSync(join(process.cwd(), file), 'utf-8');
          // Check for missing Tailwind classes (very basic)
          const classNameMatches = content.match(/className="([^"]*)"/g) || [];
          for (const match of classNameMatches) {
            const classes = match
              .replace(/className="/, '')
              .replace(/"$/, '')
              .split(' ');
            for (const cls of classes) {
              if (
                cls &&
                !cls.startsWith('hover:') &&
                !cls.startsWith('focus:') &&
                !cls.startsWith('active:') &&
                !cls.startsWith('lg:') &&
                !cls.startsWith('md:') &&
                !cls.startsWith('sm:') &&
                !cls.startsWith('group-') &&
                !cls.startsWith('peer-') &&
                !cls.startsWith('aria-') &&
                !cls.startsWith('data-')
              ) {
                // Check if it's a valid Tailwind utility (very basic check)
                if (cls.length > 20 && !cls.includes('-')) {
                  warnings.push(`Possible invalid Tailwind class in ${file}: "${cls}"`);
                }
              }
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }

    return { errors, warnings };
  } catch (error) {
    errors.push('Tailwind check failed');
    return { errors, warnings };
  }
}

async function runChecks(changedFile?: string) {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    if (changedFile) {
      logFileChange(changedFile);
    }

    // Run all checks in parallel
    const [tsResult, eslintResult, tailwindResult] = await Promise.all([
      runTypeScriptCheck(),
      runESLintCheck(),
      runTailwindCheck(),
    ]);

    // Display results
    logTypeScriptResult(tsResult);
    console.log();

    logESLintResult(eslintResult);
    console.log();

    logTailwindResult(tailwindResult);
    console.log();

    // Summary
    logSummary({
      typescript: tsResult,
      eslint: eslintResult,
      tailwind: tailwindResult,
    });
  } catch (error) {
    console.log(chalk.red('❌ Error running checks:'), error);
  } finally {
    isRunning = false;
  }
}

function handleChange(filePath: string) {
  if (!filePath.includes(TARGET_FOLDER)) {
    return;
  }

  pendingChanges.add(filePath);

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    const files = Array.from(pendingChanges);
    pendingChanges.clear();

    if (files.length === 1) {
      runChecks(files[0]);
    } else {
      logFileChange(files[0]);
      console.log(chalk.dim(`   and ${files.length - 1} other file(s)`));
      runChecks();
    }
  }, DEBOUNCE_DELAY);
}

// Main
async function main() {
  const onceMode = process.argv.includes('--once');

  logHeader(onceMode);

  // Check if target folder exists
  const targetPath = join(process.cwd(), TARGET_FOLDER);
  if (!existsSync(targetPath)) {
    console.log(chalk.yellow(`⚠️  Warning: Target folder "${TARGET_FOLDER}" does not exist yet.`));
    console.log(chalk.dim('   The watcher will start once the folder is created.'));
    console.log();
  }

  // Run initial check
  await runChecks();

  // If once mode, exit after checks
  if (onceMode) {
    console.log(chalk.dim('✅ Check completed. Exiting...'));
    process.exit(0);
  }

  // Set up watcher for long-running mode
  const watcher = watch(targetPath, {
    ignored: /(^|[\/\\])\../, // Ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    depth: 10,
  });

  watcher
    .on('add', handleChange)
    .on('change', handleChange)
    .on('unlink', handleChange)
    .on('addDir', handleChange)
    .on('unlinkDir', handleChange)
    .on('error', (error) => {
      console.log(chalk.red('❌ Watcher error:'), error);
    });

  console.log(chalk.green('✅ Watcher started successfully'));
  console.log(chalk.dim(`   Watching: ${TARGET_FOLDER}`));
  console.log();
  console.log(chalk.dim('   Waiting for file changes...'));
  console.log();

  // Keep process running
  process.on('SIGINT', () => {
    console.log();
    console.log(chalk.dim('👋 Stopping watcher...'));
    watcher.close();
    process.exit(0);
  });
}

// Run the main function
main().catch((error) => {
  console.error(chalk.red('❌ Fatal error:'), error);
  process.exit(1);
});
