/**
 * Quét nội dung bị trùng giữa nhiều nơi trong src/renderer/src:
 *   - object literal: { field: value, field: value, ... } (không phân biệt thứ tự field)
 *   - array literal:  [<value>, <value>, ...]             (phân biệt thứ tự phần tử)
 * Chỉ báo khối ngoài cùng (khối con nằm trong khối trùng lớn hơn sẽ bị bỏ qua).
 *
 * Dùng: node scripts/find-duplicates/content.js [--kind=object|array] [--min=2] [--min-chars=30]
 *   --kind=...      : chỉ xét object hoặc array
 *   --min=N         : số field/phần tử tối thiểu (mặc định 2)
 *   --min-chars=N   : độ dài text tối thiểu sau khi gộp khoảng trắng (mặc định 30)
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');

const root = path.join(__dirname, '..', '..');
const srcDir = path.join(root, 'src', 'renderer', 'src');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'out', '.git']);

const argValue = (name) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const numArg = (name, fallback) => {
  const n = Number(argValue(name));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const minItems = numArg('min', 2);
const minChars = numArg('min-chars', 30);
const kindFilter = argValue('kind');

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

function collect(file) {
  const text = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const relPath = path.relative(root, file);
  const out = [];

  const norm = (n) => n.getText(sf).replace(/\s+/g, ' ').trim();

  const push = (itemKind, node, size, content) => {
    const full = norm(node);
    if (full.length < minChars) return;
    const hash = crypto.createHash('md5').update(content).digest('hex');
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    out.push({
      key: `${itemKind}|${hash}`,
      item: {
        kind: itemKind,
        file: relPath,
        line: line + 1,
        start: node.getStart(sf),
        end: node.getEnd(),
        size,
        preview: full.length > 80 ? `${full.slice(0, 80)}…` : full,
      },
    });
  };

  const visit = (node) => {
    if (
      ts.isObjectLiteralExpression(node) &&
      node.properties.length >= minItems &&
      kindFilter !== 'array'
    ) {
      push('object', node, node.properties.length, node.properties.map(norm).sort().join(','));
    } else if (
      ts.isArrayLiteralExpression(node) &&
      node.elements.length >= minItems &&
      kindFilter !== 'object'
    ) {
      push('array', node, node.elements.length, node.elements.map(norm).join(','));
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return out;
}

if (!fs.existsSync(srcDir)) {
  console.error(`[find-duplicates:content] folder not found: ${srcDir}`);
  process.exit(1);
}

const files = walk(srcDir);
const byKey = new Map();
for (const file of files) {
  for (const { key, item } of collect(file)) {
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(item);
  }
}

const groups = [...byKey.values()].filter((g) => g.length > 1);

const byFile = new Map();
for (const g of groups) {
  for (const it of g) {
    if (!byFile.has(it.file)) byFile.set(it.file, []);
    byFile.get(it.file).push(it);
  }
}

const isNested = (it) =>
  (byFile.get(it.file) ?? []).some(
    (o) => o !== it && o.start <= it.start && o.end >= it.end && o.end - o.start > it.end - it.start,
  );

const maximal = groups
  .map((g) => g.filter((it) => !isNested(it)))
  .filter((g) => g.length > 1)
  .sort((a, b) => b.length - a.length || b[0].size - a[0].size);

for (const g of maximal) {
  const unit = g[0].kind === 'object' ? 'fields' : 'items';
  console.log(`\n[${g.length} places] ${g[0].kind} (${g[0].size} ${unit})  ${g[0].preview}`);
  for (const it of g.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
    console.log(`  ${it.file}:${it.line}`);
  }
}

console.log(
  `\n[find-duplicates:content] scanned ${files.length} files, ${maximal.length} duplicated blocks`,
);