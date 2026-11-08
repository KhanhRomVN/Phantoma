#!/usr/bin/env node

/**
 * Script to detect invalid Tailwind color classes in the codebase.
 * 
 * Valid colors include:
 * 1. Tailwind default colors (slate, gray, zinc, red, blue, etc.)
 * 2. Custom colors defined in tailwind.config.js
 * 3. Arbitrary values like bg-[#fff]
 * 
 * Usage: node scripts/check-invalid-tailwind-colors.js
 */

const fs = require('fs');
const path = require('path');

// Tailwind default color palette
const TAILWIND_DEFAULT_COLORS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
  'white', 'black', 'transparent', 'current',
  'inherit', 'none',
];

// Custom colors from tailwind.config.js
const CUSTOM_COLORS = [
  'primary',
  'success',
  'error',
  'warn',
  'info',
  'background',
  'text-primary',
  'text-secondary',
  'text-foreground',
  'border',
  'divider',
  'card-background',
  'card-hover',
  'input-background',
  'input-border-default',
  'dropdown-background',
  'dropdown-item-hover',
  'tooltip-background',
  'sidebar-background',
  'sidebar-item-hover',
  'sidebar-item-active',
  'table-header-background',
  'table-footer-background',
  'table-row-hover',
  'button-solid-background',
  'button-solid-text',
  'button-soft-background',
  // Legacy/deprecated colors still in use
  'foreground',
  'muted',
  'input',
  'tertiary',
  'secondary', // text-secondary/80 pattern
  'background-subtle',
  'text-faint',
  'sub', // text-sub
];

// Color utility prefixes
const COLOR_PREFIXES = [
  'bg', 'text', 'border', 'ring', 'divide',
  'from', 'via', 'to',
  'decoration', 'placeholder', 'caret',
  'accent', 'outline', 'shadow',
];

/**
 * Check if a color token is valid
 */
function isValidColor(colorToken) {
  // Arbitrary value: bg-[#fff], text-[rgb(...)]
  if (colorToken.includes('[')) return true;

  // Gradient directions are not colors
  if (colorToken.startsWith('gradient-to-')) return true;

  // Border with custom color: border-l-text-secondary
  if (/^l-/.test(colorToken)) {
    const actualColor = colorToken.substring(2);
    return isValidColor(actualColor);
  }

  // Check Tailwind defaults (including black/white with opacity)
  for (const defaultColor of TAILWIND_DEFAULT_COLORS) {
    if (colorToken === defaultColor || colorToken.startsWith(`${defaultColor}-`) || colorToken.startsWith(`${defaultColor}/`)) {
      return true;
    }
  }

  // Check custom colors
  for (const customColor of CUSTOM_COLORS) {
    if (colorToken === customColor || colorToken.startsWith(`${customColor}/`)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract color classes from className string
 */
function extractColorClasses(classNameStr) {
  const classes = classNameStr.split(/\s+/).filter(Boolean);
  const colorClasses = [];

  // Non-color suffixes that should be ignored
  const NON_COLOR_PATTERNS = [
    /^(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|base)$/, // sizes + base
    /^(t|b|l|r|x|y)$/, // directions (border-t, text-left, etc.)
    /^(l|r|t|b)-\d+$/, // directional with number: border-l-2, border-r-4
    /^(l|r|t|b)-(transparent|current|inherit)$/, // directional with special: border-l-transparent
    /^\d+$/, // numbers (w-4, h-8, etc.)
    /^(center|left|right|justify|start|end)$/, // alignments
    /^(solid|dashed|dotted|double|none)$/, // border styles
    /^(collapse|separate)$/, // border collapse
    /^(clip|ellipsis)$/, // text overflow
  ];

  for (const cls of classes) {
    // Remove modifiers like hover:, focus:, dark:, etc.
    const parts = cls.split(':');
    const actualClass = parts[parts.length - 1];

    // Check if it's a color utility
    for (const prefix of COLOR_PREFIXES) {
      if (actualClass.startsWith(`${prefix}-`)) {
        const colorToken = actualClass.substring(prefix.length + 1);
        
        // Skip if it matches non-color patterns
        let isNonColor = false;
        for (const pattern of NON_COLOR_PATTERNS) {
          if (pattern.test(colorToken)) {
            isNonColor = true;
            break;
          }
        }
        
        if (!isNonColor) {
          colorClasses.push({
            full: cls,
            prefix,
            color: colorToken,
          });
        }
        break;
      }
    }
  }

  return colorClasses;
}

/**
 * Scan a file for invalid color classes
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];

  // Regex to match className="..." or className={"..."} or className={cn("...", ...)}
  const classNameRegex = /className\s*=\s*(?:{[^}]*['"`]([^'"}`]+)['"`][^}]*}|['"`]([^'"}`]+)['"`])/g;

  let match;
  while ((match = classNameRegex.exec(content)) !== null) {
    const classNameStr = match[1] || match[2];
    if (!classNameStr) continue;

    const colorClasses = extractColorClasses(classNameStr);
    for (const { full, prefix, color } of colorClasses) {
      if (!isValidColor(color)) {
        // Find line number
        const lineNumber = content.substring(0, match.index).split('\n').length;
        issues.push({
          file: filePath,
          line: lineNumber,
          class: full,
          color,
          prefix,
        });
      }
    }
  }

  return issues;
}

/**
 * Recursively scan directory
 */
function scanDirectory(dir, issues = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules, dist, build, etc.
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build', '.git', 'out'].includes(entry.name)) {
        continue;
      }
      scanDirectory(fullPath, issues);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.jsx'))) {
      const fileIssues = scanFile(fullPath);
      issues.push(...fileIssues);
    }
  }

  return issues;
}

/**
 * Main
 */
function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  console.log('🔍 Scanning for invalid Tailwind color classes...\n');

  const issues = scanDirectory(srcDir);

  if (issues.length === 0) {
    console.log('✅ No invalid color classes found!');
    return;
  }

  console.log(`❌ Found ${issues.length} invalid color class(es):\n`);

  // Group by file
  const byFile = {};
  for (const issue of issues) {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  }

  for (const [file, fileIssues] of Object.entries(byFile)) {
    const relPath = path.relative(process.cwd(), file);
    console.log(`\n📄 ${relPath}`);
    for (const issue of fileIssues) {
      console.log(`   Line ${issue.line}: ${issue.class}`);
      console.log(`   └─ Invalid color: "${issue.color}"`);
    }
  }

  console.log(`\n\n📊 Summary: ${issues.length} issue(s) found in ${Object.keys(byFile).length} file(s)`);
  console.log('\n💡 Valid colors:');
  console.log('   - Tailwind defaults: slate, gray, red, blue, green, etc.');
  console.log('   - Custom colors: primary, success, error, warn, text-primary, etc.');
  console.log('   - Arbitrary values: bg-[#fff], text-[rgb(255,0,0)]');
}

main();