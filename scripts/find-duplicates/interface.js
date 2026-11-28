/**
 * Quét các interface khai báo ở top-level bị trùng tên giữa nhiều file trong src/renderer/src.
 *
 * Dùng: node scripts/find-duplicates/interface.js [--exported] [--identical-only]
 *   --exported       : chỉ xét các khai báo có export
 *   --identical-only : chỉ hiện các khai báo có nội dung giống hệt nhau
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');

const root = path.join(__dirname, '..', '..');
const srcDir = path.join(root, 'src', 'renderer', 'src');
const exportedOnly = process.argv.includes('--exported');
const identicalOnly = process.argv.includes('--identical-only');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'out', '.git']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), files);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function isExported(node) {
  const modifiers = ts.canHaveModifiers(node) ? (ts.getModifiers(node) ?? []) : [];
  return modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function collect(file) {
  const text = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const relPath = path.relative(root, file);
  const seen = new Set();
  const found = [];

  for (const node of sf.statements) {
    if (!ts.isInterfaceDeclaration(node) || seen.has(node.name.text)) continue;
    const exported = isExported(node);
    if (exportedOnly && !exported) continue;
    seen.add(node.name.text);
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    const hash = crypto
      .createHash('md5')
      .update(node.getText(sf).replace(/\s+/g, ' '))
      .digest('hex')
      .slice(0, 8);
    found.push({ name: node.name.text, file: relPath, line: line + 1, exported, hash });
  }
  return found;
}

if (!fs.existsSync(srcDir)) {
  console.error(`[find-duplicates:interface] folder not found: ${srcDir}`);
  process.exit(1);
}

const files = walk(srcDir);
const byName = new Map();
for (const file of files) {
  for (const item of collect(file)) {
    if (!byName.has(item.name)) byName.set(item.name, []);
    byName.get(item.name).push(item);
  }
}

const duplicates = [...byName.entries()]
  .filter(([, items]) => items.length > 1)
  .filter(([, items]) => !identicalOnly || items.every((i) => i.hash === items[0].hash))
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

for (const [name, items] of duplicates) {
  const same = items.every((i) => i.hash === items[0].hash) ? '  [IDENTICAL]' : '';
  console.log(`\n[${items.length} files] ${name}  <interface>${same}`);
  for (const it of items.sort((a, b) => a.file.localeCompare(b.file))) {
    console.log(`  ${it.file}:${it.line}${it.exported ? '  (export)' : ''}`);
  }
}

console.log(
  `\n[find-duplicates:interface] scanned ${files.length} files, ${duplicates.length} duplicated names${exportedOnly ? ' (exported only)' : ''}`,
);